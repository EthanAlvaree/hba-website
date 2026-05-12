import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  listProfiles,
  profileListFilterSchema,
  profileRoleSchema,
  type ProfileRecord,
  type ProfileRole,
} from "@/lib/sis"
import {
  seedQualificationsFromBiosAction,
  signOutProfilesAdminAction,
  syncM365Action,
  updateProfileActiveAction,
  updateProfileRolesAction,
} from "./actions"

export const dynamic = "force-dynamic"

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

type ProfilesPageProps = {
  searchParams: Promise<{
    role?: string
    search?: string
    include_inactive?: string
    sync_ok?: string
    created?: string
    updated?: string
    skipped?: string
    filtered?: string
    sync_error?: string
    bio_seed_ok?: string
    bio_seed_error?: string
    bios_matched?: string
    bios_total?: string
    inserted?: string
    existing?: string
    no_profile_count?: string
    no_course_count?: string
    no_profile?: string
    no_course?: string
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
  const adminEmail = session?.user?.email ?? ""

  const raw = await searchParams
  const parsed = profileListFilterSchema.parse({
    role: raw.role ?? "all",
    search: raw.search ?? "",
    include_inactive: raw.include_inactive === "on",
  })

  const profiles = await listProfiles(parsed)

  const roleTabs: Array<{ label: string; value: ProfileRole | "all" }> = [
    { label: "All", value: "all" },
    { label: "Admins", value: "admin" },
    { label: "Faculty", value: "faculty" },
    { label: "Students", value: "student" },
    { label: "Parents", value: "parent" },
  ]

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Admin dashboard
              </p>
              <h1 className="text-4xl font-extrabold">Profiles</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-white/80">
                Identity records for every person in the SIS. Roles control
                what each account sees: admin → admin dashboard, faculty →
                future teacher tools, student → /portal, parent → /parent.
                The four bootstrap admin emails ({" "}
                <code className="font-mono text-xs">molly@</code>,{" "}
                <code className="font-mono text-xs">kristin@</code>,{" "}
                <code className="font-mono text-xs">ethan@</code>,{" "}
                <code className="font-mono text-xs">kun@</code>) always have
                admin access regardless of what&rsquo;s set here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85">
                Signed in as {adminEmail}
              </div>
              <Link
                href="/admin/applications"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Applications
              </Link>
              <Link
                href="/admin/students"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Students
              </Link>
              <Link
                href="/admin/academics"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Academics
              </Link>
              <Link
                href="/admin/contact-submissions"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Contact submissions
              </Link>
              <form action={signOutProfilesAdminAction}>
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

        {raw.sync_ok === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              M365 sync complete.
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Created {raw.created ?? 0} new profile(s), updated{" "}
              {raw.updated ?? 0}, left {raw.skipped ?? 0} unchanged. Filtered{" "}
              {raw.filtered ?? 0} non-HBA / mailbox-less account(s).
            </p>
          </section>
        )}

        {raw.sync_error && (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-rose-900">
              M365 sync failed.
            </p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
              {raw.sync_error}
            </p>
          </section>
        )}

        {raw.bio_seed_ok === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              Bio import complete.
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Matched {raw.bios_matched ?? 0} of {raw.bios_total ?? 0} bios to
              profiles. Inserted {raw.inserted ?? 0} new qualifications,{" "}
              {raw.existing ?? 0} already existed.
            </p>
            {(raw.no_profile_count && Number(raw.no_profile_count) > 0) && (
              <p className="mt-2 text-xs text-emerald-800">
                <strong>{raw.no_profile_count}</strong> bio(s) had no matching
                profile (no <code>firstname@highbluffacademy.com</code> in the
                DB yet): {raw.no_profile}
                {Number(raw.no_profile_count) > 8 && " … and more"}
              </p>
            )}
            {(raw.no_course_count && Number(raw.no_course_count) > 0) && (
              <p className="mt-2 text-xs text-emerald-800">
                <strong>{raw.no_course_count}</strong> bio course entries
                didn&rsquo;t match the catalog: {raw.no_course}
                {Number(raw.no_course_count) > 12 && " … and more"}
              </p>
            )}
          </section>
        )}

        {raw.bio_seed_error && (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-rose-900">Bio import failed.</p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">{raw.bio_seed_error}</p>
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-brand-navy">
                Sync from Microsoft 365
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pulls every @highbluffacademy.com mailbox from your tenant and
                creates/updates a profile row for each. Existing roles are
                preserved; new profiles start with empty roles and get
                role <code className="text-xs">faculty</code> backfilled on
                their first sign-in. Disabled M365 accounts are deactivated
                here too.
              </p>
            </div>
            <form action={syncM365Action}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Sync from M365
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-brand-navy">
                Seed teacher qualifications from bios
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Reads <code className="text-xs">lib/faculty.ts</code> and
                creates a <code className="text-xs">teacher_qualifications</code>{" "}
                row for every (faculty member × course) pair listed on their
                public bio. Matches bio → profile by first-name email
                (e.g. Ellen Sullivan → ellen@highbluffacademy.com); courses
                match the catalog by exact name. Idempotent &mdash; rows
                that already exist are left alone. Faculty can refine
                rank/notes on{" "}
                <code className="text-xs">/faculty-portal/teaching</code> after.
              </p>
            </div>
            <form action={seedQualificationsFromBiosAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Seed from bios
              </button>
            </form>
          </div>
        </section>

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

        <section className="space-y-3">
          {profiles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No profiles match these filters.
            </div>
          ) : (
            profiles.map((profile) => {
              const isBootstrapAdmin = isAllowedAdminEmail(profile.email)
              return (
                <details
                  key={profile.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition open:border-brand-navy/15 open:shadow-md"
                >
                  <summary className="list-none cursor-pointer px-5 py-4 sm:px-6">
                    <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_auto] lg:items-center">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {profileDisplay(profile)}
                          </h3>
                          {profile.roles.map((role) => (
                            <span
                              key={role}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${roleBadgeClass[role]}`}
                            >
                              {roleLabels[role]}
                            </span>
                          ))}
                          {isBootstrapAdmin && (
                            <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                              Bootstrap admin
                            </span>
                          )}
                          {!profile.active && (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {profile.email}
                          {profile.entra_oid ? " · Has M365 sign-in" : " · Not yet signed in"}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {profile.personal_email
                          ? `Personal: ${profile.personal_email}`
                          : ""}
                        {profile.mobile_phone && (
                          <>
                            {profile.personal_email ? " · " : ""}
                            {profile.mobile_phone}
                          </>
                        )}
                      </p>
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                        Edit
                      </span>
                    </div>
                  </summary>

                  <div className="space-y-5 border-t border-slate-200 px-5 py-5 sm:px-6">
                    <form action={updateProfileRolesAction} className="space-y-3">
                      <input type="hidden" name="id" value={profile.id} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Roles</p>
                        <p className="text-xs text-slate-500">
                          A profile can hold multiple roles. Faculty who are also
                          admins check both. The bootstrap admin list overrides
                          this for the four founder emails.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {profileRoleSchema.options.map((role) => (
                          <label
                            key={role}
                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              name="roles"
                              value={role}
                              defaultChecked={profile.roles.includes(role)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                            />
                            <span>{roleLabels[role]}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                      >
                        Save roles
                      </button>
                    </form>

                    <form action={updateProfileActiveAction} className="space-y-3">
                      <input type="hidden" name="id" value={profile.id} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Active</p>
                        <p className="text-xs text-slate-500">
                          Inactive profiles can&rsquo;t sign in. Useful for
                          alumni, departed staff, or accounts pending
                          investigation.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={profile.active}
                          className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                        />
                        <span>Account is active</span>
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                      >
                        Save active flag
                      </button>
                    </form>
                  </div>
                </details>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
