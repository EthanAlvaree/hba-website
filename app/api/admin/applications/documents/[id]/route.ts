import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createAdminDownloadUrl,
  getApplicationDocumentById,
} from "@/lib/application-storage"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.isAdmin) {
    return NextResponse.redirect(new URL("/admin/sign-in", _request.url))
  }

  const { id } = await params

  try {
    const document = await getApplicationDocumentById(id)
    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found." },
        { status: 404 }
      )
    }

    const signedUrl = await createAdminDownloadUrl(document.storage_path, 60)
    return NextResponse.redirect(signedUrl, 302)
  } catch (error) {
    console.error("Admin document download failed:", error)
    return NextResponse.json(
      { success: false, error: "Couldn't generate download URL." },
      { status: 500 }
    )
  }
}
