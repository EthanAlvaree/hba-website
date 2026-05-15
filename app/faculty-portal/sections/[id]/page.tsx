import Link from "next/link"
import { notFound } from "next/navigation"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  calculateCurrentGrade,
  listAssignmentCategories,
  listAssignments,
  listScoresForAssignmentIds,
} from "@/lib/gradebook"
import {
  listEnrollmentsForSection,
  type EnrollmentRecord,
  type EnrollmentStatus,
} from "@/lib/sis"
import { modalityLabel, periodLabel } from "@/app/admin/academics/sections/SectionFormFields"
import {
  buildMailtoUrl,
  buildTeamsChatUrl,
  generalMessage,
  listParentContactsForStudent,
  type ParentContact,
} from "@/lib/parent-contact"
import {
  incidentKindBadgeClass,
  incidentKindLabels,
  incidentKindSchema,
  listIncidentsForSection,
  type IncidentRecord,
} from "@/lib/incidents"
import {
  createIncidentAction,
  deleteIncidentAction,
} from "./incidents/actions"
import {
  listAnnouncementsForSection,
  type AnnouncementRecord,
} from "@/lib/announcements"
import {
  deleteAnnouncementAction,
} from "./announcements/actions"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"
import Avatar from "@/components/ui/Avatar"
import AnnouncementComposer from "@/components/announcements/AnnouncementComposer"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function statusBadgeClass(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "audit":
      return "border border-sky-200 bg-sky-50 text-sky-700"
    case "completed":
      return "border border-slate-200 bg-slate-100 text-slate-700"
    case "dropped":
    case "withdrawn":
      return "border border-rose-200 bg-rose-50 text-rose-700"
  }
}

function statusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "Enrolled"
    case "dropped":
      return "Dropped"
    case "withdrawn":
      return "Withdrawn"
    case "completed":
      return "Completed"
    case "audit":
      return "Audit"
  }
}

