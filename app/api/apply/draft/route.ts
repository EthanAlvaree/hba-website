import { NextResponse } from "next/server"
import { z } from "zod"
import {
  applicationDraftSchema,
  createApplicationDraft,
  updateApplicationDraft,
} from "@/lib/applications"
import { sendApplicationDraftMagicLink } from "@/lib/graph"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

const minimumSubmissionDelayMs = 1500
const maximumSubmissionAgeMs = 1000 * 60 * 60 * 24

function buildResumeUrl(token: string) {
  return `${siteConfig.url}/apply?draft=${encodeURIComponent(token)}`
}

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

    const submittedAtRaw = typeof raw.submitted_at === "string" ? raw.submitted_at : ""
    const submittedAtMs = Number(submittedAtRaw)
    const hasTiming = Number.isFinite(submittedAtMs) && submittedAtMs > 0

    if (hasTiming) {
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
    }

    const parsed = applicationDraftSchema.safeParse(raw)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { success: false, error: issue?.message ?? "Please review the form and try again." },
        { status: 400 }
      )
    }

    const input = parsed.data

    if (input.draft_token) {
      const updated = await updateApplicationDraft(input.draft_token, input)

      return NextResponse.json({
        success: true,
        draft_token: updated.draft_token,
        draft_email: updated.draft_email,
        magic_link_sent: false,
      })
    }

    if (!input.draft_email) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide the parent/guardian email so we can send your resume link.",
        },
        { status: 400 }
      )
    }

    // Drafts don't require Turnstile — the email magic-link is the security
    // control. Worst-case abuse is a single email per request to whatever
    // address was provided; final submit still verifies Turnstile.
    const created = await createApplicationDraft(input)

    let magicLinkSent = true

    try {
      await sendApplicationDraftMagicLink({
        toEmail: created.draft_email ?? input.draft_email,
        parentName: created.guardian1_name ?? "there",
        resumeUrl: buildResumeUrl(created.draft_token ?? ""),
      })
    } catch (error) {
      magicLinkSent = false
      console.error("Application magic-link email failed.", error)
    }

    return NextResponse.json({
      success: true,
      draft_token: created.draft_token,
      draft_email: created.draft_email,
      magic_link_sent: magicLinkSent,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Validation failed." },
        { status: 400 }
      )
    }

    console.error("Application draft save failed.", error)

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while saving your draft. Please try again.",
      },
      { status: 500 }
    )
  }
}
