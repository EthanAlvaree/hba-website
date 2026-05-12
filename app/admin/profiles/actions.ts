"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { emailFromM365User, listM365Users } from "@/lib/graph"
import { isHbaEmail } from "@/lib/admin"
import {
  profileActiveUpdateSchema,
  profileContactUpdateSchema,
  profileRoleSchema,
  profileRolesUpdateSchema,
  syncProfilesFromM365,
  updateProfileActive,
  updateProfileContact,
  updateProfileRoles,
  type M365SyncRow,
} from "@/lib/sis"
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

  const parsed = profileRolesUpdateSchema.safeParse({
    id: formData.get("id"),
    roles: parsedRoles,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Role update failed.")
  }

  await updateProfileRoles(parsed.data)
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
    throw new Error(parsed.error.issues[0]?.message ?? "Active update failed.")
  }

  await updateProfileActive(parsed.data)
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

  let users
  try {
    users = await listM365Users()
  } catch (error) {
    const message = error instanceof Error ? error.message : "M365 fetch failed"
    redirect(`/admin/profiles?sync_error=${encodeURIComponent(message)}`)
  }

  // Only sync HBA-domain mailboxes. External guests in the tenant get
  // filtered out — we don't want random graph users showing up as faculty.
  const rows: M365SyncRow[] = []
  let nonHba = 0
  let missingEmail = 0
  for (const user of users) {
    const email = emailFromM365User(user)
    if (!email) {
      missingEmail += 1
      continue
    }
    if (!isHbaEmail(email)) {
      nonHba += 1
      continue
    }
    rows.push({
      email,
      entra_oid: user.id,
      display_name: user.displayName,
      first_name: user.givenName,
      last_name: user.surname,
      active: user.accountEnabled,
    })
  }

  let result
  try {
    result = await syncProfilesFromM365(rows)
  } catch (error) {
    const message = error instanceof Error ? error.message : "M365 sync failed"
    redirect(`/admin/profiles?sync_error=${encodeURIComponent(message)}`)
  }

  revalidateProfiles()

  const params = new URLSearchParams({
    sync_ok: "1",
    created: String(result.created),
    updated: String(result.updated),
    skipped: String(result.skipped),
    filtered: String(nonHba + missingEmail),
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

export async function signOutProfilesAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
