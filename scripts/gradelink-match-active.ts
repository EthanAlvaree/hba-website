#!/usr/bin/env tsx
//
// scripts/gradelink-match-active.ts
//
// Pre-flight match report. Reads the Gradelink active roster CSV +
// every current SIS profile, and proposes a 1:1 mapping per Gradelink
// student so Ethan can review BEFORE any DB write happens.
//
// Match tiers (highest to lowest confidence):
//   A. birthdate + last name      — gold standard, but only works when
//                                   the profile is already linked to a
//                                   students row with dob (rare today
//                                   since M365 sync just creates
//                                   profiles).
//   B. exact normalized full name — strip accents/punct/case, compare
//                                   "first last". Includes parenthetical
//                                   nicknames as alternate first names.
//   C. last name + any first-name token match — surface ALL candidates
//                                   for human review.
//   D. last name only             — last resort, ambiguous.
//   E. no match                   — needs a new M365 account.
//
// Reverse pass: every profile not matched to any Gradelink active
// student is listed separately. These are staff, stale alumni, or
// active students whose Gradelink record we missed.
//
// Outputs:
//   scripts/.gradelink-active-matches.md    — human-readable report
//   scripts/.gradelink-active-matches.csv   — same data for editing
//
// Read-only. No DB writes. Run from repo root:
//   npm run gradelink:match -- --school=hba
// (defaults to .env.local / DATABASE_URL when --school is omitted)

import { Client } from "pg"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parse as parseCsv } from "csv-parse/sync"

// ============================================================================
// .env loader (same shape as scripts/db-sql.ts)
// ============================================================================

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
  const argv = process.argv.slice(2)
  const school =
    argv
      .find((a) => a.startsWith("--school="))
      ?.slice("--school=".length) ?? null
  return { school }
}

// ============================================================================
// Normalization helpers — used to make name comparisons robust against
// accents, punctuation, parenthetical nicknames, and case.
// ============================================================================

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function normalizeName(s: string): string {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Parse a Gradelink Fname like "Xuanhao (Frank)" into ["xuanhao", "frank"]. */
function firstNameTokens(rawFname: string): string[] {
  const tokens: string[] = []
  // Pull anything inside parens as an alternate.
  for (const m of rawFname.matchAll(/\(([^)]+)\)/g)) {
    tokens.push(normalizeName(m[1]))
  }
  // Strip parens and split.
  const main = rawFname.replace(/\([^)]*\)/g, " ")
  for (const t of normalizeName(main).split(/\s+/)) {
    if (t) tokens.push(t)
  }
  return Array.from(new Set(tokens.filter(Boolean)))
}

/** Parse a Gradelink Lname (usually just one token) into normalized form. */
function lastNameKey(rawLname: string): string {
  // Drop hyphenation differences and parenthetical notes.
  return normalizeName(rawLname.replace(/\([^)]*\)/g, " ")).replace(
    /\s+/g,
    " "
  )
}

/** Try to derive (first, last) from a display_name like "First Last" or
 *  "Last, First". Returns nulls when the shape isn't recognizable. */
function namePartsFromDisplay(display: string): {
  first: string | null
  last: string | null
} {
  const cleaned = display.trim()
  if (!cleaned) return { first: null, last: null }
  if (cleaned.includes(",")) {
    const [last, rest] = cleaned.split(",", 2)
    const firstToken = (rest ?? "").trim().split(/\s+/)[0] ?? null
    return { first: firstToken, last: last.trim() }
  }
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts[parts.length - 1] }
}

// ============================================================================
// Row types
// ============================================================================

type GradelinkRow = {
  student_id: string
  account_id: string
  family_id: string
  full_name: string
  fname: string
  mname: string
  lname: string
  preferred_name: string | null // pulled from FullName parens, e.g. "Abri"
  grade_level: string // numeric portion of GradeLevX
  grade_level_raw: string
  birthdate: string | null // YYYY-MM-DD or null
  sex: string | null
  school_email: string | null
}

type ProfileRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  roles: string[]
  active: boolean
  entra_oid: string | null
  // Derived from students join, if any:
  student_id: string | null
  student_dob: string | null // YYYY-MM-DD
  student_legal_first: string | null
  student_legal_last: string | null
  student_preferred: string | null
}

type MatchTier = "A_birthdate" | "B_exact_name" | "C_token" | "D_lastname" | "E_none"

type MatchCandidate = {
  profile: ProfileRow
  tier: MatchTier
  reason: string
}

