// app/admin/applications/[id]/page.tsx
//
// Dedicated detail page for one application. Replaces the inline
// expandable card that used to live on the directory. Header shows
// the family + student names with status / enrollment-type / paid-
// or-unpaid chips; body is the full editable surface delegated to
// ApplicationDetailView.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getApplicationById } from "@/lib/applications"
import { listApplicationDocumentsByIds } from "@/lib/application-storage"
import { siteConfig } from "@/lib/site"
import ApplicationDetailView, {
  formatStatusLabel,
  formatTimestamp,
  getGuardianName,
  getStatusBadgeClassName,
  getStudentName,
} from "../ApplicationDetailView"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

function formatEnrollmentTypeLabel(value: string | null): string | null {
  if (value === "summer") return "Summer"
  if (value === "part_time") return "Part-time"
  if (value === "full_time") return "Full-time"
  return null
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id } = await params
  const application = await getApplicationById(id)
  if (!application) notFound()

  const docMap = await listApplicationDocumentsByIds([application.id])
  const documents = docMap.get(application.id) ?? []

  const hasStripeGate = Boolean(siteConfig.external.stripeRegistrationLink)
  const studentName = getStudentName(application)
  const guardianName = getGuardianName(application)
  const enrollmentLabel = formatEnrollmentTypeLabel(application.enrollment_type)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/applications"
          className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
        >
          ← All applications
        </Link>
      </div>

      <header className="space-y-3 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            {guardianName}
          </h1>
          <span className="text-base text-slate-600">
            for <span className="font-semibold">{studentName}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(application.status)}`}
          >
            {formatStatusLabel(application.status)}
          </span>
          {enrollmentLabel && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              {enrollmentLabel}
            </span>
          )}
          {hasStripeGate && (
            application.fee_paid_at ? (
              <span
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700"
                title={`Registration fee paid on ${formatTimestamp(application.fee_paid_at)}`}
              >
                Paid
              </span>
            ) : (
              <span
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700"
                title="Registration fee has not been paid"
              >
                Unpaid
              </span>
            )
          )}
          {application.student_is_international === true && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
              International
            </span>
          )}
          {application.student_is_international === false && (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              Domestic
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          {application.guardian1_email}
          {application.guardian1_mobile ? ` · ${application.guardian1_mobile}` : ""}
        </p>
        <p className="text-xs text-slate-500">
          Submitted {formatTimestamp(application.created_at)}
        </p>
      </header>

      <ApplicationDetailView
        application={application}
        documents={documents}
        redirectTo={`/admin/applications/${application.id}`}
      />
    </div>
  )
}
