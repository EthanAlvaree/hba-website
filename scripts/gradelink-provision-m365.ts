#!/usr/bin/env tsx
//
// scripts/gradelink-provision-m365.ts
//
// Provisions M365 accounts for the 27 Gradelink students who don't
// have one. For each:
//   1. Look in the M365 deleted-users bin first — if the desired UPN
//      was recently deleted, restore it (preserves entra_oid + any
//      OneDrive/email artifacts). Soft-deletes have a 30-day window.
//   2. Otherwise call provisionStudentM365Account (creates the
//      account, sets a temp password with forceChangePassword=true,
//      assigns the student license).
//   3. After provisioning succeeds, create the SIS profile +
//      students row with the new entra_oid + gradelink_account_id +
//      gradelink_student_id so subsequent re-runs of the parents /
//      transcripts importers find them.
//
// Temp passwords are written to scripts/.gradelink-m365-credentials.json
// (gitignored). That file is what feeds into the welcome-email step
// later (#6, on hold per Ethan).
//
// Dry-run by default. Use --commit to actually provision.
// One student at a time, with a console line per result. If any
// provisioning call fails, we log and continue to the next student
// — partial success is better than rolling everyone back when only
// one had a Graph hiccup.

import { Client } from "pg"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  generateTempPassword,
  provisionStudentM365Account,
} from "@/lib/graph"

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const raw of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function parseArgs() {
  return { commit: process.argv.includes("--commit") }
}

// ============================================================================
// Graph helpers — inlined here so this script is self-contained.
// ============================================================================

async function getGraphToken(): Promise<string> {
  const clientId = process.env.GRAPH_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET
  const tenantId = process.env.GRAPH_TENANT_ID
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error("Missing GRAPH_CLIENT_ID/GRAPH_CLIENT_SECRET/GRAPH_TENANT_ID")
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  )
  if (!res.ok) throw new Error(`Token failed: ${res.status}`)
  const { access_token } = (await res.json()) as { access_token: string }
  return access_token
}

type DeletedUser = {
  id: string
  userPrincipalName: string
  displayName: string
}

/** Build every UPN variant a deleted account might have. Old HBA
 *  accounts pre-date the firstname.lastname.YY@ convention — many
 *  use firstname.lastnameYY@ (no second period) and some have no
 *  grad year at all (firstname.lastname@). We check ALL three when
 *  looking in the deleted bin. */
function upnCandidatesFor(canonical: string): string[] {
  const lower = canonical.toLowerCase()
  const m = lower.match(/^([a-z0-9]+)\.([a-z0-9]+)\.(\d{2})@(.+)$/)
  if (!m) return [lower]
  const [, first, last, yy, domain] = m
  return [
    lower, // first.last.YY@domain  (canonical)
    `${first}.${last}${yy}@${domain}`, // first.lastYY@domain (no 2nd period)
    `${first}.${last}@${domain}`, // first.last@domain (no grad year)
  ]
}

let cachedDeletedList: DeletedUser[] | null = null

async function loadDeletedList(token: string): Promise<DeletedUser[]> {
  if (cachedDeletedList) return cachedDeletedList
  const out: DeletedUser[] = []
  let url:
    | string
    | null =
    `https://graph.microsoft.com/v1.0/directory/deletedItems/microsoft.graph.user?$select=id,userPrincipalName,displayName&$top=999`
  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`deletedItems list failed: ${res.status} ${body}`)
    }
    const data = (await res.json()) as {
      value: DeletedUser[]
      "@odata.nextLink"?: string
    }
    out.push(...data.value)
    url = data["@odata.nextLink"] ?? null
  }
  cachedDeletedList = out
  return out
}

/** Look in /directory/deletedItems for a user whose UPN matches any of
 *  the canonical patterns. Returns the deleted item + the matched UPN
 *  variant so the caller knows whether a UPN rename is needed. */
async function findDeletedUserForCanonical(
  canonical: string,
  token: string
): Promise<{ user: DeletedUser; matched_upn: string } | null> {
  const candidates = new Set(upnCandidatesFor(canonical))
  const list = await loadDeletedList(token)
  for (const u of list) {
    const upn = (u.userPrincipalName ?? "").toLowerCase()
    if (candidates.has(upn)) {
      return { user: u, matched_upn: upn }
    }
  }
  return null
}

