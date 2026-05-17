#!/usr/bin/env tsx
//
// scripts/gradelink-build-approvals.ts
//
// Takes:
//   - the matcher's candidate CSV (.gradelink-active-matches.csv)
//   - the manual decisions Ethan typed up after reviewing the report
// Produces:
//   - .gradelink-approvals.json — the canonical decision file the
//     importers read. One entry per Gradelink active student
//     ("link" / "create" / "skip"), plus auxiliary categorization of
//     unmatched current profiles (shared mailboxes, inactive
//     teachers, async-online students, etc.).
//
// The decisions live in this file (DECISIONS map below) so they're
// committed and reviewable in git. Bad email typos in the user's
// notes are corrected here against the DB spellings we verified
// (e.g. "chiqi.he.27" -> "chuqi.he.27").
//
// Re-run any time the matcher CSV regenerates. Idempotent.

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parse as parseCsv } from "csv-parse/sync"

// ----------------------------------------------------------------------------
// Manual decisions, keyed by the Gradelink student's last name + first name
// (the "FullName" column from the active roster). One entry per Gradelink
// student we need to override the matcher's top pick for.
//
// kind:
//   "link"   — link to an existing M365 profile (match_email required)
//   "create" — needs a new M365 account (desired_username may be set;
//              importer infers from FName/LName/grad_year otherwise)
//   "skip"   — test record, don't import
//
// Anything NOT in this map falls back to the matcher's Tier B/C/D
// top candidate (auto-applied).
// ----------------------------------------------------------------------------

type Decision =
  | { kind: "link"; match_email: string }
  | { kind: "create"; desired_username?: string }
  | { kind: "skip"; reason: string }

