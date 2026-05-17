// app/admin/applications/ApplicationDetailView.tsx
//
// Full editing + management surface for one application. Used to live
// inline inside /admin/applications's expandable cards; now lives on
// its own page at /admin/applications/[id]. Drops the read-only
// StudentCard / GuardianCard / Prior schools / Course interest cards
// that used to mirror the data — all of those fields are editable in
// AdminEditApplicationData, so showing them twice was just clutter.

import {
  ApplicationRecord,
  ApplicationStatus,
} from "@/lib/applications"
import type { ApplicationDocumentRecord } from "@/lib/application-storage"
import {
  deleteApplicationAction,
  deleteApplicationDocumentAdminAction,
  enrollApplicationAction,
  sendApplicationPaymentReminderAction,
  updateApplicationAction,
  updateApplicationDataAction,
  uploadApplicationDocumentAdminAction,
} from "./actions"
import { ConfirmAction } from "../profiles/ConfirmAction"
import { studentUpnFromApplication } from "@/lib/graph"
import { siteConfig } from "@/lib/site"

const pacificTimeZone = "America/Los_Angeles"

export function formatTimestamp(value: string | null): string {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacificTimeZone,
  }).format(new Date(value))
}

export function formatStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "draft": return "Draft"
    case "submitted": return "New submission"
    case "in_review": return "In review"
    case "info_requested": return "Info requested"
    case "admit_offered": return "Admit offered"
    case "accepted": return "Accepted"
    case "declined": return "Declined"
    case "withdrawn": return "Withdrawn"
    case "enrolled": return "Enrolled"
    case "archived": return "Archived"
  }
}

export function getStatusBadgeClassName(status: ApplicationStatus): string {
  switch (status) {
    case "draft": return "border border-slate-200 bg-slate-100 text-slate-600"
    case "submitted": return "border border-amber-200 bg-amber-50 text-amber-700"
    case "in_review": return "border border-sky-200 bg-sky-50 text-sky-700"
    case "info_requested": return "border border-violet-200 bg-violet-50 text-violet-700"
    case "admit_offered": return "border border-brand-orange/30 bg-brand-orange/10 text-brand-orange"
    case "accepted": return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "enrolled": return "border border-emerald-300 bg-emerald-100 text-emerald-800"
    case "declined":
    case "withdrawn": return "border border-rose-200 bg-rose-50 text-rose-700"
    case "archived": return "border border-slate-200 bg-slate-100 text-slate-600"
  }
}

