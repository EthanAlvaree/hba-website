"use server"

import JSZip from "jszip"
import { z } from "zod"
import { ADMIN_AUDIT_ACTIONS } from "@/lib/audit"
import { setProfilePhotoFromBuffer } from "@/lib/profile-photos"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"
import { withAdminStateAction } from "@/lib/server-actions"

const MAX_ZIP_BYTES = 50 * 1024 * 1024 // 50 MB cap on the zip itself

// MIME type each extension maps to. Mirrors lib/profile-photos.ts; only
// formats sharp can read are usable.
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
}

type FileResult = {
  filename: string
  status:
    | "synced"
    | "matched_no_m365_push"
    | "no_match"
    | "skipped_unsupported"
    | "skipped_too_large"
    | "error"
  message?: string
  email?: string
}

export type BulkPhotoResult =
  | {
      ok: true
      totals: {
        files: number
        synced: number
        matched_no_m365_push: number
        no_match: number
        skipped: number
        errored: number
      }
      results: FileResult[]
    }
  | { ok: false; error: string }

const bulkPhotoSchema = z.object({
  push_to_m365: z.literal("on").or(z.literal("")).optional(),
})

export const bulkUploadPhotosAction = withAdminStateAction<
  typeof bulkPhotoSchema,
  BulkPhotoResult
>({
  schema: bulkPhotoSchema,
  audit: (_input, result) => {
    if (!result.ok) return null
    return {
      action: ADMIN_AUDIT_ACTIONS.profile_photo_bulk_upload,
      target_kind: "profiles",
      details: {
        files: result.totals.files,
        synced: result.totals.synced,
        no_match: result.totals.no_match,
        errored: result.totals.errored,
      },
    }
  },
  handler: async (input, ctx): Promise<BulkPhotoResult> => {
    const file = ctx.formData.get("zip")
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a .zip of photos to upload." }
    }
    if (file.size > MAX_ZIP_BYTES) {
      return {
        ok: false,
        error: `Zip is too large. Keep it under ${Math.round(MAX_ZIP_BYTES / 1024 / 1024)} MB. Split into multiple uploads if needed.`,
      }
    }

    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer())
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't read zip."
      return { ok: false, error: `Not a valid zip: ${message}` }
    }

    const pushToM365 = input.push_to_m365 === "on"
    const supabase = getServiceSupabase()
    const results: FileResult[] = []

    // Iterate every non-directory entry. Filter out hidden files
    // (macOS sticks __MACOSX/* and .DS_Store everywhere when zipping
    // from Finder) before counting.
    const entries = Object.values(zip.files).filter((e) => {
      if (e.dir) return false
      const name = e.name
      if (name.startsWith("__MACOSX/")) return false
      const base = name.split("/").pop() ?? name
      if (base.startsWith(".")) return false
      return true
    })

    for (const entry of entries) {
      const filename = entry.name.split("/").pop() ?? entry.name
      const dotIndex = filename.lastIndexOf(".")
      if (dotIndex <= 0) {
        results.push({ filename, status: "skipped_unsupported", message: "No file extension." })
        continue
      }
      const stem = filename.slice(0, dotIndex)
      const ext = filename.slice(dotIndex + 1).toLowerCase()
      const mime = EXT_MIME[ext]
      if (!mime) {
        results.push({
          filename,
          status: "skipped_unsupported",
          message: `Unsupported extension .${ext}`,
        })
        continue
      }

      // Map filename stem → expected email. Two acceptable shapes:
      //   1. Bare username: "jane.doe.27" → jane.doe.27@<domain>
      //   2. Full email: "jane.doe.27@<domain>" (as a filename).
      const lowered = stem.toLowerCase().trim()
      const expectedEmail = lowered.includes("@")
        ? lowered
        : `${lowered}@${siteConfig.contact.emailDomain}`

      // Find the matching profile.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", expectedEmail)
        .maybeSingle<{ id: string; email: string }>()

      if (profileError) {
        results.push({
          filename,
          status: "error",
          message: `Lookup failed: ${profileError.message}`,
          email: expectedEmail,
        })
        continue
      }
      if (!profile) {
        results.push({
          filename,
          status: "no_match",
          message: `No profile matches ${expectedEmail}.`,
          email: expectedEmail,
        })
        continue
      }

      const buffer = Buffer.from(await entry.async("nodebuffer"))
      const setResult = await setProfilePhotoFromBuffer(profile.id, buffer, mime, {
        email: profile.email,
        pushToM365,
      })
      if (!setResult.ok) {
        results.push({
          filename,
          status: "error",
          message: setResult.error,
          email: profile.email,
        })
        continue
      }

      if (pushToM365 && setResult.m365Push?.status === "synced") {
        results.push({ filename, status: "synced", email: profile.email })
      } else {
        results.push({
          filename,
          status: "matched_no_m365_push",
          email: profile.email,
          message: pushToM365
            ? setResult.m365Push?.message ?? "M365 push didn't run."
            : undefined,
        })
      }
    }

    const totals = {
      files: results.length,
      synced: results.filter((r) => r.status === "synced").length,
      matched_no_m365_push: results.filter((r) => r.status === "matched_no_m365_push").length,
      no_match: results.filter((r) => r.status === "no_match").length,
      skipped: results.filter((r) => r.status.startsWith("skipped")).length,
      errored: results.filter((r) => r.status === "error").length,
    }

    return {
      ok: true,
      totals,
      results,
    }
  },
})
