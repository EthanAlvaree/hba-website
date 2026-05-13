"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  attendanceStatusSchema,
  saveAttendanceForSection,
  saveAttendanceInputSchema,
} from "@/lib/attendance"

type Surface = "admin" | "faculty"

function surfaceFromFormData(formData: FormData): Surface {
  return formData.get("surface") === "faculty" ? "faculty" : "admin"
}

function sectionBasePath(surface: Surface, sectionId: string): string {
  return surface === "faculty"
    ? `/faculty-portal/sections/${sectionId}`
    : `/admin/academics/sections/${sectionId}`
}

// Saves a whole week worth of attendance in one click. Form data carries
// parallel arrays of (enrollment_id, date, status, note). We group rows by
// date and dispatch one saveAttendanceForSection call per day so the
// "present + no note = skip unless existing" rule still applies day by day.
export async function saveAttendanceWeekAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const sectionId = formData.get("section_id")
  const weekOf = formData.get("week_of")

  if (typeof sectionId !== "string" || sectionId.length === 0) {
    redirect("/admin/sign-in")
  }

  await assertCanEditSection(sectionId)
  const session = await auth()

  const enrollmentIds = formData.getAll("enrollment_id").map(String)
  const dates = formData.getAll("date").map(String)
  const statuses = formData.getAll("status").map(String)
  const notes = formData.getAll("note").map((v) => (typeof v === "string" ? v : ""))

  if (
    dates.length !== enrollmentIds.length ||
    statuses.length !== enrollmentIds.length ||
    notes.length !== enrollmentIds.length
  ) {
    throw new Error("Form data is misaligned. Refresh the page and try again.")
  }

  // Group rows by date.
  const byDate = new Map<
    string,
    Array<{ enrollment_id: string; status: string; note: string | null }>
  >()
  for (let i = 0; i < enrollmentIds.length; i += 1) {
    const date = dates[i]
    const status = statuses[i]
    const enrollmentId = enrollmentIds[i]
    const note = notes[i] ?? ""
    if (!date || !status || !enrollmentId) continue
    const bucket = byDate.get(date) ?? []
    bucket.push({
      enrollment_id: enrollmentId,
      status,
      note,
    })
    byDate.set(date, bucket)
  }

  // Validate + dispatch per-day. We let the existing per-day helper handle
  // the present-skip rule, which keeps semantics identical to the single
  // day form.
  for (const [date, rows] of byDate.entries()) {
    const parsedRows = rows.map((row, idx) => {
      const statusParsed = attendanceStatusSchema.safeParse(row.status)
      if (!statusParsed.success) {
        throw new Error(`Invalid attendance status for row ${idx + 1} on ${date}.`)
      }
      return {
        enrollment_id: row.enrollment_id,
        status: statusParsed.data,
        note: row.note,
      }
    })

    const parsed = saveAttendanceInputSchema.safeParse({
      section_id: sectionId,
      date,
      rows: parsedRows,
      recorded_by: session?.user?.email ?? null,
    })
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Attendance save failed.")
    }
    await saveAttendanceForSection(parsed.data)
  }

  const base = sectionBasePath(surface, sectionId)
  revalidatePath(base)
  revalidatePath(`${base}/attendance/week`)

  redirect(
    `${base}/attendance/week?week_of=${encodeURIComponent(typeof weekOf === "string" ? weekOf : "")}&saved=1`
  )
}

export async function saveAttendanceAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const sectionId = formData.get("section_id")
  const date = formData.get("date")

  if (typeof sectionId !== "string" || sectionId.length === 0) {
    redirect("/admin/sign-in")
  }

  await assertCanEditSection(sectionId)
  const session = await auth()

  const enrollmentIds = formData.getAll("enrollment_id").map(String)
  const statuses = formData.getAll("status").map(String)
  const notes = formData.getAll("note").map((value) => (typeof value === "string" ? value : ""))

  if (statuses.length !== enrollmentIds.length || notes.length !== enrollmentIds.length) {
    throw new Error("Form data is misaligned. Refresh the page and try again.")
  }

  const rows = enrollmentIds.map((enrollmentId, idx) => {
    const status = attendanceStatusSchema.safeParse(statuses[idx])
    if (!status.success) {
      throw new Error(`Invalid attendance status for row ${idx + 1}.`)
    }
    return {
      enrollment_id: enrollmentId,
      status: status.data,
      note: notes[idx] ?? null,
    }
  })

  const parsed = saveAttendanceInputSchema.safeParse({
    section_id: sectionId,
    date,
    rows,
    recorded_by: session?.user?.email ?? null,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Attendance save failed.")
  }

  await saveAttendanceForSection(parsed.data)

  const base = sectionBasePath(surface, parsed.data.section_id)
  revalidatePath(base)
  revalidatePath(`${base}/attendance`)

  redirect(`${base}/attendance?date=${encodeURIComponent(parsed.data.date)}`)
}
