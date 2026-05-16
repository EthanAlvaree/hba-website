"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  profileContactUpdateSchema,
  updateProfileContact,
} from "@/lib/sis"

// Parent self-service: lets the signed-in parent edit their OWN profile
// row. The schema rejects an id mismatch — we force `id` to the
// authenticated user's profile id so a parent can't submit someone
// else's id from the browser console.
export async function updateOwnProfileAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const parsed = profileContactUpdateSchema.safeParse({
    id: profile.id,
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    display_name: formData.get("display_name") ?? "",
    personal_email: formData.get("personal_email") ?? "",
    mobile_phone: formData.get("mobile_phone") ?? "",
    work_phone: formData.get("work_phone") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    address_city: formData.get("address_city") ?? "",
    address_region: formData.get("address_region") ?? "",
    address_postal_code: formData.get("address_postal_code") ?? "",
    address_country: formData.get("address_country") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await updateProfileContact(parsed.data)
  revalidatePath("/parent/profile")
  revalidatePath("/parent")
  redirect("/parent/profile?saved=1")
}
