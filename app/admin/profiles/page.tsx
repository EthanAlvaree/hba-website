import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listProfiles,
  profileListFilterSchema,
  profileRoleSchema,
  type ProfileRecord,
  type ProfileRole,
} from "@/lib/sis"
import {
  deleteProfileAction,
  seedQualificationsFromBiosAction,
  setAdminRoleAction,
  syncM365Action,
  updateProfileActiveAction,
  updateProfileRolesAction,
} from "./actions"
import { ConfirmAction } from "./ConfirmAction"

// The "Save roles" checkbox form sets faculty / student / parent. Admin is
// promoted / demoted by the dedicated buttons (with confirmation) instead.
const nonAdminRoleOptions = profileRoleSchema.options.filter((r) => r !== "admin")

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
    photos_pulled?: string
    photos_failed?: string
    sync_error?: string
    deleted?: string
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
    error?: string
    role_ok?: string
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

  const roleTabs: Array<{ label: string; value: ProfileRole | "all" }> = [
    { label: "All", value: "all" },
    { label: "Admins", value: "admin" },
    { label: "Faculty", value: "faculty" },
    { label: "Students", value: "student" },
    { label: "Parents", value: "parent" },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">Profiles</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Identity records for every person in the SIS. Roles control what
          each account sees: admin → admin dashboard, faculty → faculty
          portal, student → /portal, parent → /parent. Any admin can promote
          or demote other admins; the system always keeps at least one active
          admin (the database refuses the operation that would leave zero).
        </p>
      </header>

        {raw.sync_ok === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              M365 sync complete.
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Created {raw.created ?? 0} new profile(s), updated{" "}
              {raw.updated ?? 0}, left {raw.skipped ?? 0} unchanged. Filtered{" "}
              {raw.filtered ?? 0} non-HBA / mailbox-less account(s).
              {raw.photos_pulled && Number(raw.photos_pulled) > 0 && (
                <>
                  {" "}Pulled <strong>{raw.photos_pulled}</strong> profile
                  photo(s) from M365.
                </>
              )}
              {raw.photos_failed && Number(raw.photos_failed) > 0 && (
                <>
                  {" "}<span className="text-amber-800">
                    {raw.photos_failed} photo(s) failed — see server logs.
                  </span>
                </>
              )}
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

        {raw.deleted === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              Profile deleted.
            </p>
          </section>
        )}

        {raw.role_ok === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              Admin role updated.
            </p>
          </section>
        )}

        {raw.error && (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-rose-900">
              Couldn&rsquo;t complete that action.
            </p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
              {raw.error}
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
              const isSelf = profile.email.toLowerCase() === currentAdminEmail
              const isAdminRole = profile.roles.includes("admin")
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
                          {isSelf && (
                            <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                              You
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
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Admin access</p>
                        <p className="text-xs text-slate-500">
                          Admins can see and edit everything in /admin. The
                          system always keeps at least one active admin —
                          removing the last one is refused at the database
                          level.
                        </p>
                      </div>
                      {isAdminRole ? (
                        <ConfirmAction
                          action={setAdminRoleAction}
                          fields={{ id: profile.id, make_admin: "no" }}
                          triggerLabel="Demote from admin"
                          title={isSelf ? "Demote yourself from admin?" : "Demote this admin?"}
                          confirmLabel={isSelf ? "Demote and sign out" : "Demote"}
                          variant="warning"
                          description={
                            isSelf ? (
                              <>
                                <p>
                                  This removes admin from <strong>{profile.email}</strong>.
                                </p>
                                <p className="mt-2">
                                  Because that&rsquo;s your own account,
                                  you&rsquo;ll be signed out immediately and
                                  lose access to <code>/admin</code>. You can
                                  still sign back in as your other roles
                                  (faculty / parent / student) if you have any.
                                </p>
                              </>
                            ) : (
                              <p>
                                This removes admin access from{" "}
                                <strong>{profile.email}</strong>. Their other
                                roles (faculty / parent / student) stay
                                intact. They&rsquo;ll be redirected to their
                                role-specific portal next time they sign in
                                or refresh.
                              </p>
                            )
                          }
                        />
                      ) : (
                        <ConfirmAction
                          action={setAdminRoleAction}
                          fields={{ id: profile.id, make_admin: "yes" }}
                          triggerLabel="Promote to admin"
                          title="Promote to admin?"
                          confirmLabel="Promote"
                          variant="primary"
                          description={
                            <p>
                              This grants <strong>{profile.email}</strong>{" "}
                              full admin access — they can manage applications,
                              students, course sections, the schedule, and
                              other admins (including demoting or deleting
                              you).
                            </p>
                          }
                        />
                      )}
                    </div>

                    <form action={updateProfileRolesAction} className="space-y-3">
                      <input type="hidden" name="id" value={profile.id} />
                      {/* Preserve the admin role across non-admin role edits. The
                          admin toggle has its own dedicated buttons above with
                          confirmation, so we shouldn't touch it here. */}
                      {isAdminRole && (
                        <input type="hidden" name="roles" value="admin" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Other roles</p>
                        <p className="text-xs text-slate-500">
                          A profile can hold multiple roles. Use these for
                          faculty / parent / student assignments. Admin is
                          managed by the Promote/Demote buttons above.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {nonAdminRoleOptions.map((role) => (
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

                    {!profile.active && (
                      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-rose-900">Hard delete</p>
                          <p className="text-xs text-rose-800">
                            Permanently removes this profile row. Refused if
                            the profile has a student record, parent_links,
                            or is the only active admin. Course sections
                            taught by this profile have the teacher cleared
                            automatically.
                          </p>
                        </div>
                        <ConfirmAction
                          action={deleteProfileAction}
                          fields={{ id: profile.id }}
                          triggerLabel="Delete forever"
                          title={isSelf ? "Delete your own profile?" : "Delete this profile?"}
                          confirmLabel={isSelf ? "Delete and sign out" : "Delete forever"}
                          variant="danger"
                          description={
                            isSelf ? (
                              <>
                                <p>
                                  This permanently removes{" "}
                                  <strong>{profile.email}</strong> from the
                                  profiles table.
                                </p>
                                <p className="mt-2">
                                  Because that&rsquo;s your own profile,
                                  you&rsquo;ll be signed out immediately and
                                  won&rsquo;t be able to sign back in unless
                                  the M365 mailbox seeds a fresh profile.
                                </p>
                              </>
                            ) : (
                              <p>
                                This permanently removes{" "}
                                <strong>{profile.email}</strong> from the
                                profiles table. This action cannot be undone.
                              </p>
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                </details>
              )
            })
          )}
        </section>
    </div>
  )
}
