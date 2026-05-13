import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function periodShortLabel(period: string | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
}

type SectionRow = {
  id: string
  section_code: string | null
  period: string | null
  room: string | null
  course: { id: string; code: string; name: string } | null
  term: { id: string; name: string; slug: string; start_date: string; is_current: boolean } | null
}

export default async function FacultyHomePage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  // Faculty home is for anyone with role 'faculty' or 'admin'. Pure-student
  // and pure-parent profiles get bounced.
  if (!profile.roles.includes("faculty") && !profile.roles.includes("admin")) {
    if (profile.roles.includes("parent")) redirect("/parent")
    if (profile.roles.includes("student")) redirect("/portal")
    redirect("/")
  }

  // Load this teacher's assigned sections. We use a direct client because
  // the existing helpers don't expose "by teacher" filtering yet.
  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: sections, error } = await supabase
    .from("course_sections")
    .select(
      `id, section_code, period, room,
       course:courses(id, code, name),
       term:terms(id, name, slug, start_date, is_current)`
    )
    .eq("teacher_profile_id", profile.id)
    .returns<SectionRow[]>()

  if (error) {
    throw new Error(`Failed to load assigned sections: ${error.message}`)
  }

  // Group by term, current term first.
  type Bucket = { termId: string; termName: string; isCurrent: boolean; start_date: string; sections: SectionRow[] }
  const buckets = new Map<string, Bucket>()
  for (const section of sections ?? []) {
    const term = section.term
    const key = term?.id ?? "__none__"
    if (!buckets.has(key)) {
      buckets.set(key, {
        termId: key,
        termName: term?.name ?? "Other / unscheduled",
        isCurrent: term?.is_current ?? false,
        start_date: term?.start_date ?? "0000-00-00",
        sections: [],
      })
    }
    buckets.get(key)!.sections.push(section)
  }
  const sortedBuckets = [...buckets.values()].sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1
    return right.start_date.localeCompare(left.start_date)
  })

  const greetingName = profile.first_name?.trim() || profile.display_name?.trim() || profile.email

  return (
    <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Faculty portal
          </p>
          <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
            Welcome, {greetingName}.
          </h1>
          <p className="text-sm text-slate-600">{profile.email}</p>
        </header>

        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-emerald-900">Teaching profile</h2>
          <p className="mt-1 text-sm text-emerald-800">
            Tell the scheduler what you can teach, when you&rsquo;re available,
            and how much you want to teach. The scheduler uses this to assign
            you sections each term.
          </p>
          <div className="mt-4">
            <Link
              href="/faculty-portal/teaching"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Edit teaching profile →
            </Link>
          </div>
        </section>

        {sortedBuckets.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            You&rsquo;re not assigned to any sections yet. After the office
            runs the scheduler for an upcoming term, your sections will appear
            here.
          </section>
        ) : (
          sortedBuckets.map((bucket) => (
            <section
              key={bucket.termId}
              className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-extrabold text-brand-navy">{bucket.termName}</h2>
                {bucket.isCurrent && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Current term
                  </span>
                )}
              </div>

              <ul className="mt-4 space-y-3">
                {bucket.sections.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`/faculty-portal/sections/${section.id}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-brand-navy/30 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">
                          {section.course?.name ?? "(deleted course)"}
                        </p>
                        {section.course?.code && (
                          <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {section.course.code}
                          </code>
                        )}
                        {section.section_code && (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                            Sec {section.section_code}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {periodShortLabel(section.period)}
                        {section.room && <> &middot; Room {section.room}</>}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Click any section above to see the roster, set up the gradebook
            (categories + assignments), and enter scores. Attendance entry
            still lives in the admin dashboard for now &mdash; a teacher-scoped
            version is on the roadmap.
          </p>
        </section>
    </div>
  )
}