const DECISIONS: Record<string, Decision> = {
  // === Tier C / D corrections (matcher needed help) ===
  "Carr, Francine O. (Frankie)": {
    kind: "link",
    match_email: "francine.carr.27@highbluffacademy.com",
  },
  "Chen, Selina Y.": {
    kind: "link",
    match_email: "selina.chen.27@highbluffacademy.com",
  },
  "Durnin, Abriana (Abri)": {
    kind: "link",
    match_email: "abri.durnin.26@highbluffacademy.com",
  },
  "Fu, Xuanhao (Frank)": {
    kind: "link",
    match_email: "frank.fu.27@highbluffacademy.com",
  },
  "Gatta, Giulia (Jules)": {
    kind: "link",
    match_email: "giulia.gatta.27@highbluffacademy.com",
  },
  "Ginakes, Grigoria (Gigi)": {
    kind: "link",
    match_email: "grigoria.ginakes.26@highbluffacademy.com",
  },
  "Guo, Audrey": {
    kind: "link",
    match_email: "audrey.guo.28@highbluffacademy.com",
  },
  "Guo, Yitong (Jerry)": {
    kind: "link",
    match_email: "yitong.guo.26@highbluffacademy.com",
  },
  "He, Chuqi (Bill)": {
    kind: "link",
    match_email: "chuqi.he.27@highbluffacademy.com",
  },
  "Kieran, Camilla (Cami)": {
    kind: "link",
    match_email: "camilla.kieran.28@highbluffacademy.com",
  },
  "Kim, Sienna S. (Sera)": {
    kind: "link",
    match_email: "sein.kim.26@highbluffacademy.com",
  },
  "Lee, Hyunji (Erica)": {
    kind: "link",
    match_email: "erica.lee.28@highbluffacademy.com",
  },
  "Li, Suki": {
    kind: "link",
    match_email: "suki.li.27@highbluffacademy.com",
  },
  "Li, ZhaoLin (Jordan)": {
    kind: "link",
    match_email: "zhaolin.li.26@highbluffacademy.com",
  },
  "Lu, Tien Han (Kendrick)": {
    kind: "link",
    match_email: "kendrick.lu.26@highbluffacademy.com",
  },
  "Marron Vlassova, Sofia": {
    kind: "link",
    match_email: "sofia.marron.28@highbluffacademy.com",
  },
  "Reese, Emily D. (Milly)": {
    kind: "link",
    match_email: "millie.reese.28@highbluffacademy.com",
  },
  "Tang, Boxiang (Roy)": {
    kind: "link",
    match_email: "roy.tang.27@highbluffacademy.com",
  },
  "Wang, Hanyu (Grace)": {
    kind: "link",
    match_email: "hanyu.wang.29@highbluffacademy.com",
  },
  "Wang, Jinxi (Selina)": {
    kind: "link",
    match_email: "jinxi.wang.29@highbluffacademy.com",
  },
  "Wang, Xinglang (Frank)": {
    kind: "link",
    match_email: "xinglang.wang.27@highbluffacademy.com",
  },
  "Wu, Bolun (Chris)": {
    kind: "link",
    match_email: "bolun.wu.29@highbluffacademy.com",
  },
  "Wu, Jenny": {
    kind: "link",
    match_email: "jenny.wu.27@highbluffacademy.com",
  },
  "Wu, Jiayi (Joey)": {
    kind: "link",
    match_email: "joey.wu.27@highbluffacademy.com",
  },
  "Xuan, Yijia (Alan)": {
    kind: "link",
    match_email: "yijia.xuan.27@highbluffacademy.com",
  },
  "Yang, Sol": {
    kind: "link",
    match_email: "sol.yang.27@highbluffacademy.com",
  },
  "Yao, Yangyang (Nicky)": {
    kind: "link",
    match_email: "yangyang.yao.26@highbluffacademy.com",
  },
  "Yu, Junhao": {
    kind: "link",
    match_email: "junhao.yu.26@highbluffacademy.com",
  },
  "Zhang, Qianyi (Theodore)": {
    kind: "link",
    match_email: "qianyi.zhang.27@highbluffacademy.com",
  },
  "Zhang, Zixun (Milo)": {
    kind: "link",
    match_email: "milo.zhang.27@highbluffacademy.com",
  },

  // === Tier D / matcher false positives → actually need new account ===
  "Jiang, Haoliang": { kind: "create" },
  "Li, Amy": { kind: "create" },
  "Zhang, Shidi": { kind: "create" },

  // === Tier E confirmed (matcher said no match, user agreed) ===
  // These are all "needs new M365 account" per Ethan's review.
  "Brennan, Audrey J.": { kind: "create" },
  "Chan, Jasmine": { kind: "create" },
  "Cochran, Alexis L.": { kind: "create" },
  "Costabile, Elaina": { kind: "create" },
  "Dabade, Aashna": { kind: "create" },
  "DEVINE, DANIELLE": { kind: "create" },
  "Garibaldi, Robert": { kind: "create" },
  "Mannion, Keira J.": { kind: "create" },
  "Martinez Preciado, Jeronimo": { kind: "create" },
  "Megerdichian, Nora B.": { kind: "create" },
  "Nayki, Aaron B.": { kind: "create" },
  "Nguyen, Catherine": { kind: "create" },
  "Petrova-Smith, Mirabella C.": { kind: "create" },
  "Sargen, Ian": { kind: "create" },
  "Simkin, Brady": { kind: "create" },
  "Simkin, Finley": { kind: "create" },
  "Smith, Dakota M.": { kind: "create" },
  "Sweeney, Keira P.": { kind: "create" },
  "Tan, Rui": { kind: "create" },
  "Thomas, Naya": { kind: "create" },
  "Tian, Jiyu": { kind: "create" },
  "Xie, Sophie M.": { kind: "create" },
  "Yudenfreund, Scott A.": { kind: "create" },
  "Zhao, Karen PM, Esq.": { kind: "create" },

  // === Test records to skip entirely ===
  "HBA, Demo": { kind: "skip", reason: "test account in Gradelink" },
  "Kristen, Test": { kind: "skip", reason: "test account in Gradelink" },
}

// ----------------------------------------------------------------------------
// Classifications for the 61 unmatched SIS profiles. Drives the role +
// active-flag updates the importer applies after the matching pass.
// ----------------------------------------------------------------------------

const SHARED_MAILBOXES: string[] = [
  "accounting@highbluffacademy.com",
  "admin@highbluffacademy.com",
  "admissions@highbluffacademy.com",
  "info@highbluffacademy.com",
  "jill@highbluffacademy.com",
  "nhs@highbluffacademy.com",
  "noreply@highbluffacademy.com",
  "recruitment@highbluffacademy.com",
  "registrar@highbluffacademy.com",
]

type TeacherEntry = { email: string; name: string }

