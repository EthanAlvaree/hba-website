import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, getStudentByProfileId } from "@/lib/sis"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import ReportCardDocument from "@/components/transcripts/ReportCardDocument"
import PrintButton from "@/components/transcripts/PrintButton"

export const dynamic = "force-dynamic"

export default async function StudentReportCardPage({
  params,
}: {
  params: Promise<{ termSlug: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("student")) {
    redirect("/portal")
  }

  const studentStub = await getStudentByProfileId(profile.id)
  if (!studentStub) redirect("/")

  const { termSlug } = await params

  const transcript = await buildTranscriptForStudent(studentStub.id)
  if (!transcript) redirect("/")

  const matched =
    transcript.terms.find((t) => t.term_slug === termSlug) ??
    transcript.terms.find((t) => t.term_id === termSlug) ??
    null
  if (!matched) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/portal"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to portal
        </Link>
        <PrintButton />
      </div>

      <ReportCardDocument transcript={transcript} term={matched} />
    </div>
  )
}
