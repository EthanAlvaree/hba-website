"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  bulkCreateParentLinks,
  bulkParentLinkRowSchema,
  type BulkParentLinkOutcome,
  type BulkParentLinkRow,
} from "@/lib/sis"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

const headerAliases: Record<string, keyof BulkParentLinkRow> = {
  student_email: "student_email",
  "student email": "student_email",
  student: "student_email",
  parent_email: "parent_email",
  "parent email": "parent_email",
  parent: "parent_email",
  guardian_email: "parent_email",
  "guardian email": "parent_email",
  relationship: "relationship",
  is_primary: "is_primary",
  "is primary": "is_primary",
  primary: "is_primary",
  is_homestay: "is_homestay",
  "is homestay": "is_homestay",
  homestay: "is_homestay",
  is_emergency_contact: "is_emergency_contact",
  "is emergency contact": "is_emergency_contact",
  emergency: "is_emergency_contact",
  can_view_grades: "can_view_grades",
  "can view grades": "can_view_grades",
  grades: "can_view_grades",
  can_view_attendance: "can_view_attendance",
  "can view attendance": "can_view_attendance",
  attendance: "can_view_attendance",
  can_receive_communications: "can_receive_communications",
  "can receive communications": "can_receive_communications",
  communications: "can_receive_communications",
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim().toLowerCase()
  if (trimmed === "") return undefined
  if (["true", "t", "yes", "y", "1", "x"].includes(trimmed)) return true
  if (["false", "f", "no", "n", "0", ""].includes(trimmed)) return false
  return undefined
}

// Minimal CSV parser: splits on newlines, then commas. Strips surrounding
// quotes. Sufficient for the simple "paste the spreadsheet column" use case;
// users with quoted fields containing commas should clean their input first.
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
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        cells.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
  }
  cells.push(current.trim())
  return cells
}

type ParseResult = {
  rows: BulkParentLinkRow[]
  errors: Array<{ row_number: number; message: string }>
}

function parseCsvText(text: string): ParseResult {
  const result: ParseResult = { rows: [], errors: [] }
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return result

  const headerCells = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const fieldByIndex: Array<keyof BulkParentLinkRow | null> = headerCells.map(
    (h) => headerAliases[h] ?? null
  )

  if (!fieldByIndex.includes("student_email") || !fieldByIndex.includes("parent_email")) {
    result.errors.push({
      row_number: 0,
      message:
        "Header must include both student_email and parent_email. Other columns are optional.",
    })
    return result
  }

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1 // 1-based, accounting for header
    const cells = splitCsvLine(lines[i])
    const draft: Record<string, unknown> = {}
    for (let j = 0; j < cells.length; j += 1) {
      const field = fieldByIndex[j]
      if (!field) continue
      const raw = cells[j]
      if (
        field === "is_primary" ||
        field === "is_homestay" ||
        field === "is_emergency_contact" ||
        field === "can_view_grades" ||
        field === "can_view_attendance" ||
        field === "can_receive_communications"
      ) {
        const bool = parseBool(raw)
        if (bool !== undefined) draft[field] = bool
      } else {
        draft[field] = raw
      }
    }

    const parsed = bulkParentLinkRowSchema.safeParse(draft)
    if (!parsed.success) {
      result.errors.push({
        row_number: rowNumber,
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      })
      continue
    }
    result.rows.push(parsed.data)
  }

  return result
}

export type BulkImportResult = {
  ok: boolean
  outcome?: BulkParentLinkOutcome
  parse_errors?: Array<{ row_number: number; message: string }>
  error?: string
}

export async function importParentLinksAction(
  prevState: BulkImportResult | null,
  formData: FormData
): Promise<BulkImportResult> {
  await assertAdmin()

  const csv = formData.get("csv")
  if (typeof csv !== "string" || csv.trim().length === 0) {
    return { ok: false, error: "Paste a CSV with at least a header row." }
  }

  const parsed = parseCsvText(csv)

  // If the header itself was rejected, bail before touching the DB.
  if (parsed.rows.length === 0 && parsed.errors.length > 0 && parsed.errors[0].row_number === 0) {
    return { ok: false, error: parsed.errors[0].message }
  }

  let outcome: BulkParentLinkOutcome
  try {
    outcome = await bulkCreateParentLinks(parsed.rows)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Bulk insert failed.",
    }
  }

  // Merge in any parse-time errors (e.g. malformed rows skipped during CSV
  // parse never reached the DB phase; surface them here so the admin sees them).
  outcome.rows_failed += parsed.errors.length
  outcome.errors = [...parsed.errors, ...outcome.errors]
  outcome.total_rows += parsed.errors.length

  revalidatePath("/admin/students")
  return { ok: true, outcome }
}
