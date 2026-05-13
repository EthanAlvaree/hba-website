"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail, getStudentDetail } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  createIncident,
  createIncidentInputSchema,
  deleteIncident,
  incidentKindLabels,
  incidentKindSchema,
  type IncidentKind,
} from "@/lib/incidents"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"
import {
  buildMailtoUrl,
  generalMessage,
  listParentContactsForStudent,
  missingAssignmentMessage,
  tardyMessage,
} from "@/lib/parent-contact"
import { getCourseSectionById } from "@/lib/sis"

// Picks a parent-contact email template appropriate to the incident kind.
async function buildIncidentMailto(input: {
  student_id: string
  section_id: string
  kind: IncidentKind
  summary: string
  occurredAt: string
}): Promise<string | null> {
  const session = await auth()
  const [contacts, student, section] = await Promise.all([
    listParentContactsForStudent(input.student_id),
    getStudentDetail(input.student_id),
    getCourseSectionById(input.section_id),
  ])
  if (contacts.length === 0 || !student || !section) return null

  const teacherDisplay =
    section.teacher
      ? `${section.teacher.first_name ?? ""} ${section.teacher.last_name ?? ""}`.trim() ||
        section.teacher.display_name ||
        section.teacher.email
      : session?.user?.name || session?.user?.email || "Your teacher"

  const studentLite = {
    preferred_name: student.preferred_name,
    legal_first_name: student.legal_first_name,
    legal_last_name: student.legal_last_name,
  }
  const dateIso = input.occurredAt.slice(0, 10)

  let mailto
  if (input.kind === "tardy") {
    mailto = tardyMessage({
      contacts,
      student: studentLite,
      courseName: section.course.name,
      date: dateIso,
      teacherName: teacherDisplay,
      note: input.summary,
    })
  } else if (input.kind === "missing_assignment" || input.kind === "late_assignment") {
    mailto = missingAssignmentMessage({
      contacts,
      student: studentLite,
      courseName: section.course.name,
      assignmentTitle: input.summary,
      teacherName: teacherDisplay,
      dueDate: null,
    })
  } else {
    // For everything else (classroom_disruption, kudos, etc.) use the generic
    // template with the summary inserted into the body so the teacher only
    // needs to fill in the specifics.
    const generic = generalMessage({
      contacts,
      student: studentLite,
      courseName: section.course.name,
      teacherName: teacherDisplay,
    })
    mailto = {
      ...generic,
      subject: `${student.preferred_name?.trim() || student.legal_first_name} ${student.legal_last_name} — ${incidentKindLabels[input.kind]}: ${input.summary}`,
    }
  }

  return buildMailtoUrl(mailto)
}

export async function createIncidentAction(formData: FormData) {
  const sectionId = formData.get("section_id")
  if (typeof sectionId !== "string" || sectionId.length === 0) {
    redirect("/admin/sign-in")
  }
  await assertCanEditSection(sectionId)
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const reporter = await getProfileByEmail(session.user.email)

  const occurredRaw = formData.get("occurred_at")
  const occurred =
    typeof occurredRaw === "string" && occurredRaw.length > 0
      ? new Date(occurredRaw).toISOString()
      : undefined

  const parsed = createIncidentInputSchema.safeParse({
    student_id: formData.get("student_id"),
    section_id: sectionId,
    enrollment_id: formData.get("enrollment_id") || null,
    kind: formData.get("kind"),
    occurred_at: occurred,
    summary: formData.get("summary"),
    details: formData.get("details") ?? "",
    reported_by_email: session.user.email,
    reported_by_profile_id: reporter?.id ?? null,
    parent_notified: formData.get("parent_notified") === "on",
    parent_notified_method:
      formData.get("parent_notified") === "on" ? "email" : null,
    visible_to_parent: formData.get("visible_to_parent") !== "off",
  })

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request."
    redirect(
      `/faculty-portal/sections/${sectionId}?incident_error=${encodeURIComponent(message)}`
    )
  }

  const created = await createIncident(parsed.data)

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.incident_create,
    target_kind: "incident",
    target_id: created.id,
    details: {
      student_id: created.student_id,
      kind: created.kind,
      section_id: created.section_id,
    },
  })

  revalidatePath(`/faculty-portal/sections/${sectionId}`)

  // If the teacher asked us to draft an email, build a mailto: URL and pass
  // it back via the redirect's query string. The page renders a prominent
  // "Open in mail client" link the teacher clicks once to launch their email
  // app with the message pre-filled.
  const sendEmail = formData.get("send_email") === "on"
  let emailQuery = ""
  if (sendEmail) {
    const mailto = await buildIncidentMailto({
      student_id: created.student_id,
      section_id: sectionId,
      kind: created.kind,
      summary: created.summary,
      occurredAt: created.occurred_at,
    })
    if (mailto) {
      emailQuery = `&email_link=${encodeURIComponent(mailto)}`
    } else {
      emailQuery = `&email_link_missing=1`
    }
  }

  redirect(`/faculty-portal/sections/${sectionId}?incident_saved=1${emailQuery}`)
}

const deleteSchema = z.object({
  id: z.uuid(),
  section_id: z.uuid(),
})

export async function deleteIncidentAction(formData: FormData) {
  const parsed = deleteSchema.safeParse({
    id: formData.get("id"),
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) {
    throw new Error("Invalid request.")
  }
  await assertCanEditSection(parsed.data.section_id)
  await deleteIncident(parsed.data.id)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.incident_delete,
    target_kind: "incident",
    target_id: parsed.data.id,
  })
  revalidatePath(`/faculty-portal/sections/${parsed.data.section_id}`)
  redirect(`/faculty-portal/sections/${parsed.data.section_id}?incident_saved=1`)
}