// ============================================================================
// Read & normalize Gradelink active roster
// ============================================================================

function parseGradelinkBirthdate(raw: string): string | null {
  if (!raw) return null
  // Gradelink dates look like MM/DD/YYYY.
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, mm, dd, yyyy] = m
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
}

function readActiveRoster(): GradelinkRow[] {
  const csvPath = path.resolve(
    process.cwd(),
    "hba gradelink migration",
    "StudentRosterActive.csv"
  )
  if (!existsSync(csvPath)) {
    throw new Error(`Not found: ${csvPath}`)
  }
  const raw = readFileSync(csvPath, "utf-8")
  const rows = parseCsv(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, string>[]

  const out: GradelinkRow[] = []
  for (const r of rows) {
    const fullName = (r.FullName ?? "").trim()
    // Skip the "(DELETE)" / "(DO NOT USE)" markers per user decision.
    if (/\((delete|do not use)\)/i.test(fullName)) continue

    const gradeRaw = (r.GradeLevX ?? "").trim()
    const gradeNumeric = gradeRaw.split("-", 1)[0]?.trim() ?? ""

    // Pull preferred-name out of FullName's parens. Examples:
    //   "Durnin, Abriana (Abri)"      -> "Abri"
    //   "Lu, Tien Han (Kendrick)"     -> "Kendrick"
    //   "Anderton, Noah R."           -> null
    // We ignore (DELETE)/(DO NOT USE) above so the only remaining
    // parens content is a preferred name.
    let preferred: string | null = null
    const parenMatch = fullName.match(/\(([^)]+)\)/)
    if (parenMatch && parenMatch[1].trim()) {
      preferred = parenMatch[1].trim()
    }

    out.push({
      student_id: (r.StudentID ?? "").trim(),
      account_id: (r.AccountId ?? "").trim(),
      family_id: (r.FamilyID ?? "").trim(),
      full_name: fullName,
      fname: (r.FName ?? "").trim(),
      mname: (r.MName ?? "").trim(),
      lname: (r.LName ?? "").trim(),
      preferred_name: preferred,
      grade_level: gradeNumeric,
      grade_level_raw: gradeRaw,
      birthdate: parseGradelinkBirthdate((r.Birthdate ?? "").trim()),
      sex: (r.Sex ?? "").trim() || null,
      school_email: (r.SchoolEmail ?? "").trim().toLowerCase() || null,
    })
  }
  return out
}

// ============================================================================
// Pull every profile (+ optional students join) from the DB
// ============================================================================

async function readProfiles(client: Client): Promise<ProfileRow[]> {
  // Left-join students so we get dob when it exists. The `from students`
  // alias `s` mirrors the SIS naming used elsewhere in the codebase.
  const sql = `
    select
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      p.display_name,
      p.roles,
      p.active,
      p.entra_oid,
      s.id as student_id,
      to_char(s.dob, 'YYYY-MM-DD') as student_dob,
      s.legal_first_name as student_legal_first,
      s.legal_last_name  as student_legal_last,
      s.preferred_name   as student_preferred
    from profiles p
    left join students s on s.profile_id = p.id
    order by p.email
  `
  const { rows } = await client.query<ProfileRow>(sql)
  return rows
}

// ============================================================================
// Matching
// ============================================================================

