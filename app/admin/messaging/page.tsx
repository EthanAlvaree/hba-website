import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { MessagingClient } from "./MessagingClient"
import {
  cancelScheduledMassEmailAction,
  getMassEmailSenderDescriptor,
} from "./actions"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

export default async function MessagingPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const sender = await getMassEmailSenderDescriptor()
  const supabase = getServiceSupabase()

  const [sections, history, scheduled] = await Promise.all([
    supabase
      .from("course_sections")
      .select(
        `id, section_code,
         course:courses(code, name),
         term:terms!inner(is_current)`
      )
      .eq("term.is_current", true)
      .returns<
        Array<{
          id: string
          section_code: string | null
          course: { code: string; name: string } | null
          term: { is_current: boolean } | null
        }>
      >(),
    supabase
      .from("sent_mass_emails")
      .select(
        "id, created_at, subject, cohort_audience, cohort_grade, sender_email, recipient_count, sent_count, failed_count, sent_by_email"
      )
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<
        Array<{
          id: string
          created_at: string
          subject: string
          cohort_audience: string
          cohort_grade: string | null
          sender_email: string
          recipient_count: number
          sent_count: number
          failed_count: number
          sent_by_email: string
        }>
      >(),
    supabase
      .from("scheduled_mass_emails")
      .select(
        "id, scheduled_for, subject, cohort_audience, cohort_grade, sender_email, created_by_email, status, failure_reason"
      )
      .in("status", ["pending", "sending", "failed"])
      .order("scheduled_for", { ascending: true })
      .returns<
        Array<{
          id: string
          scheduled_for: string
          subject: string
          cohort_audience: string
          cohort_grade: string | null
          sender_email: string
          created_by_email: string
          status: string
          failure_reason: string | null
        }>
      >(),
  ])

  const sectionOptions =
    (sections.data ?? [])
      .map((s) => ({
        id: s.id,
        label: `${s.course?.code ?? ""} — ${s.course?.name ?? "(deleted)"}${s.section_code ? ` · Sec ${s.section_code}` : ""}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? []

  const scheduledRows = scheduled.data ?? []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">Messaging</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Send a single message to a cohort: parents in 11th grade, students
          in a particular section, or all-school announcements. Pick a
          cohort, preview the recipient count, then compose and confirm —
          or schedule it for a specific date and time.
        </p>
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong className="font-semibold">Sends from {sender.address}.</strong>{" "}
          Replies route back to this shared mailbox (delegated to the office
          team in Outlook). Each recipient gets a single message — no CC, no
          BCC, no leaked recipient lists — and a school-branded footer is
          appended automatically.
        </p>
      </header>

      <MessagingClient
        sectionOptions={sectionOptions}
        senderAddress={sender.address}
        senderLabel={sender.label}
      />

      {scheduledRows.length > 0 && (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50/40 px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Scheduled to send
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Queued for later dispatch. The cron runs every 5 minutes, so
            actual send time may drift a few minutes past the scheduled
            time.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {scheduledRows.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-amber-200 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {row.subject}
                  </p>
                  <p className="text-xs text-slate-600">
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: pacific,
                    }).format(new Date(row.scheduled_for))}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Audience: <strong>{row.cohort_audience}</strong>
                  {row.cohort_grade && <> · grade {row.cohort_grade}</>} ·
                  scheduled by {row.created_by_email}
                  {row.status === "sending" && (
                    <> · <strong className="text-amber-800">dispatching now…</strong></>
                  )}
                  {row.status === "failed" && row.failure_reason && (
                    <>
                      {" · "}
                      <span className="text-rose-700">
                        Failed: {row.failure_reason}
                      </span>
                    </>
                  )}
                </p>
                {row.status === "pending" && (
                  <form
                    action={cancelScheduledMassEmailAction}
                    className="mt-2"
                  >
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-rose-700 underline-offset-4 hover:underline"
                    >
                      Cancel this scheduled send
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(history.data ?? []).length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-brand-navy">Recent sends</h2>
          <p className="mt-1 text-sm text-slate-600">
            Last 25 mass emails sent from this page.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {(history.data ?? []).map((h) => (
              <li
                key={h.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{h.subject}</p>
                  <p className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: pacific,
                    }).format(new Date(h.created_at))}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Audience: <strong>{h.cohort_audience}</strong>
                  {h.cohort_grade && <> · grade {h.cohort_grade}</>} ·{" "}
                  {h.sent_count} sent
                  {h.failed_count > 0 && (
                    <>
                      , <span className="text-rose-700">{h.failed_count} failed</span>
                    </>
                  )}{" "}
                  · by {h.sent_by_email}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
