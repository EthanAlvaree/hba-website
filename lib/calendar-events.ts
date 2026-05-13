// lib/calendar-events.ts
//
// DB-backed school calendar. Replaces the legacy content/events.json on-disk
// store. The same `calendar_events` table feeds:
//   - the public /calendar page (via lib/events-server.ts, which now reads here)
//   - the .ics subscription feed at /calendar.ics
//   - eventually the SIS attendance grid (skip non-school days) and the
//     scheduler (avoid placing classes on holidays).
//
// Categories match lib/categories.ts. We don't enforce them via a Postgres
// enum so adding new categories doesn't require a migration; the admin form
// uses a select limited to the canonical set.

import "server-only"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import type { CategoryKey } from "@/lib/categories"
import type { SchoolEvent } from "@/lib/events"

function createServerSupabaseClient() {
  const supabaseUrl = process.env.HBA_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
let cachedSupabase: ReturnType<typeof createServerSupabaseClient> | undefined
function getSupabase() {
  if (!cachedSupabase) cachedSupabase = createServerSupabaseClient()
  return cachedSupabase
}

// ============================================================================
// Row types
// ============================================================================

export type CalendarEventRow = {
  id: string
  created_at: string
  updated_at: string
  slug: string
  title: string
  start_date: string // YYYY-MM-DD
  end_date: string | null
  all_day: boolean
  start_time: string | null // HH:MM:SS
  end_time: string | null
  category: string
  location: string | null
  description: string | null
  created_by_email: string | null
}

const columns =
  "id, created_at, updated_at, slug, title, start_date, end_date, all_day, " +
  "start_time, end_time, category, location, description, created_by_email"

// ============================================================================
// Reads
// ============================================================================

export async function listCalendarEvents(): Promise<CalendarEventRow[]> {
  const { data, error } = await getSupabase()
    .from("calendar_events")
    .select(columns)
    .order("start_date", { ascending: true })
    .returns<CalendarEventRow[]>()
  if (error) throw new Error(`Failed to list calendar events: ${error.message}`)
  return data
}

export async function getCalendarEventBySlug(
  slug: string
): Promise<CalendarEventRow | null> {
  const { data, error } = await getSupabase()
    .from("calendar_events")
    .select(columns)
    .eq("slug", slug)
    .maybeSingle<CalendarEventRow>()
  if (error) throw new Error(`Failed to load event: ${error.message}`)
  return data
}

// Convert a DB row into the public SchoolEvent shape consumed by the public
// /calendar page + the .ics feed. Mirrors the old content/events.json format
// exactly so we didn't have to rewrite any client code.
export function rowToSchoolEvent(row: CalendarEventRow): SchoolEvent {
  return {
    id: row.slug,
    title: row.title,
    start: row.all_day
      ? row.start_date
      : `${row.start_date}T${(row.start_time ?? "00:00:00").slice(0, 8)}`,
    end: row.end_date
      ? row.all_day
        ? row.end_date
        : `${row.end_date}T${(row.end_time ?? "23:59:59").slice(0, 8)}`
      : undefined,
    allDay: row.all_day,
    category: row.category as CategoryKey,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
  }
}

// ============================================================================
// Mutations
// ============================================================================

export const calendarCategorySchema = z.enum([
  "academics",
  "holiday",
  "faculty",
  "community",
])

export const calendarEventInsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only."),
  title: z.string().trim().min(1).max(200),
  start_date: z.iso.date(),
  end_date: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  all_day: z.coerce.boolean().default(true),
  start_time: z
    .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  end_time: z
    .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  category: calendarCategorySchema,
  location: z.string().trim().max(200).optional().nullable().transform(emptyToNull),
  description: z.string().trim().max(4000).optional().nullable().transform(emptyToNull),
})

function emptyToNull(v: string | null | undefined): string | null {
  return v && v.trim().length > 0 ? v : null
}

export const calendarEventUpdateSchema = calendarEventInsertSchema.extend({
  id: z.uuid(),
})

export type CalendarEventInsert = z.infer<typeof calendarEventInsertSchema>
export type CalendarEventUpdate = z.infer<typeof calendarEventUpdateSchema>

export async function createCalendarEvent(
  input: CalendarEventInsert,
  createdByEmail: string | null
): Promise<CalendarEventRow> {
  const { data, error } = await getSupabase()
    .from("calendar_events")
    .insert({ ...input, created_by_email: createdByEmail })
    .select(columns)
    .single<CalendarEventRow>()
  if (error) throw new Error(`Failed to create event: ${error.message}`)
  return data
}

export async function updateCalendarEvent(
  input: CalendarEventUpdate
): Promise<CalendarEventRow> {
  const { id, ...rest } = input
  const { data, error } = await getSupabase()
    .from("calendar_events")
    .update(rest)
    .eq("id", id)
    .select(columns)
    .single<CalendarEventRow>()
  if (error) throw new Error(`Failed to update event: ${error.message}`)
  return data
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from("calendar_events").delete().eq("id", id)
  if (error) throw new Error(`Failed to delete event: ${error.message}`)
}

// ============================================================================
// School-day helpers (used by attendance + scheduler integration later)
// ============================================================================

// True when the given YYYY-MM-DD is NOT a school day. Considers any event
// with category "holiday" or "faculty" (in-service) that covers the date.
export function isNonSchoolDay(date: string, events: CalendarEventRow[]): boolean {
  for (const ev of events) {
    if (ev.category !== "holiday" && ev.category !== "faculty") continue
    const start = ev.start_date
    const endExclusive = ev.end_date ?? addDays(start, 1)
    if (date >= start && date < endExclusive) return true
  }
  return false
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
}
