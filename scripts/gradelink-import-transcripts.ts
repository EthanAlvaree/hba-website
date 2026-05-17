#!/usr/bin/env tsx
//
// scripts/gradelink-import-transcripts.ts
//
// Imports the HBA-own slice of TranscriptExport.csv as live
// terms / courses / course_sections / enrollments + final grades.
//
// HBA rows are identified by TermTitle starting with "High Bluff
// Academy" or "San Diego Int'l Studies" (the school's pre-rename
// name). Everything else (Torrey Pines, BYU, Cathedral Catholic,
// Afghanistan transcripts, APEX, etc.) is left for the transfer-
// credit importer to write into academic_history.
//
// Dedup strategy:
//   - Terms: ONE per distinct TermTitle (collapse Gradelink's
//     multiple TermIDs for the same semester into a single SIS
//     term). Start/end dates use min/max across all rows. If
//     start==end (Gradelink-side garbage), end gets bumped one day.
//     "Winter" gets kind='fall' (winter break is end of fall
//     semester); the unique slug keeps it as its own term.
//   - Courses: ONE per distinct ClassTitle. active=false +
//     offered_pattern='manual' so the legacy catalogue doesn't
//     pollute the scheduler. code = "legacy-<slug>".
//   - Sections: ONE per Gradelink ClassID. Teacher matched against
//     profiles (first+last, case-insensitive) when present;
//     teacher_profile_id stays null when Gradelink had no teacher
//     OR no SIS profile matches.
//   - Enrollments: ONE per (student, ClassID). final_grade_letter
//     stored as-is (enrollments table accepts any letter). Bad
//     percentages (>150 or <0) get nulled. grade_locked=true since
//     these are historical/final.
//
// Idempotency: re-running the script first deletes everything
// previously imported by this script (recognizable via the
// 'gradelink_classid' tracking column we add on course_sections),
// then re-inserts from the CSV. This way mid-script failures don't
// leave us half-imported. Run with --commit to actually write.

import { Client } from "pg"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parse as parseCsv } from "csv-parse/sync"

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

// ----- helpers --------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

/** Stable per-section key. Gradelink's older terms use ClassID=0 as a
 *  "no class id" sentinel and ~1,800 HBA rows share it — collapsing
 *  those into one section drops ~348 real classes. Synthesize a key
 *  from (TermID, ClassTitle) when that happens. */
function sectionKeyFor(r: Record<string, string>): string {
  const raw = (r.ClassID ?? "").trim()
  if (raw && raw !== "0") return raw
  const termId = (r.TermID ?? "").trim()
  const classTitle = (r.ClassTitle ?? "").trim()
  if (!termId || !classTitle) return raw
  return `0-${termId}-${slugify(classTitle)}`
}

function isHbaTerm(title: string): boolean {
  const t = title.toLowerCase()
  return (
    t.startsWith("high bluff academy") ||
    (t.includes("san diego") && t.includes("int"))
  )
}

type TermKind = "fall" | "spring" | "summer"

function parseTerm(title: string): {
  kind: TermKind
  academic_year: string // "2025-2026"
  slug_suffix: string
  display_name: string
} | null {
  const lower = title.toLowerCase()

  // High Bluff Academy Fall 2018-2019
  let m = title.match(/Fall\s+(\d{4})-(\d{4})/i)
  if (m) {
    return {
      kind: "fall",
      academic_year: `${m[1]}-${m[2]}`,
      slug_suffix: `fall-${m[1]}-${m[2]}`,
      display_name: `Fall ${m[1]}-${m[2]}`,
    }
  }
  m = title.match(/Spring\s+(\d{4})-(\d{4})/i)
  if (m) {
    return {
      kind: "spring",
      academic_year: `${m[1]}-${m[2]}`,
      slug_suffix: `spring-${m[1]}-${m[2]}`,
      display_name: `Spring ${m[1]}-${m[2]}`,
    }
  }
  m = title.match(/Summer\s+(\d{4})/i)
  if (m) {
    const start = parseInt(m[1], 10)
    return {
      kind: "summer",
      academic_year: `${start - 1}-${start}`,
      slug_suffix: `summer-${m[1]}`,
      display_name: `Summer ${m[1]}`,
    }
  }
  // "High Bluff Academy Summer 25"
  m = title.match(/Summer\s+(\d{2})\b/)
  if (m) {
    const yy = parseInt(m[1], 10)
    const start = 2000 + yy
    return {
      kind: "summer",
      academic_year: `${start - 1}-${start}`,
      slug_suffix: `summer-${start}-short`,
      display_name: `Summer ${start}`,
    }
  }
  m = title.match(/Winter\s+(\d{4})/i)
  if (m) {
    // Winter break = tail end of fall semester.
    const fallStart = parseInt(m[1], 10)
    return {
      kind: "fall",
      academic_year: `${fallStart}-${fallStart + 1}`,
      slug_suffix: `winter-${m[1]}`,
      display_name: `Winter ${m[1]}`,
    }
  }
  // SDIS semesters/quarters
  m = title.match(/(\d{2})-(\d{2})\s+S(\d)/)
  if (m) {
    const ya = 2000 + parseInt(m[1], 10)
    const yb = 2000 + parseInt(m[2], 10)
    const semester = parseInt(m[3], 10)
    return {
      kind: semester === 1 ? "fall" : "spring",
      academic_year: `${ya}-${yb}`,
      slug_suffix: `sdis-${ya}-${yb}-s${semester}`,
      display_name: `SDIS ${ya}-${yb} S${semester}`,
    }
  }
  m = title.match(/(\d{2})-(\d{2})\s+Q(\d)/)
  if (m) {
    const ya = 2000 + parseInt(m[1], 10)
    const yb = 2000 + parseInt(m[2], 10)
    const q = parseInt(m[3], 10)
    return {
      kind: q <= 2 ? "fall" : "spring",
      academic_year: `${ya}-${yb}`,
      slug_suffix: `sdis-${ya}-${yb}-q${q}`,
      display_name: `SDIS ${ya}-${yb} Q${q}`,
    }
  }
  // fallback — best effort, derive a synthetic identifier.
  if (lower.startsWith("high bluff") || lower.startsWith("san diego")) {
    return {
      kind: "fall",
      academic_year: "unknown",
      slug_suffix: slugify(title),
      display_name: title,
    }
  }
  return null
}

