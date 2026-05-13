"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  bulkCreateStudents,
  bulkStudentRowSchema,
  type BulkStudentOutcome,
  type BulkStudentRow,
} from "@/lib/sis"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
}

const headerAliases: Record<string, keyof BulkStudentRow> = {
  hba_email: "hba_email",
  "hba email": "hba_email",
  email: "hba_email",
  legal_first_name: "legal_first_name",
  "legal first name": "legal_first_name",
  first_name: "legal_first_name",
  first: "legal_first_name",
  legal_last_name: "legal_last_name",
  "legal last name": "legal_last_name",
  last_name: "legal_last_name",
  last: "legal_last_name",
  preferred_name: "preferred_name",
  "preferred name": "preferred_name",
  nickname: "preferred_name",
  current_grade: "current_grade",
  "current grade": "current_grade",
  grade: "current_grade",
  dob: "dob",
  "date of birth": "dob",
  birthdate: "dob",
  enrollment_type: "enrollment_type",
  "enrollment type": "enrollment_type",
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      cells.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

type ParseResult = {
  rows: BulkStudentRow[]
  errors: Array<{ row_number: number; message: string }>
}

function parseCsv(text: string): ParseResult {
  const out: ParseResult = { rows: [], errors: [] }
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return out

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const fields: Array<keyof BulkStudentRow | null> = header.map((h) => headerAliases[h] ?? null)

  if (
    !fields.includes("hba_email") ||
    !fields.includes("legal_first_name") ||
    !fields.includes("legal_last_name")
  ) {
    out.errors.push({
      row_number: 0,
      message:
        "Header must include hba_email, legal_first_name, and legal_last_name. Other columns are optional.",
    })
    return out
  }

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1
    const cells = splitCsvLine(lines[i])
    const draft: Record<string, unknown> = {}
    for (let j = 0; j < cells.length; j += 1) {
      const f = fields[j]
      if (f) draft[f] = cells[j]
    }
    const parsed = bulkStudentRowSchema.safeParse(draft)
    if (!parsed.success) {
      out.errors.push({
        row_number: rowNumber,
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      })
      continue
    }
    out.rows.push(parsed.data)
  }
  return out
}

export type BulkStudentImportResult = {
  ok: boolean
  outcome?: BulkStudentOutcome
  error?: string
}

export async function importStudentsAction(
  prevState: BulkStudentImportResult | null,
  formData: FormData
): Promise<BulkStudentImportResult> {
  await assertAdmin()

  const csv = formData.get("csv")
  if (typeof csv !== "string" || csv.trim().length === 0) {
    return { ok: false, error: "Paste a CSV with at least a header row." }
  }

  const parsed = parseCsv(csv)
  if (parsed.rows.length === 0 && parsed.errors.length > 0 && parsed.errors[0].row_number === 0) {
    return { ok: false, error: parsed.errors[0].message }
  }

  let outcome: BulkStudentOutcome
  try {
    outcome = await bulkCreateStudents(parsed.rows)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Insert failed." }
  }

  // Merge parse-time errors with DB-time errors.
  outcome.rows_failed += parsed.errors.length
  outcome.errors = [...parsed.errors, ...outcome.errors]
  outcome.total_rows += parsed.errors.length

  await logAdminAuditEvent({
    action: "students.bulk_import",
    target_kind: "students_import",
    details: {
      total_rows: outcome.total_rows,
      students_created: outcome.students_created,
      students_skipped_existing: outcome.students_skipped_existing,
      profiles_created: outcome.profiles_created,
      rows_failed: outcome.rows_failed,
    },
  })

  revalidatePath("/admin/students")
  return { ok: true, outcome }
}
