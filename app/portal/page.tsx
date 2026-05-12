import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
  type StudentDetailEnrollment,
} from "@/lib/sis"

export const dynamic = "force-dynamic"

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

async function signOutPortalAction() {
  "use server"
  await signOut({ redirectTo: "/" })
}

export default async function StudentPortalPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  if (!profile.roles.includes("student")) {
    // Not a student. Send admins to their dashboard; everyone else home.
    if (session.isAdmin) {
      redirect("/admin/contact-submissions")
    }
    redirect("/")
  }

  // Find the student record this profile is attached to. Reuse getStudentDetail
  // for the enrollments; the page renders demographics from this same record.
  const studentStub = await getStudentByProfileId(profile.id)
  if (!studentStub) {
    redirect("/")
  }

  const student = await getStudentDetail(studentStub.id)
  if (!student) {
    redirect("/")
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
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Student portal
              </p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">
                Welcome, {displayName}.
              </h1>
              <p className="text-sm text-white/85">
                Signed in as {profile.email}
                {student.current_grade ? ` · Grade ${student.current_grade}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/portal/transcript"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Transcript
              </Link>
              <form action={signOutPortalAction}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </section>

        {activeEnrollments.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            You aren&rsquo;t enrolled in any sections yet. Check back after the
            office assigns your schedule, or get in touch with the office if
            you think this is wrong.
          </section>
        ) : (
          buckets.map((bucket) => (
            <section
              key={bucket.key}
              className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-extrabold text-brand-navy">
                  {bucket.label}
                </h2>
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
                        href={`/portal/sections/${enrollment.id}`}
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
                          <p className="text-sm text-slate-600">
                            {section ? teacherShortName(section.teacher) : "—"}
                          </p>
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
            Calculated grades (weighted average per category, GPA across the
            year) are coming in the next release. For now, you can see each
            published assignment&rsquo;s individual score on its section page.
          </p>
        </section>
      </div>
    </main>
  )
}
