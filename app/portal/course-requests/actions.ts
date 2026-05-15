"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  getStudentById,
  getStudentByProfileId,
  type StudentRecord,
} from "@/lib/sis"
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
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

// Permits the signed-in student editing their own requests OR an
// admin editing on their behalf (form posts admin=1). Returns the
// student row.
async function assertCanEditCourseRequests(
  studentId: string,
  fromAdmin: boolean
): Promise<StudentRecord> {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  if (fromAdmin) {
    if (!session.isAdmin) redirect("/admin/sign-in")
    const student = await getStudentById(studentId)
    if (!student) redirect("/admin/students")
    return student
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("student")) redirect("/admin/sign-in")
  const student = await getStudentByProfileId(profile.id)
  if (!student || student.id !== studentId) redirect("/portal")
  return student
}

function revalidateCourseRequests(studentId: string, termId: string) {
  revalidatePath(`/portal/course-requests?term_id=${termId}`)
  revalidatePath("/portal/course-requests")
  revalidatePath("/portal")
  revalidatePath("/admin/academics/scheduler/course-requests")
  revalidatePath(`/admin/students/${studentId}/course-requests`)
}

// Where to send the caller after a save. The redirect_to=trajectory
// hint wins — it's set by the trajectory tree's inline add forms,
// which both students and admins use. An admin editing from the tree
// (admin=1 + redirect_to=trajectory) bounces back to the same tree in
// ?as= mode. Otherwise admin=1 lands on the admin per-student
// course-requests editor; plain student saves land on the portal
// course-requests page.
function courseRequestsRedirect(
  formData: FormData,
  studentId: string,
  termId: string,
  query: string
): string {
  const fromAdmin = formData.get("admin") === "1"
  if (formData.get("redirect_to") === "trajectory") {
    return fromAdmin
      ? `/portal/trajectory?as=${studentId}&${query}`
      : `/portal/trajectory?${query}`
  }
  if (fromAdmin) {
    return `/admin/students/${studentId}/course-requests?term_id=${termId}&${query}`
  }
  return `/portal/course-requests?term_id=${termId}&${query}`
}

export async function addCourseRequestAction(formData: FormData) {
  const studentId = formData.get("student_id")
  if (typeof studentId !== "string") throw new Error("Missing student_id.")
  const fromAdmin = formData.get("admin") === "1"
  await assertCanEditCourseRequests(studentId, fromAdmin)

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
  revalidateCourseRequests(studentId, parsed.data.term_id)

  if (fromAdmin) {
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.course_request_admin_edit,
      target_kind: "student",
      target_id: studentId,
      details: {
        action: "add",
        course_id: parsed.data.course_id,
        kind: parsed.data.kind,
        term_id: parsed.data.term_id,
      },
    })
  }

  redirect(
    courseRequestsRedirect(formData, studentId, parsed.data.term_id, "saved=1")
  )
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
  const fromAdmin = formData.get("admin") === "1"
  await assertCanEditCourseRequests(parsed.data.student_id, fromAdmin)

  await deleteStudentCourseRequest(parsed.data)
  revalidateCourseRequests(parsed.data.student_id, parsed.data.term_id)

  if (fromAdmin) {
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.course_request_admin_edit,
      target_kind: "student",
      target_id: parsed.data.student_id,
      details: {
        action: "delete",
        course_id: parsed.data.course_id,
        term_id: parsed.data.term_id,
      },
    })
  }

  redirect(
    courseRequestsRedirect(
      formData,
      parsed.data.student_id,
      parsed.data.term_id,
      "deleted=1"
    )
  )
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
  const fromAdmin = formData.get("admin") === "1"
  const student = await assertCanEditCourseRequests(
    parsed.data.student_id,
    fromAdmin
  )

  await markCourseRequestsSubmitted(parsed.data)
  revalidateCourseRequests(parsed.data.student_id, parsed.data.term_id)

  // Ping the office so they don't have to remember to check the
  // dashboard. Best-effort: a Graph failure shouldn't roll back the
  // submit — the data is saved. Skip the notification when an admin
  // is submitting (they already know).
  if (!fromAdmin) {
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
  } else {
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.course_request_admin_edit,
      target_kind: "student",
      target_id: parsed.data.student_id,
      details: { action: "submit", term_id: parsed.data.term_id },
    })
  }

  redirect(
    courseRequestsRedirect(
      formData,
      parsed.data.student_id,
      parsed.data.term_id,
      "submitted=1"
    )
  )
}
