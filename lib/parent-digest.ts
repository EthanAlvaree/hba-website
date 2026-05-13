// lib/parent-digest.ts
//
// Builds the daily parent-activity digest. For each parent_link with
// can_receive_communications = true, gathers the recent activity on the
// linked student's enrollments (new published-assignment grades + non-
// "present" attendance exceptions) and produces a structured payload the
// cron route can format and email.
//
// The cron decides cadence (currently nightly at 23:00 UTC). The library
// just queries by an explicit time window and is stateless — we don't track
// "last sent" anywhere, so an admin running the cron twice in 24h would
// double-send. That's acceptable for the nightly model since Vercel cron
// only fires once per schedule.

import { createClient } from "@supabase/supabase-js"
import { attendanceStatusLabels, type AttendanceStatus } from "@/lib/attendance"
import type { ScoreKind } from "@/lib/gradebook"

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
// Per-student activity (one window)
// ============================================================================

export type StudentDigestStudent = {
  id: string
  legal_first_name: string
  legal_last_name: string
  preferred_name: string | null
}

export type StudentScoreActivity = {
  assignment_title: string
  course_name: string
  course_code: string | null
  kind: ScoreKind
  points_earned: number | null
  points_possible: number
  graded_at: string
}

export type StudentAttendanceActivity = {
  date: string
  status: AttendanceStatus
  course_name: string
  course_code: string | null
  note: string | null
}

export type StudentDigest = {
  student: StudentDigestStudent
  scores: StudentScoreActivity[]
  attendance: StudentAttendanceActivity[]
}

export type ParentDigest = {
  parent_email: string
  parent_name: string | null
  /** Each linked student gets its own block in the email. */
  students: StudentDigest[]
}

export type ParentDigestRunResult = {
  parents_considered: number
  parents_with_activity: number
  emails_sent: number
  emails_failed: number
  errors: Array<{ parent_email: string; message: string }>
}

// Pulls every (active, comms-allowed) parent_link with the joined parent
// profile and the joined student. One row per link.
async function listEligibleParentLinks() {
  const { data, error } = await getSupabase()
    .from("parent_links")
    .select(
      `id, can_view_grades, can_view_attendance, can_receive_communications,
       parent:profiles!parent_links_parent_profile_id_fkey(id, email, first_name, last_name, display_name, active),
       student:students(id, legal_first_name, legal_last_name, preferred_name, status)`
    )
    .eq("can_receive_communications", true)
    .returns<
      Array<{
        id: string
        can_view_grades: boolean
        can_view_attendance: boolean
        can_receive_communications: boolean
        parent: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          active: boolean
        } | null
        student: {
          id: string
          legal_first_name: string
          legal_last_name: string
          preferred_name: string | null
          status: string
        } | null
      }>
    >()

  if (error) {
    throw new Error(`Failed to load parent_links: ${error.message}`)
  }

  // Filter to active parents linked to active students.
  return (data ?? []).filter(
    (link) =>
      link.parent &&
      link.parent.active &&
      link.student &&
      link.student.status === "active"
  )
}

type ScoreRow = {
  id: string
  enrollment_id: string
  graded_at: string
  kind: ScoreKind
  points_earned: number | null
  assignment: {
    title: string
    points_possible: number
    is_published: boolean
  } | null
  enrollment: {
    student_id: string
    section: {
      course: { name: string; code: string } | null
    } | null
  } | null
}

type AttendanceRow = {
  id: string
  date: string
  status: AttendanceStatus
  note: string | null
  enrollment: {
    student_id: string
    section: {
      course: { name: string; code: string } | null
    } | null
  } | null
}

// Pulls scores graded in [since, until] for the given student IDs.
async function listRecentScoresForStudents(
  studentIds: string[],
  since: string,
  until: string
): Promise<Map<string, StudentScoreActivity[]>> {
  const out = new Map<string, StudentScoreActivity[]>()
  if (studentIds.length === 0) return out

  const { data, error } = await getSupabase()
    .from("scores")
    .select(
      `id, enrollment_id, graded_at, kind, points_earned,
       assignment:assignments(title, points_possible, is_published),
       enrollment:enrollments!inner(
         student_id,
         section:course_sections(course:courses(name, code))
       )`
    )
    .in("enrollment.student_id", studentIds)
    .gte("graded_at", since)
    .lt("graded_at", until)
    .returns<ScoreRow[]>()

  if (error) {
    throw new Error(`Failed to list recent scores: ${error.message}`)
  }

  for (const row of data ?? []) {
    if (!row.assignment || !row.assignment.is_published) continue
    if (!row.enrollment) continue
    const studentId = row.enrollment.student_id
    const bucket = out.get(studentId) ?? []
    bucket.push({
      assignment_title: row.assignment.title,
      course_name: row.enrollment.section?.course?.name ?? "(deleted course)",
      course_code: row.enrollment.section?.course?.code ?? null,
      kind: row.kind,
      points_earned: row.points_earned,
      points_possible: row.assignment.points_possible,
      graded_at: row.graded_at,
    })
    out.set(studentId, bucket)
  }

  return out
}