function bestMatchesFor(
  g: GradelinkRow,
  profiles: ProfileRow[]
): MatchCandidate[] {
  // Combine FName tokens (legal first name, possibly multi-token like
  // "Tien Han") with the parenthetical preferred name ("Kendrick").
  // Both can match against the profile.
  const glFirstTokens = firstNameTokens(g.fname)
  if (g.preferred_name) {
    for (const t of firstNameTokens(g.preferred_name)) {
      if (!glFirstTokens.includes(t)) glFirstTokens.push(t)
    }
  }
  const glLast = lastNameKey(g.lname)

  const candidates: MatchCandidate[] = []

  for (const p of profiles) {
    // Derive comparable name parts from whatever the profile has.
    const profLast =
      normalizeName(p.student_legal_last ?? p.last_name ?? "") ||
      lastNameKey(namePartsFromDisplay(p.display_name ?? "").last ?? "")
    if (!profLast) continue

    const profFirstRaw =
      p.student_legal_first ??
      p.first_name ??
      namePartsFromDisplay(p.display_name ?? "").first ??
      ""
    const profFirsts = firstNameTokens(profFirstRaw)
    if (p.student_preferred) profFirsts.push(normalizeName(p.student_preferred))

    // Tier A: dob + last name (only when students.dob exists).
    if (g.birthdate && p.student_dob && p.student_dob === g.birthdate) {
      if (profLast === glLast) {
        candidates.push({
          profile: p,
          tier: "A_birthdate",
          reason: `dob=${g.birthdate}, last="${glLast}"`,
        })
        continue
      }
    }

    // Tier B: exact normalized full name.
    if (profLast === glLast) {
      const sharedFirst = profFirsts.find((pf) => glFirstTokens.includes(pf))
      if (sharedFirst) {
        const tier: MatchTier =
          profFirsts.length === 1 && glFirstTokens.length === 1
            ? "B_exact_name"
            : "C_token"
        candidates.push({
          profile: p,
          tier,
          reason: `last="${glLast}", first token "${sharedFirst}" matches`,
        })
        continue
      }
      // Tier D: last name alone.
      candidates.push({
        profile: p,
        tier: "D_lastname",
        reason: `last="${glLast}", first names differ (gl=${glFirstTokens.join(
          "/"
        )} vs prof=${profFirsts.join("/")})`,
      })
    }
  }

  // Sort by tier strength so the first candidate is the strongest.
  const tierOrder: Record<MatchTier, number> = {
    A_birthdate: 0,
    B_exact_name: 1,
    C_token: 2,
    D_lastname: 3,
    E_none: 4,
  }
  candidates.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
  return candidates
}

// ============================================================================
// Report writers
// ============================================================================

function tierLabel(t: MatchTier): string {
  switch (t) {
    case "A_birthdate":
      return "A · dob+last  (high)"
    case "B_exact_name":
      return "B · exact name (high)"
    case "C_token":
      return "C · token match (review)"
    case "D_lastname":
      return "D · last name only (low)"
    case "E_none":
      return "E · no match (needs new account)"
  }
}

function rolesOrEmpty(p: ProfileRow): string {
  if (!p.roles || p.roles.length === 0) return "(no roles)"
  return p.roles.join(",")
}

function writeMarkdown(
  matches: { g: GradelinkRow; candidates: MatchCandidate[] }[],
  unmatchedProfiles: ProfileRow[],
  outPath: string
) {
  const lines: string[] = []
  lines.push(`# Gradelink active-roster match report\n`)
  lines.push(`Generated: ${new Date().toISOString()}\n`)
  lines.push(
    `Gradelink active students: ${matches.length}  •  unmatched current profiles: ${unmatchedProfiles.length}\n`
  )

  const byTier = new Map<MatchTier, number>()
  for (const m of matches) {
    const tier: MatchTier =
      m.candidates.length === 0 ? "E_none" : m.candidates[0].tier
    byTier.set(tier, (byTier.get(tier) ?? 0) + 1)
  }
  lines.push(`\n## Summary\n`)
  for (const tier of [
    "A_birthdate",
    "B_exact_name",
    "C_token",
    "D_lastname",
    "E_none",
  ] as MatchTier[]) {
    lines.push(`- ${tierLabel(tier)}: **${byTier.get(tier) ?? 0}**`)
  }

  lines.push(`\n## Gradelink students → SIS profile match\n`)
  for (const { g, candidates } of matches) {
    const top = candidates[0]
    const topTier: MatchTier = top?.tier ?? "E_none"
    lines.push(
      `### ${g.full_name}  ·  grade ${g.grade_level_raw}  ·  dob ${g.birthdate ?? "—"}`
    )
    lines.push(
      `- Gradelink StudentID **${g.student_id}**, AccountId **${g.account_id}**`
    )
    lines.push(`- Best tier: **${tierLabel(topTier)}**`)
    if (candidates.length === 0) {
      lines.push(`- No SIS profile candidates. Needs new M365 account.`)
    } else {
      lines.push(`- Candidates (${candidates.length}):`)
      for (const c of candidates.slice(0, 4)) {
        lines.push(
          `  - \`${c.profile.email}\` · ${rolesOrEmpty(c.profile)} · active=${c.profile.active} · ${tierLabel(c.tier)} · ${c.reason}`
        )
      }
      if (candidates.length > 4) {
        lines.push(`  - …and ${candidates.length - 4} more`)
      }
    }
    lines.push("")
  }

  lines.push(`\n## SIS profiles not matched to any active Gradelink student\n`)
  lines.push(
    `These are: staff/faculty/admin profiles (expected), stale alumni who weren't deactivated, OR currently-active students whose Gradelink record we missed.\n`
  )
  lines.push(`| Email | Roles | Active | Display |`)
  lines.push(`|---|---|---|---|`)
  for (const p of unmatchedProfiles) {
    lines.push(
      `| \`${p.email}\` | ${rolesOrEmpty(p)} | ${p.active} | ${p.display_name ?? ""} |`
    )
  }

  writeFileSync(outPath, lines.join("\n"), "utf-8")
}

