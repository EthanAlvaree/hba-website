// lib/incidents.ts
//
// Lightweight student incident log. Used for the everyday stuff teachers
// need to communicate to parents: late to class, missing assignment, in-
// class disruption, kudos. Heavier behavior cases (suspensions, IEP
// triggers) live in the office and can flow through the same table with
// the appropriate kind enum value + admin-only visibility.
//
// See migration 0013-incidents.sql for the schema. The DB enum
// `incident_kind` is the source of truth — keep the IncidentKind type
// below in sync.

import "server-only"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

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
// Types + schemas
// ============================================================================

export const incidentKindSchema = z.enum([
  "tardy",
  "unexcused_absence",
  "dress_code",
  "cell_phone",
  "classroom_disruption",
  "missing_assignment",
  "late_assignment",
  "academic_concern",
  "positive",
  "other",
])
export type IncidentKind = z.infer<typeof incidentKindSchema>

export const incidentKindLabels: Record<IncidentKind, string> = {
  tardy: "Tardy",
  unexcused_absence: "Unexcused absence",
  dress_code: "Dress code",
  cell_phone: "Cell phone",
  classroom_disruption: "Classroom disruption",
  missing_assignment: "Missing assignment",
  late_assignment: "Late assignment",
  academic_concern: "Academic concern",
  positive: "Kudos / positive",
  other: "Other",
}

export const incidentKindBadgeClass: Record<IncidentKind, string> = {
  tardy: "border border-amber-200 bg-amber-50 text-amber-800",
  unexcused_absence: "border border-rose-200 bg-rose-50 text-rose-700",
  dress_code: "border border-violet-200 bg-violet-50 text-violet-700",
  cell_phone: "border border-violet-200 bg-violet-50 text-violet-700",
  classroom_disruption: "border border-rose-200 bg-rose-50 text-rose-700",
  missing_assignment: "border border-amber-200 bg-amber-50 text-amber-800",
  late_assignment: "border border-amber-200 bg-amber-50 text-amber-800",
  academic_concern: "border border-sky-200 bg-sky-50 text-sky-700",
  positive: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  other: "border border-slate-200 bg-slate-100 text-slate-700",
}

export type IncidentRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  section_id: string | null
  enrollment_id: string | null
  attendance_record_id: string | null
  kind: IncidentKind
  occurred_at: string
  summary: string
  details: string | null
  reported_by_email: string
  reported_by_profile_id: string | null
  parent_notified: boolean
  parent_notified_at: string | null
  parent_notified_method: string | null
  visible_to_parent: boolean
}

const columns =
  "id, created_at, updated_at, student_id, section_id, enrollment_id, " +
  "attendance_record_id, kind, occurred_at, summary, details, " +
  "reported_by_email, reported_by_profile_id, parent_notified, " +
  "parent_notified_at, parent_notified_method, visible_to_parent"

// ============================================================================
// Reads
// ============================================================================

export async function listIncidentsForStudent(
  studentId: string,
  options?: { onlyVisibleToParent?: boolean }
): Promise<IncidentRecord[]> {
  let query = getSupabase()
    .from("incidents")
    .select(columns)
    .eq("student_id", studentId)
    .order("occurred_at", { ascending: false })
  if (options?.onlyVisibleToParent) {
    query = query.eq("visible_to_parent", true)
  }
  const { data, error } = await query.returns<IncidentRecord[]>()
  if (error) throw new Error(`Failed to list incidents: ${error.message}`)
  return data
}

export async function listIncidentsForSection(
  sectionId: string
): Promise<IncidentRecord[]> {
  const { data, error } = await getSupabase()
    .from("incidents")
    .select(columns)
    .eq("section_id", sectionId)
    .order("occurred_at", { ascending: false })
    .returns<IncidentRecord[]>()
  if (error) throw new Error(`Failed to list section incidents: ${error.message}`)
  return data
}

// ============================================================================
// Writes
// ============================================================================

export const createIncidentInputSchema = z.object({
  student_id: z.uuid(),
  section_id: z.uuid().optional().nullable(),
  enrollment_id: z.uuid().optional().nullable(),
  attendance_record_id: z.uuid().optional().nullable(),
  kind: incidentKindSchema,
  occurred_at: z.string().datetime().optional(),
  summary: z.string().trim().min(1, "Summary is required").max(300),
  details: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  reported_by_email: z.string().email(),
  reported_by_profile_id: z.uuid().optional().nullable(),
  parent_notified: z.boolean().optional().default(false),
  parent_notified_method: z
    .enum(["email", "phone", "in_person", "teams"])
    .optional()
    .nullable(),
  visible_to_parent: z.boolean().optional().default(true),
})
export type CreateIncidentInput = z.infer<typeof createIncidentInputSchema>

export async function createIncident(
  input: CreateIncidentInput
): Promise<IncidentRecord> {
  const row: Record<string, unknown> = { ...input }
  if (input.parent_notified) {
    row.parent_notified_at = new Date().toISOString()
  }
  const { data, error } = await getSupabase()
    .from("incidents")
    .insert(row)
    .select(columns)
    .single<IncidentRecord>()
  if (error) throw new Error(`Failed to create incident: ${error.message}`)
  return data
}

export async function markParentNotified(input: {
  id: string
  method: "email" | "phone" | "in_person" | "teams"
}): Promise<void> {
  const { error } = await getSupabase()
    .from("incidents")
    .update({
      parent_notified: true,
      parent_notified_at: new Date().toISOString(),
      parent_notified_method: input.method,
    })
    .eq("id", input.id)
  if (error) throw new Error(`Failed to mark notified: ${error.message}`)
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await getSupabase().from("incidents").delete().eq("id", id)
  if (error) throw new Error(`Failed to delete incident: ${error.message}`)
}
