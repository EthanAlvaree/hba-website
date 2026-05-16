import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listProfiles,
  listProfileIdsWithStudentRecord,
  listStudentsLinkedToParent,
  profileListFilterSchema,
  type ProfileRecord,
  type ProfileRole,
} from "@/lib/sis"
import {
  deleteProfileAction,
  saveProfileAction,
  updateProfileContactAction,
} from "./actions"
import { ConfirmAction } from "./ConfirmAction"

// Order the role checkboxes the way the office thinks about them, not the
// way the enum happens to be declared.
const roleOrder: ProfileRole[] = ["student", "parent", "faculty", "admin"]

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
    deleted?: string
    student_created?: string
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

  // Map of student-role profile id → students row id, so a profile card
  // can link straight to that student's detail page.
  const studentRoleProfileIds = profiles
    .filter((p) => p.roles.includes("student"))
    .map((p) => p.id)
  const profileIdsWithStudent = await listProfileIdsWithStudentRecord(
    studentRoleProfileIds
  )

  // For every parent on the page, fetch their linked students so the card
  // can render quick links into each child's /admin/students detail page.
  // One round-trip per parent is fine on this page — the list is paginated
  // server-side via filters and admins typically scroll a handful at once.
  const parentRoleProfileIds = profiles
    .filter((p) => p.roles.includes("parent"))
    .map((p) => p.id)
  const linkedStudentsByParent = new Map<
    string,
    Awaited<ReturnType<typeof listStudentsLinkedToParent>>
  >()
  await Promise.all(
    parentRoleProfileIds.map(async (parentId) => {
      linkedStudentsByParent.set(
        parentId,
        await listStudentsLinkedToParent(parentId)
      )
    })
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
            portal, student → /portal, parent → /parent. Any admin can
            promote or demote other admins; the system always keeps at
            least one active admin (the database refuses the operation that
            would leave zero).
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
            <p className="text-sm font-semibold text-emerald-900">
              Profile deleted.
            </p>
          </section>
        )}

        {raw.role_ok === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              Profile saved.
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
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
              {raw.error}
            </p>
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

        <section className="space-y-3">
          {profiles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No profiles match these filters.
            </div>
          ) : (
            profiles.map((profile) => {
              const isSelf = profile.email.toLowerCase() === currentAdminEmail
              const studentId = profileIdsWithStudent.get(profile.id)
              const linkedStudents = linkedStudentsByParent.get(profile.id) ?? []
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
                    <form action={saveProfileAction} className="space-y-4">
                      <input type="hidden" name="id" value={profile.id} />

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Roles
                          </p>
                          <p className="text-xs text-slate-500">
                            A profile can hold more than one role. Checking{" "}
                            <strong>Student</strong> also creates a row in the
                            students table (so they appear in{" "}
                            <code>/admin/students</code> and can be enrolled);
                            unchecking it leaves that record alone — use the
                            Withdraw flow to remove it. Checking{" "}
                            <strong>Admin</strong> grants full <code>/admin</code>{" "}
                            access. The system always keeps at least one active
                            admin — removing the last one is refused at the
                            database level.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {roleOrder.map((role) => (
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
                      </div>

                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            name="active"
                            defaultChecked={profile.active}
                            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                          />
                          <span className="font-semibold text-slate-900">
                            Account is active
                          </span>
                        </label>
                        <p className="text-xs text-slate-500">
                          Inactive profiles can&rsquo;t sign in. Useful for
                          alumni, departed staff, or accounts pending
                          investigation.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                      >
                        Save
                      </button>
                    </form>

                    <form
                      action={updateProfileContactAction}
                      className="space-y-4 border-t border-slate-200 pt-4"
                    >
                      <input type="hidden" name="id" value={profile.id} />
                      <p className="text-sm font-semibold text-slate-900">Contact info</p>
                      <p className="text-xs text-slate-500">
                        Name, phones, and personal email. Sign-in email
                        ({profile.email}) is fixed by Microsoft and can&rsquo;t
                        be changed here.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-xs font-medium text-slate-700">
                          <span className="block">First name</span>
                          <input
                            name="first_name"
                            defaultValue={profile.first_name ?? ""}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-slate-700">
                          <span className="block">Last name</span>
                          <input
                            name="last_name"
                            defaultValue={profile.last_name ?? ""}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
                          <span className="block">
                            Display name (overrides first + last when set)
                          </span>
                          <input
                            name="display_name"
                            defaultValue={profile.display_name ?? ""}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-slate-700">
                          <span className="block">Mobile phone</span>
                          <input
                            name="mobile_phone"
                            type="tel"
                            defaultValue={profile.mobile_phone ?? ""}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-slate-700">
                          <span className="block">Work phone</span>
                          <input
                            name="work_phone"
                            type="tel"
                            defaultValue={profile.work_phone ?? ""}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
                          <span className="block">
                            Personal email (separate from sign-in email)
                          </span>
                          <input
                            name="personal_email"
                            type="email"
                            defaultValue={profile.personal_email ?? ""}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Mailing address
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
                            <span className="block">Street address</span>
                            <input
                              name="address_line1"
                              defaultValue={profile.address_line1 ?? ""}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
                            <span className="block">Apartment / suite (optional)</span>
                            <input
                              name="address_line2"
                              defaultValue={profile.address_line2 ?? ""}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">
                            <span className="block">City</span>
                            <input
                              name="address_city"
                              defaultValue={profile.address_city ?? ""}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">
                            <span className="block">State / region</span>
                            <input
                              name="address_region"
                              defaultValue={profile.address_region ?? ""}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">
                            <span className="block">Postal code</span>
                            <input
                              name="address_postal_code"
                              defaultValue={profile.address_postal_code ?? ""}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">
                            <span className="block">Country</span>
                            <input
                              name="address_country"
                              defaultValue={profile.address_country ?? ""}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                      >
                        Save contact info
                      </button>
                    </form>

                    {profile.roles.includes("parent") && (
                      <div className="space-y-2 border-t border-slate-200 pt-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Linked students
                        </p>
                        {linkedStudents.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No students currently linked to this parent. Links
                            are created automatically when an application is
                            enrolled, or manually via{" "}
                            <Link
                              href="/admin/students/import-parents"
                              className="font-semibold text-brand-navy underline hover:text-brand-orange"
                            >
                              import parents
                            </Link>
                            .
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {linkedStudents.map((link) => {
                              const display =
                                link.preferred_name?.trim() ||
                                `${link.legal_first_name} ${link.legal_last_name}`.trim()
                              return (
                                <li
                                  key={link.student_id}
                                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
                                >
                                  <Link
                                    href={`/admin/students/${link.student_id}`}
                                    className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
                                  >
                                    {display} →
                                  </Link>
                                  {link.relationship && (
                                    <span className="text-xs text-slate-600">
                                      ({link.relationship})
                                    </span>
                                  )}
                                  {link.is_primary && (
                                    <span className="rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
                                      Primary
                                    </span>
                                  )}
                                  {link.status !== "active" && (
                                    <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                      {link.status}
                                    </span>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}

                    {profile.roles.includes("faculty") && (
                      <div className="space-y-2 border-t border-slate-200 pt-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Faculty editor
                        </p>
                        <p className="text-xs text-slate-500">
                          Edit on this faculty member&rsquo;s behalf — public
                          bio + portrait, plus the scheduler inputs the office
                          team typically tunes (which courses, which periods,
                          workload caps).
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/profiles/${profile.id}/bio`}
                            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                          >
                            Manage public bio →
                          </Link>
                          <Link
                            href={`/admin/profiles/${profile.id}/teaching`}
                            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                          >
                            Teaching preferences →
                          </Link>
                        </div>
                      </div>
                    )}

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

                    {studentId && (
                      <div className="flex justify-end border-t border-slate-200 pt-4">
                        <Link
                          href={`/admin/students/${studentId}`}
                          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                        >
                          Open student profile →
                        </Link>
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
