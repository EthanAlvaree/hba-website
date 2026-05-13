"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  faculty as codeFaculty,
  resolveProfileForFacultySlug,
  seedFacultyBioFromCodeForProfile,
  bulkSeedFacultyBios,
} from "@/lib/faculty"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"
import { getServiceSupabase } from "@/lib/supabase-server"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
  return session
}

// "Seed from code defaults" — finds the code-side faculty member whose
// slug matches this profile (by email convention) and copies the
// defaults into the faculty_bios row. Won't overwrite an existing row.
export async function seedFacultyBioForProfileAction(formData: FormData) {
  await assertAdmin()
  const profileId = String(formData.get("profile_id") ?? "").trim()
  if (!profileId) throw new Error("Missing profile_id.")

  // Look up the profile's email so we can match it back to the
  // code-side faculty list by slug-first-name convention.
  const { data: profile } = await getServiceSupabase()
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle<{ email: string }>()
  if (!profile) throw new Error("Profile not found.")

  // Resolve profile→faculty: walk the code list, look each up by
  // slug, take the one whose profile_id matches. (Array.find can't
  // await across iterations, hence the explicit for-loop.)
  let matched: typeof codeFaculty[number] | null = null
  for (const m of codeFaculty) {
    const p = await resolveProfileForFacultySlug(m.slug)
    if (p?.id === profileId) {
      matched = m
      break
    }
  }

  if (!matched) {
    redirect(
      `/admin/profiles/${profileId}/bio?seed_error=${encodeURIComponent("No code-side faculty entry matches this profile's email.")}`
    )
  }

  const result = await seedFacultyBioFromCodeForProfile(profileId, matched)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.faculty_bio_seed,
    target_kind: "profile",
    target_id: profileId,
    details: { seeded: result.seeded, slug: matched.slug },
  })
  revalidatePath(`/admin/profiles/${profileId}/bio`)
  revalidatePath("/faculty")
  redirect(
    `/admin/profiles/${profileId}/bio?seeded=${result.seeded ? "1" : "already"}`
  )
}

// Bulk-seed every faculty member's bio in one click. Used once per
// deployment when the team first wants faculty to self-edit.
export async function bulkSeedFacultyBiosAction() {
  await assertAdmin()
  const result = await bulkSeedFacultyBios()
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.faculty_bio_bulk_seed,
    target_kind: "faculty_bios",
    details: {
      seeded: result.seeded,
      skipped_already_seeded: result.skipped_already_seeded,
      skipped_no_profile: result.skipped_no_profile,
    },
  })
  revalidatePath("/admin/profiles")
  revalidatePath("/faculty")
  const params = new URLSearchParams({
    faculty_bio_seed_ok: "1",
    faculty_bio_seed_count: String(result.seeded),
    faculty_bio_seed_skipped: String(result.skipped_already_seeded),
    faculty_bio_seed_no_profile: String(result.skipped_no_profile.length),
  })
  redirect(`/admin/profiles?${params.toString()}`)
}
