import { NextResponse } from "next/server"
import {
  applicationDocumentInitSchema,
  createApplicationDocumentUploadUrl,
} from "@/lib/application-storage"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as unknown

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      )
    }

    const parsed = applicationDocumentInitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      )
    }

    const result = await createApplicationDocumentUploadUrl(parsed.data)

    return NextResponse.json({
      success: true,
      signed_url: result.signed_url,
      storage_path: result.storage_path,
      token: result.token,
    })
  } catch (error) {
    console.error("Application document init failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Couldn't start upload.",
      },
      { status: 500 }
    )
  }
}
