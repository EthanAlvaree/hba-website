import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { createClient } from "@supabase/supabase-js"
import { getProfileByEmail, type SectionPeriod } from "@/lib/sis"
import { WeekSchedule, type ScheduleEntry } from "@/components/schedule/WeekSchedule"

export const dynamic = "force-dynamic"

type SectionRow = {
  id: string
  section_code: string | null
  period: SectionPeriod | null
  room: string | null
  course: { id: string; code: string; name: string } | null
  term: { id: string; name: string; is_current: boolean } | null
}

export default async function FacultyScheduleWeekPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")
  if (!profile.roles.includes("faculty") && !profile.roles.includes("admin")) {
    redirect("/")
  }

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Load this teacher's current-term sections. The grid is a "this week"
  // view, so non-current terms are filtered out.
  const { data: sections, error } = await supabase
    .from("course_sections")
    .select(
      `id, section_code, period, room,
       course:courses(id, code, name),
       term:terms!inner(id, name, is_current)`
    )
    .eq("teacher_profile_id", profile.id)
    .eq("term.is_current", true)
    .returns<SectionRow[]>()

  if (error) {
    throw new Error(`Failed to load schedule: ${error.message}`)
  }

  const entries: ScheduleEntry[] = (sections ?? [])
    .filter((s): s is SectionRow & { period: SectionPeriod } => s.period !== null)
    .map((s) => ({
      period: s.period,
      course_name: s.course?.name ?? "(deleted course)",
      course_code: s.course?.code ?? null,
      section_code: s.section_code,
      room: s.room,
      href: `/faculty-portal/sections/${s.id}`,
    }))

  const currentTermName = sections?.[0]?.term?.name

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/faculty-portal"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to faculty portal
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Schedule
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Your week
        </h1>
        <p className="text-sm text-slate-600">
          {currentTermName ?? "Current term"} &middot; click a section to open
          its roster, gradebook, or attendance.
        </p>
      </header>

      {entries.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          You&rsquo;re not teaching any sections in the current term yet. Once
          the office assigns your schedule, classes will appear here.
        </section>
      ) : (
        <WeekSchedule entries={entries} emptyCellLabel="Prep" />
      )}
    </div>
  )
}
