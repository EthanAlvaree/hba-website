import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getPostEnrollmentData,
  listStudentDocuments,
  studentDocumentKindLabels,
  studentDocumentKindSchema,
  type PostEnrollmentDataRecord,
  type StudentDocumentRecord,
} from "@/lib/post-enrollment"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  getStudentDetail,
} from "@/lib/sis"
import {
  deleteStudentDocumentAction,
  savePostEnrollmentDataAction,
  submitPostEnrollmentAction,
  uploadStudentDocumentAction,
} from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; submitted?: string; uploaded?: string; deleted?: string }>
}

const pacific = "America/Los_Angeles"

function formatTimestamp(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

export default async function CompleteFilePage({ params, searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const { id: studentId } = await params
  const isAdmin = session.isAdmin === true

  // Parents reach this page for their own linked kid. Admins reach it
  // from the student detail page to fill the file in on a family's
  // behalf (phone intake, families who can't navigate the portal).
  if (!isAdmin) {
    const profile = await getProfileByEmail(session.user.email)
    if (!profile || !profile.roles.includes("parent")) {
      redirect("/admin/sign-in")
    }
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) {
      notFound()
    }
  }

  const student = await getStudentDetail(studentId)
  if (!student) {
    notFound()
  }

  const [data, documents] = await Promise.all([
    getPostEnrollmentData(studentId),
    listStudentDocuments(studentId),
  ])

  const raw = await searchParams

  const displayName = student.preferred_name?.trim()
    ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
    : `${student.legal_first_name} ${student.legal_last_name}`

  return (
    <div className="space-y-6">
        <div>
          <Link
            href={
              isAdmin
                ? `/admin/students/${studentId}`
                : `/parent/students/${studentId}`
            }
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to {displayName}
          </Link>
        </div>

        {isAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You&rsquo;re editing this file as an admin, on the
            family&rsquo;s behalf. Saves are attributed to your account.
          </div>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            Complete {displayName}&rsquo;s file
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Fill out the sections below after your child&rsquo;s admission has
            been accepted. You can save your progress at any time and come
            back. When everything is in, click <strong>Submit complete file</strong>{" "}
            so the office knows it&rsquo;s ready for review.
          </p>
          {data?.family_completed_at && (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
              You submitted this file on {formatTimestamp(data.family_completed_at)}.
              {data.admin_verified_at
                ? ` The office verified it on ${formatTimestamp(data.admin_verified_at)}.`
                : " The office hasn't reviewed it yet."}
              {" "}You can keep editing — re-submit to flag it for fresh review.
            </p>
          )}
        </section>

        {raw.saved === "1" && <Banner kind="ok">Saved. Keep going whenever you&rsquo;re ready.</Banner>}
        {raw.submitted === "1" && (
          <Banner kind="ok">Submitted for office review. We&rsquo;ll let you know if anything&rsquo;s missing.</Banner>
        )}
        {raw.uploaded === "1" && <Banner kind="ok">Uploaded.</Banner>}
        {raw.deleted === "1" && <Banner kind="ok">Deleted.</Banner>}

        <form action={savePostEnrollmentDataAction} className="space-y-6">
          <input type="hidden" name="student_id" value={studentId} />

          <FormCard title="Immunizations">
            <CheckboxRow
              name="immunizations_complete"
              label="My child is up to date on required immunizations"
              defaultChecked={data?.immunizations_complete ?? false}
            />
            <TextField
              name="immunizations_exemption_reason"
              label="If exempt, why? (optional — medical, religious, etc.)"
              defaultValue={data?.immunizations_exemption_reason}
            />
            <TextareaField
              name="immunizations_notes"
              label="Notes for the office"
              defaultValue={data?.immunizations_notes}
              rows={2}
            />
            <Tip>Upload your child&rsquo;s immunization record in the documents section below.</Tip>
          </FormCard>

          <FormCard title="Medical history">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="medical_blood_type" label="Blood type" defaultValue={data?.medical_blood_type} />
              <TextField name="medical_pediatrician_name" label="Pediatrician name" defaultValue={data?.medical_pediatrician_name} />
              <TextField name="medical_pediatrician_phone" label="Pediatrician phone" type="tel" defaultValue={data?.medical_pediatrician_phone} />
              <TextField name="medical_emergency_contact_name" label="Emergency contact name" defaultValue={data?.medical_emergency_contact_name} />
              <TextField name="medical_emergency_contact_phone" label="Emergency contact phone" type="tel" defaultValue={data?.medical_emergency_contact_phone} />
              <TextField name="medical_emergency_contact_relationship" label="Emergency contact relationship" defaultValue={data?.medical_emergency_contact_relationship} />
            </div>
            <TextareaField name="medical_allergies" label="Allergies" defaultValue={data?.medical_allergies} placeholder="Food, environmental, drug, etc." rows={2} />
            <TextareaField name="medical_conditions" label="Medical conditions" defaultValue={data?.medical_conditions} placeholder="Asthma, diabetes, etc." rows={2} />
            <TextareaField name="medical_medications" label="Current medications" defaultValue={data?.medical_medications} rows={2} />
            <TextareaField name="medical_notes" label="Anything else the school nurse should know" defaultValue={data?.medical_notes} rows={3} />
          </FormCard>

          <FormCard title="Medical insurance">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="insurance_provider" label="Insurance provider" defaultValue={data?.insurance_provider} />
              <TextField name="insurance_phone" label="Provider phone" type="tel" defaultValue={data?.insurance_phone} />
              <TextField name="insurance_policy_number" label="Policy number" defaultValue={data?.insurance_policy_number} />
              <TextField name="insurance_group_number" label="Group number" defaultValue={data?.insurance_group_number} />
              <TextField name="insurance_subscriber_name" label="Subscriber name" defaultValue={data?.insurance_subscriber_name} />
              <TextField name="insurance_subscriber_dob" label="Subscriber DOB" type="date" defaultValue={data?.insurance_subscriber_dob} />
            </div>
            <TextareaField name="insurance_notes" label="Notes" defaultValue={data?.insurance_notes} rows={2} />
            <Tip>Upload a photo of the insurance card in the documents section.</Tip>
          </FormCard>

          <FormCard title="Financial aid (optional)">
            <CheckboxRow
              name="financial_aid_requested"
              label="We&rsquo;d like to be considered for financial aid"
              defaultChecked={data?.financial_aid_requested ?? false}
            />
            <TextareaField name="financial_aid_notes" label="Notes / context (optional)" defaultValue={data?.financial_aid_notes} rows={2} />
            <Tip>Upload completed financial aid forms in the documents section.</Tip>
          </FormCard>

          <FormCard title="Accommodations &amp; IEP">
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxRow name="has_iep" label="My child has an IEP" defaultChecked={data?.has_iep ?? false} />
              <CheckboxRow name="has_504" label="My child has a 504 plan" defaultChecked={data?.has_504 ?? false} />
            </div>
            <TextareaField name="accommodations_needed" label="Accommodations needed" defaultValue={data?.accommodations_needed} placeholder="Extra time on tests, preferential seating, etc." rows={3} />
            <TextareaField name="accommodation_notes" label="Notes" defaultValue={data?.accommodation_notes} rows={2} />
            <Tip>Upload IEP / 504 documentation in the documents section.</Tip>
          </FormCard>

          <FormCard title="Citizenship &amp; visa (international students only)">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="citizenship_country" label="Country of citizenship" defaultValue={data?.citizenship_country} />
              <TextField name="visa_type" label="Visa type" defaultValue={data?.visa_type} placeholder="F-1, J-1, etc." />
              <TextField name="visa_expiration" label="Visa expiration" type="date" defaultValue={data?.visa_expiration} />
              <TextField name="i20_number" label="I-20 number" defaultValue={data?.i20_number} />
              <TextField name="passport_number" label="Passport number" defaultValue={data?.passport_number} />
              <TextField name="passport_expiration" label="Passport expiration" type="date" defaultValue={data?.passport_expiration} />
            </div>
            <Tip>Upload passport, visa, and I-20 scans in the documents section.</Tip>
          </FormCard>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Save progress
            </button>
          </div>
        </form>

        <DocumentsCard
          studentId={studentId}
          documents={documents}
        />

        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-emerald-900">
            Submit complete file
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            When you&rsquo;ve filled in every section and uploaded every
            document the school asked for, submit so the office can verify.
            You can keep editing afterward — re-submitting just flags it for
            fresh review.
          </p>
          <form action={submitPostEnrollmentAction} className="mt-4">
            <input type="hidden" name="student_id" value={studentId} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Submit complete file
            </button>
          </form>
        </section>
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-brand-navy">{title}</h2>
      {children}
    </section>
  )
}

function Banner({ kind, children }: { kind: "ok"; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
      {children}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500">💡 {children}</p>
}

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string | null
  type?: string
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
      />
    </label>
  )
}

function TextareaField({
  name,
  label,
  defaultValue,
  rows = 3,
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string | null
  rows?: number
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
      />
    </label>
  )
}

function CheckboxRow({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
      />
      <span>{label}</span>
    </label>
  )
}

function DocumentsCard({
  studentId,
  documents,
}: {
  studentId: string
  documents: StudentDocumentRecord[]
}) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold text-brand-navy">Documents</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload immunization records, insurance cards, IEP / 504 documents,
          passport / visa / I-20 (international), financial aid forms, and
          anything else relevant. Max 4 MB per file.
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-600">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">📎 {doc.filename}</p>
                <p className="text-xs text-slate-500">
                  {studentDocumentKindLabels[doc.kind]}
                  {doc.description ? ` · ${doc.description}` : ""}
                </p>
              </div>
              <form action={deleteStudentDocumentAction}>
                <input type="hidden" name="student_id" value={studentId} />
                <input type="hidden" name="document_id" value={doc.id} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={uploadStudentDocumentAction}
        encType="multipart/form-data"
        className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4"
      >
        <input type="hidden" name="student_id" value={studentId} />

        <p className="text-sm font-semibold text-brand-navy">Upload a document</p>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Document type</span>
          <select
            name="kind"
            required
            defaultValue=""
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Pick a type…</option>
            {studentDocumentKindSchema.options.map((kind) => (
              <option key={kind} value={kind}>
                {studentDocumentKindLabels[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Description (optional)</span>
          <input
            name="description"
            maxLength={200}
            placeholder="e.g. Updated 2026 immunization record"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">File</span>
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.gif,.heic,.doc,.docx"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Upload document
        </button>
      </form>
    </section>
  )
}
