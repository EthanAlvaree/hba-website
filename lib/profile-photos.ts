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
import { pushPhotoToM365 } from "@/lib/graph"
import { isHbaEmail } from "@/lib/admin"
import { getServiceSupabase } from "@/lib/supabase-server"
import { getSupabaseUrl } from "@/lib/env"

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
  | {
      ok: true
      photoPath: string
      /** Optional report from the M365 push step. Only present when
       *  pushToM365 was requested. */
      m365Push?: {
        status: "synced" | "skipped_permission" | "skipped_not_found" | "error"
        message?: string
      }
    }
  | { ok: false; error: string }

export type SetProfilePhotoOptions = {
  /** Email of the profile being updated. Required when pushToM365 is
   *  true so we know which Graph user to PUT to. */
  email?: string
  /** When true, also PUT the photo to Microsoft Graph for this user's
   *  M365 profile. Two-way sync. Failures degrade gracefully (logged,
   *  not thrown) — the SIS-side upload still succeeds.
   *
   *  Set this when the source of the upload is a human (the admin
   *  student page). Leave false when the source is the M365 → SIS
   *  pull, or we'd round-trip the same photo back to Graph for no
   *  reason. */
  pushToM365?: boolean
}

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
  mimeType: string,
  options: SetProfilePhotoOptions = {}
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
    console.error("profile-photos: sharp failed", err)
    const rawMessage = err instanceof Error ? err.message : ""
    const lowered = rawMessage.toLowerCase()
    const looksLikeHeic =
      mimeType.toLowerCase() === "image/heic" ||
      mimeType.toLowerCase() === "image/heif"
    const sharpDoesntKnowFormat =
      lowered.includes("unsupported image format") ||
      lowered.includes("heif") ||
      lowered.includes("heic")

    // Most common cause on Vercel: the runtime's sharp binary didn't ship
    // with libheif. Give an actionable next step rather than dumping the
    // raw sharp error.
    if (looksLikeHeic || sharpDoesntKnowFormat) {
      return {
        ok: false,
        error:
          "We couldn't process this HEIC photo. On iPhone, open Files → Photos → Share → Save to Files as JPEG, then upload that — or take a fresh photo with the camera set to Most Compatible (Settings → Camera → Formats).",
      }
    }
    return {
      ok: false,
      error:
        "Couldn't read that as an image. Make sure the file isn't corrupted, then try again.",
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

  // Optional: two-way push to M365. Fire-and-handle so a Graph failure
  // never blocks the SIS-side success. Only attempt for HBA-domain
  // emails — pushing to a personal Outlook account would silently
  // touch the wrong directory.
  let m365Push:
    | {
        status: "synced" | "skipped_permission" | "skipped_not_found" | "error"
        message?: string
      }
    | undefined
  if (options.pushToM365 && options.email && isHbaEmail(options.email)) {
    try {
      const pushResult = await pushPhotoToM365(options.email, normalized, "image/webp")
      m365Push = pushResult.ok
        ? { status: "synced" }
        : { status: pushResult.status, message: pushResult.message }
      if (!pushResult.ok && pushResult.status !== "skipped_permission") {
        console.warn(
          `profile-photos: M365 push ${pushResult.status} for ${options.email}: ${pushResult.message}`
        )
      }
    } catch (err) {
      console.error("profile-photos: M365 push threw", err)
      m365Push = {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown M365 push failure.",
      }
    }
  }

  return { ok: true, photoPath, m365Push }
}

/** Pulls the M365 photo for a single profile and stores it as their
 *  SIS profile photo, overwriting any existing one. Returns a result
 *  describing what happened. Used by the per-profile "Resync from
 *  M365" button. */
export async function resyncProfilePhotoFromM365(profileId: string): Promise<
  | { ok: true; outcome: "synced" | "no_m365_photo" }
  | { ok: false; error: string }
> {
  // Local imports to avoid pulling Graph code into client bundles that
  // happen to transitively import this file.
  const { fetchM365UserPhoto } = await import("@/lib/graph")
  const supabase = getServiceSupabase()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, photo_path")
    .eq("id", profileId)
    .maybeSingle<{ email: string; photo_path: string | null }>()
  if (error || !profile) {
    return { ok: false, error: error?.message ?? "Profile not found." }
  }
  if (!isHbaEmail(profile.email)) {
    return {
      ok: false,
      error: `${profile.email} isn't an HBA-domain email; M365 lookup skipped.`,
    }
  }

  let photo
  try {
    photo = await fetchM365UserPhoto(profile.email)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "M365 photo fetch failed.",
    }
  }
  if (!photo) {
    return { ok: true, outcome: "no_m365_photo" }
  }

  const setResult = await setProfilePhotoFromBuffer(
    profileId,
    photo.buffer,
    photo.contentType
  )
  if (!setResult.ok) return { ok: false, error: setResult.error }
  return { ok: true, outcome: "synced" }
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
  const base = getSupabaseUrl()
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
