import { NextResponse } from "next/server"
import {
  applicationDocumentCompleteSchema,
  applicationDocumentDeleteSchema,
  deleteApplicationDocument,
  listApplicationDocumentsForDraft,
  recordApplicationDocument,
} from "@/lib/application-storage"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("draft_token")

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing draft_token." },
      { status: 400 }
    )
  }

  try {
    const documents = await listApplicationDocumentsForDraft(token)
    return NextResponse.json({ success: true, documents })
  } catch (error) {
    console.error("Application document list failed:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load documents." },
      { status: 500 }
    )
  }
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

    const parsed = applicationDocumentCompleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      )
    }

    const document = await recordApplicationDocument(parsed.data)
    return NextResponse.json({ success: true, document })
  } catch (error) {
    console.error("Application document complete failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Couldn't record upload.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as unknown

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      )
    }

    const parsed = applicationDocumentDeleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      )
    }

    await deleteApplicationDocument(parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Application document delete failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Couldn't delete.",
      },
      { status: 500 }
    )
  }
}
