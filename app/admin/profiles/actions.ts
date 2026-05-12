"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import {
  profileActiveUpdateSchema,
  profileContactUpdateSchema,
  profileRoleSchema,
  profileRolesUpdateSchema,
  updateProfileActive,
  updateProfileContact,
  updateProfileRoles,
} from "@/lib/sis"

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

export async function signOutProfilesAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
