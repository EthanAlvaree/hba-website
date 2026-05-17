#!/usr/bin/env tsx
//
// scripts/gradelink-import-transfer-credit.ts
//
// Imports the NON-HBA half of TranscriptExport.csv as academic_history
// rows. These are courses students took at Torrey Pines, Cathedral
// Catholic, BYU, Afghanistan transcripts, APEX Learning, etc., that
// HBA accepted as transfer credit on the way to graduation.
//
// One row per Gradelink TranscriptID. Tracking column to keep re-runs
// idempotent: academic_history.gradelink_transcript_id (added inline
// when missing, see ensureTrackingColumn).
//
// Source classification:
//   - "summer" if TermTitle mentions "summer" (e.g. "Boston University
//     Summer 2023") — gets the dedicated summer source.
//   - "concurrent" if TermTitle mentions community college or BYU IS
//     style names (BYU Independent Study, MiraCosta, etc.).
//   - "transfer" for everything else (regular high schools, foreign
//     transcripts).
//
// Grade letter mapping (academic_history.grade_letter check rejects
// CR / INC / PLD / NM / NC / IP / W):
//   - Standard A..F+/- → kept as-is
//   - Everything else (CR, INC, PLD, NM, NC, IP, W) → null, with
//     counts_toward_gpa=false so the row still grants credit (when
//     UnitsEarned > 0) but doesn't enter the cumulative GPA.
//
// Dry-run by default; --commit to apply.

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

function isHbaTerm(title: string): boolean {
  const t = title.toLowerCase()
  return (
    t.startsWith("high bluff academy") ||
    (t.includes("san diego") && t.includes("int"))
  )
}

const VALID_LETTERS = new Set([
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
])

function normalizeGrade(raw: string): {
  grade_letter: string | null
  counts_toward_gpa: boolean
} {
  const trimmed = (raw ?? "").trim().toUpperCase()
  if (!trimmed) return { grade_letter: null, counts_toward_gpa: false }
  if (VALID_LETTERS.has(trimmed)) {
    return { grade_letter: trimmed, counts_toward_gpa: true }
  }
  // CR (credit) / P (pass) → credit only, no GPA contribution.
  return { grade_letter: null, counts_toward_gpa: false }
}

function classifySource(termTitle: string): "transfer" | "summer" | "concurrent" {
  const lower = termTitle.toLowerCase()
  if (
    lower.includes("byu independent") ||
    lower.includes("community college") ||
    lower.includes("miracosta") ||
    lower.includes("palomar college") ||
    lower.includes("cuyamaca") ||
    lower.includes("boston university") // BU summer terms are concurrent enrollment for HS students
  ) {
    return "concurrent"
  }
  if (lower.includes("summer")) return "summer"
  return "transfer"
}

/** "Torrey Pines HS Fall 20-21" → "Torrey Pines HS". */
function schoolNameFromTermTitle(title: string): string {
  // Strip trailing "Fall 20-21" / "Spring YY-YY" / "Q1" / "S1" / 4-digit year.
  return title
    .replace(/\s+(Fall|Spring|Summer|Winter)\s+\d{2,4}([-\s]\d{2,4})?\s*$/i, "")
    .replace(/\s+\d{2,4}-\d{2,4}\s+(Q|S)\d\s*$/, "")
    .replace(/\s+\d{4}-\d{4}\s*$/, "")
    .replace(/\s+\d{4}\s*$/, "")
    .replace(/\s+(Q|S)\d\s*$/, "")
    .trim() || title
}

/** "Torrey Pines HS Fall 20-21" → term_label "Fall 20-21". */
function termLabelFromTermTitle(title: string, school: string): string {
  const rest = title.slice(school.length).trim()
  return rest || title
}

function academicYearFromDates(start: string, end: string): string | null {
  // Use TermStart year as the start; assume single-year academic span.
  const sm = start.match(/^(\d{4})/)
  if (!sm) return null
  const startYear = parseInt(sm[1], 10)
  return `${startYear}-${startYear + 1}`
}

type Row = Record<string, string>

function readTransferRows(): Row[] {
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
  return all.filter((r) => !isHbaTerm(r.TermTitle ?? ""))
}

async function ensureTrackingColumn(client: Client) {
  await client.query(
    `alter table academic_history add column if not exists gradelink_transcript_id text`
  )
  await client.query(
    `create unique index if not exists academic_history_gradelink_transcript_uidx on academic_history(gradelink_transcript_id) where gradelink_transcript_id is not null`
  )
}

async function importAll(client: Client, rows: Row[]) {
  await ensureTrackingColumn(client)

  const { rows: studentRows } = await client.query<{
    id: string
    gradelink_student_id: string
  }>(
    `select id, gradelink_student_id from students where gradelink_student_id is not null`
  )
  const studentIdByGradelink = new Map<string, string>()
  for (const s of studentRows)
    studentIdByGradelink.set(s.gradelink_student_id, s.id)

  let inserted = 0
  let skippedExisting = 0
  let skippedNoStudent = 0
  for (const r of rows) {
    const transcriptId = (r.TranscriptID ?? "").trim()
    const studentId = studentIdByGradelink.get((r.StudentID ?? "").trim())
    if (!transcriptId) continue
    if (!studentId) {
      skippedNoStudent += 1
      continue
    }

    const termTitle = (r.TermTitle ?? "").trim()
    if (!termTitle) continue

    const school = schoolNameFromTermTitle(termTitle)
    const termLabel = termLabelFromTermTitle(termTitle, school)
    const academicYear = academicYearFromDates(
      r.TermStart ?? "",
      r.TermEnd ?? ""
    )
    const source = classifySource(termTitle)
    const grade = normalizeGrade(r.LetterGrade ?? "")
    const credits = parseFloat(r.UnitsEarned ?? r.ClassUnits ?? "0") || 0

    // Insert. ON CONFLICT against the unique idx so re-runs no-op.
    const res = await client.query(
      `insert into academic_history
         (student_id, title, school_name, academic_year, term_label,
          grade_letter, credits, source, counts_toward_gpa,
          gradelink_transcript_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (gradelink_transcript_id)
         where gradelink_transcript_id is not null
         do nothing`,
      [
        studentId,
        (r.ClassTitle ?? "").trim() || "(no title)",
        school,
        academicYear,
        termLabel,
        grade.grade_letter,
        credits,
        source,
        grade.counts_toward_gpa,
        transcriptId,
      ]
    )
    if ((res.rowCount ?? 0) > 0) inserted += 1
    else skippedExisting += 1
  }

  return { inserted, skippedExisting, skippedNoStudent }
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
  const rows = readTransferRows()
  console.log(`[transfer-credit] Non-HBA transcript rows: ${rows.length}`)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    if (!commit) {
      // Show source breakdown for the dry-run.
      const breakdown = { transfer: 0, summer: 0, concurrent: 0 }
      for (const r of rows) breakdown[classifySource(r.TermTitle ?? "")] += 1
      console.log(`  by source: ${JSON.stringify(breakdown)}`)
      console.log(`\nDry run only. Re-run with --commit to write.`)
      return
    }
    console.log(`\nApplying ...`)
    await client.query("begin")
    try {
      const r = await importAll(client, rows)
      await client.query("commit")
      console.log(`OK — committed.`)
      console.log(`  inserted          : ${r.inserted}`)
      console.log(`  already in DB     : ${r.skippedExisting}`)
      console.log(`  skipped no-student: ${r.skippedNoStudent}`)
    } catch (err) {
      await client.query("rollback")
      console.error("ROLLBACK:", err instanceof Error ? err.message : err)
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