/** Rename a user's UPN + mailNickname to the canonical pattern. Used
 *  after restoring an old account with a non-canonical UPN like
 *  audrey.brennan28@ — we want it to become audrey.brennan.28@. */
async function renameUpn(
  userId: string,
  newUpn: string,
  token: string
): Promise<void> {
  const localPart = newUpn.split("@")[0] ?? newUpn
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        userPrincipalName: newUpn,
        mailNickname: localPart,
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`UPN rename failed: ${res.status} ${body}`)
  }
}

/** Restore a soft-deleted user. Returns the restored object. */
async function restoreDeletedUser(
  id: string,
  token: string
): Promise<{ id: string; userPrincipalName: string }> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/directory/deletedItems/${encodeURIComponent(id)}/restore`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`restore failed: ${res.status} ${body}`)
  }
  return (await res.json()) as { id: string; userPrincipalName: string }
}

/** Once a restored user is back, force a temp password + license check.
 *  We don't know the prior password and admins typically want a fresh
 *  one anyway so the family gets the same welcome-email flow.
 *
 *  Returns true on success, false on 403 (Graph app missing the
 *  `User-PasswordProfile.ReadWrite.All` application permission that
 *  changing an existing user's password requires — distinct from
 *  `User.ReadWrite.All` which is enough to CREATE a user with a
 *  password but not enough to RESET one afterwards). Other failures
 *  still throw. */
async function resetPasswordAndForceChange(
  userId: string,
  newPassword: string,
  token: string
): Promise<boolean> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        accountEnabled: true,
        passwordProfile: {
          password: newPassword,
          forceChangePasswordNextSignIn: true,
        },
      }),
    }
  )
  if (res.status === 403) return false
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`password reset failed: ${res.status} ${body}`)
  }
  return true
}

async function fetchUserEntraOid(
  upn: string,
  token: string
): Promise<string | null> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}?$select=id`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  )
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`user lookup failed: ${res.status} ${body}`)
  }
  const { id } = (await res.json()) as { id: string }
  return id
}

/** After a brand-new account creation, M365's directory takes a few
 *  seconds (sometimes up to ~30s) before /users/{upn} returns the
 *  new user. Poll with backoff so we don't drop the entra_oid + temp
 *  password we just generated. */
async function fetchUserEntraOidWithRetry(
  upn: string,
  token: string,
  maxAttempts = 8
): Promise<string | null> {
  let waitMs = 2000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const oid = await fetchUserEntraOid(upn, token)
    if (oid) return oid
    if (attempt === maxAttempts) return null
    await new Promise((r) => setTimeout(r, waitMs))
    waitMs = Math.min(waitMs * 1.5, 8000)
  }
  return null
}

// ============================================================================
// Per-student pipeline
// ============================================================================

type Pending = {
  gradelink_student_id: string
  gradelink_account_id: string
  full_name: string
  legal_first_name: string
  legal_last_name: string
  preferred_name: string | null
  grade_level: string
  birthdate: string | null
  desired_email: string
  grad_year: number
}

type CredentialRecord = {
  gradelink_student_id: string
  full_name: string
  upn: string
  entra_oid: string
  temp_password: string
  flow: "created" | "restored"
  provisioned_at: string
}

async function provisionOne(
  pending: Pending,
  token: string,
  pgClient: Client
): Promise<
  | CredentialRecord
  | { error: string; orphan_credential?: CredentialRecord }
