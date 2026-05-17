// app/admin/profiles/[id]/page.tsx
//
// Dedicated profile detail page. Holds every heavy edit surface that used
// to expand inline on /admin/profiles — roles, active flag, contact info,
// mailing address, parent-only sections (linked students, "request
// update"), faculty editor links, and the hard delete card. The directory
// at /admin/profiles is now a clean roster that links each row here.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileById,
  getStudentByProfileId,
  listStudentsLinkedToParent,
  type ProfileRecord,
  type ProfileRole,
} from "@/lib/sis"
import {
  deleteProfileAction,
  requestProfileUpdateFromFamilyAction,
  saveProfileAction,
  updateProfileContactAction,
} from "../actions"
import { ConfirmAction } from "../ConfirmAction"

export const dynamic = "force-dynamic"

const roleOrder: ProfileRole[] = [
  "student",
  "parent",
  "faculty",
  "admin",
  "shared_mailbox",
]

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

function profileDisplay(profile: ProfileRecord): string {
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()
  return full || profile.display_name || profile.email
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    contact_saved?: string
    role_ok?: string
    update_request_sent?: string
    error?: string
  }>
}

export default async function ProfileDetailPage({ params, searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id } = await params
  const profile = await getProfileById(id)
  if (!profile) notFound()

  const raw = await searchParams
  const currentAdminEmail = (session.user?.email ?? "").toLowerCase()
  const isSelf = profile.email.toLowerCase() === currentAdminEmail
  const detailPath = `/admin/profiles/${profile.id}`

  // For students, the student detail page is the canonical rich view —
  // photo, tags, parent_links, enrollments, post-enrollment file, all
  // of it. Showing this thinner profile-only page in addition just
  // forces an extra click. Redirect there directly. Admin/faculty/parent
  // profiles stay on this page.
  const linkedStudentRecord = await getStudentByProfileId(profile.id)
  if (linkedStudentRecord) {
    redirect(`/admin/students/${linkedStudentRecord.id}`)
  }

  const linkedStudents = profile.roles.includes("parent")
    ? await listStudentsLinkedToParent(profile.id)
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <Link
          href="/admin/profiles"
          className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
        >
          ← All profiles
        </Link>
      </div>

      <header className="space-y-3 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            {profileDisplay(profile)}
          </h1>
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
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              profile.active
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {profile.active ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {profile.email}
          {profile.entra_oid ? " · Has M365 sign-in" : " · Not yet signed in"}
        </p>
      </header>

      {raw.contact_saved === "1" && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-3">
          <p className="text-sm font-semibold text-emerald-900">Contact info saved.</p>
        </section>
      )}
      {raw.role_ok === "1" && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-3">
          <p className="text-sm font-semibold text-emerald-900">Profile saved.</p>
        </section>
      )}
      {raw.update_request_sent && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-3">
          <p className="text-sm font-semibold text-emerald-900">
            Update request sent to {raw.update_request_sent}.
          </p>
        </section>
      )}
      {raw.error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4">
          <p className="text-sm font-semibold text-rose-900">
            Couldn&rsquo;t complete that action.
          </p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">{raw.error}</p>
        </section>
      )}

      {/* Faculty-only quick links to the dedicated bio + teaching editors */}
      {profile.roles.includes("faculty") && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Faculty editors
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/admin/profiles/${profile.id}/bio`}
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              Public bio →
            </Link>
            <Link
              href={`/admin/profiles/${profile.id}/teaching`}
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              Teaching preferences →
            </Link>
          </div>
        </section>
      )}

      {/* Roles + active */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <form action={saveProfileAction} className="space-y-5">
          <input type="hidden" name="id" value={profile.id} />
          <input type="hidden" name="redirectTo" value={detailPath} />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Roles</p>
            <p className="text-xs text-slate-500">
              A profile can hold more than one role. Checking{" "}
              <strong>Student</strong> also creates a row in the students
              table (so they appear in <code>/admin/students</code> and can be
              enrolled); unchecking it leaves that record alone — use the
              Withdraw flow to remove it. Checking <strong>Admin</strong>{" "}
              grants full <code>/admin</code> access. The system always keeps
              at least one active admin — removing the last one is refused at
              the database level.
            </p>
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

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked={profile.active}
              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span className="font-semibold text-slate-900">Account is active</span>
            <span className="text-xs text-slate-500">
              · Inactive profiles can&rsquo;t sign in
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Save roles &amp; active
          </button>
        </form>
      </section>

      {/* Contact + address */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <form action={updateProfileContactAction} className="space-y-5">
          <input type="hidden" name="id" value={profile.id} />
          <input type="hidden" name="redirectTo" value={detailPath} />

          <div>
            <p className="text-sm font-semibold text-slate-900">Contact info</p>
            <p className="text-xs text-slate-500">
              Name, phones, personal email, mailing address. Sign-in email
              ({profile.email}) is fixed by Microsoft and can&rsquo;t be
              changed here.
            </p>
          </div>

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

          <div className="space-y-2 border-t border-slate-100 pt-4">
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
      </section>

      {/* Parent-only sections */}
      {profile.roles.includes("parent") && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <form
            action={requestProfileUpdateFromFamilyAction}
            className="space-y-3"
          >
            <input type="hidden" name="id" value={profile.id} />
            <input type="hidden" name="redirectTo" value={detailPath} />
            <p className="text-sm font-semibold text-slate-900">
              Request profile update from family
            </p>
            <p className="text-xs text-slate-500">
              Emails this parent a link to <code>/parent/profile</code> where
              they can review and update their own contact info plus their
              children&rsquo;s demographics. Useful for migrating legacy SIS
              data and for annual data-freshness sweeps.
            </p>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">
                Optional note (quoted verbatim in the email)
              </span>
              <textarea
                name="note"
                rows={2}
                placeholder="e.g. We're migrating to a new SIS — please confirm your info still looks right."
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-brand-orange/40 bg-brand-orange/10 px-4 py-2 text-xs font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
            >
              Send update request
            </button>
          </form>
        </section>
      )}

      {profile.roles.includes("parent") && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Linked students</p>
          {linkedStudents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No students currently linked to this parent. Links are created
              automatically when an application is enrolled, or manually via{" "}
              <Link
                href="/admin/students/import-parents"
                className="font-semibold text-brand-navy underline hover:text-brand-orange"
              >
                import parents
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
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
        </section>
      )}

      {/* Hard delete (always visible now — FK guards do the real protection) */}
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50/40 px-6 py-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-900">Hard delete</p>
        <p className="mt-1 text-xs text-rose-800">
          Permanently removes this profile row. Refused if the profile is
          linked as a parent to any student, has its own student record, or
          is the only active admin. Course sections taught by this profile
          have the teacher cleared automatically.
        </p>
        <div className="mt-3">
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
                    This permanently removes <strong>{profile.email}</strong>{" "}
                    from the profiles table.
                  </p>
                  <p className="mt-2">
                    Because that&rsquo;s your own profile, you&rsquo;ll be
                    signed out immediately and won&rsquo;t be able to sign back
                    in unless the M365 mailbox seeds a fresh profile.
                  </p>
                </>
              ) : (
                <p>
                  This permanently removes <strong>{profile.email}</strong>{" "}
                  from the profiles table. This action cannot be undone.
                </p>
              )
            }
          />
        </div>
      </section>
    </div>
  )
}
