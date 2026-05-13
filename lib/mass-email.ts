// lib/mass-email.ts
//
// Office-side mass email: build a recipient list from cohort filters, then
// fire a Graph email through the existing sendCustomEmail helper. Used by
// /admin/messaging.
//
// Cohort filters (start simple, expand later):
//   - audience: "parents" | "students" | "faculty" | "active_families"
//   - grade: optional ("9", "10", "11", "12")
//   - section_id: optional (sent to parents OR students linked to this section)
//
// Active filter: only parents with can_receive_communications = true; only
// active profiles; only active students; only currently-enrolled students.

import "server-only"
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
let cached: ReturnType<typeof createServerSupabaseClient> | undefined
function getSupabase() {
  if (!cached) cached = createServerSupabaseClient()
  return cached
}

export type Audience =
  | "parents"
  | "students"
  | "faculty"
  | "active_families"
  | "all_school"

export type CohortFilters = {
  audience: Audience
  grade?: string | null
  section_id?: string | null
}

// Returns the deduplicated list of recipient emails for the given filters.
export async function resolveCohortEmails(
  filters: CohortFilters
): Promise<string[]> {
  const supabase = getSupabase()
  const emails = new Set<string>()

  if (filters.audience === "faculty") {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, roles, active")
      .eq("active", true)
      .returns<Array<{ email: string; roles: string[]; active: boolean }>>()
    if (error) throw new Error(error.message)
    for (const p of data ?? []) {
      if (p.roles.includes("faculty") || p.roles.includes("admin")) emails.add(p.email)
    }
    return [...emails]
  }

  if (filters.audience === "all_school") {
    // Everyone: faculty + admins + every active student + every parent_link
    // with comms enabled. Grade / section filters DO still apply to the
    // student + parent sides for things like "all-school but only the
    // upper school" — though typically all_school is used unscoped.
    const { data: profileRows, error: profileErr } = await supabase
      .from("profiles")
      .select("email, roles, active")
      .eq("active", true)
      .returns<Array<{ email: string; roles: string[]; active: boolean }>>()
    if (profileErr) throw new Error(profileErr.message)
    for (const p of profileRows ?? []) {
      if (p.roles.includes("faculty") || p.roles.includes("admin")) emails.add(p.email)
    }
    // Fall through to the student + parent collection logic below so the
    // grade / section filters still get applied if set.
  }

  // Parents / students / active_families: walk parent_links + students with
  // appropriate filters joined.
  let studentsQuery = supabase
    .from("students")
    .select("id, current_grade, status")
    .eq("status", "active")
  if (filters.grade) studentsQuery = studentsQuery.eq("current_grade", filters.grade)

  const { data: students, error: studentsError } = await studentsQuery.returns<
    Array<{ id: string; current_grade: string | null; status: string }>
  >()
  if (studentsError) throw new Error(studentsError.message)

  let studentIds = (students ?? []).map((s) => s.id)
  if (filters.section_id) {
    const { data: enrolledIds, error: enrolledError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("section_id", filters.section_id)
      .in("status", ["enrolled", "audit"])
      .returns<Array<{ student_id: string }>>()
    if (enrolledError) throw new Error(enrolledError.message)
    const allowed = new Set((enrolledIds ?? []).map((e) => e.student_id))
    studentIds = studentIds.filter((id) => allowed.has(id))
  }
  if (studentIds.length === 0) return []

  if (
    filters.audience === "students" ||
    filters.audience === "active_families" ||
    filters.audience === "all_school"
  ) {
    const { data: studentProfiles } = await supabase
      .from("students")
      .select("profile:profiles(email, active)")
      .in("id", studentIds)
      .returns<Array<{ profile: { email: string; active: boolean } | null }>>()
    for (const row of studentProfiles ?? []) {
      if (row.profile?.active && row.profile.email) emails.add(row.profile.email)
    }
  }

  if (
    filters.audience === "parents" ||
    filters.audience === "active_families" ||
    filters.audience === "all_school"
  ) {
    const { data: links } = await supabase
      .from("parent_links")
      .select(
        `can_receive_communications,
         parent:profiles!parent_links_parent_profile_id_fkey(email, active)`
      )
      .in("student_id", studentIds)
      .eq("can_receive_communications", true)
      .returns<
        Array<{
          can_receive_communications: boolean
          parent: { email: string; active: boolean } | null
        }>
      >()
    for (const link of links ?? []) {
      if (link.parent?.active && link.parent.email) emails.add(link.parent.email)
    }
  }

  return [...emails]
}
