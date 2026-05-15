import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, listStudentsForParent } from "@/lib/sis"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"
import { signCalendarToken } from "@/lib/calendar-tokens"
import { siteConfig } from "@/lib/site"
import Avatar from "@/components/ui/Avatar"
import CalendarSubscribeCard from "./CalendarSubscribeCard"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

export default async function ParentPortalPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  // Layout already gates: only parents and admins reach here.
  const isParent = profile.roles.includes("parent")
  const isAdmin = session.isAdmin === true

  if (!isParent && !isAdmin) {
    if (profile.roles.includes("student")) redirect("/portal")
    if (profile.roles.includes("faculty")) redirect("/faculty-portal")
    redirect("/admin/sign-in")
  }

  // For admins without a parent role, listStudentsForParent returns empty
  // (no parent_links). That naturally hits the empty-state below and points
  // them to the admin students directory.
  const children = await listStudentsForParent(profile.id)
  const greetingName =
    profile.first_name?.trim() || profile.display_name?.trim() || profile.email

  // Personal calendar subscription URL. If no token secret is
  // configured (development with neither env var set), skip rendering
  // the card so the page still renders.
  let calendarSubscribeUrl: string | null = null
  try {
    if (children.length > 0) {
      const token = signCalendarToken(profile.id)
      calendarSubscribeUrl = `${siteConfig.url}/api/calendar/parent/${profile.id}?token=${token}`
    }
  } catch {
    calendarSubscribeUrl = null
  }

  return (
    <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Family portal
          </p>
          <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
            Hello, {greetingName}.
          </h1>
          <p className="text-sm text-slate-600">{profile.email}</p>
        </header>

        {children.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            {isAdmin && !isParent ? (
              <>
                <p>
                  You&rsquo;re an admin previewing the family portal. To see
                  what a specific parent sees, open a parent profile from the
                  Profiles directory and click their kid&rsquo;s record from
                  there.
                </p>
                <p className="mt-3">
                  <Link
                    href="/admin/profiles?role=parent"
                    className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                  >
                    Open Profiles directory →
                  </Link>
                </p>
              </>
            ) : (
              <>
                We don&rsquo;t have any students linked to your account yet. If
                you believe this is wrong, contact the office at{" "}
                <a
                  href={`mailto:${siteConfig.contact.infoEmail}`}
                  className="font-semibold text-brand-navy underline-offset-4 hover:underline"
                >
                  {siteConfig.contact.infoEmail}
                </a>{" "}
                so we can sort it out.
              </>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-brand-navy">Your children</h2>
            <p className="text-sm text-slate-600">
              Pick a student to see their schedule, current grades, and recent
              attendance.
            </p>

            {children.map(({ link_id, student, student_profile, parent_link }) => {
              const displayName = student.preferred_name?.trim()
                ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
                : `${student.legal_first_name} ${student.legal_last_name}`

              return (
                <Link
                  key={link_id}
                  href={`/parent/students/${student.id}`}
                  className="block rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
                >
                  <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.4fr)_auto] sm:items-center">
                    <Avatar
                      photoUrl={profilePhotoUrl(student_profile?.photo_path)}
                      initials={initialsFor({
                        first_name: student.legal_first_name,
                        last_name: student.legal_last_name,
                        display_name: student_profile?.display_name,
                        email: student_profile?.email,
                      })}
                      alt={displayName}
                      size="md"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-extrabold text-brand-navy">
                          {displayName}
                        </p>
                        {parent_link.is_homestay && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                            Homestay
                          </span>
                        )}
                        {parent_link.is_primary && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            Primary guardian
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {parent_link.relationship ?? "Guardian"}
                        {student.current_grade && (
                          <> &middot; Grade {student.current_grade}</>
                        )}
                        {student.registered_at_hba && (
                          <> &middot; Registered {formatDate(student.registered_at_hba)}</>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Sees grades: {parent_link.can_view_grades ? "yes" : "no"}{" "}
                      &middot; attendance:{" "}
                      {parent_link.can_view_attendance ? "yes" : "no"}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-brand-navy/20 px-3 py-1 text-xs font-semibold text-brand-navy">
                      Open →
                    </span>
                  </div>
                </Link>
              )
            })}
          </section>
        )}

        {calendarSubscribeUrl && (
          <CalendarSubscribeCard icsUrl={calendarSubscribeUrl} />
        )}
    </div>
  )
}
