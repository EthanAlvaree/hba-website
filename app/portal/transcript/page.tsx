import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, getStudentByProfileId } from "@/lib/sis"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import TranscriptDocument from "@/components/transcripts/TranscriptDocument"
import PrintButton from "@/components/transcripts/PrintButton"

export const dynamic = "force-dynamic"

export default async function PortalTranscriptPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("student")) {
    redirect("/portal")
  }

  const studentStub = await getStudentByProfileId(profile.id)
  if (!studentStub) {
    redirect("/")
  }

  const transcript = await buildTranscriptForStudent(studentStub.id)
  if (!transcript) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/portal"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to portal
          </Link>
          <PrintButton />
        </div>

        <TranscriptDocument transcript={transcript} variant="student" />
      </div>
    </main>
  )
}
