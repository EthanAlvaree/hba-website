// lib/faculty.ts
//
// Faculty bios. The faculty_bios table is the single source of truth
// (see migrations 0024 / 0040 / 0041). This module is a thin reader +
// the portrait-upload machinery.
//
// Both the index page (/faculty) and the per-person detail pages
// (/faculty/[slug]) read from here. Slugs live in the DB but stay
// stable — change one only with a redirect.

import { getServiceSupabase } from "@/lib/supabase-server"
import { getSupabaseUrl } from "@/lib/env"

export type FacultyMember = {
  /** URL slug — used at /faculty/<slug>. */
  slug: string
  name: string
  title: string
  /** Portrait src — an uploaded portrait if one exists, else the
   *  /public image path, else a placeholder. Always a valid src. */
  image: string
  /** Subject / department label, e.g. "Science". */
  area: string
  /** Year (or season + year) the member began teaching at HBA. */
  hbaStart?: string
  /** When their teaching career began. */
  careerStart?: string
  /** Courses currently or historically taught at HBA. */
  coursesTaught?: string[]
  /** 1–2 sentence intro (faculty index cards + detail meta description). */
  shortBio: string
  /** Full bio. Paragraphs separated by \n\n. */
  fullBio: string
  /** Whether this person is part of the school's leadership team. */
  leadership?: boolean
}

// Fallback portrait when a faculty member has neither an uploaded
// portrait nor a /public image path.
const FACULTY_PLACEHOLDER_IMAGE = "/images/hba/faculty/faculty-hero.webp"

const PORTRAIT_BUCKET = "profile-photos"
const PORTRAIT_MAX_DIMENSION = 1200
const PORTRAIT_MAX_INPUT_BYTES = 10 * 1024 * 1024
const PORTRAIT_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

// ============================================================================
// faculty_bios row
// ============================================================================

/** A faculty_bios row as stored. All fields nullable except profile_id —
 *  a row created by the faculty self-edit form has no slug/name yet. */
export type FacultyBioRow = {
  profile_id: string
  slug: string | null
  name: string | null
  title: string | null
  area: string | null
  image: string | null
  hba_start: string | null
  career_start: string | null
  courses_taught: string[] | null
  short_bio: string | null
  full_bio: string | null
  public_photo_path: string | null
  is_leadership: boolean
  display_order: number | null
}

const bioColumns =
  "profile_id, slug, name, title, area, image, hba_start, career_start, " +
  "courses_taught, short_bio, full_bio, public_photo_path, is_leadership, display_order"

