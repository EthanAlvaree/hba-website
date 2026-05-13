// lib/parent-contact.ts
//
// Friction-reducing helpers for teacher -> parent communication. Builds
// pre-filled mailto: URLs so a teacher clicks ONE button in the gradebook
// or attendance grid and lands in their email client with subject + body
// already drafted. Most communication blockers we've observed are the
// "having to open my email and look up the parent's address" friction;
// closing that gap dramatically increases the rate at which teachers
// actually reach out.
//
// Future: an in-app messaging surface (Teams via Graph, or SMTP through
// the existing Graph mailer) could replace mailto:, but mailto: works
// everywhere today with zero infrastructure and the message goes from
// the teacher's actual email (so parents reply to the teacher, not a
// no-reply address).

import "server-only"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

export type ParentContact = {
  parent_email: string
  parent_name: string | null
  is_primary: boolean
  is_homestay: boolean
}

// Returns every parent_link with can_receive_communications = true for the
// given student. Primary guardians first; homestay hosts after non-primary
// guardians. Filters out inactive parent profiles.
export async function listParentContactsForStudent(
  studentId: string
): Promise<ParentContact[]> {
  const { data, error } = await getSupabase()
    .from("parent_links")
    .select(
      `is_primary, is_homestay, can_receive_communications,
       parent:profiles!parent_links_parent_profile_id_fkey(email, first_name, display_name, active)`
    )
    .eq("student_id", studentId)
    .eq("can_receive_communications", true)
    .returns<
      Array<{
        is_primary: boolean
        is_homestay: boolean
        can_receive_communications: boolean
        parent: {
          email: string
          first_name: string | null
          display_name: string | null
          active: boolean
        } | null
      }>
    >()
  if (error) {
    throw new Error(`Failed to load parent contacts: ${error.message}`)
  }
  const rows = (data ?? [])
    .filter((r) => r.parent && r.parent.active)
    .map((r) => ({
      parent_email: r.parent!.email,
      parent_name:
        r.parent!.first_name?.trim() ||
        r.parent!.display_name?.trim() ||
        null,
      is_primary: r.is_primary,
      is_homestay: r.is_homestay,
    }))
  rows.sort((a, b) => {
    const score = (c: ParentContact) =>
      (c.is_primary ? 0 : c.is_homestay ? 2 : 1)
    return score(a) - score(b)
  })
  return rows
}

// ============================================================================
// Mailto: URL builder
// ============================================================================

export type MailtoOptions = {
  toEmails: string[]
  ccEmails?: string[]
  subject: string
  body: string
}

export function buildMailtoUrl({
  toEmails,
  ccEmails = [],
  subject,
  body,
}: MailtoOptions): string {
  const params = new URLSearchParams()
  params.set("subject", subject)
  params.set("body", body)
  if (ccEmails.length > 0) params.set("cc", ccEmails.join(","))
  return `mailto:${toEmails.join(",")}?${params.toString().replace(/\+/g, "%20")}`
}

// ============================================================================
// Pre-filled message templates for common teacher -> parent contexts
// ============================================================================

export type StudentLite = {
  preferred_name: string | null
  legal_first_name: string
  legal_last_name: string
}

function studentDisplay(s: StudentLite): string {
  const preferred = s.preferred_name?.trim()
  return preferred ? `${preferred} ${s.legal_last_name}` : `${s.legal_first_name} ${s.legal_last_name}`
}

function greeting(contacts: ParentContact[]): string {
  const named = contacts.map((c) => c.parent_name).filter(Boolean) as string[]
  if (named.length === 0) return "Hello,"
  if (named.length === 1) return `Hi ${named[0]},`
  if (named.length === 2) return `Hi ${named[0]} and ${named[1]},`
  return `Hi everyone,`
}

export function tardyMessage(input: {
  contacts: ParentContact[]
  student: StudentLite
  courseName: string
  date: string // YYYY-MM-DD
  teacherName: string
  note?: string | null
}): MailtoOptions {
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(`${input.date}T12:00:00Z`))
  const studentName = studentDisplay(input.student)
  return {
    toEmails: input.contacts.map((c) => c.parent_email),
    subject: `${studentName} — tardy to ${input.courseName} on ${date}`,
    body: `${greeting(input.contacts)}

I wanted to let you know that ${studentName} was tardy to ${input.courseName} on ${date}. ${
      input.note ? `Note: ${input.note}\n\n` : ""
    }No action needed on your end — I just want to keep you in the loop so we can support ${studentName} together. Please let me know if there's anything going on at home I should be aware of.

Thanks,
${input.teacherName}`,
  }
}

export function missingAssignmentMessage(input: {
  contacts: ParentContact[]
  student: StudentLite
  courseName: string
  assignmentTitle: string
  teacherName: string
  dueDate?: string | null
}): MailtoOptions {
  const studentName = studentDisplay(input.student)
  const dueLine = input.dueDate
    ? ` (due ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Los_Angeles" }).format(new Date(`${input.dueDate}T12:00:00Z`))})`
    : ""
  return {
    toEmails: input.contacts.map((c) => c.parent_email),
    subject: `${studentName} — missing ${input.assignmentTitle} in ${input.courseName}`,
    body: `${greeting(input.contacts)}

I haven't received ${studentName}'s submission for ${input.assignmentTitle} in ${input.courseName}${dueLine}. Could you help check in with them about it? I'm happy to accept it late and answer any questions they have.

Thanks,
${input.teacherName}`,
  }
}

export function lowGradeMessage(input: {
  contacts: ParentContact[]
  student: StudentLite
  courseName: string
  assignmentTitle: string
  pointsEarned: number | null
  pointsPossible: number
  teacherName: string
}): MailtoOptions {
  const studentName = studentDisplay(input.student)
  const pctLine =
    input.pointsEarned !== null && input.pointsPossible > 0
      ? ` (${input.pointsEarned} / ${input.pointsPossible}, ${((Number(input.pointsEarned) / Number(input.pointsPossible)) * 100).toFixed(0)}%)`
      : ""
  return {
    toEmails: input.contacts.map((c) => c.parent_email),
    subject: `${studentName} — ${input.assignmentTitle} score in ${input.courseName}`,
    body: `${greeting(input.contacts)}

I wanted to give you a heads-up about ${studentName}'s recent score on ${input.assignmentTitle} in ${input.courseName}${pctLine}. Happy to set up a time to talk through what we're seeing in class and how we can support ${studentName} moving forward.

Thanks,
${input.teacherName}`,
  }
}

export function generalMessage(input: {
  contacts: ParentContact[]
  student: StudentLite
  courseName: string
  teacherName: string
}): MailtoOptions {
  const studentName = studentDisplay(input.student)
  return {
    toEmails: input.contacts.map((c) => c.parent_email),
    subject: `Re: ${studentName} (${input.courseName})`,
    body: `${greeting(input.contacts)}

I wanted to reach out about ${studentName}.



Thanks,
${input.teacherName}`,
  }
}
