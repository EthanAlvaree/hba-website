// lib/conferences.ts — parent-teacher conference scheduling.

import "server-only"
import { z } from "zod"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

// ============================================================================
// Events
// ============================================================================

export type ConferenceEvent = {
  id: string
  created_at: string
  updated_at: string
  slug: string
  name: string
  description: string | null
  start_at: string
  end_at: string
  slot_minutes: number
  active: boolean
}

const eventColumns =
  "id, created_at, updated_at, slug, name, description, start_at, end_at, slot_minutes, active"

export async function listConferenceEvents(
  options?: { activeOnly?: boolean }
): Promise<ConferenceEvent[]> {
  let query = getSupabase()
    .from("conference_events")
    .select(eventColumns)
    .order("start_at", { ascending: false })
  if (options?.activeOnly) {
    query = query.eq("active", true)
  }
  const { data, error } = await query.returns<ConferenceEvent[]>()
  if (error) throw new Error(`Failed to list conference events: ${error.message}`)
  return data
}

export async function getConferenceEventBySlug(
  slug: string
): Promise<ConferenceEvent | null> {
  const { data, error } = await getSupabase()
    .from("conference_events")
    .select(eventColumns)
    .eq("slug", slug)
    .maybeSingle<ConferenceEvent>()
  if (error) throw new Error(error.message)
  return data
}

export async function getConferenceEventById(id: string): Promise<ConferenceEvent | null> {
  const { data, error } = await getSupabase()
    .from("conference_events")
    .select(eventColumns)
    .eq("id", id)
    .maybeSingle<ConferenceEvent>()
  if (error) throw new Error(error.message)
  return data
}

export const conferenceEventInsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens only."),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable().transform(
    (v) => (v && v.length > 0 ? v : null)
  ),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  slot_minutes: z.coerce.number().int().min(5).max(120).default(15),
  active: z.coerce.boolean().default(true),
})
export type ConferenceEventInsert = z.infer<typeof conferenceEventInsertSchema>

export async function createConferenceEvent(
  input: ConferenceEventInsert
): Promise<ConferenceEvent> {
  const { data, error } = await getSupabase()
    .from("conference_events")
    .insert(input)
    .select(eventColumns)
    .single<ConferenceEvent>()
  if (error) throw new Error(`Failed to create event: ${error.message}`)
  return data
}

export async function deleteConferenceEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from("conference_events").delete().eq("id", id)
  if (error) throw new Error(`Failed to delete event: ${error.message}`)
}

// ============================================================================
// Slots
// ============================================================================

export type ConferenceSlot = {
  id: string
  created_at: string
  updated_at: string
  event_id: string
  teacher_profile_id: string
  start_at: string
  end_at: string
  booked_by_parent_email: string | null
  booked_by_profile_id: string | null
  booked_for_student_id: string | null
  parent_notes: string | null
  booked_at: string | null
  cancelled_at: string | null
}

const slotColumns =
  "id, created_at, updated_at, event_id, teacher_profile_id, start_at, end_at, " +
  "booked_by_parent_email, booked_by_profile_id, booked_for_student_id, parent_notes, " +
  "booked_at, cancelled_at"

export async function listSlotsForEvent(eventId: string): Promise<ConferenceSlot[]> {
  const { data, error } = await getSupabase()
    .from("conference_slots")
    .select(slotColumns)
    .eq("event_id", eventId)
    .order("start_at", { ascending: true })
    .returns<ConferenceSlot[]>()
  if (error) throw new Error(error.message)
  return data
}

export async function listSlotsForTeacher(
  eventId: string,
  teacherProfileId: string
): Promise<ConferenceSlot[]> {
  const { data, error } = await getSupabase()
    .from("conference_slots")
    .select(slotColumns)
    .eq("event_id", eventId)
    .eq("teacher_profile_id", teacherProfileId)
    .order("start_at", { ascending: true })
    .returns<ConferenceSlot[]>()
  if (error) throw new Error(error.message)
  return data
}

