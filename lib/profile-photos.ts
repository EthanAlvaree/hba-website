// lib/profile-photos.ts
//
// Profile photo storage helpers. Photos live in the "profile-photos"
// Supabase Storage bucket (public). Each profile has at most one
// active photo; uploading a new one deletes the previous file so the
// bucket doesn't accumulate orphans.
//
// Path scheme: `<profile-id>/<crypto-random>.<ext>`. Keeping each
// profile's photo under a folder of its own makes "delete this
// profile's photos" a single listObjects + remove call.

import "server-only"
import { randomBytes } from "node:crypto"
import { getServiceSupabase } from "@/lib/supabase-server"

const BUCKET = "profile-photos"
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Subset of image MIME types we trust. JPEG + PNG + WebP cover any
// photo a school office would upload from a phone or laptop.
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export type SetProfilePhotoResult =
  | { ok: true; photoPath: string }
  | { ok: false; error: string }

export async function setProfilePhotoFromBuffer(
  profileId: string,
  buffer: Buffer,
  mimeType: string
): Promise<SetProfilePhotoResult> {
  const ext = ALLOWED_MIME[mimeType.toLowerCase()]
  if (!ext) {
    return {
      ok: false,
      error: "Unsupported image type. Use JPEG, PNG, or WebP.",
    }
  }
  if (buffer.byteLength > MAX_BYTES) {
    return {
      ok: false,
      error: `Photo is too large. Keep it under ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
    }
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: "Empty file." }
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

  const filename = `${randomBytes(8).toString("hex")}.${ext}`
  const photoPath = `${profileId}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(photoPath, buffer, {
      contentType: mimeType,
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