function safeIsoDate(value: string): string | null {
  if (!value) return null
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return null
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function safePct(raw: string): number | null {
  if (!raw) return null
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return null
  if (n < 0 || n > 150) return null
  return n
}

// ----- main pipeline --------------------------------------------------------

type Row = Record<string, string>

type TermDraft = {
  title: string // original Gradelink TermTitle
  parsed: ReturnType<typeof parseTerm>
  start_date: string
  end_date: string
  grade_count: number
}

type CourseDraft = {
  class_title: string
  code: string
  credit_hours: number | null
  grade_count: number
}

type SectionDraft = {
  class_id: string
  class_title: string
  term_title: string
  teacher_fname: string | null
  teacher_lname: string | null
  grade_count: number
}

function readHbaRows(): Row[] {
  const csvPath = path.resolve(
    process.cwd(),
    "hba gradelink migration",
    "TranscriptExport.csv"
  )
  if (!existsSync(csvPath)) throw new Error(`Not found: ${csvPath}`)
  const all = parseCsv(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Row[]
  return all.filter((r) => isHbaTerm(r.TermTitle ?? ""))
}

function buildDrafts(rows: Row[]) {
  const termMap = new Map<string, TermDraft>()
  const courseMap = new Map<string, CourseDraft>()
  const sectionMap = new Map<string, SectionDraft>()

  for (const r of rows) {
    const termTitle = (r.TermTitle ?? "").trim()
    const classTitle = (r.ClassTitle ?? "").trim()
    const classId = sectionKeyFor(r)
    const start = safeIsoDate((r.TermStart ?? "").trim()) ?? ""
    const end = safeIsoDate((r.TermEnd ?? "").trim()) ?? ""
    if (!termTitle || !classTitle || !classId || !start || !end) continue

    // Terms — dedup by TermTitle, accumulate min/max dates.
    let term = termMap.get(termTitle)
    if (!term) {
      term = {
        title: termTitle,
        parsed: parseTerm(termTitle),
        start_date: start,
        end_date: end,
        grade_count: 0,
      }
      termMap.set(termTitle, term)
    } else {
      if (start < term.start_date) term.start_date = start
      if (end > term.end_date) term.end_date = end
    }
    term.grade_count += 1

    // Courses — dedup by ClassTitle.
    let course = courseMap.get(classTitle)
    if (!course) {
      course = {
        class_title: classTitle,
        code: `legacy-${slugify(classTitle)}`,
        credit_hours: parseFloat(r.ClassUnits ?? "1") || 1,
        grade_count: 0,
      }
      courseMap.set(classTitle, course)
    }
    course.grade_count += 1

    // Sections — one per ClassID.
    let section = sectionMap.get(classId)
    if (!section) {
      section = {
        class_id: classId,
        class_title: classTitle,
        term_title: termTitle,
        teacher_fname: (r.TFname ?? "").trim() || null,
        teacher_lname: (r.TLname ?? "").trim() || null,
        grade_count: 0,
      }
      sectionMap.set(classId, section)
    }
    section.grade_count += 1
  }

  return { termMap, courseMap, sectionMap }
}

async function ensureTrackingColumn(client: Client) {
  // gradelink_classid lives on course_sections so we can find + delete
  // previously-imported legacy sections cleanly on re-runs. Migration-
  // style addition inside the script keeps the import self-contained.
  await client.query(
    `alter table course_sections add column if not exists gradelink_classid text`
  )
  await client.query(
    `create unique index if not exists course_sections_gradelink_classid_uidx on course_sections(gradelink_classid) where gradelink_classid is not null`
  )
}

async function cleanupPriorImport(client: Client) {
  // Remove enrollments + sections from prior runs of this script (recognizable
  // via course_sections.gradelink_classid). Terms + courses live longer; we
  // leave them and just upsert.
  const { rowCount: enrollCount } = await client.query(`
    delete from enrollments
     where section_id in (
       select id from course_sections where gradelink_classid is not null
     )
  `)
  const { rowCount: sectionCount } = await client.query(
    `delete from course_sections where gradelink_classid is not null`
  )
  console.log(
    `  cleanup: removed ${enrollCount ?? 0} prior enrollments + ${sectionCount ?? 0} prior sections`
  )
}

type ProfileByName = { id: string; first_name: string; last_name: string }

async function loadTeacherCandidates(client: Client): Promise<ProfileByName[]> {
  // Anyone who's ever been faculty OR currently active — covers cases
  // where an old teacher is now inactive but still needs section
  // attribution.
  const { rows } = await client.query<ProfileByName>(
    `select id,
            coalesce(first_name, '') as first_name,
            coalesce(last_name, '')  as last_name
       from profiles
      where 'faculty' = any(roles) or active`
  )
  return rows
}

function findTeacher(
  fname: string | null,
  lname: string | null,
  candidates: ProfileByName[]
): string | null {
  if (!fname || !lname) return null
  const fl = fname.trim().toLowerCase()
  const ll = lname.trim().toLowerCase()
  const matches = candidates.filter(
    (c) =>
      c.first_name.toLowerCase() === fl && c.last_name.toLowerCase() === ll
  )
  if (matches.length === 1) return matches[0].id
  // Multiple matches (e.g., two profiles for the same teacher across
  // years) — pick deterministically by lowest id so re-runs are stable.
  if (matches.length > 1) {
    return matches.sort((a, b) => (a.id < b.id ? -1 : 1))[0].id
  }
  return null
}

async function importAll(
  client: Client,
  rows: Row[],
  drafts: ReturnType<typeof buildDrafts>
) {
  const { termMap, courseMap, sectionMap } = drafts

  await ensureTrackingColumn(client)
  await cleanupPriorImport(client)

  // ---- Terms -------------------------------------------------------------
  const termIdByTitle = new Map<string, string>()
  let termsInserted = 0
  let termsExisting = 0
  for (const term of termMap.values()) {
    const parsed = term.parsed
    if (!parsed) {
      console.log(`  skipping unparseable term: ${term.title}`)
      continue
    }
    let startDate = term.start_date
    let endDate = term.end_date
    if (startDate >= endDate) {
      endDate = addDays(startDate, 1)
    }
    const slug = parsed.slug_suffix
    // Upsert on slug.
    const { rows: existing } = await client.query<{ id: string }>(
      `select id from terms where slug = $1`,
      [slug]
    )
    if (existing.length > 0) {
      termIdByTitle.set(term.title, existing[0].id)
      termsExisting += 1
      continue
    }
    const { rows: ins } = await client.query<{ id: string }>(
      `insert into terms
         (name, slug, kind, academic_year, start_date, end_date,
          is_current, is_grades_locked)
       values ($1, $2, $3, $4, $5::date, $6::date, false, true)
       returning id`,
      [
        `${parsed.display_name}`,
        slug,
        parsed.kind,
        parsed.academic_year,
        startDate,
        endDate,
      ]
    )
    termIdByTitle.set(term.title, ins[0].id)
    termsInserted += 1
  }
  console.log(`  terms : +${termsInserted} new, ${termsExisting} existing`)

  // ---- Courses -----------------------------------------------------------
  const courseIdByTitle = new Map<string, string>()
  let coursesInserted = 0
  let coursesExisting = 0
  for (const course of courseMap.values()) {
    const { rows: existing } = await client.query<{ id: string }>(
      `select id from courses where code = $1`,
      [course.code]
    )
    if (existing.length > 0) {
      courseIdByTitle.set(course.class_title, existing[0].id)
      coursesExisting += 1
      continue
    }
    const { rows: ins } = await client.query<{ id: string }>(
      `insert into courses
         (code, name, credit_hours, active, offered_pattern)
       values ($1, $2, $3, false, 'manual')
       returning id`,
      [course.code, course.class_title, course.credit_hours ?? 1]
    )
    courseIdByTitle.set(course.class_title, ins[0].id)
    coursesInserted += 1
  }
  console.log(`  courses : +${coursesInserted} new, ${coursesExisting} existing`)

  // ---- Sections ----------------------------------------------------------
  const teachers = await loadTeacherCandidates(client)
  const sectionIdByClassId = new Map<string, string>()
  let sectionsInserted = 0
  let sectionsSkipped = 0
  let teacherMatched = 0
  let teacherUnmatched = 0
  for (const section of sectionMap.values()) {
    const courseId = courseIdByTitle.get(section.class_title)
    const termId = termIdByTitle.get(section.term_title)
    if (!courseId || !termId) {
      sectionsSkipped += 1
      continue
    }
    const teacherId = findTeacher(
      section.teacher_fname,
      section.teacher_lname,
      teachers
    )
    if (section.teacher_fname && section.teacher_lname) {
      if (teacherId) teacherMatched += 1
      else teacherUnmatched += 1
    }
    const { rows: ins } = await client.query<{ id: string }>(
      `insert into course_sections
         (course_id, term_id, teacher_profile_id, section_code,
          modality, gradelink_classid)
       values ($1, $2, $3, $4, 'in_person', $5)
       returning id`,
      [
        courseId,
        termId,
        teacherId,
        `legacy-${section.class_id}`,
        section.class_id,
      ]
    )
    sectionIdByClassId.set(section.class_id, ins[0].id)
    sectionsInserted += 1
  }
  console.log(
    `  sections : +${sectionsInserted} new, ${sectionsSkipped} skipped (missing course/term)`
  )
  console.log(
    `  teachers : ${teacherMatched} matched, ${teacherUnmatched} unmatched (kept as null)`
  )

  // ---- Enrollments --------------------------------------------------------
  // Need student_id by gradelink_student_id.
  const { rows: studentRows } = await client.query<{
    id: string
    gradelink_student_id: string
  }>(
    `select id, gradelink_student_id from students where gradelink_student_id is not null`
  )
  const studentIdByGradelink = new Map<string, string>()
  for (const s of studentRows)
    studentIdByGradelink.set(s.gradelink_student_id, s.id)

  let enrolled = 0
  let enrolledSkipNoStudent = 0
  let enrolledSkipNoSection = 0
  let enrolledSkipDupe = 0

  // Track (student_id, section_id) to skip the (rare) dupe rows.
  const seenPair = new Set<string>()

  for (const r of rows) {
    const studentId = studentIdByGradelink.get((r.StudentID ?? "").trim())
    if (!studentId) {
      enrolledSkipNoStudent += 1
      continue
    }
    const sectionId = sectionIdByClassId.get(sectionKeyFor(r))
    if (!sectionId) {
      enrolledSkipNoSection += 1
      continue
    }
    const dupKey = `${studentId}|${sectionId}`
    if (seenPair.has(dupKey)) {
      enrolledSkipDupe += 1
      continue
    }
    seenPair.add(dupKey)

    const letter = (r.LetterGrade ?? "").trim() || null
    const pct = safePct((r.PercentageGrade ?? "").trim())

    await client.query(
      `insert into enrollments
         (student_id, section_id, status, final_grade_percentage,
          final_grade_letter, grade_locked)
       values ($1, $2, 'completed', $3, $4, true)`,
      [studentId, sectionId, pct, letter]
    )
    enrolled += 1
  }
  console.log(
    `  enrollments : +${enrolled} new, skipped ${enrolledSkipNoStudent} no-student, ${enrolledSkipNoSection} no-section, ${enrolledSkipDupe} dupe`
  )
}

async function main() {
  loadEnvLocal()
  const { commit } = parseArgs()
  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env.local")
    process.exit(2)
  }
  const rows = readHbaRows()
  console.log(`[transcripts] Filtered HBA-only rows: ${rows.length}`)
  const drafts = buildDrafts(rows)
  console.log(
    `  distinct terms: ${drafts.termMap.size}, courses: ${drafts.courseMap.size}, sections: ${drafts.sectionMap.size}`
  )

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    if (!commit) {
      console.log(`\nDry run only. Re-run with --commit to write.`)
      return
    }
    console.log(`\nApplying ...`)
    await client.query("begin")
    try {
      await importAll(client, rows, drafts)
      await client.query("commit")
      console.log(`OK — committed.`)
    } catch (err) {
      await client.query("rollback")
      console.error(
        "ROLLBACK:",
        err instanceof Error ? err.message : err
      )
      process.exitCode = 1
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
