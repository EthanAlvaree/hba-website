import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentLinkForStudent, getProfileByEmail } from "@/lib/sis"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import ReportCardDocument from "@/components/transcripts/ReportCardDocument"
import PrintButton from "@/components/transcripts/PrintButton"

export const dynamic = "force-dynamic"

export default async function ParentReportCardPage({
  params,
}: {
  params: Promise<{ id: string; termSlug: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const { id: studentId, termSlug } = await params
  const isAdmin = session.isAdmin === true

  if (!isAdmin) {
    if (!profile.roles.includes("parent")) {
      redirect("/admin/sign-in")
    }
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) notFound()
    if (!link.can_view_grades) {
      redirect(`/parent/students/${studentId}`)
    }
  }

  const transcript = await buildTranscriptForStudent(studentId)
  if (!transcript) notFound()

  const matched =
    transcript.terms.find((t) => t.term_slug === termSlug) ??
    transcript.terms.find((t) => t.term_id === termSlug) ??
    null
  if (!matched) notFound()

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

      <ReportCardDocument transcript={transcript} term={matched} />
    </div>
  )
}
