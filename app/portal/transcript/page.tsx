import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, getStudentByProfileId } from "@/lib/sis"
import { buildTranscriptForStudent } from "@/lib/transcripts"
import TranscriptDocument from "@/components/transcripts/TranscriptDocument"
import PrintButton from "@/components/transcripts/PrintButton"
import NoStudentRecord from "@/components/portal/NoStudentRecord"

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
    return <NoStudentRecord title="No transcript yet" />
  }

  const transcript = await buildTranscriptForStudent(studentStub.id)
  if (!transcript) {
    // Stub exists but transcript builder returned null — likely no
    // graded terms yet. Show a gentler version of the same message.
    return (
      <div className="space-y-4">
        <Link
          href="/portal"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to portal
        </Link>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          No transcript to show yet
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          Once you complete at least one graded term, your transcript
          shows up here. Until then there&rsquo;s nothing to print.
        </p>
      </div>
    )
  }

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

        <TranscriptDocument
          transcript={transcript}
          variant="student"
          reportCardBasePath="/portal/report-card"
        />
    </div>
  )
}