// Pulls non-"present" attendance records with date in [sinceDate, untilDate].
async function listRecentAttendanceForStudents(
  studentIds: string[],
  sinceDate: string,
  untilDate: string
): Promise<Map<string, StudentAttendanceActivity[]>> {
  const out = new Map<string, StudentAttendanceActivity[]>()
  if (studentIds.length === 0) return out

  const { data, error } = await getSupabase()
    .from("attendance_records")
    .select(
      `id, date, status, note,
       enrollment:enrollments!inner(
         student_id,
         section:course_sections(course:courses(name, code))
       )`
    )
    .in("enrollment.student_id", studentIds)
    .gte("date", sinceDate)
    .lte("date", untilDate)
    .neq("status", "present")
    .returns<AttendanceRow[]>()

  if (error) {
    throw new Error(`Failed to list recent attendance: ${error.message}`)
  }

  for (const row of data ?? []) {
    if (!row.enrollment) continue
    const studentId = row.enrollment.student_id
    const bucket = out.get(studentId) ?? []
    bucket.push({
      date: row.date,
      status: row.status,
      course_name: row.enrollment.section?.course?.name ?? "(deleted course)",
      course_code: row.enrollment.section?.course?.code ?? null,
      note: row.note,
    })
    out.set(studentId, bucket)
  }

  return out
}

// Builds per-parent digests. `since` is an ISO timestamp; `until` defaults to
// now. Attendance is matched by calendar date in Pacific time on the
// caller's behalf — we accept ISO strings here and let the caller pre-format
// the date range.
export async function buildParentDigests(input: {
  since: string
  until: string
  sinceDate: string // YYYY-MM-DD
  untilDate: string // YYYY-MM-DD
}): Promise<ParentDigest[]> {
  const links = await listEligibleParentLinks()
  if (links.length === 0) return []

  // Group links by parent profile so each parent gets one email even if
  // they're linked to multiple students.
  type ParentBucket = {
    parent_email: string
    parent_name: string | null
    studentIds: Set<string>
    students: Map<string, StudentDigestStudent>
    canViewGrades: Map<string, boolean>
    canViewAttendance: Map<string, boolean>
  }
  const byParent = new Map<string, ParentBucket>()
  for (const link of links) {
    if (!link.parent || !link.student) continue
    const key = link.parent.email.toLowerCase()
    let bucket = byParent.get(key)
    if (!bucket) {
      bucket = {
        parent_email: link.parent.email,
        parent_name:
          link.parent.first_name?.trim() ||
          link.parent.display_name?.trim() ||
          null,
        studentIds: new Set(),
        students: new Map(),
        canViewGrades: new Map(),
        canViewAttendance: new Map(),
      }
      byParent.set(key, bucket)
    }
    bucket.studentIds.add(link.student.id)
    bucket.students.set(link.student.id, {
      id: link.student.id,
      legal_first_name: link.student.legal_first_name,
      legal_last_name: link.student.legal_last_name,
      preferred_name: link.student.preferred_name,
    })
    // For multiply-linked students (rare), grant the most-permissive flag.
    bucket.canViewGrades.set(
      link.student.id,
      bucket.canViewGrades.get(link.student.id) || link.can_view_grades
    )
    bucket.canViewAttendance.set(
      link.student.id,
      bucket.canViewAttendance.get(link.student.id) || link.can_view_attendance
    )
  }

  // Batch-fetch activity for every student involved.
  const allStudentIds = Array.from(
    new Set(Array.from(byParent.values()).flatMap((b) => Array.from(b.studentIds)))
  )
  const [scoresByStudent, attendanceByStudent] = await Promise.all([
    listRecentScoresForStudents(allStudentIds, input.since, input.until),
    listRecentAttendanceForStudents(
      allStudentIds,
      input.sinceDate,
      input.untilDate
    ),
  ])

  const digests: ParentDigest[] = []
  for (const bucket of byParent.values()) {
    const students: StudentDigest[] = []
    for (const studentId of bucket.studentIds) {
      const student = bucket.students.get(studentId)
      if (!student) continue
      const scores = bucket.canViewGrades.get(studentId)
        ? scoresByStudent.get(studentId) ?? []
        : []
      const attendance = bucket.canViewAttendance.get(studentId)
        ? attendanceByStudent.get(studentId) ?? []
        : []
      if (scores.length === 0 && attendance.length === 0) continue
      students.push({ student, scores, attendance })
    }
    if (students.length === 0) continue
    digests.push({
      parent_email: bucket.parent_email,
      parent_name: bucket.parent_name,
      students,
    })
  }

  return digests
}

