import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, type SectionPeriod } from "@/lib/sis"
import { getServiceSupabase } from "@/lib/supabase-server"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"
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

type EnrollmentRosterRow = {
  section_id: string
  status: string
  student: {
    legal_first_name: string
    legal_last_name: string
    preferred_name: string | null
    profile: {
      display_name: string | null
      email: string
      photo_path: string | null
    } | null
  } | null
}

export default async function FacultyScheduleWeekPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")
  if (!profile.roles.includes("faculty") && !profile.roles.includes("admin")) {
    redirect("/")
  }

  const supabase = getServiceSupabase()

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

  // Pull rosters for the same sections so each cell can render a small
  // stack of student avatars. One query for all sections.
  const sectionIds = (sections ?? []).map((s) => s.id)
  const rosterBySection = new Map<
    string,
    Array<{ photoUrl: string | null; initials: string; alt: string }>
  >()
  const rosterCountBySection = new Map<string, number>()
  if (sectionIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        `section_id, status,
         student:students(
           legal_first_name, legal_last_name, preferred_name,
           profile:profiles(display_name, email, photo_path)
         )`
      )
      .in("section_id", sectionIds)
      .in("status", ["enrolled", "audit"])
      .returns<EnrollmentRosterRow[]>()
    for (const e of enrollments ?? []) {
      if (!e.student) continue
      rosterCountBySection.set(
        e.section_id,
        (rosterCountBySection.get(e.section_id) ?? 0) + 1
      )
      const bucket = rosterBySection.get(e.section_id) ?? []
      if (bucket.length < 5) {
        const studentName =
          e.student.preferred_name ||
          `${e.student.legal_first_name} ${e.student.legal_last_name}`.trim()
        bucket.push({
          photoUrl: profilePhotoUrl(e.student.profile?.photo_path),
          initials: initialsFor({
            first_name: e.student.legal_first_name,
            last_name: e.student.legal_last_name,
            display_name: e.student.profile?.display_name,
            email: e.student.profile?.email,
          }),
          alt: studentName,
        })
        rosterBySection.set(e.section_id, bucket)
      }
    }
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
      rosterPreview: {
        count: rosterCountBySection.get(s.id) ?? 0,
        avatars: rosterBySection.get(s.id) ?? [],
      },
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
