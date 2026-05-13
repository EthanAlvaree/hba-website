import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
  type StudentDetailEnrollment,
} from "@/lib/sis"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import GpaSummary from "@/components/portal/GpaSummary"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ as?: string }>
}

const pacific = "America/Los_Angeles"

function periodShortLabel(period: string | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
}

function teacherShortName(
  teacher: NonNullable<StudentDetailEnrollment["section"]>["teacher"]
): string {
  if (!teacher) return "Unassigned"
  const full = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ").trim()
  return full || teacher.display_name || teacher.email
}

function groupByTerm(enrollments: StudentDetailEnrollment[]) {
  const buckets = new Map<
    string,
    { key: string; label: string; sortKey: string; enrollments: StudentDetailEnrollment[] }
  >()
  for (const enrollment of enrollments) {
    const term = enrollment.section?.term
    const key = term?.id ?? "__none__"
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: term?.name ?? "Other / unscheduled",
        sortKey: term?.start_date ?? "0000-00-00",
        enrollments: [],
      })
    }
    buckets.get(key)!.enrollments.push(enrollment)
  }
  return [...buckets.values()].sort((left, right) =>
    right.sortKey.localeCompare(left.sortKey)
  )
}

export default async function StudentPortalPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const isStudent = profile.roles.includes("student")
  const isAdmin = session.isAdmin === true
  const raw = await searchParams

  // Layout already gates non-student/non-admin out. Here we figure out
  // *which* student to show:
  //   - signed-in student → their own data
  //   - admin with ?as=<studentId> → that student's data (preview mode)
  //   - admin without ?as → friendly landing page asking them to pick
  let targetStudentId: string | null = null
  let previewing = false

  if (isStudent) {
    const stub = await getStudentByProfileId(profile.id)
    if (!stub) {
      return (
        <EmptyState
          title="No student record yet"
          body="Your profile is marked as a student, but no student record is linked to it. Contact the office so they can finish the enrollment."
        />
      )
    }
    targetStudentId = stub.id
  } else if (isAdmin && raw.as) {
    targetStudentId = raw.as
    previewing = true
  } else if (isAdmin) {
    return (
      <EmptyState
        title="Preview the student portal"
        body="To preview the portal as a specific student, open a student from the directory and click 'Preview portal'."
        cta={{ label: "Open the students directory", href: "/admin/students" }}
      />
    )
  }

  if (!targetStudentId) {
    redirect("/admin/sign-in")
  }

  const [student, transcript] = await Promise.all([
    getStudentDetail(targetStudentId),
    buildTranscriptForStudent(targetStudentId),
  ])
  if (!student) {
    notFound()
  }

  const displayName = student.preferred_name?.trim() || student.legal_first_name

  const activeEnrollments = student.enrollments.filter(
    (enrollment) => enrollment.status === "enrolled" || enrollment.status === "audit"
  )
  const buckets = groupByTerm(activeEnrollments)
  const currentTermBucket =
    buckets.find((bucket) =>
      bucket.enrollments.some((enrollment) => enrollment.section?.term?.id)
    ) ?? buckets[0]

  return (
    <div className="space-y-6">
      {previewing && (
        <PreviewBanner
          studentName={`${student.legal_first_name} ${student.legal_last_name}`.trim()}
          returnHref={`/admin/students/${student.id}`}
        />
      )}

      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Student portal
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Welcome, {displayName}.
        </h1>
        <p className="text-sm text-slate-600">
          {student.profile?.email ?? student.legal_first_name}
          {student.current_grade ? ` · Grade ${student.current_grade}` : ""}
        </p>
      </header>

      {transcript && transcript.terms.length > 0 && (
        <GpaSummary transcript={transcript} viewerLabel="Your" />
      )}

      {activeEnrollments.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          You aren&rsquo;t enrolled in any sections yet. Check back after the
          office assigns your schedule, or get in touch with the office if you
          think this is wrong.
        </section>
      ) : (
        buckets.map((bucket) => (
          <section
            key={bucket.key}
            className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-extrabold text-brand-navy">{bucket.label}</h2>
              {bucket === currentTermBucket && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Current term
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-3">
              {bucket.enrollments.map((enrollment) => {
                const section = enrollment.section
                return (
                  <li key={enrollment.id}>
                    <Link
                      href={`/portal/sections/${enrollment.id}${previewing ? `?as=${student.id}` : ""}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-brand-navy/30 hover:shadow-md"
                    >
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto] sm:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900">
                              {section?.course?.name ?? "(deleted course)"}
                            </p>
                            {section?.course?.code && (
                              <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {section.course.code}
                              </code>
                            )}
                            {section?.section_code && (
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                                Sec {section.section_code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {periodShortLabel(section?.period ?? null)}
                            {section?.room && <> &middot; Room {section.room}</>}
                          </p>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p>{section ? teacherShortName(section.teacher) : "—"}</p>
                          {enrollment.grade_locked && enrollment.final_grade_letter && (
                            <p className="mt-1 text-xs font-semibold text-brand-navy">
                              Final: {enrollment.final_grade_letter}
                              {enrollment.final_grade_percentage !== null && (
                                <> · {Number(enrollment.final_grade_percentage).toFixed(1)}%</>
                              )}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center rounded-full border border-brand-navy/20 px-3 py-1 text-xs font-semibold text-brand-navy">
                          Open →
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Click any section above to see its assignments, current grade, and
          attendance. The full transcript &mdash; including past terms &mdash;
          is on the <Link href="/portal/transcript" className="underline-offset-4 hover:underline font-semibold text-brand-navy">Transcript</Link> page.
        </p>
      </section>
    </div>
  )
}

function PreviewBanner({
  studentName,
  returnHref,
}: {
  studentName: string
  returnHref: string
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      Previewing as <strong>{studentName}</strong> —{" "}
      <Link href={returnHref} className="underline-offset-4 hover:underline">
        return to admin
      </Link>
    </div>
  )
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string
  body: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">{title}</h1>
        <p className="text-sm text-slate-600">{body}</p>
      </header>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