// ============================================================================
// HTML formatting
// ============================================================================

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function studentName(s: StudentDigestStudent): string {
  return s.preferred_name?.trim() || s.legal_first_name
}

function scoreLine(score: StudentScoreActivity): string {
  if (score.kind === "numeric" && score.points_earned !== null) {
    const pct =
      score.points_possible > 0
        ? ` (${((Number(score.points_earned) / Number(score.points_possible)) * 100).toFixed(1)}%)`
        : ""
    return `${escapeHtml(score.assignment_title)} — ${Number(score.points_earned).toFixed(2)} / ${Number(score.points_possible).toFixed(2)}${pct}`
  }
  const kindLabel: Record<ScoreKind, string> = {
    numeric: "Numeric",
    excused: "Excused",
    incomplete: "Incomplete",
    missing: "Missing (counts as 0)",
    not_counted: "Doesn't count",
  }
  return `${escapeHtml(score.assignment_title)} — ${kindLabel[score.kind]}`
}

function attendanceLine(record: StudentAttendanceActivity): string {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(`${record.date}T12:00:00Z`))
  const noteLabel = record.note ? ` — ${escapeHtml(record.note)}` : ""
  return `${dateLabel}: ${attendanceStatusLabels[record.status]} in ${escapeHtml(record.course_name)}${noteLabel}`
}

export function buildDigestEmailHtml(digest: ParentDigest): {
  subject: string
  html: string
} {
  const studentLabel =
    digest.students.length === 1
      ? studentName(digest.students[0].student)
      : digest.students.map((s) => studentName(s.student)).join(", ")

  const blocks = digest.students
    .map((s) => {
      const name = studentName(s.student)
      const scoresHtml = s.scores.length
        ? `<p style="margin:8px 0 4px;font-weight:600;">New graded assignments</p><ul style="margin:0 0 12px;padding-left:18px;">${s.scores
            .map((sc) => `<li>${scoreLine(sc)} <span style="color:#666;">(${escapeHtml(sc.course_name)})</span></li>`)
            .join("")}</ul>`
        : ""
      const attendanceHtml = s.attendance.length
        ? `<p style="margin:8px 0 4px;font-weight:600;">Attendance updates</p><ul style="margin:0 0 12px;padding-left:18px;">${s.attendance
            .map((a) => `<li>${attendanceLine(a)}</li>`)
            .join("")}</ul>`
        : ""
      return `<section style="margin:18px 0;padding:14px 18px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <h3 style="margin:0 0 6px;color:#001f3f;font-size:16px;">${escapeHtml(name)}</h3>
        ${scoresHtml}
        ${attendanceHtml}
      </section>`
    })
    .join("")

  const greeting = digest.parent_name
    ? `<p>Hi ${escapeHtml(digest.parent_name)},</p>`
    : `<p>Hello,</p>`

  const html = [
    greeting,
    `<p>Here&rsquo;s the latest activity from HBA for the past 24 hours.</p>`,
    blocks,
    `<p style="color:#666;font-size:13px;">Sign in to the family portal at <a href="https://highbluffacademy.com/parent">highbluffacademy.com/parent</a> to see full grades, attendance, and assignment details.</p>`,
    `<p style="color:#666;font-size:13px;">To stop receiving these digests, ask the office to disable communications on your parent record.</p>`,
    `<p>— High Bluff Academy</p>`,
  ].join("")

  return {
    subject: `HBA daily update — ${studentLabel}`,
    html,
  }
}