> {
  const upn = pending.desired_email.toLowerCase()
  const displayName = `${pending.legal_first_name} ${pending.legal_last_name}`.trim()

  // 1) Already exists? Two sub-cases:
  //   - Idempotent re-run after a previous successful provision: the
  //     creds file already has this student, so the caller skipped it
  //     and we never get here.
  //   - "Phantom" account from a previous run where Graph created the
  //     user but the directory hadn't caught up in time so we lost
  //     the password. Reset to a new temp password and treat as a
  //     fresh provision.
  const existingOid = await fetchUserEntraOid(upn, token)
  if (existingOid) {
    const tempPassword = generateTempPassword()
    const reset = await resetPasswordAndForceChange(existingOid, tempPassword, token)
    return await persistSisRow(
      pgClient,
      pending,
      upn,
      existingOid,
      reset ? tempPassword : null,
      "created"
    )
  }

  // 2) Check the deleted bin — search ALL UPN variants the student
  // might have been deleted under (canonical, old no-period, old
  // no-year). If we find one, restore + rename to canonical + reset
  // password.
  const deletedMatch = await findDeletedUserForCanonical(upn, token)
  if (deletedMatch) {
    await restoreDeletedUser(deletedMatch.user.id, token)
    // If the deleted UPN wasn't the canonical pattern, rename it now.
    if (deletedMatch.matched_upn !== upn) {
      await renameUpn(deletedMatch.user.id, upn, token)
    }
    const tempPassword = generateTempPassword()
    await resetPasswordAndForceChange(deletedMatch.user.id, tempPassword, token)
    const oid = await fetchUserEntraOid(upn, token)
    if (!oid) {
      return { error: `restored ${deletedMatch.matched_upn} but couldn't fetch entra_oid after rename to ${upn}` }
    }
    return await persistSisRow(pgClient, pending, upn, oid, tempPassword, "restored")
  }

  // 3) Create fresh via the existing helper, then poll for the
  // directory to catch up before writing the SIS row.
  const result = await provisionStudentM365Account({ upn, displayName })
  const oid = await fetchUserEntraOidWithRetry(upn, token)
  if (!oid) {
    // Worst case: account exists in M365 with the temp password we
    // just generated, but Graph can't see it yet. Save the credential
    // anyway so we don't lose the password — next run picks up the
    // entra_oid and writes the SIS row.
    return {
      orphan_credential: {
        gradelink_student_id: pending.gradelink_student_id,
        full_name: pending.full_name,
        upn,
        entra_oid: "",
        temp_password: result.tempPassword ?? "(unknown)",
        flow: "created" as const,
        provisioned_at: new Date().toISOString(),
      },
      error: `created ${upn} but Graph directory hasn't caught up after 8 retries — temp password saved`,
    }
  }
  return await persistSisRow(
    pgClient,
    pending,
    upn,
    oid,
    result.tempPassword,
    "created"
  )
}

async function persistSisRow(
  client: Client,
  pending: Pending,
  upn: string,
  entraOid: string,
  tempPassword: string | null,
  flow: "created" | "restored"
): Promise<CredentialRecord> {
  // Find-or-create profile by email OR entra_oid. The M365 sync's
  // bug-fix from a few sessions back: prefer entra_oid lookup so a UPN
  // rename later won't break this.
  const { rows: existingByOid } = await client.query<{
    id: string
    email: string
  }>(`select id, email from profiles where entra_oid = $1`, [entraOid])
  let profileId: string

  if (existingByOid.length > 0) {
    profileId = existingByOid[0].id
    await client.query(
      `update profiles
          set roles = case
                        when 'student' = any(roles) then roles
                        else array_append(roles, 'student')
                      end,
              email = $2,
              gradelink_account_id = coalesce(gradelink_account_id, $3),
              first_name = coalesce(first_name, $4),
              last_name = coalesce(last_name, $5),
              display_name = coalesce(display_name, $6)
        where id = $1`,
      [
        profileId,
        upn,
        pending.gradelink_account_id,
        pending.legal_first_name,
        pending.legal_last_name,
        `${pending.legal_last_name}, ${pending.legal_first_name}`,
      ]
    )
  } else {
    const { rows: ins } = await client.query<{ id: string }>(
      `insert into profiles
         (email, entra_oid, first_name, last_name, display_name, roles,
          active, gradelink_account_id)
       values ($1, $2, $3, $4, $5, array['student']::text[], true, $6)
       on conflict (email) do update
         set entra_oid = excluded.entra_oid,
             gradelink_account_id = excluded.gradelink_account_id,
             roles = case
                       when 'student' = any(profiles.roles) then profiles.roles
                       else array_append(profiles.roles, 'student')
                     end
       returning id`,
      [
        upn,
        entraOid,
        pending.legal_first_name,
        pending.legal_last_name,
        `${pending.legal_last_name}, ${pending.legal_first_name}`,
        pending.gradelink_account_id,
      ]
    )
    profileId = ins[0].id
  }

  // Find-or-create students row keyed by gradelink_student_id.
  const { rows: existingStudent } = await client.query<{ id: string }>(
    `select id from students where gradelink_student_id = $1`,
    [pending.gradelink_student_id]
  )
  if (existingStudent.length === 0) {
    await client.query(
      `insert into students
         (profile_id, gradelink_student_id, legal_first_name,
          legal_last_name, preferred_name, dob, current_grade, status)
       values ($1, $2, $3, $4, $5, $6::date, $7, 'active')`,
      [
        profileId,
        pending.gradelink_student_id,
        pending.legal_first_name,
        pending.legal_last_name,
        pending.preferred_name,
        pending.birthdate,
        pending.grade_level || null,
      ]
    )
  }

  return {
    gradelink_student_id: pending.gradelink_student_id,
    full_name: pending.full_name,
    upn,
    entra_oid: entraOid,
    temp_password:
      tempPassword ??
      "(NEEDS MANUAL RESET — Graph app needs User-PasswordProfile.ReadWrite.All permission. Reset in Entra admin center, then paste the password into this field.)",
    flow,
    provisioned_at: new Date().toISOString(),
  }
}

