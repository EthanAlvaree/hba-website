import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { getProfileByEmail, listStudentsForParent } from "@/lib/sis"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

async function signOutParentAction() {
  "use server"
  await signOut({ redirectTo: "/" })
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

  if (!profile.roles.includes("parent")) {
    // Not a parent. Send students to /portal, admins to admin dashboard,
    // everyone else home.
    if (profile.roles.includes("student")) redirect("/portal")
    if (session.isAdmin) redirect("/admin/contact-submissions")
    redirect("/")
  }

  const children = await listStudentsForParent(profile.id)
  const greetingName =
    profile.first_name?.trim() || profile.display_name?.trim() || profile.email

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Family portal
              </p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">
                Hello, {greetingName}.
              </h1>
              <p className="text-sm text-white/85">Signed in as {profile.email}</p>
            </div>
            <form action={signOutParentAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>

        {children.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            We don&rsquo;t have any students linked to your account yet. If you
            believe this is wrong, contact the office at{" "}
            <a
              href="mailto:info@highbluffacademy.com"
              className="font-semibold text-brand-navy underline-offset-4 hover:underline"
            >
              info@highbluffacademy.com
            </a>{" "}
            so we can sort it out.
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-brand-navy">Your children</h2>
            <p className="text-sm text-slate-600">
              Pick a student to see their schedule, current grades, and recent
              attendance.
            </p>

            {children.map(({ link_id, student, parent_link }) => {
              const displayName = student.preferred_name?.trim()
                ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
                : `${student.legal_first_name} ${student.legal_last_name}`

              return (
                <Link
                  key={link_id}
                  href={`/parent/students/${student.id}`}
                  className="block rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
                >
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto] sm:items-center">
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
      </div>
    </main>
  )
}
