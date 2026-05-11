import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  contactSubmissionStatusSchema,
  listContactSubmissions,
} from "@/lib/contact-submissions"
import {
  signOutAdminAction,
  updateContactSubmissionAction,
} from "./actions"

type ContactSubmissionsPageProps = {
  searchParams: Promise<{
    status?: string
    tour?: string
  }>
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export const dynamic = "force-dynamic"

export default async function ContactSubmissionsPage({ searchParams }: ContactSubmissionsPageProps) {
  const session = await auth()

  if (!isAllowedAdminEmail(session?.user?.email)) {
    redirect("/admin/sign-in")
  }

  const adminEmail = session?.user?.email ?? ""

  const params = await searchParams
  const parsedStatus = contactSubmissionStatusSchema.safeParse(params.status)
  const status = parsedStatus.success ? parsedStatus.data : "all"
  const tour = params.tour === "yes" || params.tour === "no" ? params.tour : "all"

  const submissions = await listContactSubmissions({ status, tour })

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Admin dashboard
              </p>
              <h1 className="text-4xl font-extrabold">Contact submissions</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80">
                Review new inquiries, keep notes for the office team, and mark each conversation as contacted or archived.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85">
                Signed in as {adminEmail}
              </div>
              <form action={signOutAdminAction}>
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

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] md:items-end">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Status</span>
              <select
                name="status"
                defaultValue={status}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Tour interest</span>
              <select
                name="tour"
                defaultValue={tour}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                <option value="all">All inquiries</option>
                <option value="yes">Tour requested</option>
                <option value="no">No tour requested</option>
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Apply filters
            </button>
          </form>
        </section>

        <section className="space-y-5">
          {submissions.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No submissions matched the current filters.
            </div>
          ) : (
            submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-brand-navy">
                        {submission.name}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {submission.status}
                      </span>
                      {submission.schedule_tour && (
                        <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                          Tour requested
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                      <span>{submission.email}</span>
                      <span>{submission.phone}</span>
                      <span>Student: {submission.student_name}</span>
                      <span>Received: {formatTimestamp(submission.created_at)}</span>
                    </div>

                    <p className="text-sm text-slate-500">
                      How they heard about HBA: {submission.how_did_you_hear ?? "Not provided"}
                    </p>

                    <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-700">
                      {submission.message}
                    </div>
                  </div>

                  <form action={updateContactSubmissionAction} className="w-full max-w-md space-y-4">
                    <input type="hidden" name="id" value={submission.id} />

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span className="block">Status</span>
                      <select
                        name="status"
                        defaultValue={submission.status}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span className="block">Notes</span>
                      <textarea
                        name="notes"
                        rows={6}
                        defaultValue={submission.notes ?? ""}
                        className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                      />
                    </label>

                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      Save changes
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}