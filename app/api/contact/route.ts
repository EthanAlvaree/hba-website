import { NextResponse } from "next/server"
import {
  contactSubmissionRequestSchema,
  createContactSubmission,
} from "@/lib/contact-submissions"
import { sendContactNotification } from "@/lib/graph"
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"

export const dynamic = "force-dynamic"

const minimumSubmissionDelayMs = 1500
const maximumSubmissionAgeMs = 1000 * 60 * 60 * 24

// 5 contact submissions per IP per 10 minutes. A real prospective family
// wouldn't ever hit this; an attacker who got past Turnstile would.
const CONTACT_WINDOW_MS = 10 * 60 * 1000
const CONTACT_MAX_HITS = 5

export async function POST(request: Request) {
  try {
    // Apply rate limit BEFORE parsing the body so an attacker can't waste
    // our CPU on parsing. Turnstile + this combo means: bots get filtered
    // first, then humans-with-a-script get capped here.
    const ip = await clientIpFromHeaders()
    const limit = await checkRateLimit({
      key: `contact:ip:${ip}`,
      windowMs: CONTACT_WINDOW_MS,
      maxHits: CONTACT_MAX_HITS,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many submissions from your network. Please wait a few minutes and try again, or call the office directly.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      )
    }

    const formData = await request.formData()

    const websiteHoneypot = formData.get("website")
    if (typeof websiteHoneypot === "string" && websiteHoneypot.trim().length > 0) {
      return NextResponse.json({ success: true })
    }

    const parsed = contactSubmissionRequestSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      studentName: formData.get("studentName"),
      message: formData.get("message"),
      scheduleTour: formData.get("scheduleTour"),
      howDidYouHear: formData.get("howDidYouHear"),
      submittedAt: formData.get("submittedAt"),
      turnstileToken: formData.get("cf-turnstile-response"),
    })

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Please review the form and try again."

      return NextResponse.json({ success: false, error: firstError }, { status: 400 })
    }

    const submittedAtMs = Number(parsed.data.submittedAt)

    if (!Number.isFinite(submittedAtMs)) {
      return NextResponse.json({ success: false, error: "Submission metadata was invalid." }, { status: 400 })
    }

    const ageMs = Date.now() - submittedAtMs

    if (ageMs < minimumSubmissionDelayMs) {
      return NextResponse.json({ success: false, error: "Please wait a moment and try again." }, { status: 429 })
    }

    if (ageMs > maximumSubmissionAgeMs) {
      return NextResponse.json({ success: false, error: "This form expired. Please refresh the page and try again." }, { status: 400 })
    }

    const turnstileResult = await verifyTurnstileToken(parsed.data.turnstileToken)

    if (!turnstileResult.success) {
      console.error("Turnstile verification failed.", turnstileResult.errors)

      return NextResponse.json(
        { success: false, error: "Please complete the spam check and try again." },
        { status: 400 }
      )
    }

    const submission = await createContactSubmission(parsed.data)

    let notificationDelivered = true

    try {
      await sendContactNotification(submission)
    } catch (error) {
      notificationDelivered = false
      console.error("Contact notification email failed.", error)
    }

    return NextResponse.json({ success: true, notificationDelivered })
  } catch (error) {
    console.error("Contact submission failed.", error)

    return NextResponse.json(
      { success: false, error: "Something went wrong while sending your message. Please try again." },
      { status: 500 }
    )
  }
}