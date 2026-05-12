"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  attendanceStatusSchema,
  saveAttendanceForSection,
  saveAttendanceInputSchema,
} from "@/lib/attendance"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

export async function saveAttendanceAction(formData: FormData) {
  const session = await assertAdmin()

  const sectionId = formData.get("section_id")
  const date = formData.get("date")

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

  revalidatePath(`/admin/academics/sections/${parsed.data.section_id}`)
  revalidatePath(`/admin/academics/sections/${parsed.data.section_id}/attendance`)

  redirect(
    `/admin/academics/sections/${parsed.data.section_id}/attendance?date=${encodeURIComponent(parsed.data.date)}`
  )
}
