// Dynamic profile-photo endpoint for email signatures.
//
// Email signatures embed photos via a stable, dynamic URL:
//
//   https://highbluffacademy.com/api/email-signatures/photo/<email>
//
// The endpoint looks up the profile by email and 302-redirects to the
// current Supabase Storage URL for their photo. This is the key piece
// that makes the M365 ↔ SIS ↔ Email Signature sync work: every email
// signature ever sent renders the *current* photo, because the URL
// stays stable but the redirect target updates whenever the photo
// changes.
//
// Caching: short Cache-Control so email clients pick up new photos
// within an hour or so. Real-world inbox image caches are also
// short-lived, so this is consistent with how things work.

import { NextResponse } from "next/server"
import { profilePhotoUrl } from "@/lib/profile-photos"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

const CACHE_HEADERS = {
  // Public so CDNs can cache. Short max-age so an updated photo
  // propagates within an hour.
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ email: string }> }
) {
  const { email: rawEmail } = await context.params
  const email = decodeURIComponent(rawEmail).toLowerCase().trim()

  if (!email || !email.includes("@")) {
    return new NextResponse("Bad email parameter.", { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data: profile } = await supabase
    .from("profiles")
    .select("photo_path")
    .eq("email", email)
    .maybeSingle<{ photo_path: string | null }>()

  const url = profilePhotoUrl(profile?.photo_path)
  if (!url) {
    // No photo or no profile. Return a 1x1 transparent PNG so email
    // clients don't show a broken-image icon. Better UX than 404 here
    // — recipients shouldn't see scary missing-content boxes.
    const transparentPixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
      "base64"
    )
    return new NextResponse(transparentPixel, {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "image/png",
      },
    })
  }

  // 302 redirect — most email clients (Outlook, Gmail) follow it and
  // cache the resolved URL for a while. Hand-built so we can attach
  // cache headers (NextResponse.redirect doesn't accept arbitrary
  // headers in its init).
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: url,
      ...CACHE_HEADERS,
    },
  })
}
