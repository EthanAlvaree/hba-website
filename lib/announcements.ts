// lib/announcements.ts
//
// Class announcements: short messages posted by a teacher to one section.
// Students see them on their /portal/sections/[enrollmentId] page; parents
// see them on /parent/students/[id]/sections/[enrollmentId].

import "server-only"
import { z } from "zod"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

export type AnnouncementRecord = {
  id: string
  created_at: string
  updated_at: string
  section_id: string
  author_email: string
  author_profile_id: string | null
  title: string
  body: string
  pinned: boolean
}

const columns = "id, created_at, updated_at, section_id, author_email, author_profile_id, title, body, pinned"

export async function listAnnouncementsForSection(
  sectionId: string
): Promise<AnnouncementRecord[]> {
  const { data, error } = await getSupabase()
    .from("section_announcements")
    .select(columns)
    .eq("section_id", sectionId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AnnouncementRecord[]>()
  if (error) throw new Error(`Failed to list announcements: ${error.message}`)
  return data
}

export const announcementCreateSchema = z.object({
  section_id: z.uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(8000),
  pinned: z.coerce.boolean().optional().default(false),
  author_email: z.string().email(),
  author_profile_id: z.uuid().optional().nullable(),
})
export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>

export async function createAnnouncement(
  input: AnnouncementCreateInput
): Promise<AnnouncementRecord> {
  const { data, error } = await getSupabase()
    .from("section_announcements")
    .insert(input)
    .select(columns)
    .single<AnnouncementRecord>()
  if (error) throw new Error(`Failed to create announcement: ${error.message}`)
  return data
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await getSupabase().from("section_announcements").delete().eq("id", id)
  if (error) throw new Error(`Failed to delete announcement: ${error.message}`)
}