function writeCsv(
  matches: { g: GradelinkRow; candidates: MatchCandidate[] }[],
  outPath: string
) {
  const headers = [
    "gradelink_student_id",
    "gradelink_account_id",
    "gradelink_full_name",
    "gradelink_fname",
    "gradelink_lname",
    "gradelink_grade",
    "gradelink_birthdate",
    "best_tier",
    "match_profile_id",
    "match_profile_email",
    "match_profile_roles",
    "match_profile_active",
    "match_reason",
    "n_candidates",
    "alternate_emails",
  ]
  const rows: string[] = [headers.join(",")]

  for (const { g, candidates } of matches) {
    const top = candidates[0] ?? null
    const alts = candidates.slice(1, 5).map((c) => c.profile.email).join("|")
    const cols = [
      g.student_id,
      g.account_id,
      g.full_name,
      g.fname,
      g.lname,
      g.grade_level,
      g.birthdate ?? "",
      top?.tier ?? "E_none",
      top?.profile.id ?? "",
      top?.profile.email ?? "",
      top ? rolesOrEmpty(top.profile) : "",
      top ? String(top.profile.active) : "",
      top?.reason ?? "",
      String(candidates.length),
      alts,
    ].map((v) => {
      const s = String(v).replace(/"/g, '""')
      return /[",\n]/.test(s) ? `"${s}"` : s
    })
    rows.push(cols.join(","))
  }
  writeFileSync(outPath, rows.join("\n"), "utf-8")
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  loadEnvLocal()
  const { school } = parseArgs()

  if (school) {
    const prefix = school.toUpperCase()
    const url = process.env[`${prefix}_DATABASE_URL`]
    if (url) process.env.DATABASE_URL = url
  }

  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error(
      "Missing DATABASE_URL. Add it to .env.local (or pass --school=<key>)."
    )
    process.exit(2)
  }

  const gradelinkRows = readActiveRoster()
  console.log(`[match] Gradelink active roster: ${gradelinkRows.length} rows`)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  let profiles: ProfileRow[]
  try {
    profiles = await readProfiles(client)
  } finally {
    await client.end()
  }
  console.log(`[match] Current SIS profiles: ${profiles.length}`)

  const matches = gradelinkRows.map((g) => ({
    g,
    candidates: bestMatchesFor(g, profiles),
  }))

  // Reverse pass: which profiles weren't matched to anyone?
  const matchedProfileIds = new Set<string>()
  for (const { candidates } of matches) {
    const top = candidates[0]
    if (top) matchedProfileIds.add(top.profile.id)
  }
  const unmatchedProfiles = profiles
    .filter((p) => !matchedProfileIds.has(p.id))
    .sort((a, b) => a.email.localeCompare(b.email))

  const mdOut = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-active-matches.md"
  )
  const csvOut = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-active-matches.csv"
  )
  writeMarkdown(matches, unmatchedProfiles, mdOut)
  writeCsv(matches, csvOut)

  // Tier summary on stdout for quick scan.
  const tierCounts = new Map<MatchTier, number>()
  for (const m of matches) {
    const tier: MatchTier =
      m.candidates.length === 0 ? "E_none" : m.candidates[0].tier
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1)
  }
  console.log(`[match] Tier breakdown:`)
  for (const tier of [
    "A_birthdate",
    "B_exact_name",
    "C_token",
    "D_lastname",
    "E_none",
  ] as MatchTier[]) {
    console.log(`  ${tierLabel(tier)}: ${tierCounts.get(tier) ?? 0}`)
  }
  console.log(`[match] Unmatched current profiles: ${unmatchedProfiles.length}`)
  console.log(`[match] Wrote:`)
  console.log(`  ${path.relative(process.cwd(), mdOut)}`)
  console.log(`  ${path.relative(process.cwd(), csvOut)}`)
}

main().catch((err) => {
  console.error(
    "[match] failed:",
    err instanceof Error ? err.stack ?? err.message : err
  )
  process.exit(1)
})