const ACTIVE_TEACHERS: TeacherEntry[] = [
  { email: "alan@highbluffacademy.com", name: "Alan Saltamachio" },
  { email: "dalbert@highbluffacademy.com", name: "Dalbert Marin" },
  { email: "daniel.byun@highbluffacademy.com", name: "Daniel Byun" },
  { email: "drwill@highbluffacademy.com", name: "Will Anderson" },
  { email: "ellen@highbluffacademy.com", name: "Ellen Sullivan" },
  { email: "ethan@highbluffacademy.com", name: "Ethan Alvarée" }, // also admin
  { email: "fran@highbluffacademy.com", name: "Fran Dickson" },
  { email: "george@highbluffacademy.com", name: "George Humphreys" },
  { email: "ishaan@highbluffacademy.com", name: "Ishaan Mishra" },
  { email: "judy@highbluffacademy.com", name: "Judy Beck" },
  { email: "kevin@highbluffacademy.com", name: "Kevin Hopp" },
  { email: "kristin@highbluffacademy.com", name: "Kristin O'Connor" },
  { email: "kristofer@highbluffacademy.com", name: "Kristofer Bunce" },
  { email: "kun@highbluffacademy.com", name: "Kun Xuan" },
  { email: "lindy@highbluffacademy.com", name: "Lindy Benson" },
  { email: "michael@highbluffacademy.com", name: "Michael Armstrong" },
  { email: "molly@highbluffacademy.com", name: "Molly Sun" }, // also admin
  { email: "najib.yousefi@highbluffacademy.com", name: "Najibullah Yousefi" },
  { email: "tricia@highbluffacademy.com", name: "Tricia Tigli" },
  { email: "wendy@highbluffacademy.com", name: "Wendy Xu" },
  { email: "zikrullah.habibi@highbluffacademy.com", name: "Zikrullah Habibi" },
]

const INACTIVE_TEACHERS: TeacherEntry[] = [
  { email: "alex@highbluffacademy.com", name: "Alex Yu" },
  { email: "andrew@highbluffacademy.com", name: "Andrew Collins" },
  { email: "katherine@highbluffacademy.com", name: "Katherine Blake" },
  { email: "kunx@highbluffacademy.com", name: "Kun Xuan (secondary account)" },
  { email: "nicolas@highbluffacademy.com", name: "Nicolas Duoto" },
  { email: "todd@highbluffacademy.com", name: "Todd Simmons" },
]

const INACTIVE_ALUMNI: TeacherEntry[] = [
  { email: "dante.carr.25@highbluffacademy.com", name: "Dante Carr (graduated 2025)" },
  { email: "julia.brumer.25@highbluffacademy.com", name: "Julia Brumer (graduated 2025)" },
]

// Students who have M365 accounts and are currently enrolled at HBA but
// don't appear on the Gradelink active roster — they take UC Scout /
// Acellus async online classes and their grades are entered into Gradelink
// only at course completion. We still want them as students in the SIS so
// they show up in the directory.
const EXTRA_ACTIVE_STUDENTS: string[] = [
  "adilyn.matthies.28@highbluffacademy.com",
  "charlotte.coates.29@highbluffacademy.com",
  "christian.cantero.26@highbluffacademy.com",
  "emily.cameron.28@highbluffacademy.com",
  "grant.bravo.26@highbluffacademy.com",
  "hongyu.chen.26@highbluffacademy.com",
  "isabela.baca.28@highbluffacademy.com",
  "jacob.babcock.29@highbluffacademy.com",
  "jacob.wang.29@highbluffacademy.com",
  "kash.kinney.27@highbluffacademy.com",
  "leila.ghassemkhani.29@highbluffacademy.com",
  "lejia.wang.28@highbluffacademy.com",
  "luke.mougin.28@highbluffacademy.com",
  "max.yang.27@highbluffacademy.com",
  "michael.aparin.27@highbluffacademy.com",
  "michael.wang.29@highbluffacademy.com",
  "oneill.white.27@highbluffacademy.com",
  "raymond.chui.28@highbluffacademy.com",
  "sienna.stclair.28@highbluffacademy.com",
  "sophia.ahmed.27@highbluffacademy.com",
  "sophia.li.28@highbluffacademy.com",
  "zihao.chen.26@highbluffacademy.com",
]

// ----------------------------------------------------------------------------
// Builder
// ----------------------------------------------------------------------------

type MatcherRow = {
  gradelink_student_id: string
  gradelink_account_id: string
  gradelink_full_name: string
  gradelink_fname: string
  gradelink_lname: string
  gradelink_grade: string
  gradelink_birthdate: string
  best_tier: string
  match_profile_id: string
  match_profile_email: string
  match_profile_roles: string
  match_profile_active: string
  match_reason: string
  n_candidates: string
  alternate_emails: string
}

type ApprovedActiveEntry = {
  gradelink_student_id: string
  gradelink_account_id: string
  full_name: string
  fname: string
  lname: string
  grade_level: string
  birthdate: string | null
  decision: "link" | "create" | "skip"
  match_email: string | null
  desired_username: string | null
  notes: string
  matcher_tier: string
}

function loadMatcherRows(): MatcherRow[] {
  const csvPath = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-active-matches.csv"
  )
  if (!existsSync(csvPath)) {
    throw new Error(
      `Missing ${csvPath}. Run \`npm run gradelink:match\` first.`
    )
  }
  return parseCsv(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as MatcherRow[]
}

