// Orphan / data-quality view.
//
// Surfaces the four classes of broken-relationship state that silently
// degrade portal experiences without any obvious admin error:
//
//   1. Active student → no parent_links row → parent portal is empty.
//   2. Parent profile → no parent_links row pointing at them → parent
//      signs in to nothing.
//   3. Active student → no enrollments in the current term → student
//      portal home is empty.
//   4. Faculty profile → no course_sections for the current term →
//      faculty portal teaching list is empty.
//
// These all silently fail with a generic "nothing here yet" state in the
// affected portal, which means the user thinks they're broken instead of
// reporting a real bug. This page is the triage view: see all four
// classes at once, click through to fix.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type StudentRow = {
  id: string
  legal_first_name: string
  legal_last_name: string
  current_grade: string | null
  status: string
}

type ProfileRow = {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  roles: string[]
  active: boolean
}

export default async function OrphansPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const supabase = getServiceSupabase()

  // ---- Load the data we need to compute the four orphan classes. ----

  const [
    activeStudentsRes,
    parentLinksRes,
    parentProfilesRes,
    facultyProfilesRes,
    currentTermRes,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, legal_first_name, legal_last_name, current_grade, status")
      .eq("status", "active")
      .returns<StudentRow[]>(),
    supabase
      .from("parent_links")
      .select("student_id, parent_profile_id"),
    supabase
      .from("profiles")
      .select("id, email, display_name, first_name, last_name, roles, active")
      .contains("roles", ["parent"])
      .eq("active", true)
      .returns<ProfileRow[]>(),
    supabase
      .from("profiles")
      .select("id, email, display_name, first_name, last_name, roles, active")
      .contains("roles", ["faculty"])
      .eq("active", true)
      .returns<ProfileRow[]>(),
    supabase
      .from("terms")
      .select("id, name")
      .eq("is_current", true)
      .maybeSingle<{ id: string; name: string }>(),
  ])

  const activeStudents = activeStudentsRes.data ?? []
  const parentLinks = parentLinksRes.data ?? []
  const parentProfiles = parentProfilesRes.data ?? []
  const facultyProfiles = facultyProfilesRes.data ?? []
  const currentTerm = currentTermRes.data

  // ---- Class 1: active students with no parent_link. ----
  const studentIdsWithParents = new Set(parentLinks.map((p) => p.student_id))
  const studentsWithoutParents = activeStudents.filter(
    (s) => !studentIdsWithParents.has(s.id)
  )

  // ---- Class 2: parent profiles not referenced by any parent_link. ----
  const parentProfileIdsInUse = new Set(
    parentLinks.map((p) => p.parent_profile_id)
  )
  const parentsWithoutStudents = parentProfiles.filter(
    (p) => !parentProfileIdsInUse.has(p.id)
  )

  // ---- Classes 3 & 4 only if there IS a current term. ----
  let studentsNotEnrolled: StudentRow[] = []
  let facultyNotTeaching: ProfileRow[] = []

  if (currentTerm) {
    const [enrollmentsRes, sectionsRes] = await Promise.all([
      // Pull enrollments joined to sections to know which students are
      // enrolled in something this term.
      supabase
        .from("enrollments")
        .select("student_id, section:course_sections!inner(term_id)")
        .eq("section.term_id", currentTerm.id)
        .returns<Array<{ student_id: string; section: { term_id: string } | null }>>(),
      // Pull sections to know which faculty are teaching this term.
      supabase
        .from("course_sections")
        .select("teacher_profile_id")
        .eq("term_id", currentTerm.id)
        .not("teacher_profile_id", "is", null)
        .returns<Array<{ teacher_profile_id: string | null }>>(),
    ])

    const enrolledStudentIds = new Set(
      (enrollmentsRes.data ?? []).map((e) => e.student_id)
    )
    studentsNotEnrolled = activeStudents.filter(
      (s) => !enrolledStudentIds.has(s.id)
    )

    const teachingFacultyIds = new Set(
      (sectionsRes.data ?? [])
        .map((s) => s.teacher_profile_id)
        .filter((id): id is string => Boolean(id))
    )
    facultyNotTeaching = facultyProfiles.filter(
      (p) => !teachingFacultyIds.has(p.id)
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">
          Orphans &amp; data quality
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Four classes of silently-broken state. Each shows up as a
          mysterious empty page in a portal — fixing them here prevents a
          frustrated email later.
          {!currentTerm && (
            <>
              {" "}
              <span className="font-semibold text-amber-700">
                No term is marked current,
              </span>{" "}
              so the enrollment and teaching checks are skipped. Mark a
              term current at{" "}
              <Link
                href="/admin/academics/terms"
                className="underline-offset-4 hover:underline"
              >
                /admin/academics/terms
              </Link>
              .
            </>
          )}
        </p>
      </header>

      <OrphanCard
        title="Active students with no parent on file"
        impact="The parent portal will be empty for these families. They can&rsquo;t see grades, attendance, or schedules. Fix by adding a parent profile and linking it on the student page."
        countLabel="student"
        items={studentsWithoutParents.map((s) => ({
          id: s.id,
          primary: `${s.legal_first_name} ${s.legal_last_name}`,
          secondary: s.current_grade ? `Grade ${s.current_grade}` : "No grade set",
          href: `/admin/students/${s.id}`,
        }))}
      />

      <OrphanCard
        title="Parent profiles with no linked students"
        impact="These parents can sign in but the parent portal is empty. Usually means an enrollment never ran or the parent_link import skipped them. Open the student record and add the link."
        countLabel="parent"
        items={parentsWithoutStudents.map((p) => ({
          id: p.id,
          primary:
            p.display_name ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            p.email,
          secondary: p.email,
          href: `/admin/profiles?email=${encodeURIComponent(p.email)}`,
        }))}
      />

      {currentTerm && (
        <>
          <OrphanCard
            title={`Active students with no enrollments in ${currentTerm.name}`}
            impact="Student portal home shows nothing. Run the scheduler or enroll the student manually from their student page."
            countLabel="student"
            items={studentsNotEnrolled.map((s) => ({
              id: s.id,
              primary: `${s.legal_first_name} ${s.legal_last_name}`,
              secondary: s.current_grade
                ? `Grade ${s.current_grade}`
                : "No grade set",
              href: `/admin/students/${s.id}`,
            }))}
          />

          <OrphanCard
            title={`Faculty with no sections in ${currentTerm.name}`}
            impact="Faculty portal teaching list is empty. If they should be teaching, assign sections; if not (admin-only role, sabbatical), this is expected."
            countLabel="faculty member"
            items={facultyNotTeaching.map((p) => ({
              id: p.id,
              primary:
                p.display_name ||
                [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                p.email,
              secondary: p.email,
              href: `/admin/profiles?email=${encodeURIComponent(p.email)}`,
            }))}
          />
        </>
      )}
    </div>
  )
}

type OrphanItem = {
  id: string
  primary: string
  secondary: string
  href: string
}

function OrphanCard({
  title,
  impact,
  countLabel,
  items,
}: {
  title: string
  impact: string
  countLabel: string
  items: OrphanItem[]
}) {
  const empty = items.length === 0
  return (
    <section
      className={`rounded-[2rem] border ${empty ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"} px-6 py-5 shadow-sm`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-brand-navy">{title}</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${empty ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}
        >
          {items.length} {countLabel}
          {items.length === 1 ? "" : "s"}
        </span>
      </header>
      <p className="mt-1 text-sm text-slate-700">{impact}</p>

      {empty ? (
        <p className="mt-3 text-sm font-semibold text-emerald-800">
          Nothing flagged. Nice.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-navy hover:shadow-sm"
              >
                <p className="font-semibold text-slate-900">{item.primary}</p>
                <p className="text-xs text-slate-600">{item.secondary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
