import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import TranscriptDocument from "@/components/transcripts/TranscriptDocument"
import PrintButton from "@/components/transcripts/PrintButton"

export const dynamic = "force-dynamic"

export default async function AdminTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id } = await params

  const transcript = await buildTranscriptForStudent(id)
  if (!transcript) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/admin/students/${id}`}
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to student
          </Link>
          <PrintButton />
        </div>

        <TranscriptDocument transcript={transcript} variant="official" />
      </div>
    </main>
  )
}
