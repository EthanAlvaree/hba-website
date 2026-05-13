"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  announcementCreateSchema,
  createAnnouncement,
  deleteAnnouncement,
} from "@/lib/announcements"

export async function createAnnouncementAction(formData: FormData) {
  const sectionId = formData.get("section_id")
  if (typeof sectionId !== "string" || sectionId.length === 0) {
    redirect("/admin/sign-in")
  }
  await assertCanEditSection(sectionId)
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const author = await getProfileByEmail(session.user.email)

  const parsed = announcementCreateSchema.safeParse({
    section_id: sectionId,
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
    author_email: session.user.email,
    author_profile_id: author?.id ?? null,
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input."
    redirect(
      `/faculty-portal/sections/${sectionId}?announcement_error=${encodeURIComponent(message)}`
    )
  }

  await createAnnouncement(parsed.data)

  revalidatePath(`/faculty-portal/sections/${sectionId}`)
  // The student / parent sees announcements on the per-section drilldown,
  // so revalidate every enrollment route under both surfaces. Cheaper to
  // be coarse than to look up every enrollment id.
  revalidatePath("/portal", "layout")
  revalidatePath("/parent", "layout")
  redirect(`/faculty-portal/sections/${sectionId}?announcement_saved=1`)
}

const deleteSchema = z.object({ id: z.uuid(), section_id: z.uuid() })

export async function deleteAnnouncementAction(formData: FormData) {
  const parsed = deleteSchema.safeParse({
    id: formData.get("id"),
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) throw new Error("Invalid request.")
  await assertCanEditSection(parsed.data.section_id)
  await deleteAnnouncement(parsed.data.id)
  revalidatePath(`/faculty-portal/sections/${parsed.data.section_id}`)
  revalidatePath("/portal", "layout")
  revalidatePath("/parent", "layout")
  redirect(`/faculty-portal/sections/${parsed.data.section_id}?announcement_saved=1`)
}
