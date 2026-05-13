import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
} from "@/lib/sis"
import { WeekSchedule, type ScheduleEntry } from "@/components/schedule/WeekSchedule"
import PrintButton from "@/components/transcripts/PrintButton"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ as?: string }>
}

export default async function StudentScheduleWeekPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const isStudent = profile.roles.includes("student")
  const isAdmin = session.isAdmin === true
  const raw = await searchParams

  let targetStudentId: string | null = null
  let previewing = false

  if (isStudent) {
    const stub = await getStudentByProfileId(profile.id)
    if (!stub) notFound()
    targetStudentId = stub.id
  } else if (isAdmin && raw.as) {
    targetStudentId = raw.as
    previewing = true
  } else {
    redirect("/portal")
  }

  const student = await getStudentDetail(targetStudentId!)
  if (!student) notFound()

  // Active (or auditing) enrollments in the current term only.
  const enrollments = student.enrollments.filter(
    (e) => e.status === "enrolled" || e.status === "audit"
  )

  const entries: ScheduleEntry[] = enrollments
    .filter((e) => e.section && e.section.period !== null)
    .map((e) => {
      const teacher = e.section!.teacher
      const teacherName = teacher
        ? [teacher.first_name, teacher.last_name].filter(Boolean).join(" ").trim() ||
          teacher.display_name ||
          teacher.email
        : null
      return {
        period: e.section!.period!,
        course_name: e.section!.course?.name ?? "(deleted course)",
        course_code: e.section!.course?.code ?? null,
        section_code: e.section!.section_code,
        room: e.section!.room,
        href: previewing
          ? `/portal/sections/${e.id}?as=${targetStudentId}`
          : `/portal/sections/${e.id}`,
        avatar: teacher && teacherName
          ? {
              photoUrl: profilePhotoUrl(teacher.photo_path),
              initials: initialsFor({
                first_name: teacher.first_name,
                last_name: teacher.last_name,
                display_name: teacher.display_name,
                email: teacher.email,
              }),
              alt: teacherName,
            }
          : undefined,
      }
    })

  const displayName = student.preferred_name?.trim() || student.legal_first_name

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={previewing ? `/portal?as=${targetStudentId}` : "/portal"}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to portal
        </Link>
        <PrintButton label="Print / save as PDF" />
      </div>

      <header className="space-y-2 print:border-b print:border-slate-300 print:pb-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          High Bluff Academy &middot; Weekly schedule
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          {displayName}&rsquo;s week
        </h1>
        <p className="text-sm text-slate-600">
          {student.current_grade ? `Grade ${student.current_grade} · ` : ""}
          {student.profile?.email ?? ""}
        </p>
      </header>

      {entries.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No active enrollments with scheduled periods yet.
        </section>
      ) : (
        <WeekSchedule entries={entries} />
      )}
    </div>
  )
}
