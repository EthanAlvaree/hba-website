import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  getStudentDetail,
} from "@/lib/sis"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import TranscriptDocument from "@/components/transcripts/TranscriptDocument"
import PrintButton from "@/components/transcripts/PrintButton"

export const dynamic = "force-dynamic"

export default async function ParentTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  const { id: studentId } = await params
  const isAdmin = session.isAdmin === true

  // Parents need an explicit parent_link + can_view_grades. Admins go through
  // regardless (they get the same parent-style read-only view here).
  if (!isAdmin) {
    if (!profile.roles.includes("parent")) {
      redirect("/admin/sign-in")
    }
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) {
      notFound()
    }
    if (!link.can_view_grades) {
      redirect(`/parent/students/${studentId}`)
    }
  }

  const student = await getStudentDetail(studentId)
  if (!student) {
    notFound()
  }

  const transcript = await buildTranscriptForStudent(student.id)
  if (!transcript) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/parent/students/${studentId}`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to student overview
        </Link>
        <PrintButton />
      </div>

      {/* Parent view uses the same unofficial layout as the student's own view. */}
      <TranscriptDocument transcript={transcript} variant="student" />
    </div>
  )
}