function rosterName(enrollment: EnrollmentRecord): string {
  const student = enrollment.student
  if (!student) return "(unknown student)"
  const preferred = student.preferred_name?.trim()
  const legal = `${student.legal_first_name} ${student.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    incident_saved?: string
    incident_error?: string
    email_link?: string
    teams_link?: string
    email_link_missing?: string
    announcement_saved?: string
    announcement_error?: string
  }>
}

export default async function FacultySectionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const raw = await searchParams
  const { section, isAdmin, profileId } = await assertCanEditSection(id)
  if (!section) notFound()

  const teacherDisplayName =
    section.teacher
      ? `${section.teacher.first_name ?? ""} ${section.teacher.last_name ?? ""}`.trim() ||
        section.teacher.display_name ||
        section.teacher.email
      : "Your teacher"

  const [enrollments, categories, assignments, incidents, announcements] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAssignmentCategories(section.id),
    listAssignments(section.id),
    listIncidentsForSection(section.id),
    listAnnouncementsForSection(section.id),
  ])

  // Compute current grade per enrollment using only published assignments.
  const publishedAssignments = assignments.filter((a) => a.is_published)
  const allScores = await listScoresForAssignmentIds(publishedAssignments.map((a) => a.id))
  const scoresByEnrollment = new Map<string, typeof allScores>()
  for (const score of allScores) {
    const bucket = scoresByEnrollment.get(score.enrollment_id) ?? []
    bucket.push(score)
    scoresByEnrollment.set(score.enrollment_id, bucket)
  }
  const gradeByEnrollment = new Map<string, ReturnType<typeof calculateCurrentGrade>>()
  for (const enrollment of enrollments) {
    gradeByEnrollment.set(
      enrollment.id,
      calculateCurrentGrade({
        categories,
        assignments: publishedAssignments,
        scores: scoresByEnrollment.get(enrollment.id) ?? [],
      })
    )
  }

  // Batch-fetch parent contacts for every student on the roster, so each
  // row's "Email parents" link is pre-filled with the right recipients.
  const studentIds = enrollments
    .map((e) => e.student?.id)
    .filter((id): id is string => Boolean(id))
  const parentContactsByStudent = new Map<string, ParentContact[]>()
  await Promise.all(
    studentIds.map(async (sid) => {
      parentContactsByStudent.set(sid, await listParentContactsForStudent(sid))
    })
  )

  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/faculty-portal"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to my sections
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/faculty-portal/sections/${section.id}/attendance`}
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy shadow-md transition hover:bg-brand-navy hover:text-white"
          >
            Take attendance →
          </Link>
          <Link
            href={`/faculty-portal/sections/${section.id}/gradebook`}
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Gradebook setup →
          </Link>
          {isAdmin && (
            <Link
              href={`/admin/academics/sections/${section.id}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Admin view
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-brand-navy">
              {section.course.name}
            </h1>
            <code className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {section.course.code}
            </code>
            {section.section_code && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                Section {section.section_code}
              </span>
            )}
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              {section.term.name}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {periodLabel(section.period)} &middot; {modalityLabel(section.modality)}
            {section.room && <> &middot; Room {section.room}</>}
          </p>
          <p className="text-sm text-slate-600">
            {enrolledCount} enrolled
            {typeof section.max_enrollment === "number" &&
              ` of ${section.max_enrollment}`}
          </p>
        </div>
      </section>

      {raw.incident_saved === "1" && !raw.email_link && !raw.email_link_missing && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900 shadow-sm">
          Incident saved.
        </section>
      )}
      {raw.incident_saved === "1" && raw.email_link && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
          <p className="font-semibold">Incident saved.</p>
          <p className="mt-1">
            A pre-filled message is ready — open it in your mail client OR
            in Teams (Teams works if the parent has a Microsoft account).
            Edit before sending.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={raw.email_link}
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              ✉ Open email to parents →
            </a>
            {raw.teams_link && (
              <a
                href={raw.teams_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-brand-navy bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                💬 Open in Teams →
              </a>
            )}
          </div>
        </section>
      )}
      {raw.incident_saved === "1" && raw.email_link_missing && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 shadow-sm">
          Incident saved. No parents with communications enabled are on file
          for this student, so we couldn&rsquo;t draft an email. Add a parent
          link via the office and try again.
        </section>
      )}
      {raw.incident_error && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-900 shadow-sm">
          {raw.incident_error}
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-extrabold text-brand-navy">Roster</h2>
          <p className="text-xs text-slate-500">
            Current grades use only published assignments. Drafts don&rsquo;t count yet.
          </p>
        </div>

        {enrollments.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            No students enrolled in this section yet.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {enrollments.map((enrollment) => {
              const grade = gradeByEnrollment.get(enrollment.id)
              const pct =
                grade && grade.overall_percentage !== null
                  ? `${grade.overall_percentage.toFixed(1)}%`
                  : "—"
              const letter = grade?.letter ?? null
              const studentId = enrollment.student?.id
              const contacts = studentId
                ? parentContactsByStudent.get(studentId) ?? []
                : []
              const messageOptions =
                contacts.length > 0 && enrollment.student
                  ? generalMessage({
                      contacts,
                      student: {
                        preferred_name: enrollment.student.preferred_name,
                        legal_first_name: enrollment.student.legal_first_name,
                        legal_last_name: enrollment.student.legal_last_name,
                      },
                      courseName: section.course.name,
                      teacherName: teacherDisplayName,
                    })
                  : null
              const mailto = messageOptions ? buildMailtoUrl(messageOptions) : null
              const teamsUrl = messageOptions ? buildTeamsChatUrl(messageOptions) : null
              return (
                <li
                  key={enrollment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_auto_auto] sm:items-center">
                    <Avatar
                      photoUrl={profilePhotoUrl(enrollment.student?.profile?.photo_path)}
                      initials={initialsFor({
                        first_name: enrollment.student?.legal_first_name,
                        last_name: enrollment.student?.legal_last_name,
                        display_name: enrollment.student?.profile?.display_name,
                        email: enrollment.student?.profile?.email,
                      })}
                      alt={rosterName(enrollment)}
                      size="md"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">
                          {rosterName(enrollment)}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(enrollment.status)}`}
                        >
                          {statusLabel(enrollment.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {enrollment.student?.profile?.email ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      Grade: {pct} {letter && <span className="text-slate-500">({letter})</span>}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {grade?.categories.reduce((sum, c) => sum + c.graded_count, 0) ?? 0} graded
                    </span>
                    {mailto && teamsUrl ? (
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={mailto}
                          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                          title={`Email ${contacts.length} parent${contacts.length === 1 ? "" : "s"}`}
                        >
                          ✉ Email
                        </a>
                        <a
                          href={teamsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                          title={`Start a Teams chat with ${contacts.length} parent${contacts.length === 1 ? "" : "s"} (works if they have a Microsoft account)`}
                        >
                          💬 Teams
                        </a>
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400"
                        title="No parents on file with comms enabled"
                      >
                        ✉ —
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <AnnouncementsCard
        sectionId={section.id}
        announcements={announcements}
        savedFlag={raw.announcement_saved === "1"}
        errorMessage={raw.announcement_error}
      />

      <IncidentsCard
        sectionId={section.id}
        enrollments={enrollments}
        incidents={incidents}
      />
    </div>
  )
}

function AnnouncementsCard({
  sectionId,
  announcements,
  savedFlag,
  errorMessage,
}: {
  sectionId: string
  announcements: AnnouncementRecord[]
  savedFlag: boolean
  errorMessage?: string
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold text-brand-navy">Announcements</h2>
        <p className="mt-1 text-sm text-slate-600">
          Short messages to this class. Students see them at the top of their
          section page; parents see them in their kid&rsquo;s section view.
        </p>
      </div>

      {savedFlag && (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Announcement saved.
        </p>
      )}
      {errorMessage && (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900">
          {errorMessage}
        </p>
      )}

      <AnnouncementComposer sectionId={sectionId} />

      {announcements.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No announcements yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {announcements.map((ann) => (
            <li
              key={ann.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {ann.pinned && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                        Pinned
                      </span>
                    )}
                    <p className="text-sm font-semibold text-slate-900">{ann.title}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{ann.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTimestamp(ann.created_at)} · {ann.author_email}
                  </p>
                </div>
                <form action={deleteAnnouncementAction}>
                  <input type="hidden" name="id" value={ann.id} />
                  <input type="hidden" name="section_id" value={sectionId} />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function IncidentsCard({
  sectionId,
  enrollments,
  incidents,
}: {
  sectionId: string
  enrollments: EnrollmentRecord[]
  incidents: IncidentRecord[]
}) {
  const studentLookup = new Map(
    enrollments
      .filter((e) => e.student)
      .map((e) => [
        e.student!.id,
        { enrollmentId: e.id, label: rosterName(e) },
      ])
  )

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-brand-navy">Incidents</h2>
          <p className="mt-1 text-sm text-slate-600">
            Quick log for tardies, missing assignments, classroom issues, or
            kudos. Visible to the student&rsquo;s parents by default unless you
            check &ldquo;internal only.&rdquo;
          </p>
        </div>
      </div>

      <form
        action={createIncidentAction}
        className="mt-4 grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
      >
        <input type="hidden" name="section_id" value={sectionId} />

        <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-3">
          <span className="block">Student</span>
          <select
            name="student_id"
            required
            defaultValue=""
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Pick a student…</option>
            {[...studentLookup.entries()].map(([sid, info]) => (
              <option key={sid} value={sid}>
                {info.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Kind</span>
          <select
            name="kind"
            required
            defaultValue="tardy"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {incidentKindSchema.options.map((k) => (
              <option key={k} value={k}>
                {incidentKindLabels[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">When (optional)</span>
          <input
            name="occurred_at"
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 sm:w-auto"
          >
            Log incident
          </button>
        </div>

        <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-3">
          <span className="block">Summary (required, shown to parents)</span>
          <input
            name="summary"
            required
            maxLength={300}
            placeholder="Late to class by 8 minutes, no excuse."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-3">
          <span className="block">Details (optional, longer narrative)</span>
          <textarea
            name="details"
            rows={2}
            maxLength={4000}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <div className="flex flex-wrap items-center gap-6 sm:col-span-3">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              name="send_email"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>
              <strong className="font-semibold">Draft an email to parents</strong>
              {" "}— after saving, I&rsquo;ll get a one-click link to open my
              mail client with the message pre-filled.
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-6 sm:col-span-3">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              name="parent_notified"
              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>I already notified the parent (phone, in person, etc.)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              name="visible_to_parent"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>Visible to parents on the family portal</span>
          </label>
        </div>
      </form>

      {incidents.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No incidents logged yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {incidents.map((incident) => {
            const student = studentLookup.get(incident.student_id)
            return (
              <li
                key={incident.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${incidentKindBadgeClass[incident.kind]}`}
                  >
                    {incidentKindLabels[incident.kind]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {student?.label ?? "(unknown student)"}
                    </p>
                    <p className="text-xs text-slate-600">{incident.summary}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatTimestamp(incident.occurred_at)}
                      {incident.parent_notified && (
                        <> &middot; Parent notified ({incident.parent_notified_method ?? "email"})</>
                      )}
                      {!incident.visible_to_parent && (
                        <> &middot; <span className="font-semibold">Internal only</span></>
                      )}
                    </p>
                  </div>
                  <form action={deleteIncidentAction}>
                    <input type="hidden" name="id" value={incident.id} />
                    <input type="hidden" name="section_id" value={sectionId} />
                    <button
                      type="submit"
                      className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
