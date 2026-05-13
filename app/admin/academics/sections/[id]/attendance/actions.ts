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
