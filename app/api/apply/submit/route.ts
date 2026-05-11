import { NextResponse } from "next/server"
import { z } from "zod"
import {
  applicationSubmitSchema,
  submitApplication,
} from "@/lib/applications"
import { sendApplicationNotification } from "@/lib/graph"
import { verifyTurnstileToken } from "@/lib/turnstile"

export const dynamic = "force-dynamic"

const minimumSubmissionDelayMs = 1500
const maximumSubmissionAgeMs = 1000 * 60 * 60 * 24

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as unknown

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      )
    }

    const raw = body as Record<string, unknown>

    if (typeof raw.website === "string" && raw.website.trim().length > 0) {
      return NextResponse.json({ success: true })
    }

    const submittedAtMs = Number(raw.submitted_at)

    if (!Number.isFinite(submittedAtMs)) {
      return NextResponse.json(
        { success: false, error: "Submission metadata was invalid." },
        { status: 400 }
      )
    }

    const ageMs = Date.now() - submittedAtMs

    if (ageMs < minimumSubmissionDelayMs) {
      return NextResponse.json(
        { success: false, error: "Please wait a moment and try again." },
        { status: 429 }
      )
    }

    if (ageMs > maximumSubmissionAgeMs) {
      return NextResponse.json(
        { success: false, error: "This form expired. Please refresh the page and try again." },
        { status: 400 }
      )
    }

    const parsed = applicationSubmitSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Please review the form and try again.",
        },
        { status: 400 }
      )
    }

    const turnstileResult = await verifyTurnstileToken(parsed.data.turnstile_token)

    if (!turnstileResult.success) {
      console.error("Turnstile verification failed (submit).", turnstileResult.errors)

      return NextResponse.json(
        { success: false, error: "Please complete the spam check and try again." },
        { status: 400 }
      )
    }

    const application = await submitApplication(parsed.data)

    let notificationDelivered = true

    try {
      await sendApplicationNotification(application)
    } catch (error) {
      notificationDelivered = false
      console.error("Application notification email failed.", error)
    }

    return NextResponse.json({
      success: true,
      application_id: application.id,
      notification_delivered: notificationDelivered,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Validation failed." },
        { status: 400 }
      )
    }

    console.error("Application submission failed.", error)

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while submitting your application. Please try again.",
      },
      { status: 500 }
    )
  }
}
