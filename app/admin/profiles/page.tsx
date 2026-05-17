// app/admin/profiles/page.tsx
//
// Directory of every profile in the SIS. Compact roster — name, email,
// role chips, Active pill, and an "Open profile" button per row. All
// editing lives on /admin/profiles/[id].

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileRoleCounts,
  listProfiles,
  listProfileIdsWithStudentRecord,
  profileListFilterSchema,
  PROFILE_LIST_PAGE_SIZE,
  type ProfileRecord,
  type ProfileRole,
} from "@/lib/sis"
import Avatar from "@/components/ui/Avatar"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"
import { ProfileFiltersForm } from "./ProfileFiltersForm"

const roleLabels: Record<ProfileRole, string> = {
  admin: "Admin",
  faculty: "Faculty",
  student: "Student",
  parent: "Parent",
  shared_mailbox: "Shared mailbox",
}

const roleBadgeClass: Record<ProfileRole, string> = {
  admin: "border border-rose-200 bg-rose-50 text-rose-700",
  faculty: "border border-sky-200 bg-sky-50 text-sky-700",
  student: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  parent: "border border-violet-200 bg-violet-50 text-violet-700",
  shared_mailbox: "border border-slate-300 bg-slate-100 text-slate-700",
}

export const dynamic = "force-dynamic"

type ProfilesPageProps = {
  searchParams: Promise<{
    role?: string
    search?: string
    include_inactive?: string
    sort?: string
    page?: string
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
  sort: string
  page?: number
}) {
  const params = new URLSearchParams()
  if (filters.role !== "all") params.set("role", filters.role)
  if (filters.search.length > 0) params.set("search", filters.search)
  if (filters.include_inactive) params.set("include_inactive", "on")
  if (filters.sort && filters.sort !== "name_asc") params.set("sort", filters.sort)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
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
    sort: raw.sort ?? "name_asc",
    page: raw.page ?? "1",
  })

  const [listResult, roleCounts] = await Promise.all([
    listProfiles(parsed),
    getProfileRoleCounts({ include_inactive: parsed.include_inactive }),
  ])
  const { profiles, total, page, page_size } = listResult

  const studentRoleProfileIds = profiles
    .filter((p) => p.roles.includes("student"))
    .map((p) => p.id)
  const profileIdsWithStudent = await listProfileIdsWithStudentRecord(
    studentRoleProfileIds
  )

  const roleTabs: Array<{
    label: string
    value: ProfileRole | "all"
    count: number
  }> = [
    { label: "All", value: "all", count: roleCounts.all },
    { label: "Admins", value: "admin", count: roleCounts.admin },
    { label: "Faculty", value: "faculty", count: roleCounts.faculty },
    { label: "Students", value: "student", count: roleCounts.student },
    { label: "Parents", value: "parent", count: roleCounts.parent },
    {
      label: "Shared mailboxes",
      value: "shared_mailbox",
      count: roleCounts.shared_mailbox,
    },
  ]

  const totalPages = Math.max(1, Math.ceil(total / page_size))
  const firstShown = total === 0 ? 0 : (page - 1) * page_size + 1
  const lastShown = Math.min(total, page * page_size)

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
        <div className="flex flex-wrap items-center gap-2">
          {roleTabs.map((tab) => {
            const active = tab.value === parsed.role
            return (
              <Link
                key={tab.value}
                href={buildPath({
                  role: tab.value,
                  search: parsed.search,
                  include_inactive: parsed.include_inactive,
                  sort: parsed.sort,
                })}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count.toLocaleString()}
                </span>
              </Link>
            )
          })}
        </div>

        <ProfileFiltersForm
          defaultSearch={parsed.search}
          defaultIncludeInactive={parsed.include_inactive}
          defaultSort={parsed.sort}
        />
      </section>

      {/* Result count + pagination header */}
      <section className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-slate-600">
        <p>
          {total === 0 ? (
            <span>No profiles match these filters.</span>
          ) : (
            <span>
              Showing <strong className="text-slate-900">{firstShown.toLocaleString()}</strong>–
              <strong className="text-slate-900">{lastShown.toLocaleString()}</strong> of{" "}
              <strong className="text-slate-900">{total.toLocaleString()}</strong>
            </span>
          )}
        </p>
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            buildPageHref={(p) =>
              buildPath({
                role: parsed.role,
                search: parsed.search,
                include_inactive: parsed.include_inactive,
                sort: parsed.sort,
                page: p,
              })
            }
          />
        )}
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

            const detailHref = studentId
              ? `/admin/students/${studentId}`
              : `/admin/profiles/${profile.id}`

            return (
              <Link
                key={profile.id}
                href={detailHref}
                className="block rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
              >
                <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.4fr)_auto] lg:items-center">
                  <Avatar
                    photoUrl={profilePhotoUrl(profile.photo_path)}
                    initials={initialsFor({
                      first_name: profile.first_name,
                      last_name: profile.last_name,
                      display_name: profile.display_name,
                      email: profile.email,
                    })}
                    alt={profileDisplay(profile)}
                    size="md"
                  />
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
                    <span className="inline-flex items-center rounded-full bg-brand-navy px-4 py-1.5 text-xs font-semibold text-white">
                      {studentId ? "Open student →" : "Open profile →"}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </section>

      {/* Bottom pagination — same controls so admin doesn't have to scroll back up */}
      {totalPages > 1 && (
        <section className="flex justify-center">
          <Pagination
            page={page}
            totalPages={totalPages}
            buildPageHref={(p) =>
              buildPath({
                role: parsed.role,
                search: parsed.search,
                include_inactive: parsed.include_inactive,
                sort: parsed.sort,
                page: p,
              })
            }
          />
        </section>
      )}
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  buildPageHref,
}: {
  page: number
  totalPages: number
  buildPageHref: (page: number) => string
}) {
  const prev = page > 1 ? page - 1 : null
  const next = page < totalPages ? page + 1 : null

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
      {prev !== null ? (
        <Link
          href={buildPageHref(prev)}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-navy hover:bg-slate-100"
        >
          ← Prev
        </Link>
      ) : (
        <span className="rounded-full px-3 py-1.5 text-sm text-slate-300">
          ← Prev
        </span>
      )}
      <span className="text-xs text-slate-500">
        Page <strong className="text-slate-900">{page}</strong> of {totalPages}
      </span>
      {next !== null ? (
        <Link
          href={buildPageHref(next)}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-navy hover:bg-slate-100"
        >
          Next →
        </Link>
      ) : (
        <span className="rounded-full px-3 py-1.5 text-sm text-slate-300">
          Next →
        </span>
      )}
    </div>
  )
}
