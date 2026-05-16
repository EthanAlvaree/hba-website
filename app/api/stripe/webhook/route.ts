// Stripe webhook receiver — the authoritative event source for
// registration-fee payments. Stripe POSTs `checkout.session.completed`
// here when a family completes (or coupon-discounts to $0) the hosted
// Payment Link. We mark the application paid and fire the admin
// notification + family confirmation emails.
//
// Configure in Stripe: Developers → Webhooks → Add endpoint
//   URL:     https://www.highbluffacademy.com/api/stripe/webhook
//   Events:  checkout.session.completed
//   Signing secret → env var STRIPE_WEBHOOK_SECRET
//
// The endpoint is public by design (Stripe needs to reach it) but only
// requests with a valid Stripe-Signature header (HMAC-signed with the
// webhook secret) are accepted.

import { NextResponse } from "next/server"
import { markApplicationPaid } from "@/lib/applications"
import { provisionAndEnrollFromApplication } from "@/lib/enrollment"
import {
  sendApplicationNotification,
  sendApplicationSubmittedConfirmation,
} from "@/lib/graph"
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe"
import type Stripe from "stripe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret()
  if (!webhookSecret) {
    console.error(
      "[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured."
    )
    return NextResponse.json(
      { ok: false, error: "Webhook secret not configured." },
      { status: 503 }
    )
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing Stripe-Signature header." },
      { status: 400 }
    )
  }

  // Stripe signs the raw body; we MUST verify against the raw bytes,
  // not a JSON-parsed object. Reading text() preserves the raw payload.
  const rawBody = await request.text()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[stripe-webhook] signature verification failed:", message)
    return NextResponse.json(
      { ok: false, error: `Signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  // Only the events the apply flow cares about. Other event types are
  // accepted (200) but ignored — Stripe re-delivers non-200 responses.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: event.type })
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== "paid") {
    // Coupons that bring the total to $0 still come through with
    // payment_status === "paid", so this branch only catches genuinely
    // unpaid sessions (e.g. async bank debits that haven't cleared).
    return NextResponse.json({
      ok: true,
      ignored: `payment_status=${session.payment_status}`,
    })
  }

  const applicationId = session.client_reference_id
  if (!applicationId) {
    console.error(
      "[stripe-webhook] checkout.session.completed missing client_reference_id",
      { session_id: session.id }
    )
    return NextResponse.json(
      { ok: false, error: "Missing client_reference_id on session." },
      { status: 400 }
    )
  }

  let application
  try {
    application = await markApplicationPaid({
      application_id: applicationId,
      stripe_session_id: session.id,
    })
  } catch (err) {
    console.error("[stripe-webhook] markApplicationPaid threw:", err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }

  if (!application) {
    // Already paid (idempotent re-delivery, or the success page beat us
    // to it). Nothing more to do.
    return NextResponse.json({ ok: true, status: "already_paid" })
  }

  // Send notifications — these are best-effort; the application is
  // already marked paid in the DB regardless of email outcome.
  try {
    await sendApplicationNotification(application)
  } catch (err) {
    console.error("[stripe-webhook] admin notification failed", err)
  }
  try {
    await sendApplicationSubmittedConfirmation({ application })
  } catch (err) {
    console.error("[stripe-webhook] family confirmation failed", err)
  }

  // Auto-enroll on payment: provision the M365 account + create student /
  // parent profiles + send the welcome email with temp password. Best-effort
  // — if anything fails (collision, Graph permission, transient network),
  // the application stays "paid + accepted" and the admin can finish via
  // the dashboard Enroll button. We still return 200 because the payment
  // event itself was processed successfully; a 5xx here would cause Stripe
  // to redeliver and double-fire notifications.
  try {
    await provisionAndEnrollFromApplication({
      application,
      actorEmail: "system:stripe-webhook",
    })
  } catch (err) {
    console.error("[stripe-webhook] auto-enroll failed", err)
  }

  return NextResponse.json({ ok: true, application_id: application.id })
}
