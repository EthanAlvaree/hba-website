// Admin "teaching grid" — at-a-glance view of who's teaching what,
// every period of the bell schedule, for a selected term.
//
// Each row is a teacher; each column is a bell-schedule period. Cells
// link directly to /admin/academics/sections/[id] so the admin can
// click in to roster, gradebook, attendance, etc.
//
// Also includes a row at the bottom for unassigned sections (teacher
// not yet set) so they're discoverable.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { listTerms, type SectionPeriod } from "@/lib/sis"
import { getServiceSupabase } from "@/lib/supabase-server"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"
import Avatar from "@/components/ui/Avatar"
import AcademicsHeader from "../AcademicsHeader"

export const dynamic = "force-dynamic"

type SectionRow = {
  id: string
  section_code: string | null
  period: SectionPeriod | null
  room: string | null
  modality: string
  max_enrollment: number | null
  course: { code: string; name: string } | null
  teacher: {
    id: string
    email: string
    display_name: string | null
    first_name: string | null
    last_name: string | null
    photo_path: string | null
  } | null
  enrollment_count: { count: number } | null
}

const COLUMNS: Array<{ period: SectionPeriod; label: string }> = [
  { period: "period_1", label: "P1" },
  { period: "period_2", label: "P2" },
  { period: "period_3", label: "P3" },
  { period: "period_4", label: "P4" },
  { period: "period_5", label: "P5" },
  { period: "period_6", label: "P6" },
  { period: "elective_1", label: "E1" },
  { period: "elective_2", label: "E2" },
  { period: "async", label: "Async" },
]

type PageProps = {
  searchParams: Promise<{ term?: string }>
}

export default async function TeachingGridPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const terms = await listTerms()
  const requestedTerm = raw.term
    ? terms.find((t) => t.id === raw.term)
    : terms.find((t) => t.is_current) ?? terms[0]

  if (!requestedTerm) {
    return (
      <div className="space-y-6">
        <AcademicsHeader active="teaching-grid" />
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No terms have been created yet. Set one up at{" "}
          <Link
            href="/admin/academics/terms"
            className="font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            Terms
          </Link>
          .
        </section>
      </div>
    )
  }

  const supabase = getServiceSupabase()
  const { data: sections, error } = await supabase
    .from("course_sections")
    .select(
      `id, section_code, period, room, modality, max_enrollment,
       course:courses(code, name),
       teacher:profiles(id, email, display_name, first_name, last_name, photo_path),
       enrollment_count:enrollments(count)`
    )
    .eq("term_id", requestedTerm.id)
    .order("period", { ascending: true, nullsFirst: false })
    .returns<SectionRow[]>()

  if (error) {
    throw new Error(`Failed to load sections: ${error.message}`)
  }

  // ---- Group by teacher ----
  type TeacherGroup = {
    key: string
    teacher: SectionRow["teacher"]
    sortName: string
    byPeriod: Map<SectionPeriod, SectionRow[]>
    asyncSections: SectionRow[]
  }
  const groups = new Map<string, TeacherGroup>()
  const unassigned: SectionRow[] = []

  for (const section of sections ?? []) {
    if (!section.teacher) {
      unassigned.push(section)
      continue
    }
    const key = section.teacher.id
    const sortName =
      `${section.teacher.last_name ?? ""} ${section.teacher.first_name ?? ""}`.trim() ||
      section.teacher.display_name ||
      section.teacher.email
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        teacher: section.teacher,
        sortName: sortName.toLowerCase(),
        byPeriod: new Map(),
        asyncSections: [],
      }
      groups.set(key, group)
    }
    if (!section.period) {
      // No period — treat as "unscheduled"; rare but worth surfacing.
      group.asyncSections.push(section)
      continue
    }
    const bucket = group.byPeriod.get(section.period) ?? []
    bucket.push(section)
    group.byPeriod.set(section.period, bucket)
  }

  const orderedGroups = [...groups.values()].sort((a, b) =>
    a.sortName.localeCompare(b.sortName)
  )

  return (
    <div className="space-y-6">
      <AcademicsHeader active="teaching-grid" />

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">
              Who&rsquo;s teaching what this term
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Each row is a teacher; columns are bell-schedule periods.
              Click a cell to open that section — roster, gradebook,
              attendance, announcements, all from there.
            </p>
          </div>
          <form className="flex items-end gap-2">
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Term</span>
              <select
                name="term"
                defaultValue={requestedTerm.id}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.is_current ? " · current" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              View
            </button>
          </form>
        </div>
      </section>

      {orderedGroups.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No sections in {requestedTerm.name} have a teacher assigned yet.
          {unassigned.length > 0 && (
            <>
              {" "}There are <strong>{unassigned.length}</strong> unassigned section
              {unassigned.length === 1 ? "" : "s"} below.
            </>
          )}
        </section>
      ) : (
        <section className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                  Teacher
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.period}
                    className="px-3 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-600"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedGroups.map((group) => {
                const teacherName =
                  `${group.teacher?.first_name ?? ""} ${group.teacher?.last_name ?? ""}`.trim() ||
                  group.teacher?.display_name ||
                  group.teacher?.email ||
                  "Unknown"
                return (
                  <tr key={group.key} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          photoUrl={profilePhotoUrl(group.teacher?.photo_path)}
                          initials={initialsFor({
                            first_name: group.teacher?.first_name,
                            last_name: group.teacher?.last_name,
                            display_name: group.teacher?.display_name,
                            email: group.teacher?.email,
                          })}
                          alt={teacherName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-navy">{teacherName}</p>
                          <p className="text-[11px] text-slate-500">
                            {group.teacher?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.period} className="px-3 py-3 align-top">
                        <CellContents
                          sections={group.byPeriod.get(col.period) ?? []}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {unassigned.length > 0 && (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
          <h3 className="text-base font-extrabold text-brand-navy">
            Unassigned sections ({unassigned.length})
          </h3>
          <p className="mt-1 text-xs text-slate-700">
            Sections in {requestedTerm.name} with no teacher. Assign one from
            the section page.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/academics/sections/${s.id}`}
                  className="block rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs transition hover:border-brand-navy/30 hover:shadow-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {s.course?.code ?? "??"} &middot; {s.course?.name ?? "(deleted course)"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {s.period ?? "no period"}
                    {s.section_code ? ` · Sec ${s.section_code}` : ""}
                    {s.room ? ` · Room ${s.room}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function CellContents({ sections }: { sections: SectionRow[] }) {
  if (sections.length === 0) {
    return <span className="text-[11px] text-slate-400">—</span>
  }
  return (
    <ul className="space-y-1.5">
      {sections.map((s) => {
        const enrollment = s.enrollment_count?.count ?? 0
        const capLabel =
          s.max_enrollment !== null && s.max_enrollment > 0
            ? `${enrollment}/${s.max_enrollment}`
            : `${enrollment}`
        return (
          <li key={s.id}>
            <Link
              href={`/admin/academics/sections/${s.id}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] leading-tight transition hover:border-brand-navy/30 hover:bg-white hover:shadow-sm"
              title={`${s.course?.name ?? "(deleted course)"}${s.section_code ? ` · Sec ${s.section_code}` : ""}${s.room ? ` · Room ${s.room}` : ""}`}
            >
              <p className="font-semibold text-brand-navy">
                {s.course?.code ?? "??"}
                {s.section_code ? ` · ${s.section_code}` : ""}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {capLabel} enrolled
                {s.room ? ` · ${s.room}` : ""}
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