// ============================================================================
// Credentials file
// ============================================================================

const CREDS_PATH = path.resolve(
  process.cwd(),
  "scripts",
  ".gradelink-m365-credentials.json"
)

function loadExistingCreds(): CredentialRecord[] {
  if (!existsSync(CREDS_PATH)) return []
  const data = JSON.parse(readFileSync(CREDS_PATH, "utf-8")) as {
    records?: CredentialRecord[]
  }
  return data.records ?? []
}

function saveCreds(records: CredentialRecord[]) {
  writeFileSync(
    CREDS_PATH,
    JSON.stringify(
      {
        _meta: {
          generated: new Date().toISOString(),
          source: "scripts/gradelink-provision-m365.ts",
          count: records.length,
          warning:
            "PII — gitignored. Use to send welcome emails with temp passwords. Delete after rotation.",
        },
        records,
      },
      null,
      2
    ),
    "utf-8"
  )
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  loadEnvLocal()
  const { commit } = parseArgs()

  const pendingPath = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-pending-m365.json"
  )
  if (!existsSync(pendingPath)) {
    console.error(
      `Missing ${pendingPath}. Run \`npm run gradelink:import-active\` first.`
    )
    process.exit(2)
  }
  const { pending } = JSON.parse(readFileSync(pendingPath, "utf-8")) as {
    pending: Pending[]
  }
  console.log(`[provision] Pending M365 accounts: ${pending.length}`)

  // Skip students already in the creds file (idempotent re-run).
  const existingCreds = loadExistingCreds()
  const alreadyProvisioned = new Set(
    existingCreds.map((c) => c.gradelink_student_id)
  )
  const todo = pending.filter(
    (p) => !alreadyProvisioned.has(p.gradelink_student_id)
  )
  console.log(`  already provisioned (from creds file): ${alreadyProvisioned.size}`)
  console.log(`  to do this run                       : ${todo.length}`)

  if (!commit) {
    console.log(`\nDry run — would attempt:`)
    for (const p of todo) {
      console.log(`  ${p.full_name.padEnd(35)} -> ${p.desired_email}`)
    }
    console.log(`\nRe-run with --commit to provision.`)
    return
  }

  if (todo.length === 0) {
    console.log(`Nothing to do. Done.`)
    return
  }

  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env.local")
    process.exit(2)
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const token = await getGraphToken()
  const newCreds: CredentialRecord[] = []
  let failures = 0

  try {
    for (const p of todo) {
      process.stdout.write(`  ${p.full_name.padEnd(35)} ${p.desired_email.padEnd(50)} ... `)
      try {
        const result = await provisionOne(p, token, client)
        if ("error" in result) {
          // Even on error, save any orphan credential (account created
          // in M365 but SIS write failed — we don't want to lose the
          // password).
          if ("orphan_credential" in result && result.orphan_credential) {
            newCreds.push(result.orphan_credential)
            console.log(
              `PARTIAL ${result.error} — credential saved for next-run claim`
            )
          } else {
            console.log(`FAIL ${result.error}`)
          }
          failures += 1
          continue
        }
        newCreds.push(result)
        console.log(`OK (${result.flow})`)
      } catch (err) {
        console.log(`FAIL ${err instanceof Error ? err.message : err}`)
        failures += 1
      }
    }
  } finally {
    await client.end()
  }

  const allCreds = [...existingCreds, ...newCreds]
  saveCreds(allCreds)
  console.log(`\nProvisioned ${newCreds.length} new accounts (${failures} failures).`)
  console.log(`Credentials saved to: ${path.relative(process.cwd(), CREDS_PATH)}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
