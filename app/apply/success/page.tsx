// Post-payment confirmation page. Stripe redirects here after the
// family completes the hosted Payment Link, with the session id
// appended as a query string (configured per the Payment Link's
// "After payment" → custom URL in the Stripe dashboard).
//
// We don't strictly need the session id to render — the webhook is
// the canonical event that marks the application paid. But we DO use
// it for a defensive belt-and-suspenders update: if the webhook is
// slow or hasn't fired yet, we look up the session via the Stripe
// API and mark the application paid here too. The markApplicationPaid
// helper is idempotent so a double-call is safe.

import Link from "next/link"
import { markApplicationPaid } from "@/lib/applications"
import {
  sendApplicationNotification,
  sendApplicationSubmittedConfirmation,
} from "@/lib/graph"
import { siteConfig } from "@/lib/site"
import { getStripeClient } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export const metadata = {
  title: `Application received — ${siteConfig.name}`,
  description: `Your application and registration fee have been received. Here's what happens next.`,
}

type PageProps = {
  searchParams: Promise<{ session_id?: string }>
}

async function tryMarkPaidFromSession(sessionId: string | undefined) {
  if (!sessionId) return
  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (
      session.payment_status !== "paid" ||
      !session.client_reference_id
    ) {
      return
    }
    const result = await markApplicationPaid({
      application_id: session.client_reference_id,
      stripe_session_id: session.id,
    })
    if (result) {
      // We were the first to confirm — webhook hadn't fired yet. Send
      // the notifications now so the office isn't waiting on a webhook
      // delay (idempotent vs. webhook because markApplicationPaid
      // returns null on second call → notifications skipped).
      try {
        await sendApplicationNotification(result)
      } catch (err) {
        console.error("[apply/success] admin notification failed", err)
      }
      try {
        await sendApplicationSubmittedConfirmation({ application: result })
      } catch (err) {
        console.error("[apply/success] family confirmation failed", err)
      }
    }
  } catch (err) {
    // Stripe lookup or DB write failed; the webhook is still the
    // authoritative path. Surface to logs but don't fail the page —
    // the family already paid; they should see the success view.
    console.error("[apply/success] defensive session lookup failed", err)
  }
}

export default async function ApplySuccessPage({ searchParams }: PageProps) {
  const raw = await searchParams
  // Defensive: try to mark paid here too. Most of the time the webhook
  // beats this; that's fine, markApplicationPaid is idempotent.
  await tryMarkPaidFromSession(raw.session_id)

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="max-w-3xl mx-auto px-6 lg:px-12 py-20">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-8 py-12 shadow-sm text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Payment received
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy sm:text-4xl">
            You&rsquo;re in the queue.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-700 leading-relaxed">
            Thanks — we received your application and the $350 registration
            fee. A confirmation email is on its way; you&rsquo;ll also
            receive a Stripe receipt separately. If anything seems off,
            reply to either email and we&rsquo;ll sort it.
          </p>
        </div>

        <div className="mt-10 space-y-4 text-left">
          <h2 className="text-center text-sm font-bold uppercase tracking-[0.18em] text-brand-orange">
            What to expect next
          </h2>
          <ol className="space-y-3 text-sm leading-relaxed text-slate-800">
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                1
              </span>
              <div>
                <strong className="font-semibold">
                  Within one business day:
                </strong>{" "}
                the admissions team reviews your application and reaches out
                by email to schedule a conversation.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                2
              </span>
              <div>
                <strong className="font-semibold">Campus visit:</strong> if
                it&rsquo;s a good fit on both sides, we&rsquo;ll invite you
                to tour the campus, meet faculty, and talk through schedules
                and academics.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                3
              </span>
              <div>
                <strong className="font-semibold">
                  Admissions decision & enrollment:
                </strong>{" "}
                we&rsquo;ll communicate a decision and, if accepted, walk
                you through the enrollment paperwork and post-enrollment
                file.
              </div>
            </li>
          </ol>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-6 py-3 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            ← Back to {siteConfig.shortName}
          </Link>
        </div>
      </section>
    </main>
  )
}