/** Build the public URL for a faculty_bios.public_photo_path value. */
export function facultyPortraitUrl(
  path: string | null | undefined
): string | null {
  if (!path) return null
  const base = getSupabaseUrl()
  if (!base) return null
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PORTRAIT_BUCKET}/${path}`
}

function rowToMember(row: FacultyBioRow): FacultyMember {
  return {
    slug: row.slug ?? "",
    name: row.name ?? "",
    title: row.title ?? "",
    image:
      facultyPortraitUrl(row.public_photo_path) ??
      row.image ??
      FACULTY_PLACEHOLDER_IMAGE,
    area: row.area ?? "",
    hbaStart: row.hba_start ?? undefined,
    careerStart: row.career_start ?? undefined,
    coursesTaught: row.courses_taught ?? undefined,
    shortBio: row.short_bio ?? "",
    fullBio: row.full_bio ?? "",
    leadership: row.is_leadership,
  }
}

// ============================================================================
// Public reads
// ============================================================================

/** Every published faculty member (has a slug), ordered for display. */
export async function getFacultyMembers(): Promise<FacultyMember[]> {
  const { data, error } = await getServiceSupabase()
    .from("faculty_bios")
    .select(bioColumns)
    .not("slug", "is", null)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .returns<FacultyBioRow[]>()
  if (error) {
    throw new Error(`Failed to load faculty: ${error.message}`)
  }
  return (data ?? []).map(rowToMember)
}

export async function getFacultyBySlug(
  slug: string
): Promise<FacultyMember | undefined> {
  const { data, error } = await getServiceSupabase()
    .from("faculty_bios")
    .select(bioColumns)
    .eq("slug", slug)
    .maybeSingle<FacultyBioRow>()
  if (error) {
    throw new Error(`Failed to load faculty member: ${error.message}`)
  }
  return data ? rowToMember(data) : undefined
}

/** Previous + next faculty member in display order, wrapping at the
 *  ends. Used for prev/next navigation on detail pages. */
export async function getNeighbors(
  slug: string
): Promise<{ prev: FacultyMember; next: FacultyMember } | null> {
  const members = await getFacultyMembers()
  const i = members.findIndex((m) => m.slug === slug)
  if (i === -1) return null
  return {
    prev: members[(i - 1 + members.length) % members.length],
    next: members[(i + 1) % members.length],
  }
}

// ============================================================================
// Bio editor reads / writes (admin + faculty self-edit)
// ============================================================================

/** The faculty_bios row for a profile, or null if none exists. */
export async function getFacultyBioForProfile(
  profileId: string
): Promise<FacultyBioRow | null> {
  const { data } = await getServiceSupabase()
    .from("faculty_bios")
    .select(bioColumns)
    .eq("profile_id", profileId)
    .maybeSingle<FacultyBioRow>()
  return data ?? null
}

/** Upsert a faculty_bios row. The faculty self-edit form passes only
 *  the bio fields; the admin create/edit flow may also pass identity
 *  fields (slug / name). Supabase upsert touches only the keys given,
 *  so a partial save never clobbers columns it didn't include. */
export async function upsertFacultyBio(input: {
  profile_id: string
  title?: string | null
  area?: string | null
  hba_start?: string | null
  career_start?: string | null
  courses_taught?: string[] | null
  short_bio?: string | null
  full_bio?: string | null
  slug?: string | null
  name?: string | null
}): Promise<void> {
  const { error } = await getServiceSupabase()
    .from("faculty_bios")
    .upsert(input, { onConflict: "profile_id" })
  if (error) {
    throw new Error(`Failed to save faculty bio: ${error.message}`)
  }
}

// ============================================================================
// Portrait upload (rectangular, public faculty page)
// ============================================================================

export type SetFacultyPortraitResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

/** Resize + EXIF-strip + re-encode the input as a WebP and store it
 *  under <profile-id>/portrait-<rand>.webp in the profile-photos
 *  bucket. Aspect ratio is preserved (no square crop). Updates
 *  faculty_bios.public_photo_path. */
export async function setFacultyPortraitFromBuffer(
  profileId: string,
  buffer: Buffer,
  mimeType: string
): Promise<SetFacultyPortraitResult> {
  if (!PORTRAIT_ALLOWED_MIME.has(mimeType.toLowerCase())) {
    return {
      ok: false,
      error: "Unsupported image type. Use JPEG, PNG, WebP, or HEIC.",
    }
  }
  if (buffer.byteLength === 0) return { ok: false, error: "Empty file." }
  if (buffer.byteLength > PORTRAIT_MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: `Photo is too large. Keep it under ${Math.round(PORTRAIT_MAX_INPUT_BYTES / 1024 / 1024)} MB.`,
    }
  }

  const [{ default: sharp }, { randomBytes }] = await Promise.all([
    import("sharp"),
    import("node:crypto"),
  ])

  let normalized: Buffer
  try {
    normalized = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: PORTRAIT_MAX_DIMENSION,
        height: PORTRAIT_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer()
  } catch (err) {
    console.error("setFacultyPortraitFromBuffer: sharp failed", err)
    return {
      ok: false,
      error:
        "Couldn't process this image. If it's a HEIC, try converting to JPEG first.",
    }
  }

  const supabase = getServiceSupabase()

  // Clean up any prior portrait files under this profile's folder so
  // the bucket doesn't accumulate orphans. Only files whose names start
  // with "portrait-" — the round-avatar files are left untouched.
  try {
    const { data: existing } = await supabase.storage
      .from(PORTRAIT_BUCKET)
      .list(profileId, { limit: 100 })
    const toRemove = (existing ?? [])
      .filter((f) => f.name.startsWith("portrait-"))
      .map((f) => `${profileId}/${f.name}`)
    if (toRemove.length > 0) {
      await supabase.storage.from(PORTRAIT_BUCKET).remove(toRemove)
    }
  } catch (err) {
    console.error("portrait cleanup failed:", err)
  }

  const filename = `portrait-${randomBytes(8).toString("hex")}.webp`
  const path = `${profileId}/${filename}`
  const { error: uploadError } = await supabase.storage
    .from(PORTRAIT_BUCKET)
    .upload(path, normalized, {
      contentType: "image/webp",
      upsert: false,
    })
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Upsert the row so a faculty member who's never used the bio editor
  // still gets the portrait linked.
  const { error: updateError } = await supabase
    .from("faculty_bios")
    .upsert(
      { profile_id: profileId, public_photo_path: path },
      { onConflict: "profile_id" }
    )
  if (updateError) {
    await supabase.storage.from(PORTRAIT_BUCKET).remove([path])
    return { ok: false, error: `DB update failed: ${updateError.message}` }
  }

  return { ok: true, path }
}

/** Removes the portrait, falling the public page back to the
 *  faculty_bios.image path (or the placeholder). */
export async function clearFacultyPortrait(profileId: string): Promise<void> {
  const supabase = getServiceSupabase()
  try {
    const { data: existing } = await supabase.storage
      .from(PORTRAIT_BUCKET)
      .list(profileId, { limit: 100 })
    const toRemove = (existing ?? [])
      .filter((f) => f.name.startsWith("portrait-"))
      .map((f) => `${profileId}/${f.name}`)
    if (toRemove.length > 0) {
      await supabase.storage.from(PORTRAIT_BUCKET).remove(toRemove)
    }
  } catch (err) {
    console.error("portrait clear failed:", err)
  }
  await supabase
    .from("faculty_bios")
    .update({ public_photo_path: null })
    .eq("profile_id", profileId)
}
