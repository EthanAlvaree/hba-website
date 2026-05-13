// lib/profile-photos.ts
//
// Profile photo storage helpers. Photos live in the "profile-photos"
// Supabase Storage bucket (public). Each profile has at most one
// active photo; uploading a new one deletes the previous file so the
// bucket doesn't accumulate orphans.
//
// Pipeline: every upload, regardless of input format, is routed
// through sharp. We:
//   - resize so the longest side is at most 1024px
//   - strip EXIF (privacy: removes location, camera, sometimes name)
//   - re-encode as WebP (q=85) and store as .webp
//
// Why: it normalizes everything to one format that every browser
// renders, shrinks 5–10 MB phone photos to ~120 KB, and lets us
// accept HEIC (which <img> doesn't render natively) by converting
// it server-side. Sharp on Vercel ships with libheif, so HEIC works.
//
// Path scheme: `<profile-id>/<crypto-random>.webp`. Keeping each
// profile's photo under a folder of its own makes "delete this
// profile's photos" a single listObjects + remove call.

import "server-only"
import { randomBytes } from "node:crypto"
import sharp from "sharp"
import { getServiceSupabase } from "@/lib/supabase-server"

const BUCKET = "profile-photos"
const MAX_INPUT_BYTES = 10 * 1024 * 1024 // 10 MB; matches bucket
const MAX_DIMENSION = 1024

// Input formats we accept. Output is always WebP regardless.
// image/heic + image/heif from iPhone uploads work via sharp+libheif
// on Vercel's runtime.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

export type SetProfilePhotoResult =
  | { ok: true; photoPath: string }
  | { ok: false; error: string }

/** Normalize any supported input buffer to a square-ish WebP under
 *  MAX_DIMENSION on the longest side. Strips EXIF. */
async function normalizeToWebp(input: Buffer): Promise<Buffer> {
  return await sharp(input, { failOn: "none" })
    .rotate() // honor EXIF orientation, then strip
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer()
}

export async function setProfilePhotoFromBuffer(
  profileId: string,
  buffer: Buffer,
  mimeType: string
): Promise<SetProfilePhotoResult> {
  if (!ALLOWED_MIME.has(mimeType.toLowerCase())) {
    return {
      ok: false,
      error: "Unsupported image type. Use JPEG, PNG, WebP, or HEIC.",
    }
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: "Empty file." }
  }
  if (buffer.byteLength > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: `Photo is too large. Keep it under ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB.`,
    }
  }

  let normalized: Buffer
  try {
    normalized = await normalizeToWebp(buffer)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown image processing error."
    console.error("profile-photos: sharp failed", err)
    return {
      ok: false,
      error: `Couldn't process the image (${message}). Try a different file.`,
    }
  }

  const supabase = getServiceSupabase()

  // Drop any prior photos under this profile's folder. Best-effort —
  // if the bucket doesn't have a previous file the list call returns
  // an empty array and the remove is a no-op.
  try {
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(profileId, { limit: 100 })
    if (existing && existing.length > 0) {
      const toRemove = existing.map((f) => `${profileId}/${f.name}`)
      await supabase.storage.from(BUCKET).remove(toRemove)
    }
  } catch (err) {
    console.error("profile-photos: cleanup of prior photos failed", err)
    // Continue — the new upload still works.
  }

  const filename = `${randomBytes(8).toString("hex")}.webp`
  const photoPath = `${profileId}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(photoPath, normalized, {
      contentType: "image/webp",
      upsert: false,
    })
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ photo_path: photoPath })
    .eq("id", profileId)
  if (profileError) {
    // Roll back the storage object so we don't leave an orphan.
    await supabase.storage.from(BUCKET).remove([photoPath])
    return { ok: false, error: `Profile update failed: ${profileError.message}` }
  }

  return { ok: true, photoPath }
}

export async function clearProfilePhoto(profileId: string): Promise<void> {
  const supabase = getServiceSupabase()
  try {
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(profileId, { limit: 100 })
    if (existing && existing.length > 0) {
      const toRemove = existing.map((f) => `${profileId}/${f.name}`)
      await supabase.storage.from(BUCKET).remove(toRemove)
    }
  } catch (err) {
    console.error("profile-photos: clear failed", err)
  }
  await supabase
    .from("profiles")
    .update({ photo_path: null })
    .eq("id", profileId)
}

/** Build a public URL from a stored photo_path. Returns null if the
 *  profile has no photo. Safe to render directly in <img src>. */
export function profilePhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null
  const base = process.env.HBA_SUPABASE_URL
  if (!base) return null
  // Trim trailing slash if someone set the env var with one.
  const cleanBase = base.replace(/\/$/, "")
  return `${cleanBase}/storage/v1/object/public/${BUCKET}/${photoPath}`
}

/** Look up a user's profile by email and return avatar props. Used by
 *  every portal layout to feed PortalShell. Returns sensible defaults
 *  (no photo, "?" initials) if the lookup fails so layouts never crash
 *  over a missing avatar. */
export async function avatarForEmail(
  email: string | null | undefined
): Promise<{ photoUrl: string | null; initials: string }> {
  if (!email) return { photoUrl: null, initials: "?" }
  try {
    const { getProfileByEmail } = await import("@/lib/sis")
    const profile = await getProfileByEmail(email)
    if (!profile) return { photoUrl: null, initials: email.charAt(0).toUpperCase() }
    return {
      photoUrl: profilePhotoUrl(profile.photo_path),
      initials: initialsFor({
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name,
        email: profile.email,
      }),
    }
  } catch (err) {
    console.error("avatarForEmail failed:", err)
    return { photoUrl: null, initials: email.charAt(0).toUpperCase() }
  }
}

/** Initials fallback rendered when there's no photo. */
export function initialsFor(input: {
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  email?: string | null
}): string {
  const first = input.first_name?.trim() || ""
  const last = input.last_name?.trim() || ""
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?"
  }
  const display = input.display_name?.trim() || ""
  if (display) {
    const parts = display.split(/\s+/)
    return ((parts[0]?.charAt(0) ?? "") + (parts[1]?.charAt(0) ?? "")).toUpperCase() || "?"
  }
  const email = input.email?.trim() || ""
  return email.charAt(0).toUpperCase() || "?"
}