export async function listSlotsForParent(parentEmail: string): Promise<ConferenceSlot[]> {
  const { data, error } = await getSupabase()
    .from("conference_slots")
    .select(slotColumns)
    .eq("booked_by_parent_email", parentEmail.toLowerCase())
    .order("start_at", { ascending: true })
    .returns<ConferenceSlot[]>()
  if (error) throw new Error(error.message)
  return data
}

// Generates uniform slots for every teacher profile across the event window.
// Idempotent — uses ON CONFLICT (event_id, teacher_profile_id, start_at).
export async function generateSlotsForEvent(eventId: string): Promise<{
  slots_created: number
  teachers_with_slots: number
}> {
  const supabase = getSupabase()
  const event = await getConferenceEventById(eventId)
  if (!event) throw new Error("Event not found.")

  // All active faculty profiles. (Admins who teach can show up because they
  // have role='faculty' too.)
  const { data: teachers, error: teachersError } = await supabase
    .from("profiles")
    .select("id, roles, active")
    .eq("active", true)
    .returns<Array<{ id: string; roles: string[]; active: boolean }>>()
  if (teachersError) throw new Error(teachersError.message)
  const facultyIds = (teachers ?? [])
    .filter((p) => p.roles.includes("faculty"))
    .map((p) => p.id)

  if (facultyIds.length === 0) {
    return { slots_created: 0, teachers_with_slots: 0 }
  }

  const slotsPerTeacher: Array<{
    event_id: string
    teacher_profile_id: string
    start_at: string
    end_at: string
  }> = []

  const startMs = new Date(event.start_at).getTime()
  const endMs = new Date(event.end_at).getTime()
  const stepMs = event.slot_minutes * 60 * 1000

  for (const tid of facultyIds) {
    for (let t = startMs; t + stepMs <= endMs; t += stepMs) {
      slotsPerTeacher.push({
        event_id: eventId,
        teacher_profile_id: tid,
        start_at: new Date(t).toISOString(),
        end_at: new Date(t + stepMs).toISOString(),
      })
    }
  }

  if (slotsPerTeacher.length === 0) {
    return { slots_created: 0, teachers_with_slots: 0 }
  }

  // Insert with ignore-on-conflict — re-generating won't create duplicates.
  const { error, count } = await supabase
    .from("conference_slots")
    .upsert(slotsPerTeacher, {
      onConflict: "event_id,teacher_profile_id,start_at",
      ignoreDuplicates: true,
      count: "exact",
    })
  if (error) throw new Error(error.message)

  return {
    slots_created: count ?? 0,
    teachers_with_slots: facultyIds.length,
  }
}

// Atomically books an open slot. The parent_email + student_id are NOT NULL
// only after a successful booking. Refuses if the slot is already booked
// (raced or stale).
export async function bookSlot(input: {
  slot_id: string
  parent_email: string
  parent_profile_id: string | null
  student_id: string
  parent_notes?: string | null
}): Promise<ConferenceSlot> {
  const supabase = getSupabase()
  // Conditional update: only set the booking fields if currently null.
  // (This is the race-safe approach without a stored procedure.)
  const { data, error } = await supabase
    .from("conference_slots")
    .update({
      booked_by_parent_email: input.parent_email.toLowerCase(),
      booked_by_profile_id: input.parent_profile_id,
      booked_for_student_id: input.student_id,
      parent_notes: input.parent_notes ?? null,
      booked_at: new Date().toISOString(),
      cancelled_at: null,
    })
    .eq("id", input.slot_id)
    .is("booked_by_parent_email", null)
    .is("cancelled_at", null)
    .select(slotColumns)
    .maybeSingle<ConferenceSlot>()
  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error("This slot is no longer open. Pick another time.")
  }
  return data
}

export async function cancelSlot(input: {
  slot_id: string
  by_parent_email: string
}): Promise<void> {
  const supabase = getSupabase()
  // Only the booker (or an admin via a separate code path) can cancel.
  const { error } = await supabase
    .from("conference_slots")
    .update({
      booked_by_parent_email: null,
      booked_by_profile_id: null,
      booked_for_student_id: null,
      parent_notes: null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", input.slot_id)
    .eq("booked_by_parent_email", input.by_parent_email.toLowerCase())
  if (error) throw new Error(error.message)
}
