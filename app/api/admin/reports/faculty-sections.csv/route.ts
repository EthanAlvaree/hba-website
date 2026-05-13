import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { csvResponse, csvRows } from "@/lib/csv"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.isAdmin) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase
    .from("course_sections")
    .select(
      `section_code, period, room, max_enrollment,
       course:courses(code, name),
       term:terms!inner(name, is_current),
       teacher:profiles(email, first_name, last_name, display_name)`
    )
    .eq("term.is_current", true)
    .returns<
      Array<{
        section_code: string | null
        period: string | null
        room: string | null
        max_enrollment: number | null
        course: { code: string; name: string } | null
        term: { name: string; is_current: boolean } | null
        teacher: {
          email: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
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
      "max_enrollment",
      "teacher_email",
      "teacher_name",
    ],
    (data ?? [])
      .sort((a, b) => {
        const at = (a.teacher?.last_name ?? a.teacher?.email ?? "zzz").toLowerCase()
        const bt = (b.teacher?.last_name ?? b.teacher?.email ?? "zzz").toLowerCase()
        return at.localeCompare(bt)
      })
      .map((r) => [
        r.term?.name,
        r.course?.code,
        r.course?.name,
        r.section_code,
        r.period,
        r.room,
        r.max_enrollment,
        r.teacher?.email ?? "",
        r.teacher
          ? `${r.teacher.first_name ?? ""} ${r.teacher.last_name ?? ""}`.trim() ||
            r.teacher.display_name ||
            r.teacher.email
          : "(unassigned)",
      ])
  )

  return csvResponse(csv, "faculty-sections.csv")
}
