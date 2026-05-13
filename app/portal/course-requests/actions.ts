"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail, getStudentByProfileId } from "@/lib/sis"
import {
  deleteStudentCourseRequest,
  listStudentCourseRequests,
  markCourseRequestsSubmitted,
  studentCourseRequestUpsertSchema,
  upsertStudentCourseRequest,
} from "@/lib/scheduler"
import { sendCourseRequestsSubmittedNotification } from "@/lib/graph"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"

// Authorizes the signed-in user as a student and ensures the request they're
// editing belongs to them. Returns the student row.
async function assertSelfStudent(studentId: string) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("student")) redirect("/admin/sign-in")
  const student = await getStudentByProfileId(profile.id)
  if (!student || student.id !== studentId) redirect("/portal")
  return student
}

function revalidateCourseRequests(termId: string) {
  revalidatePath(`/portal/course-requests?term_id=${termId}`)
  revalidatePath("/portal/course-requests")
  revalidatePath("/portal")
}

export async function addCourseRequestAction(formData: FormData) {
  const studentId = formData.get("student_id")
  if (typeof studentId !== "string") throw new Error("Missing student_id.")
  await assertSelfStudent(studentId)

  const parsed = studentCourseRequestUpsertSchema.safeParse({
    student_id: studentId,
    term_id: formData.get("term_id"),
    course_id: formData.get("course_id"),
    kind: formData.get("kind"),
    preference_rank: formData.get("preference_rank") ?? 1,
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await upsertStudentCourseRequest(parsed.data)
  revalidateCourseRequests(parsed.data.term_id)

  // Trajectory page also calls this action so the per-course "Add"
  // forms can stay where the student picked them. Honor a non-leaking
  // redirect hint so we don't ping-pong them back to the requests list.
  const redirectTo = formData.get("redirect_to")
  if (redirectTo === "trajectory") {
    revalidatePath("/portal/trajectory")
    redirect("/portal/trajectory?saved=1")
  }

  redirect(`/portal/course-requests?term_id=${parsed.data.term_id}&saved=1`)
}

const deleteRequestSchema = z.object({
  student_id: z.uuid(),
  term_id: z.uuid(),
  course_id: z.uuid(),
})

export async function deleteCourseRequestAction(formData: FormData) {
  const parsed = deleteRequestSchema.safeParse({
    student_id: formData.get("student_id"),
    term_id: formData.get("term_id"),
    course_id: formData.get("course_id"),
  })
  if (!parsed.success) throw new Error("Invalid request.")
  await assertSelfStudent(parsed.data.student_id)

  await deleteStudentCourseRequest(parsed.data)
  revalidateCourseRequests(parsed.data.term_id)
  redirect(`/portal/course-requests?term_id=${parsed.data.term_id}&deleted=1`)
}

const submitSchema = z.object({
  student_id: z.uuid(),
  term_id: z.uuid(),
})

export async function submitCourseRequestsAction(formData: FormData) {
  const parsed = submitSchema.safeParse({
    student_id: formData.get("student_id"),
    term_id: formData.get("term_id"),
  })
  if (!parsed.success) throw new Error("Invalid request.")
  const student = await assertSelfStudent(parsed.data.student_id)

  await markCourseRequestsSubmitted(parsed.data)
  revalidateCourseRequests(parsed.data.term_id)
  revalidatePath("/admin/academics/scheduler/course-requests")

  // Ping the office so they don't have to remember to check the
  // dashboard. Best-effort: a Graph failure shouldn't roll back the
  // submit — the student's done their part and the data is saved.
  try {
    const session = await auth()
    const supabase = getServiceSupabase()
    const [{ data: term }, requests] = await Promise.all([
      supabase
        .from("terms")
        .select("name")
        .eq("id", parsed.data.term_id)
        .maybeSingle<{ name: string }>(),
      listStudentCourseRequests({
        student_id: parsed.data.student_id,
        term_id: parsed.data.term_id,
      }),
    ])
    const studentName =
      student.preferred_name?.trim() ||
      `${student.legal_first_name} ${student.legal_last_name}`
    const dashboardUrl = `${siteConfig.url}/admin/academics/scheduler/course-requests?term_id=${parsed.data.term_id}`
    await sendCourseRequestsSubmittedNotification({
      studentName,
      studentEmail: session?.user?.email ?? null,
      termName: term?.name ?? "the upcoming term",
      coreCount: requests.filter((r) => r.kind === "core").length,
      electiveCount: requests.filter((r) => r.kind === "elective").length,
      alternateCount: requests.filter((r) => r.kind === "alternate").length,
      dashboardUrl,
    })
  } catch (err) {
    console.error("Course requests submit notification failed:", err)
  }

  redirect(`/portal/course-requests?term_id=${parsed.data.term_id}&submitted=1`)
}
