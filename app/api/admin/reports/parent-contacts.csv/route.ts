// Parent-contacts CSV export with filters.
//
// Query params (all optional):
//   ?status=active|graduated|withdrawn|all   — student status filter
//                                              (default: active)
//   ?grade=K|1|2|...|12                     — filter to one grade
//   ?primary_only=1                          — only is_primary=true rows
//   ?comms_only=1                            — only can_receive_communications=true
//   ?tag=soccer                              — limit to students with this tag
//
// The "comms_only" preset is what the office wants in an emergency
// (school closure, weather, etc.) — every parent who's opted in to
// receive school communications, one row per parent-student link.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { csvResponse, csvRows } from "@/lib/csv"
import { listStudentIdsByTag } from "@/lib/sis"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type Row = {
  parent_email: string
  parent_first_name: string | null
  parent_last_name: string | null
  parent_phone: string | null
  is_primary: boolean
  is_homestay: boolean
  is_emergency_contact: boolean
  can_view_grades: boolean
  can_view_attendance: boolean
  can_receive_communications: boolean
  student_legal_first_name: string
  student_legal_last_name: string
  student_preferred_name: string | null
  student_grade: string | null
  student_status: string
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.isAdmin) return new NextResponse("Unauthorized", { status: 401 })

  const url = new URL(request.url)
  const status = url.searchParams.get("status") ?? "active"
  const grade = url.searchParams.get("grade")
  const primaryOnly = url.searchParams.get("primary_only") === "1"
  const commsOnly = url.searchParams.get("comms_only") === "1"
  const tag = url.searchParams.get("tag")?.trim() || null

  // Tag filter: resolve to a student-id list up front, then intersect.
  // An unknown tag (no matching students) short-circuits to an empty CSV
  // — preferable to silently returning the unfiltered set.
  let taggedStudentIds: string[] | null = null
  if (tag) {
    taggedStudentIds = await listStudentIdsByTag(tag)
    if (taggedStudentIds.length === 0) {
      const stamp = new Date().toISOString().slice(0, 10)
      return csvResponse(
        csvRows(
          [
            "student_last",
            "student_first",
            "student_preferred",
            "student_grade",
            "student_status",
            "parent_email",
            "parent_first",
            "parent_last",
            "parent_phone",
            "is_primary",
            "is_homestay",
            "is_emergency_contact",
            "can_view_grades",
            "can_view_attendance",
            "can_receive_communications",
          ],
          []
        ),
        `parent-contacts-tag-${tag}-${stamp}.csv`
      )
    }
  }

  const supabase = getServiceSupabase()
  let query = supabase
    .from("parent_links")
    .select(
      `student_id, is_primary, is_homestay, is_emergency_contact, can_view_grades,
       can_view_attendance, can_receive_communications,
       parent:profiles!parent_links_parent_profile_id_fkey(email, first_name, last_name, mobile_phone, active),
       student:students!inner(legal_first_name, legal_last_name, preferred_name, current_grade, status)`
    )

  if (status !== "all") {
    query = query.eq("student.status", status)
  }
  if (grade) {
    query = query.eq("student.current_grade", grade)
  }
  if (primaryOnly) {
    query = query.eq("is_primary", true)
  }
  if (commsOnly) {
    query = query.eq("can_receive_communications", true)
  }
  if (taggedStudentIds) {
    query = query.in("student_id", taggedStudentIds)
  }

  const { data, error } = await query.returns<
    Array<{
      student_id: string
      is_primary: boolean
      is_homestay: boolean
      is_emergency_contact: boolean
      can_view_grades: boolean
      can_view_attendance: boolean
      can_receive_communications: boolean
      parent: {
        email: string
        first_name: string | null
        last_name: string | null
        mobile_phone: string | null
        active: boolean
      } | null
      student: {
        legal_first_name: string
        legal_last_name: string
        preferred_name: string | null
        current_grade: string | null
        status: string
      } | null
    }>
  >()

  if (error) return new NextResponse(error.message, { status: 500 })

  const rows: Row[] = (data ?? [])
    .filter((r) => r.parent && r.parent.active && r.student)
    .map((r) => ({
      parent_email: r.parent!.email,
      parent_first_name: r.parent!.first_name,
      parent_last_name: r.parent!.last_name,
      parent_phone: r.parent!.mobile_phone,
      is_primary: r.is_primary,
      is_homestay: r.is_homestay,
      is_emergency_contact: r.is_emergency_contact,
      can_view_grades: r.can_view_grades,
      can_view_attendance: r.can_view_attendance,
      can_receive_communications: r.can_receive_communications,
      student_legal_first_name: r.student!.legal_first_name,
      student_legal_last_name: r.student!.legal_last_name,
      student_preferred_name: r.student!.preferred_name,
      student_grade: r.student!.current_grade,
      student_status: r.student!.status,
    }))
    .sort((a, b) =>
      a.student_legal_last_name.localeCompare(b.student_legal_last_name) ||
      a.student_legal_first_name.localeCompare(b.student_legal_first_name)
    )

  const csv = csvRows(
    [
      "student_last",
      "student_first",
      "student_preferred",
      "student_grade",
      "student_status",
      "parent_email",
      "parent_first",
      "parent_last",
      "parent_phone",
      "is_primary",
      "is_homestay",
      "is_emergency_contact",
      "can_view_grades",
      "can_view_attendance",
      "can_receive_communications",
    ],
    rows.map((r) => [
      r.student_legal_last_name,
      r.student_legal_first_name,
      r.student_preferred_name,
      r.student_grade,
      r.student_status,
      r.parent_email,
      r.parent_first_name,
      r.parent_last_name,
      r.parent_phone,
      r.is_primary,
      r.is_homestay,
      r.is_emergency_contact,
      r.can_view_grades,
      r.can_view_attendance,
      r.can_receive_communications,
    ])
  )

  // Filename hints at what was downloaded so a "comms only" export
  // doesn't get mixed up with a full export in the user's Downloads.
  const stamp = new Date().toISOString().slice(0, 10)
  const filterSuffix = [
    commsOnly ? "comms-only" : null,
    primaryOnly ? "primary-only" : null,
    grade ? `grade-${grade}` : null,
    tag ? `tag-${tag}` : null,
    status !== "active" ? `status-${status}` : null,
  ]
    .filter(Boolean)
    .join("-")
  const filename = `parent-contacts${filterSuffix ? `-${filterSuffix}` : ""}-${stamp}.csv`
  return csvResponse(csv, filename)
}
