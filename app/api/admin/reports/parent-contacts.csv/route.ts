import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { csvResponse, csvRows } from "@/lib/csv"
import { createClient } from "@supabase/supabase-js"

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
}

export async function GET() {
  const session = await auth()
  if (!session?.isAdmin) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase
    .from("parent_links")
    .select(
      `is_primary, is_homestay, is_emergency_contact, can_view_grades,
       can_view_attendance, can_receive_communications,
       parent:profiles!parent_links_parent_profile_id_fkey(email, first_name, last_name, mobile_phone, active),
       student:students!inner(legal_first_name, legal_last_name, preferred_name, current_grade, status)`
    )
    .eq("student.status", "active")
    .returns<
      Array<{
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

  return csvResponse(csv, "parent-contacts.csv")
}
