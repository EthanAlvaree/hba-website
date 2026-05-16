// app/admin/profiles/page.tsx
//
// Directory of every profile in the SIS. Used to be a heavy expand-in-place
// list with all editing forms inline; that got crowded once profiles grew a
// contact section, address, linked-students, etc. The directory is now a
// compact roster — name, email, role chips, Active pill, and an "Open
// profile" button per row. All editing lives on /admin/profiles/[id].

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listProfiles,
  listProfileIdsWithStudentRecord,
  profileListFilterSchema,
  type ProfileRecord,
  type ProfileRole,
} from "@/lib/sis"

const roleLabels: Record<ProfileRole, string> = {
  admin: "Admin",
  faculty: "Faculty",
  student: "Student",
  parent: "Parent",
}

const roleBadgeClass: Record<ProfileRole, string> = {
  admin: "border border-rose-200 bg-rose-50 text-rose-700",
  faculty: "border border-sky-200 bg-sky-50 text-sky-700",
  student: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  parent: "border border-violet-200 bg-violet-50 text-violet-700",
}

export const dynamic = "force-dynamic"

type ProfilesPageProps = {
  searchParams: Promise<{
    role?: string
    search?: string
    include_inactive?: string
    deleted?: string
    student_created?: string
    error?: string
    role_ok?: string
    update_request_sent?: string
  }>
}

function buildPath(filters: {
  role: ProfileRole | "all"
  search: string
  include_inactive: boolean
}) {
  const params = new URLSearchParams()
  if (filters.role !== "all") params.set("role", filters.role)
  if (filters.search.length > 0) params.set("search", filters.search)
  if (filters.include_inactive) params.set("include_inactive", "on")
  const qs = params.toString()
  return qs ? `/admin/profiles?${qs}` : "/admin/profiles"
}

function profileDisplay(profile: ProfileRecord): string {
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()
  return full || profile.display_name || profile.email
}

export default async function ProfilesAdminPage({ searchParams }: ProfilesPageProps) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const currentAdminEmail = (session.user?.email ?? "").toLowerCase()
  const raw = await searchParams
  const parsed = profileListFilterSchema.parse({
    role: raw.role ?? "all",
    search: raw.search ?? "",
    include_inactive: raw.include_inactive === "on",
  })

  const profiles = await listProfiles(parsed)

  // Map of student-role profile id → students row id, used to render a
  // direct "→ student" link on those rows.
  const studentRoleProfileIds = profiles
    .filter((p) => p.roles.includes("student"))
    .map((p) => p.id)
  const profileIdsWithStudent = await listProfileIdsWithStudentRecord(
    studentRoleProfileIds
  )

  const roleTabs: Array<{ label: string; value: ProfileRole | "all" }> = [
    { label: "All", value: "all" },
    { label: "Admins", value: "admin" },
    { label: "Faculty", value: "faculty" },
    { label: "Students", value: "student" },
    { label: "Parents", value: "parent" },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">Profiles</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Identity records for every person in the SIS. Roles control what
            each account sees: admin → admin dashboard, faculty → faculty
            portal, student → /portal, parent → /parent. Click any row to
            edit roles, contact info, or address.
          </p>
        </div>
        <Link
          href="/admin/tools"
          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
        >
          Admin tools →
        </Link>
      </header>

      {raw.deleted === "1" && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">Profile deleted.</p>
        </section>
      )}

      {raw.update_request_sent && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">
            Update request sent to {raw.update_request_sent}.
          </p>
        </section>
      )}

      {raw.student_created && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">
            Student record created — they now appear in{" "}
            <Link
              href={`/admin/students/${raw.student_created}`}
              className="underline"
            >
              the student directory
            </Link>
            .
          </p>
        </section>
      )}

      {raw.error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">
            Couldn&rsquo;t complete that action.
          </p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">{raw.error}</p>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {roleTabs.map((tab) => (
            <Link
              key={tab.value}
              href={buildPath({
                role: tab.value,
                search: parsed.search,
                include_inactive: parsed.include_inactive,
              })}
              className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab.value === parsed.role
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <form className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span className="block">Search</span>
            <input
              name="search"
              defaultValue={parsed.search}
              placeholder="Email, first name, last name, or display name"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
            />
          </label>
          {parsed.role !== "all" && <input type="hidden" name="role" value={parsed.role} />}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="include_inactive"
              defaultChecked={parsed.include_inactive}
              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>Include inactive</span>
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Search
          </button>
        </form>
      </section>

      <section className="space-y-2">
        {profiles.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            No profiles match these filters.
          </div>
        ) : (
          profiles.map((profile) => {
            const isSelf = profile.email.toLowerCase() === currentAdminEmail
            const studentId = profileIdsWithStudent.get(profile.id)
            const subtleSummary = [
              profile.personal_email ? `Personal: ${profile.personal_email}` : null,
              profile.mobile_phone,
            ]
              .filter(Boolean)
              .join(" · ")

            return (
              <Link
                key={profile.id}
                href={`/admin/profiles/${profile.id}`}
                className="block rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
              >
                <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto] lg:items-center">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {profileDisplay(profile)}
                      </h3>
                      {profile.roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${roleBadgeClass[role]}`}
                        >
                          {roleLabels[role]}
                        </span>
                      ))}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          profile.active
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {profile.active ? "Active" : "Inactive"}
                      </span>
                      {isSelf && (
                        <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                          You
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {profile.email}
                      {profile.entra_oid ? "" : " · Not yet signed in"}
                    </p>
                  </div>

                  <p className="truncate text-xs text-slate-500">{subtleSummary}</p>

                  <div className="flex items-center justify-end gap-2">
                    {studentId && (
                      <span
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
                        title="This profile is also a student record"
                      >
                        Student →
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-brand-navy px-4 py-1.5 text-xs font-semibold text-white">
                      Open profile →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
