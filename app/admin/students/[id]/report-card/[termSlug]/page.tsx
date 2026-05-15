import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import ReportCardDocument from "@/components/transcripts/ReportCardDocument"
import PrintButton from "@/components/transcripts/PrintButton"

export const dynamic = "force-dynamic"

export default async function AdminReportCardPage({
  params,
}: {
  params: Promise<{ id: string; termSlug: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id, termSlug } = await params

  const transcript = await buildTranscriptForStudent(id)
  if (!transcript) {
    notFound()
  }

  // termSlug param is the friendly slug, but we accept term IDs too for
  // direct linking from admin tools that already have the UUID handy.
  const matched =
    transcript.terms.find((t) => t.term_slug === termSlug) ??
    transcript.terms.find((t) => t.term_id === termSlug) ??
    null
  if (!matched) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/students/${id}`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to student
        </Link>
        <PrintButton />
      </div>

      <ReportCardDocument transcript={transcript} term={matched} />
    </div>
  )
}
