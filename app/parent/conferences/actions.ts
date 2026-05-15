"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail, getParentLinkForStudent } from "@/lib/sis"
import { bookSlot, cancelSlot } from "@/lib/conferences"
import { sendConferenceBookingConfirmation } from "@/lib/conference-emails"
import { getServiceSupabase } from "@/lib/supabase-server"

const bookSchema = z.object({
  slot_id: z.uuid(),
  student_id: z.uuid(),
  parent_notes: z.string().trim().max(2000).optional().nullable(),
})

export async function bookConferenceSlotAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("parent")) {
    redirect("/admin/sign-in")
  }

  const parsed = bookSchema.safeParse({
    slot_id: formData.get("slot_id"),
    student_id: formData.get("student_id"),
    parent_notes: formData.get("parent_notes") ?? null,
  })
  if (!parsed.success) {
    redirect(`/parent/conferences?error=${encodeURIComponent("Invalid booking.")}`)
  }

  // Confirm this parent is actually linked to this student.
  const link = await getParentLinkForStudent(profile.id, parsed.data.student_id)
  if (!link) {
    redirect(`/parent/conferences?error=${encodeURIComponent("Not your student.")}`)
  }

  try {
    await bookSlot({
      slot_id: parsed.data.slot_id,
      parent_email: session.user.email,
      parent_profile_id: profile.id,
      student_id: parsed.data.student_id,
      parent_notes: parsed.data.parent_notes ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking failed."
    redirect(`/parent/conferences?error=${encodeURIComponent(message)}`)
  }

  // Send the booking confirmation + ICS attachment, with the co-parent
  // CC'd when there is one. Best-effort: if email fails the booking
  // itself is still committed, the parent sees the success page, and
  // they can find the slot in /parent/conferences.
  try {
    const supabase = getServiceSupabase()
    const { data: slot } = await supabase
      .from("conference_slots")
      .select(
        `id, start_at, end_at, parent_notes,
         booked_by_parent_email, booked_for_student_id,
         teacher:profiles!conference_slots_teacher_profile_id_fkey(first_name, last_name, display_name, email),
         student:students(legal_first_name, legal_last_name, preferred_name),
         event:conference_events(name, slot_minutes)`
      )
      .eq("id", parsed.data.slot_id)
      .maybeSingle()
    if (slot && slot.booked_by_parent_email) {
      await sendConferenceBookingConfirmation(slot as never)
    }
  } catch (error) {
    console.error("Conference booking confirmation send failed:", error)
  }

  revalidatePath("/parent/conferences")
  revalidatePath("/faculty-portal/conferences")
  redirect(`/parent/conferences?saved=1`)
}

const cancelSchema = z.object({ slot_id: z.uuid() })
export async function cancelConferenceSlotAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const parsed = cancelSchema.safeParse({ slot_id: formData.get("slot_id") })
  if (!parsed.success) redirect("/parent/conferences")
  await cancelSlot({ slot_id: parsed.data.slot_id, by_parent_email: session.user.email })
  revalidatePath("/parent/conferences")
  revalidatePath("/faculty-portal/conferences")
  redirect("/parent/conferences?cancelled=1")
}
