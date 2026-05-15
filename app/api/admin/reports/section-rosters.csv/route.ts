import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { csvResponse, csvRows } from "@/lib/csv"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.isAdmin) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = createClient(
    getSupabaseUrl()!,
    getSupabaseServiceRoleKey()!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `status,
       student:students(legal_first_name, legal_last_name, preferred_name, current_grade),
       section:course_sections!inner(
         section_code, period, room,
         course:courses(code, name),
         term:terms!inner(name, is_current)
       )`
    )
    .eq("section.term.is_current", true)
    .returns<
      Array<{
        status: string
        student: {
          legal_first_name: string
          legal_last_name: string
          preferred_name: string | null
          current_grade: string | null
        } | null
        section: {
          section_code: string | null
          period: string | null
          room: string | null
          course: { code: string; name: string } | null
          term: { name: string; is_current: boolean } | null
        } | null
      }>
    >()

  if (error) return new NextResponse(error.message, { status: 500 })

  const csv = csvRows(
    [
      "term",
      "course_code",
      "course_name",
      "section_code",
      "period",
      "room",
      "student_last",
      "student_first",
      "student_preferred",
      "grade",
      "enrollment_status",
    ],
    (data ?? [])
      .filter((r) => r.student && r.section)
      .sort((a, b) => {
        const ac = a.section?.course?.code ?? ""
        const bc = b.section?.course?.code ?? ""
        const cmp = ac.localeCompare(bc)
        if (cmp !== 0) return cmp
        return (a.student?.legal_last_name ?? "").localeCompare(
          b.student?.legal_last_name ?? ""
        )
      })
      .map((r) => [
        r.section?.term?.name,
        r.section?.course?.code,
        r.section?.course?.name,
        r.section?.section_code,
        r.section?.period,
        r.section?.room,
        r.student?.legal_last_name,
        r.student?.legal_first_name,
        r.student?.preferred_name,
        r.student?.current_grade,
        r.status,
      ])
  )

  return csvResponse(csv, "section-rosters.csv")
}