export function getStudentName(application: ApplicationRecord): string {
  const parts = [application.student_first_name, application.student_last_name]
    .map((p) => p?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "Unknown student"
}

export function getGuardianName(application: ApplicationRecord): string {
  return application.guardian1_name?.trim() || "Unknown guardian"
}

export default function ApplicationDetailView({
  application,
  documents,
  redirectTo,
}: {
  application: ApplicationRecord
  documents: ApplicationDocumentRecord[]
  redirectTo: string
}) {
  const hasStripeGate = Boolean(siteConfig.external.stripeRegistrationLink)

  return (
    <div className="space-y-6">
      {hasStripeGate && !application.fee_paid_at && (
        <PaymentReminderCard application={application} redirectTo={redirectTo} />
      )}

      <AdminEditApplicationData application={application} redirectTo={redirectTo} />

      <AdminManageDocuments
        application={application}
        documents={documents}
        redirectTo={redirectTo}
      />

      <StatusTriageForm application={application} redirectTo={redirectTo} />

      {application.status === "accepted" && (
        <EnrollForm application={application} redirectTo={redirectTo} />
      )}

      <DeleteApplicationCard application={application} />
    </div>
  )
}

function PaymentReminderCard({
  application,
  redirectTo,
}: {
  application: ApplicationRecord
  redirectTo: string
}) {
  return (
    <form
      action={sendApplicationPaymentReminderAction}
      className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-5"
    >
      <input type="hidden" name="id" value={application.id} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <p className="text-sm font-semibold text-rose-900">
          Registration fee unpaid
        </p>
        <p className="text-xs text-rose-800">
          The family submitted but the $350 fee hasn&rsquo;t cleared. Send
          a fresh payment link — it&rsquo;s the same Stripe link as Submit,
          tagged so the webhook can match the eventual payment back to
          this application.
        </p>
      </div>
      <label className="space-y-1 text-xs font-medium text-rose-900">
        <span className="block">Optional note to family (quoted verbatim in the email)</span>
        <textarea
          name="note_to_family"
          rows={2}
          placeholder="e.g. We noticed your payment didn't come through — please try this link or reply if you'd like an alternative."
          className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-400 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Send payment link to family
      </button>
    </form>
  )
}

function StatusTriageForm({
  application,
  redirectTo,
}: {
  application: ApplicationRecord
  redirectTo: string
}) {
  return (
    <form
      action={updateApplicationAction}
      className="space-y-4 rounded-3xl border border-brand-navy/15 bg-white p-5"
    >
      <input type="hidden" name="id" value={application.id} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <p className="text-sm font-semibold text-brand-navy">Triage</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span className="block">Status</span>
          <select
            name="status"
            defaultValue={application.status}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          >
            <option value="draft">Draft</option>
            <option value="submitted">New submission</option>
            <option value="in_review">In review</option>
            <option value="info_requested">Info requested</option>
            <option value="admit_offered">Admit offered</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="enrolled">Enrolled</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span className="block">Enrollment type</span>
          <select
            name="enrollment_type"
            defaultValue={application.enrollment_type ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          >
            <option value="">Not set</option>
            <option value="summer">Summer</option>
            <option value="part_time">Part-time</option>
            <option value="full_time">Full-time</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span className="block">Assigned admin (optional)</span>
          <input
            name="assigned_to"
            defaultValue={application.assigned_to ?? ""}
            placeholder="Office staff name or email"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span className="block">Internal notes</span>
          <textarea
            name="internal_notes"
            rows={5}
            defaultValue={application.internal_notes ?? ""}
            placeholder="Office-only notes about this application: admit decisions, scholarship status, follow-up calls, etc."
            className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span className="block">
            Note to family (optional, included verbatim in the status email)
          </span>
          <textarea
            name="note_to_family"
            rows={3}
            placeholder="A short, friendly note we'll quote in the email — e.g., 'Could you send a copy of last semester's transcript?'"
            className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          />
        </label>

        <fieldset className="space-y-2 text-sm text-slate-700 sm:col-span-2">
          <legend className="block text-sm font-medium text-slate-700">
            Documents to request (only sent if status becomes <em>info requested</em>)
          </legend>
          <p className="text-xs text-slate-500">
            Tick anything you&rsquo;d like the family to send. We&rsquo;ll
            list these in the email above your custom note.
          </p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {[
              ["transcripts", "Recent transcripts (past 2 years)"],
              ["test_scores", "Standardized test scores (PSAT/SAT/ACT)"],
              ["recommendation_letters", "One or more recommendation letters"],
              ["writing_sample", "Personal essay or recent writing sample"],
              ["disciplinary_record", "Disciplinary record from current school"],
              ["iep_504_docs", "IEP / 504 plan or accommodation documentation"],
              ["english_proficiency", "English-language proficiency test (international)"],
              ["passport_visa", "Passport + F-1 visa documents (international)"],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  name="requested_documents"
                  value={value}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            name="suppress_family_email"
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>
            Don&rsquo;t notify the family (internal change only). Emails are
            sent automatically when status changes to <em>info requested</em>,{" "}
            <em>admit offered</em>, <em>accepted</em>, or <em>declined</em>.
          </span>
        </label>
      </div>

      {application.admit_decision_at && (
        <p className="text-xs text-slate-500">
          Admit decision recorded {formatTimestamp(application.admit_decision_at)}
        </p>
      )}
      {application.archived_at && (
        <p className="text-xs text-slate-500">
          Archived on {formatTimestamp(application.archived_at)}
        </p>
      )}

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Save triage
      </button>
    </form>
  )
}

function EnrollForm({
  application,
  redirectTo,
}: {
  application: ApplicationRecord
  redirectTo: string
}) {
  return (
    <form
      action={enrollApplicationAction}
      className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5"
    >
      <input type="hidden" name="application_id" value={application.id} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-1">
        <p className="text-sm font-semibold text-emerald-900">Enroll this student</p>
        <p className="text-sm text-emerald-800">
          Creates the student record, the parent/guardian profiles, and
          links them together — and provisions the student&rsquo;s HBA
          Microsoft 365 account (with an Office 365 A1 license) on submit.
          The email below is suggested in the standard format; review and
          edit it before enrolling.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span className="block">Student HBA email</span>
          <input
            name="student_hba_email"
            type="email"
            required
            defaultValue={studentUpnFromApplication(application, new Date().getFullYear())}
            placeholder={`firstname.lastname@${siteConfig.contact.emailDomain}`}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span className="block">Registered at HBA (optional)</span>
          <input
            name="registered_at_hba"
            type="date"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Enroll student
      </button>
    </form>
  )
}

function DeleteApplicationCard({ application }: { application: ApplicationRecord }) {
  return (
    <section className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50/40 px-5 py-5">
      <div>
        <p className="text-sm font-semibold text-rose-900">Delete this application</p>
        <p className="text-xs text-rose-800">
          Permanently removes this application row. If the family has already
          been enrolled, the student record stays intact — only the original
          application is deleted (the student row&rsquo;s back-pointer is
          cleared via the FK&rsquo;s on-delete-set-null). Best used for
          obvious test data; production records should be archived instead.
        </p>
      </div>
      <ConfirmAction
        action={deleteApplicationAction}
        fields={{ id: application.id }}
        triggerLabel="Delete forever"
        title="Delete this application?"
        confirmLabel="Delete forever"
        variant="danger"
        description={
          <p>
            Permanently removes <strong>{getStudentName(application)}</strong>
            &rsquo;s application (from <strong>{getGuardianName(application)}</strong>).
            This cannot be undone.
          </p>
        }
      />
    </section>
  )
}

function AdminEditApplicationData({
  application,
  redirectTo,
}: {
  application: ApplicationRecord
  redirectTo: string
}) {
  return (
    <section className="rounded-3xl border border-brand-navy/15 bg-white">
      <div className="px-5 py-4 text-sm font-semibold text-brand-navy">
        Application data — edit any field, then save at the bottom.
      </div>

      <form
        action={updateApplicationDataAction}
        className="space-y-6 border-t border-slate-200 px-5 py-5"
      >
        <input type="hidden" name="id" value={application.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <FormSection title="Enrollment type">
          <SelectField
            name="enrollment_type"
            defaultValue={application.enrollment_type ?? ""}
            options={[
              { value: "", label: "Not set" },
              { value: "summer", label: "Summer" },
              { value: "part_time", label: "Part-time" },
              { value: "full_time", label: "Full-time" },
            ]}
            label="Enrollment type"
          />
        </FormSection>

        <FormSection title="Student">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="student_first_name" label="Legal first name" defaultValue={application.student_first_name} />
            <TextField name="student_middle_name" label="Legal middle name" defaultValue={application.student_middle_name} />
            <TextField name="student_last_name" label="Legal last name" defaultValue={application.student_last_name} />
            <TextField name="student_suffix" label="Suffix" defaultValue={application.student_suffix} />
            <TextField name="student_preferred_name" label="Preferred name" defaultValue={application.student_preferred_name} className="sm:col-span-2" />
            <TextField name="student_dob" label="Date of birth" type="date" defaultValue={application.student_dob} />
            <TextField name="student_gender" label="Gender" defaultValue={application.student_gender} />
            <TextField name="student_pronouns" label="Pronouns" defaultValue={application.student_pronouns} />
            <TextField name="student_birthplace" label="Birthplace" defaultValue={application.student_birthplace} />
            <TextField name="student_primary_language" label="Primary language" defaultValue={application.student_primary_language} />
            <TextField name="student_secondary_language" label="Secondary language" defaultValue={application.student_secondary_language} />
            <TextField name="student_english_proficiency" label="English proficiency" defaultValue={application.student_english_proficiency} />
            <TextField name="student_current_grade" label="Current grade" defaultValue={application.student_current_grade} />
            <TextField name="student_desired_grade" label="Desired entry grade" defaultValue={application.student_desired_grade} />
            <TextField
              name="student_graduation_year"
              label="Expected graduation year"
              type="number"
              defaultValue={
                application.student_graduation_year != null
                  ? String(application.student_graduation_year)
                  : ""
              }
            />
            <SelectField
              name="student_is_international"
              label="Student status (tuition + visa)"
              defaultValue={
                application.student_is_international === true
                  ? "international"
                  : application.student_is_international === false
                    ? "domestic"
                    : ""
              }
              options={[
                { value: "", label: "Not set" },
                { value: "domestic", label: "Domestic" },
                { value: "international", label: "International (F-1)" },
              ]}
            />
            <TextField name="student_personal_email" label="Student personal email" type="email" defaultValue={application.student_personal_email} />
            <TextField name="student_phone" label="Student phone" type="tel" defaultValue={application.student_phone} />
          </div>

          <AddressFields prefix="student" application={application} />
        </FormSection>

        <FormSection title="Guardian 1">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="guardian1_name" label="Full name" defaultValue={application.guardian1_name} />
            <TextField name="guardian1_relationship" label="Relationship" defaultValue={application.guardian1_relationship} />
            <TextField name="guardian1_mobile" label="Mobile phone" type="tel" defaultValue={application.guardian1_mobile} />
            <TextField name="guardian1_work_phone" label="Work phone" type="tel" defaultValue={application.guardian1_work_phone} />
            <TextField name="guardian1_email" label="Email" type="email" defaultValue={application.guardian1_email} className="sm:col-span-2" />
          </div>

          <CheckboxRow
            name="guardian1_address_same_as_student"
            label="Same address as student"
            defaultChecked={application.guardian1_address_same_as_student}
          />
          <AddressFields prefix="guardian1" application={application} />
        </FormSection>

        <FormSection title="Guardian 2 (optional)">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="guardian2_name" label="Full name" defaultValue={application.guardian2_name} />
            <TextField name="guardian2_relationship" label="Relationship" defaultValue={application.guardian2_relationship} />
            <TextField name="guardian2_mobile" label="Mobile phone" type="tel" defaultValue={application.guardian2_mobile} />
            <TextField name="guardian2_work_phone" label="Work phone" type="tel" defaultValue={application.guardian2_work_phone} />
            <TextField name="guardian2_email" label="Email" type="email" defaultValue={application.guardian2_email} className="sm:col-span-2" />
          </div>

          <CheckboxRow
            name="guardian2_address_same_as_student"
            label="Same address as student"
            defaultChecked={application.guardian2_address_same_as_student}
          />
          <AddressFields prefix="guardian2" application={application} />
        </FormSection>

        <FormSection title="Homestay (optional)">
          <CheckboxRow
            name="has_homestay"
            label="Has homestay family"
            defaultChecked={application.has_homestay}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="homestay_name" label="Contact name" defaultValue={application.homestay_name} />
            <TextField name="homestay_relationship" label="Relationship" defaultValue={application.homestay_relationship} />
            <TextField name="homestay_mobile" label="Mobile phone" type="tel" defaultValue={application.homestay_mobile} />
            <TextField name="homestay_work_phone" label="Work phone" type="tel" defaultValue={application.homestay_work_phone} />
            <TextField name="homestay_email" label="Email" type="email" defaultValue={application.homestay_email} className="sm:col-span-2" />
          </div>

          <AddressFields prefix="homestay" application={application} />
        </FormSection>

        <FormSection title="Source + notes">
          <div className="grid gap-3">
            <TextField name="how_did_you_hear" label="How they heard about HBA" defaultValue={application.how_did_you_hear} />
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Notes from family</span>
              <textarea
                name="notes_from_family"
                rows={4}
                defaultValue={application.notes_from_family ?? ""}
                maxLength={4000}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </FormSection>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save application data
        </button>
      </form>
    </section>
  )
}

function AdminManageDocuments({
  application,
  documents,
  redirectTo,
}: {
  application: ApplicationRecord
  documents: ApplicationDocumentRecord[]
  redirectTo: string
}) {
  return (
    <section className="rounded-3xl border border-brand-navy/15 bg-white">
      <div className="px-5 py-4 text-sm font-semibold text-brand-navy">
        Transcript PDFs ({documents.length})
      </div>

      <div className="space-y-4 border-t border-slate-200 px-5 py-5">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-600">No documents on file yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/admin/applications/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener"
                    className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
                  >
                    📎 {doc.filename}
                  </a>
                  {doc.prior_school_name && (
                    <p className="text-xs text-slate-500">
                      For school: {doc.prior_school_name}
                    </p>
                  )}
                </div>
                <form action={deleteApplicationDocumentAdminAction}>
                  <input type="hidden" name="document_id" value={doc.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={uploadApplicationDocumentAdminAction}
          encType="multipart/form-data"
          className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4"
        >
          <input type="hidden" name="application_id" value={application.id} />
          <input type="hidden" name="kind" value="transcript" />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <p className="text-sm font-semibold text-brand-navy">
            Upload a replacement transcript
          </p>
          <p className="text-xs text-slate-500">
            Max 4 MB per file. For larger PDFs, ask the family to re-upload
            via their draft link.
          </p>

          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">For which prior school? (optional)</span>
            <input
              name="prior_school_name"
              maxLength={200}
              placeholder="e.g. La Jolla Country Day School"
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
            Upload
          </button>
        </form>
      </div>
    </section>
  )
}

// ============================================================================
// Form primitives
// ============================================================================

function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  className = "",
}: {
  name: string
  label: string
  defaultValue?: string | null
  type?: string
  className?: string
}) {
  return (
    <label className={`space-y-1 text-xs font-medium text-slate-700 ${className}`}>
      <span className="block">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  )
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string
  label: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function AddressFields({
  prefix,
  application,
}: {
  prefix: "student" | "guardian1" | "guardian2" | "homestay"
  application: ApplicationRecord
}) {
  const v = (suffix: string) =>
    application[`${prefix}_${suffix}` as keyof ApplicationRecord] as string | null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField name={`${prefix}_address_line1`} label="Street address" defaultValue={v("address_line1")} className="sm:col-span-2" />
      <TextField name={`${prefix}_address_line2`} label="Address line 2" defaultValue={v("address_line2")} className="sm:col-span-2" />
      <TextField name={`${prefix}_address_city`} label="City" defaultValue={v("address_city")} />
      <TextField name={`${prefix}_address_region`} label="State / region" defaultValue={v("address_region")} />
      <TextField name={`${prefix}_address_postal_code`} label="Postal code" defaultValue={v("address_postal_code")} />
      <TextField name={`${prefix}_address_country`} label="Country" defaultValue={v("address_country")} />
    </div>
  )
}
