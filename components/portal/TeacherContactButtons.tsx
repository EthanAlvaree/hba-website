// Two-button contact panel students + parents see on each section
// page. Teams chat is the recommended default since every teacher
// lives in Teams during the day; email is the universal fallback.
//
// The student-view passes no `aboutStudentName` — the message is from
// them and they're the subject of the conversation. The parent-view
// passes `aboutStudentName` so the message reads "Hi, I'm writing
// about <student>."

import Link from "next/link"
import { buildMailtoUrl, buildTeamsChatUrl } from "@/lib/parent-contact"

export type TeacherContactButtonsProps = {
  teacherEmail: string | null
  teacherName: string
  courseName: string
  /** Audience hint that drives the message template. Default: student. */
  audience?: "student" | "parent"
  /** When audience is "parent", the student's display name to mention
   *  in the message body (so the teacher knows whose parent is writing). */
  aboutStudentName?: string
  /** Sender's display name for the email signature line. Helpful but
   *  not required — many email clients fill it in from the From: field. */
  fromName?: string
}

export default function TeacherContactButtons({
  teacherEmail,
  teacherName,
  courseName,
  audience = "student",
  aboutStudentName,
  fromName,
}: TeacherContactButtonsProps) {
  if (!teacherEmail) {
    return (
      <p className="text-xs text-slate-500">
        No teacher contact on file yet. The office is working on it.
      </p>
    )
  }

  const subject =
    audience === "parent" && aboutStudentName
      ? `Question about ${aboutStudentName} in ${courseName}`
      : `Question about ${courseName}`

  const greeting = `Hi ${teacherName.split(" ")[0] ?? teacherName},`
  const introLine =
    audience === "parent" && aboutStudentName
      ? `I'm ${aboutStudentName}'s parent and I had a quick question about ${courseName}.`
      : `I had a quick question about ${courseName}.`
  const signLine = fromName ? `\n\nThanks,\n${fromName}` : `\n\nThanks,`

  const body = `${greeting}\n\n${introLine}\n\n${signLine}`

  const messageOpts = {
    toEmails: [teacherEmail],
    subject,
    body,
  }
  const teamsUrl = buildTeamsChatUrl(messageOpts)
  const mailto = buildMailtoUrl(messageOpts)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={teamsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
        title={`Open a Teams chat with ${teacherName}`}
      >
        💬 Message {teacherName} on Teams
      </Link>
      <a
        href={mailto}
        className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
        title={`Email ${teacherName} as a fallback`}
      >
        ✉ Email instead
      </a>
    </div>
  )
}
