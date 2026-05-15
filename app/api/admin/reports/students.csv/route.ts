import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { csvResponse, csvRows } from "@/lib/csv"
import { listStudentsForDirectory } from "@/lib/sis"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.isAdmin) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const url = new URL(request.url)
  const status = url.searchParams.get("status") as
    | "active"
    | "graduated"
    | "withdrawn"
    | null

  const students = await listStudentsForDirectory({
    status: status ?? "all",
    enrollmentType: "all",
  })

  const csv = csvRows(
    [
      "id",
      "legal_first_name",
      "legal_last_name",
      "preferred_name",
      "hba_email",
      "current_grade",
      "enrollment_type",
      "status",
      "registered_at_hba",
    ],
    students.map((s) => [
      s.id,
      s.legal_first_name,
      s.legal_last_name,
      s.preferred_name,
      s.profile?.email,
      s.current_grade,
      s.enrollment_type,
      s.status,
      s.registered_at_hba,
    ])
  )

  return csvResponse(csv, `students-${status ?? "all"}.csv`)
}