function build(): {
  active_roster: ApprovedActiveEntry[]
  shared_mailboxes: string[]
  active_teachers: TeacherEntry[]
  inactive_teachers: TeacherEntry[]
  inactive_alumni: TeacherEntry[]
  extra_active_students: string[]
  warnings: string[]
} {
  const rows = loadMatcherRows()
  const warnings: string[] = []
  const usedDecisionKeys = new Set<string>()

  const entries: ApprovedActiveEntry[] = []
  for (const r of rows) {
    const override = DECISIONS[r.gradelink_full_name]
    if (override) usedDecisionKeys.add(r.gradelink_full_name)

    let decision: "link" | "create" | "skip"
    let matchEmail: string | null = null
    let desiredUsername: string | null = null
    let notes = ""

    if (override) {
      decision = override.kind
      if (override.kind === "link") matchEmail = override.match_email
      if (override.kind === "create" && "desired_username" in override) {
        desiredUsername = override.desired_username ?? null
      }
      if (override.kind === "skip") notes = override.reason
    } else {
      // No override — apply the matcher's top pick when it's high-
      // confidence (Tier B). Anything else gets flagged as needing a
      // decision.
      if (r.best_tier === "B_exact_name" && r.match_profile_email) {
        decision = "link"
        matchEmail = r.match_profile_email
      } else if (r.best_tier === "E_none") {
        decision = "create"
      } else {
        // C / D without an override — refuse to auto-apply, log loudly.
        decision = "create" // safest default: don't auto-link a sketchy match
        warnings.push(
          `No explicit decision for "${r.gradelink_full_name}" (matcher tier ${r.best_tier}). ` +
            `Defaulting to "create" — add an entry to DECISIONS if this is wrong.`
        )
      }
    }

    entries.push({
      gradelink_student_id: r.gradelink_student_id,
      gradelink_account_id: r.gradelink_account_id,
      full_name: r.gradelink_full_name,
      fname: r.gradelink_fname,
      lname: r.gradelink_lname,
      grade_level: r.gradelink_grade,
      birthdate: r.gradelink_birthdate || null,
      decision,
      match_email: matchEmail,
      desired_username: desiredUsername,
      notes,
      matcher_tier: r.best_tier,
    })
  }

  // Sanity check: every DECISIONS key must have matched a Gradelink row.
  // Typos here would silently drop overrides on the floor.
  for (const key of Object.keys(DECISIONS)) {
    if (!usedDecisionKeys.has(key)) {
      warnings.push(
        `DECISIONS entry "${key}" did not match any Gradelink active student. Check for typo.`
      )
    }
  }

  return {
    active_roster: entries,
    shared_mailboxes: SHARED_MAILBOXES,
    active_teachers: ACTIVE_TEACHERS,
    inactive_teachers: INACTIVE_TEACHERS,
    inactive_alumni: INACTIVE_ALUMNI,
    extra_active_students: EXTRA_ACTIVE_STUDENTS,
    warnings,
  }
}

function main() {
  const out = build()
  const outPath = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-approvals.json"
  )

  const summary = {
    _meta: {
      generated: new Date().toISOString(),
      source:
        "scripts/gradelink-build-approvals.ts (DECISIONS map + matcher CSV)",
    },
    active_roster: out.active_roster,
    shared_mailboxes: out.shared_mailboxes,
    active_teachers: out.active_teachers,
    inactive_teachers: out.inactive_teachers,
    inactive_alumni: out.inactive_alumni,
    extra_active_students: out.extra_active_students,
  }
  writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf-8")

  // Stdout summary so the human running this sees what got produced.
  const byDecision = { link: 0, create: 0, skip: 0 }
  for (const e of out.active_roster) byDecision[e.decision] += 1
  console.log("Gradelink active roster decisions:")
  console.log(`  link   : ${byDecision.link}`)
  console.log(`  create : ${byDecision.create}`)
  console.log(`  skip   : ${byDecision.skip}`)
  console.log(`Auxiliary:`)
  console.log(`  shared_mailboxes      : ${out.shared_mailboxes.length}`)
  console.log(`  active_teachers       : ${out.active_teachers.length}`)
  console.log(`  inactive_teachers     : ${out.inactive_teachers.length}`)
  console.log(`  inactive_alumni       : ${out.inactive_alumni.length}`)
  console.log(`  extra_active_students : ${out.extra_active_students.length}`)
  console.log(`Wrote: ${path.relative(process.cwd(), outPath)}`)

  if (out.warnings.length > 0) {
    console.log()
    console.log(`WARNINGS (${out.warnings.length}):`)
    for (const w of out.warnings) console.log(`  - ${w}`)
    process.exitCode = 1
  }
}

main()
