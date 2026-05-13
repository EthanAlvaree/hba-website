"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { runM365Sync } from "@/lib/m365-sync"
import {
  deleteProfile,
  getProfileById,
  profileActiveUpdateSchema,
  profileContactUpdateSchema,
  profileRoleSchema,
  profileRolesUpdateSchema,
  updateProfileActive,
  updateProfileContact,
  updateProfileRoles,
} from "@/lib/sis"
import { z } from "zod"
import { seedTeacherQualificationsFromBios } from "@/lib/scheduler"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateProfiles() {
  revalidatePath("/admin/profiles")
}

export async function updateProfileRolesAction(formData: FormData) {
  await assertAdmin()

  const rawRoles = formData.getAll("roles").map(String)
  const parsedRoles: string[] = []
  for (const role of rawRoles) {
    const check = profileRoleSchema.safeParse(role)
    if (check.success) parsedRoles.push(check.data)
  }
  // De-dup in case the hidden admin pin and the checkbox both produced 'admin'
  const dedup = Array.from(new Set(parsedRoles))

  const parsed = profileRolesUpdateSchema.safeParse({
    id: formData.get("id"),
    roles: dedup,
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Role update failed."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  try {
    await updateProfileRoles(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update roles."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }
  revalidateProfiles()
  redirect("/admin/profiles")
}

export async function updateProfileActiveAction(formData: FormData) {
  await assertAdmin()

  const parsed = profileActiveUpdateSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active") === "on",
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Active update failed."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  try {
    await updateProfileActive(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update active flag."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }
  revalidateProfiles()
  redirect("/admin/profiles")
}

export async function updateProfileContactAction(formData: FormData) {
  await assertAdmin()

  const parsed = profileContactUpdateSchema.safeParse({
    id: formData.get("id"),
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    display_name: formData.get("display_name") ?? "",
    personal_email: formData.get("personal_email") ?? "",
    mobile_phone: formData.get("mobile_phone") ?? "",
    work_phone: formData.get("work_phone") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Contact update failed.")
  }

  await updateProfileContact(parsed.data)
  revalidateProfiles()

  // Re-render any student detail page that might show this parent profile,
  // too. We can't know which student(s) reference this profile without a
  // join — easier to revalidate the whole students directory.
  revalidatePath("/admin/students")

  const redirectTo = formData.get("redirectTo")
  if (typeof redirectTo === "string" && redirectTo.startsWith("/admin/")) {
    redirect(redirectTo)
  }
  redirect("/admin/profiles")
}

export async function syncM365Action() {
  await assertAdmin()

  const result = await runM365Sync()

  if (!result.ok) {
    redirect(`/admin/profiles?sync_error=${encodeURIComponent(result.message)}`)
  }

  revalidateProfiles()

  const params = new URLSearchParams({
    sync_ok: "1",
    created: String(result.created),
    updated: String(result.updated),
    skipped: String(result.skipped),
    filtered: String(result.filtered),
  })
  redirect(`/admin/profiles?${params.toString()}`)
}

export async function seedQualificationsFromBiosAction() {
  await assertAdmin()

  let result
  try {
    result = await seedTeacherQualificationsFromBios()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bio seed failed"
    redirect(`/admin/profiles?bio_seed_error=${encodeURIComponent(message)}`)
  }

  revalidateProfiles()

  const params = new URLSearchParams({
    bio_seed_ok: "1",
    bios_matched: String(result.bios_matched_to_profile),
    bios_total: String(result.bios_total),
    inserted: String(result.courses_inserted),
    existing: String(result.courses_skipped_existing),
    no_profile_count: String(result.bios_no_profile.length),
    no_course_count: String(result.courses_no_match.length),
    // Truncate the freetext arrays so URL doesn't explode on big mismatches.
    no_profile: result.bios_no_profile.slice(0, 8).join(", "),
    no_course: result.courses_no_match.slice(0, 12).join(" | "),
  })
  redirect(`/admin/profiles?${params.toString()}`)
}

const deleteProfileSchema = z.object({ id: z.uuid() })

export async function deleteProfileAction(formData: FormData) {
  const session = await assertAdmin()
  const parsed = deleteProfileSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) redirect(`/admin/profiles?error=${encodeURIComponent("Invalid request.")}`)

  // Capture whether this is a self-delete BEFORE we destroy the row.
  const target = await getProfileById(parsed.data.id)
  const isSelf = Boolean(
    target && session.user?.email && target.email.toLowerCase() === session.user.email.toLowerCase()
  )

  try {
    await deleteProfile(parsed.data.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete profile."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }
  revalidateProfiles()

  if (isSelf) {
    // The admin just deleted their own profile. Sign them out so they don't
    // sit in a broken session pointing at a missing row.
    await signOut({ redirectTo: "/" })
  }
  redirect("/admin/profiles?deleted=1")
}

// Promote a profile to admin or demote it. The DB-level last-admin trigger
// (migration 0009) is the final safety net; updateProfileRoles in lib/sis.ts
// catches the same case earlier with a friendlier message.
const setAdminRoleSchema = z.object({
  id: z.uuid(),
  make_admin: z.enum(["yes", "no"]),
})

export async function setAdminRoleAction(formData: FormData) {
  const session = await assertAdmin()
  const parsed = setAdminRoleSchema.safeParse({
    id: formData.get("id"),
    make_admin: formData.get("make_admin"),
  })
  if (!parsed.success) {
    redirect(`/admin/profiles?error=${encodeURIComponent("Invalid request.")}`)
  }

  const target = await getProfileById(parsed.data.id)
  if (!target) {
    redirect(`/admin/profiles?error=${encodeURIComponent("Profile not found.")}`)
  }

  const makeAdmin = parsed.data.make_admin === "yes"
  const hasAdmin = target.roles.includes("admin")

  // No-op short-circuit.
  if (makeAdmin === hasAdmin) {
    revalidateProfiles()
    redirect(`/admin/profiles?role_ok=1`)
  }

  const nextRoles = makeAdmin
    ? [...target.roles, "admin" as const]
    : target.roles.filter((r) => r !== "admin")

  try {
    await updateProfileRoles({ id: target.id, roles: nextRoles })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update admin role."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  revalidateProfiles()

  const isSelf =
    !!session.user?.email && target.email.toLowerCase() === session.user.email.toLowerCase()

  if (!makeAdmin && isSelf) {
    // Self-demotion: sign out so the user doesn't keep stale session.isAdmin
    // until their next JWT refresh.
    await signOut({ redirectTo: "/" })
  }

  redirect(`/admin/profiles?role_ok=1`)
}

export async function signOutProfilesAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
