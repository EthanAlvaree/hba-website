"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { summerCategories } from "@/lib/summer-courses"
import type {
  ApplicationEnrollmentType,
  ApplicationRecord,
  PriorSchool,
} from "@/lib/applications"
import type { ApplicationDocumentRecord } from "@/lib/application-storage"

const turnstileSiteKey =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : "1x00000000000000000000AA"

// ============================================================================
// State
// ============================================================================

type WizardState = {
  draft_token: string
  draft_email: string

  enrollment_type: "" | ApplicationEnrollmentType

  student_first_name: string
  student_middle_name: string
  student_last_name: string
  student_suffix: string
  student_preferred_name: string
  student_dob: string
  student_gender: string
  student_pronouns: string
  student_birthplace: string
  student_primary_language: string
  student_secondary_language: string
  student_english_proficiency: string
  student_current_grade: string
  student_desired_grade: string
  student_personal_email: string
  student_phone: string
  student_address_line1: string
  student_address_line2: string
  student_address_city: string
  student_address_region: string
  student_address_postal_code: string
  student_address_country: string

  guardian1_name: string
  guardian1_relationship: string
  guardian1_mobile: string
  guardian1_work_phone: string
  guardian1_email: string
  guardian1_address_same_as_student: boolean
  guardian1_address_line1: string
  guardian1_address_line2: string
  guardian1_address_city: string
  guardian1_address_region: string
  guardian1_address_postal_code: string
  guardian1_address_country: string

  guardian2_enabled: boolean
  guardian2_name: string
  guardian2_relationship: string
  guardian2_mobile: string
  guardian2_work_phone: string
  guardian2_email: string
  guardian2_address_same_as_student: boolean
  guardian2_address_line1: string
  guardian2_address_line2: string
  guardian2_address_city: string
  guardian2_address_region: string
  guardian2_address_postal_code: string
  guardian2_address_country: string

  has_homestay: boolean
  homestay_name: string
  homestay_relationship: string
  homestay_mobile: string
  homestay_work_phone: string
  homestay_email: string
  homestay_address_line1: string
  homestay_address_line2: string
  homestay_address_city: string
  homestay_address_region: string
  homestay_address_postal_code: string
  homestay_address_country: string

  prior_schools: PriorSchool[]
  course_interest: string[]

  how_did_you_hear: string
  notes_from_family: string
}

const emptyState: WizardState = {
  draft_token: "",
  draft_email: "",
  enrollment_type: "",
  student_first_name: "",
  student_middle_name: "",
  student_last_name: "",
  student_suffix: "",
  student_preferred_name: "",
  student_dob: "",
  student_gender: "",
  student_pronouns: "",
  student_birthplace: "",
  student_primary_language: "",
  student_secondary_language: "",
  student_english_proficiency: "",
  student_current_grade: "",
  student_desired_grade: "",
  student_personal_email: "",
  student_phone: "",
  student_address_line1: "",
  student_address_line2: "",
  student_address_city: "",
  student_address_region: "",
  student_address_postal_code: "",
  student_address_country: "",
  guardian1_name: "",
  guardian1_relationship: "",
  guardian1_mobile: "",
  guardian1_work_phone: "",
  guardian1_email: "",
  guardian1_address_same_as_student: false,
  guardian1_address_line1: "",
  guardian1_address_line2: "",
  guardian1_address_city: "",
  guardian1_address_region: "",
  guardian1_address_postal_code: "",
  guardian1_address_country: "",
  guardian2_enabled: false,
  guardian2_name: "",
  guardian2_relationship: "",
  guardian2_mobile: "",
  guardian2_work_phone: "",
  guardian2_email: "",
  guardian2_address_same_as_student: false,
  guardian2_address_line1: "",
  guardian2_address_line2: "",
  guardian2_address_city: "",
  guardian2_address_region: "",
  guardian2_address_postal_code: "",
  guardian2_address_country: "",
  has_homestay: false,
  homestay_name: "",
  homestay_relationship: "",
  homestay_mobile: "",
  homestay_work_phone: "",
  homestay_email: "",
  homestay_address_line1: "",
  homestay_address_line2: "",
  homestay_address_city: "",
  homestay_address_region: "",
  homestay_address_postal_code: "",
  homestay_address_country: "",
  prior_schools: [],
  course_interest: [],
  how_did_you_hear: "",
  notes_from_family: "",
}

function stateFromRecord(record: ApplicationRecord): WizardState {
  return {
    draft_token: record.draft_token ?? "",
    draft_email: record.draft_email ?? "",
    enrollment_type: record.enrollment_type ?? "",
    student_first_name: record.student_first_name ?? "",
    student_middle_name: record.student_middle_name ?? "",
    student_last_name: record.student_last_name ?? "",
    student_suffix: record.student_suffix ?? "",
    student_preferred_name: record.student_preferred_name ?? "",
    student_dob: record.student_dob ?? "",
    student_gender: record.student_gender ?? "",
    student_pronouns: record.student_pronouns ?? "",
    student_birthplace: record.student_birthplace ?? "",
    student_primary_language: record.student_primary_language ?? "",
    student_secondary_language: record.student_secondary_language ?? "",
    student_english_proficiency: record.student_english_proficiency ?? "",
    student_current_grade: record.student_current_grade ?? "",
    student_desired_grade: record.student_desired_grade ?? "",
    student_personal_email: record.student_personal_email ?? "",
    student_phone: record.student_phone ?? "",
    student_address_line1: record.student_address_line1 ?? "",
    student_address_line2: record.student_address_line2 ?? "",
    student_address_city: record.student_address_city ?? "",
    student_address_region: record.student_address_region ?? "",
    student_address_postal_code: record.student_address_postal_code ?? "",
    student_address_country: record.student_address_country ?? "",
    guardian1_name: record.guardian1_name ?? "",
    guardian1_relationship: record.guardian1_relationship ?? "",
    guardian1_mobile: record.guardian1_mobile ?? "",
    guardian1_work_phone: record.guardian1_work_phone ?? "",
    guardian1_email: record.guardian1_email ?? "",
    guardian1_address_same_as_student: record.guardian1_address_same_as_student,
    guardian1_address_line1: record.guardian1_address_line1 ?? "",
    guardian1_address_line2: record.guardian1_address_line2 ?? "",
    guardian1_address_city: record.guardian1_address_city ?? "",
    guardian1_address_region: record.guardian1_address_region ?? "",
    guardian1_address_postal_code: record.guardian1_address_postal_code ?? "",
    guardian1_address_country: record.guardian1_address_country ?? "",
    guardian2_enabled: Boolean(record.guardian2_name),
    guardian2_name: record.guardian2_name ?? "",
    guardian2_relationship: record.guardian2_relationship ?? "",
    guardian2_mobile: record.guardian2_mobile ?? "",
    guardian2_work_phone: record.guardian2_work_phone ?? "",
    guardian2_email: record.guardian2_email ?? "",
    guardian2_address_same_as_student: record.guardian2_address_same_as_student,
    guardian2_address_line1: record.guardian2_address_line1 ?? "",
    guardian2_address_line2: record.guardian2_address_line2 ?? "",
    guardian2_address_city: record.guardian2_address_city ?? "",
    guardian2_address_region: record.guardian2_address_region ?? "",
    guardian2_address_postal_code: record.guardian2_address_postal_code ?? "",
    guardian2_address_country: record.guardian2_address_country ?? "",
    has_homestay: record.has_homestay,
    homestay_name: record.homestay_name ?? "",
    homestay_relationship: record.homestay_relationship ?? "",
    homestay_mobile: record.homestay_mobile ?? "",
    homestay_work_phone: record.homestay_work_phone ?? "",
    homestay_email: record.homestay_email ?? "",
    homestay_address_line1: record.homestay_address_line1 ?? "",
    homestay_address_line2: record.homestay_address_line2 ?? "",
    homestay_address_city: record.homestay_address_city ?? "",
    homestay_address_region: record.homestay_address_region ?? "",
    homestay_address_postal_code: record.homestay_address_postal_code ?? "",
    homestay_address_country: record.homestay_address_country ?? "",
    prior_schools: record.prior_schools ?? [],
    course_interest: record.course_interest ?? [],
    how_did_you_hear: record.how_did_you_hear ?? "",
    notes_from_family: record.notes_from_family ?? "",
  }
}

function buildApiPayload(state: WizardState, extras: Record<string, unknown>) {
  return {
    ...extras,
    draft_token: state.draft_token || undefined,
    draft_email: state.draft_email || state.guardian1_email || undefined,
    enrollment_type: state.enrollment_type || undefined,

    student_first_name: state.student_first_name,
    student_middle_name: state.student_middle_name,
    student_last_name: state.student_last_name,
    student_suffix: state.student_suffix,
    student_preferred_name: state.student_preferred_name,
    student_dob: state.student_dob,
    student_gender: state.student_gender,
    student_pronouns: state.student_pronouns,
    student_birthplace: state.student_birthplace,
    student_primary_language: state.student_primary_language,
    student_secondary_language: state.student_secondary_language,
    student_english_proficiency: state.student_english_proficiency,
    student_current_grade: state.student_current_grade,
    student_desired_grade: state.student_desired_grade,
    student_personal_email: state.student_personal_email,
    student_phone: state.student_phone,
    student_address_line1: state.student_address_line1,
    student_address_line2: state.student_address_line2,
    student_address_city: state.student_address_city,
    student_address_region: state.student_address_region,
    student_address_postal_code: state.student_address_postal_code,
    student_address_country: state.student_address_country,

    guardian1_name: state.guardian1_name,
    guardian1_relationship: state.guardian1_relationship,
    guardian1_mobile: state.guardian1_mobile,
    guardian1_work_phone: state.guardian1_work_phone,
    guardian1_email: state.guardian1_email,
    guardian1_address_same_as_student: state.guardian1_address_same_as_student,
    guardian1_address_line1: state.guardian1_address_line1,
    guardian1_address_line2: state.guardian1_address_line2,
    guardian1_address_city: state.guardian1_address_city,
    guardian1_address_region: state.guardian1_address_region,
    guardian1_address_postal_code: state.guardian1_address_postal_code,
    guardian1_address_country: state.guardian1_address_country,

    guardian2_name: state.guardian2_enabled ? state.guardian2_name : "",
    guardian2_relationship: state.guardian2_enabled ? state.guardian2_relationship : "",
    guardian2_mobile: state.guardian2_enabled ? state.guardian2_mobile : "",
    guardian2_work_phone: state.guardian2_enabled ? state.guardian2_work_phone : "",
    guardian2_email: state.guardian2_enabled ? state.guardian2_email : "",
    guardian2_address_same_as_student:
      state.guardian2_enabled && state.guardian2_address_same_as_student,
    guardian2_address_line1: state.guardian2_enabled ? state.guardian2_address_line1 : "",
    guardian2_address_line2: state.guardian2_enabled ? state.guardian2_address_line2 : "",
    guardian2_address_city: state.guardian2_enabled ? state.guardian2_address_city : "",
    guardian2_address_region: state.guardian2_enabled ? state.guardian2_address_region : "",
    guardian2_address_postal_code: state.guardian2_enabled ? state.guardian2_address_postal_code : "",
    guardian2_address_country: state.guardian2_enabled ? state.guardian2_address_country : "",

    has_homestay: state.has_homestay,
    homestay_name: state.has_homestay ? state.homestay_name : "",
    homestay_relationship: state.has_homestay ? state.homestay_relationship : "",
    homestay_mobile: state.has_homestay ? state.homestay_mobile : "",
    homestay_work_phone: state.has_homestay ? state.homestay_work_phone : "",
    homestay_email: state.has_homestay ? state.homestay_email : "",
    homestay_address_line1: state.has_homestay ? state.homestay_address_line1 : "",
    homestay_address_line2: state.has_homestay ? state.homestay_address_line2 : "",
    homestay_address_city: state.has_homestay ? state.homestay_address_city : "",
    homestay_address_region: state.has_homestay ? state.homestay_address_region : "",
    homestay_address_postal_code: state.has_homestay ? state.homestay_address_postal_code : "",
    homestay_address_country: state.has_homestay ? state.homestay_address_country : "",

    prior_schools: state.prior_schools.filter((s) => s.name.trim().length > 0),
    course_interest: state.course_interest,
    how_did_you_hear: state.how_did_you_hear,
    notes_from_family: state.notes_from_family,
  }
}

// ============================================================================
// Reusable inputs
// ============================================================================

type FieldErrors = Record<string, string | undefined>

function TextField({
  label,
  name,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  autoComplete,
  error,
  className = "",
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
  autoComplete?: string
  error?: string
  className?: string
}) {
  return (
    <label className={`space-y-2 text-left ${className}`}>
      <span className="block text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      />
      {error && <span className="block text-sm text-rose-700">{error}</span>}
    </label>
  )
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required,
  error,
  placeholder = "Select…",
  className = "",
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  required?: boolean
  error?: string
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`space-y-2 text-left ${className}`}>
      <span className="block text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="block text-sm text-rose-700">{error}</span>}
    </label>
  )
}

function TextareaField({
  label,
  name,
  value,
  onChange,
  rows = 4,
  placeholder,
  error,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  error?: string
}) {
  return (
    <label className="space-y-2 text-left">
      <span className="block text-sm font-semibold text-slate-900">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-3xl border px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      />
      {error && <span className="block text-sm text-rose-700">{error}</span>}
    </label>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 text-sm text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
      />
      <span>{label}</span>
    </label>
  )
}

// ============================================================================
// Option lists
// ============================================================================

const genderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
  { value: "other", label: "Other" },
]

const englishProficiencyOptions = [
  { value: "native", label: "Native" },
  { value: "fluent", label: "Fluent" },
  { value: "proficient", label: "Proficient" },
  { value: "intermediate", label: "Intermediate" },
  { value: "beginner", label: "Beginner" },
]

const gradeOptions = [
  { value: "6", label: "6th grade" },
  { value: "7", label: "7th grade" },
  { value: "8", label: "8th grade" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade" },
  { value: "other", label: "Other" },
]

const relationshipOptions = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "stepmother", label: "Stepmother" },
  { value: "stepfather", label: "Stepfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "legal-guardian", label: "Legal guardian" },
  { value: "other", label: "Other" },
]

// ============================================================================
// Progress bar
// ============================================================================

function ProgressBar({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <ol className="mb-10 flex flex-wrap items-center gap-3 text-sm">
      {labels.map((label, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === current
        const isDone = stepNumber < current

        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? "bg-brand-orange text-white"
                  : isDone
                  ? "bg-brand-navy text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {stepNumber}
            </span>
            <span
              className={`font-semibold ${
                isActive ? "text-brand-navy" : isDone ? "text-slate-700" : "text-slate-500"
              }`}
            >
              {label}
            </span>
            {stepNumber < total && (
              <span className="hidden h-px w-8 bg-slate-200 sm:inline-block" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ============================================================================
// Validation per step
// ============================================================================

const stepLabels = ["Student", "Guardians", "Prior schools", "Enrollment", "Review"]

function validateStep(step: number, state: WizardState): FieldErrors {
  const errors: FieldErrors = {}

  if (step === 1) {
    if (!state.student_first_name.trim()) errors.student_first_name = "Required."
    if (!state.student_last_name.trim()) errors.student_last_name = "Required."
    if (!state.student_dob.trim()) errors.student_dob = "Required."
    if (!state.student_current_grade) errors.student_current_grade = "Required."
    if (!state.student_desired_grade) errors.student_desired_grade = "Required."
    if (!state.student_primary_language.trim()) errors.student_primary_language = "Required."
    if (!state.student_english_proficiency) errors.student_english_proficiency = "Required."
  }

  if (step === 2) {
    if (!state.guardian1_name.trim()) errors.guardian1_name = "Required."
    if (!state.guardian1_relationship) errors.guardian1_relationship = "Required."
    if (!state.guardian1_mobile.trim()) errors.guardian1_mobile = "Required."
    if (!state.guardian1_email.trim()) {
      errors.guardian1_email = "Required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.guardian1_email.trim())) {
      errors.guardian1_email = "Please enter a valid email."
    }
  }

  if (step === 4) {
    if (!state.enrollment_type) errors.enrollment_type = "Pick an enrollment type."
    if (state.enrollment_type === "summer" && state.course_interest.length === 0) {
      errors.course_interest = "Pick at least one course."
    }
  }

  return errors
}

// ============================================================================
// Main wizard
// ============================================================================

type SubmissionState =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "submitting" }
  | { type: "draft-saved"; magicLinkSent: boolean }
  | { type: "submitted" }
  | { type: "error"; message: string }

// Key for localStorage backup of in-progress wizard state. Stored under one
// key (not per-tab) — if a user opens two tabs we accept the last-write-wins.
// The backup is cleared as soon as we have a server-side draft token.
const localBackupKey = "hba-apply-draft-backup-v1"

type LocalBackup = {
  state: WizardState
  step: number
  savedAt: number
}

export default function ApplyWizard({
  initialRecord,
}: {
  initialRecord: ApplicationRecord | null
}) {
  const [state, setState] = useState<WizardState>(() =>
    initialRecord ? stateFromRecord(initialRecord) : emptyState
  )
  const [step, setStep] = useState(1)
  const [submission, setSubmission] = useState<SubmissionState>({ type: "idle" })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showDraftEmailPrompt, setShowDraftEmailPrompt] = useState(false)
  const [submittedAt] = useState(() => Date.now().toString())
  // When set, offers to restore an in-progress wizard from localStorage.
  // Only ever populated on first mount when there was NO initialRecord.
  const [pendingBackup, setPendingBackup] = useState<LocalBackup | null>(null)
  // Drives the post-save panel that shows the resume URL + copy button.
  const [copiedLink, setCopiedLink] = useState(false)

  const setField = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((current) => ({ ...current, [key]: value }))
  }

  // ---- Local backup: restore on mount, save on changes, clear on draft save.
  //
  // The server-side draft (saved via "Save and continue later" + email magic
  // link) is the official recovery path. localStorage is a *belt-and-
  // suspenders* layer: if the applicant closes the tab without saving, they
  // can pick up where they left off as long as they re-open in the same
  // browser. Once the server has a draft token we trust that and clear the
  // local copy.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (initialRecord) return // server-side restore wins; nothing to offer.
    try {
      const raw = window.localStorage.getItem(localBackupKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as LocalBackup
      if (!parsed.state || !parsed.savedAt) return
      // Ignore backups older than 30 days (matches server-side draft TTL).
      const ageMs = Date.now() - parsed.savedAt
      if (ageMs > 1000 * 60 * 60 * 24 * 30) {
        window.localStorage.removeItem(localBackupKey)
        return
      }
      setPendingBackup(parsed)
    } catch {
      // Corrupt backup — drop it.
      window.localStorage.removeItem(localBackupKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    // If the server has a draft token, the DB is authoritative — no need to
    // shadow it in localStorage.
    if (state.draft_token) {
      window.localStorage.removeItem(localBackupKey)
      return
    }
    // Don't snapshot a truly empty form (avoids overwriting a real backup
    // immediately on first mount).
    if (
      !state.student_first_name &&
      !state.student_last_name &&
      !state.guardian1_name &&
      !state.guardian1_email
    ) {
      return
    }
    const handle = window.setTimeout(() => {
      try {
        const payload: LocalBackup = {
          state,
          step,
          savedAt: Date.now(),
        }
        window.localStorage.setItem(localBackupKey, JSON.stringify(payload))
      } catch {
        // Quota exceeded or storage unavailable — silently ignore.
      }
    }, 500)
    return () => window.clearTimeout(handle)
  }, [state, step])

  // ---- URL sync: when we acquire a draft token, push it into the URL so a
  // plain browser reload re-hydrates from the server. Without this the URL
  // stays at /apply and a reload starts the form over.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!state.draft_token) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("draft") === state.draft_token) return
    params.set("draft", state.draft_token)
    const next = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(window.history.state, "", next)
  }, [state.draft_token])

  const resumeUrl =
    typeof window !== "undefined" && state.draft_token
      ? `${window.location.origin}/apply?draft=${encodeURIComponent(state.draft_token)}`
      : ""

  async function copyResumeUrl() {
    if (!resumeUrl) return
    try {
      await navigator.clipboard.writeText(resumeUrl)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Clipboard API can fail on insecure contexts / older browsers.
      // The URL is still visible on screen for manual copy.
    }
  }

  const goToStep = (next: number) => {
    setStep(next)
    setErrors({})
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleNext = () => {
    const stepErrors = validateStep(step, state)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length === 0) {
      goToStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      goToStep(step - 1)
    }
  }

  async function saveDraft(emailOverride?: string, turnstileTokenOverride?: string) {
    // First-time saves go through DraftEmailPrompt, which collects both the
    // email and the Turnstile token. Subsequent saves use the existing draft
    // token as the auth credential and skip the prompt entirely.
    if (!state.draft_token && !turnstileTokenOverride) {
      setShowDraftEmailPrompt(true)
      return
    }

    setSubmission({ type: "saving" })

    const email = emailOverride ?? state.draft_email ?? state.guardian1_email

    const payload = buildApiPayload(state, {
      draft_email: email,
      website: "",
      submitted_at: submittedAt,
      turnstile_token: turnstileTokenOverride,
    })

    try {
      const response = await fetch("/api/apply/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as {
        success: boolean
        draft_token?: string
        draft_email?: string
        magic_link_sent?: boolean
        error?: string
      }

      if (!response.ok || !result.success) {
        setSubmission({ type: "error", message: result.error ?? "Couldn’t save your draft." })
        return
      }

      setState((current) => ({
        ...current,
        draft_token: result.draft_token ?? current.draft_token,
        draft_email: result.draft_email ?? current.draft_email ?? email,
      }))
      setShowDraftEmailPrompt(false)
      setSubmission({
        type: "draft-saved",
        magicLinkSent: result.magic_link_sent ?? false,
      })
    } catch {
      setSubmission({ type: "error", message: "Network error while saving. Please try again." })
    }
  }

  async function handleSubmit() {
    const turnstileToken =
      (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value ?? ""

    if (!turnstileToken) {
      setSubmission({ type: "error", message: "Please complete the spam check before submitting." })
      return
    }

    // run validation across all required steps
    const allErrors: FieldErrors = {
      ...validateStep(1, state),
      ...validateStep(2, state),
      ...validateStep(4, state),
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      // jump to the first step with errors
      if (
        allErrors.student_first_name ||
        allErrors.student_last_name ||
        allErrors.student_dob ||
        allErrors.student_current_grade ||
        allErrors.student_desired_grade ||
        allErrors.student_primary_language ||
        allErrors.student_english_proficiency
      ) {
        goToStep(1)
      } else if (
        allErrors.guardian1_name ||
        allErrors.guardian1_relationship ||
        allErrors.guardian1_mobile ||
        allErrors.guardian1_email
      ) {
        goToStep(2)
      } else if (allErrors.enrollment_type || allErrors.course_interest) {
        goToStep(4)
      }
      return
    }

    setSubmission({ type: "submitting" })

    const payload = buildApiPayload(state, {
      website: "",
      submitted_at: submittedAt,
      turnstile_token: turnstileToken,
    })

    try {
      const response = await fetch("/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as {
        success: boolean
        application_id?: string
        notification_delivered?: boolean
        error?: string
      }

      if (!response.ok || !result.success) {
        setSubmission({ type: "error", message: result.error ?? "Something went wrong submitting." })
        window.turnstile?.reset()
        return
      }

      setSubmission({ type: "submitted" })
    } catch {
      setSubmission({ type: "error", message: "Network error while submitting. Please try again." })
      window.turnstile?.reset()
    }
  }

  // ============================================================================
  // Submitted success view
  // ============================================================================

  if (submission.type === "submitted") {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-8 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Thank you
        </p>
        <h2 className="mt-4 text-3xl font-extrabold text-brand-navy">
          Your application was submitted.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-700">
          We typically respond within one business day. The HBA office will be in
          touch about next steps — including a campus visit if you’d like one.
        </p>
      </div>
    )
  }

  return (
    <>
      {pendingBackup && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">
            We found in-progress work in this browser.
          </p>
          <p className="mt-1 text-amber-800">
            Saved{" "}
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(pendingBackup.savedAt))}
            . Restore it, or start a fresh application?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setState(pendingBackup.state)
                setStep(pendingBackup.step || 1)
                setPendingBackup(null)
              }}
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Restore my work
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(localBackupKey)
                }
                setPendingBackup(null)
              }}
              className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}

      <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-12">
        <ProgressBar current={step} total={stepLabels.length} labels={stepLabels} />

        {submission.type === "draft-saved" && (
          <div className="mb-6 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div>
              <strong className="font-semibold">Draft saved.</strong>{" "}
              {submission.magicLinkSent
                ? "We emailed you a resume link — keep working below or close this tab and come back later."
                : "(Heads up: we couldn’t send the email this time, but your progress is saved.)"}
            </div>
            {resumeUrl && (
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Resume link (also saved in this browser)
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="break-all rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
                    {resumeUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyResumeUrl}
                    className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    {copiedLink ? "Copied!" : "Copy link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {submission.type === "error" && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submission.message}
          </div>
        )}

        {step === 1 && <Step1Student state={state} setField={setField} errors={errors} />}
        {step === 2 && <Step2Guardians state={state} setField={setField} errors={errors} />}
        {step === 3 && (
          <Step3PriorSchools
            state={state}
            setPriorSchools={(schools) => setField("prior_schools", schools)}
          />
        )}
        {step === 4 && (
          <Step4Enrollment
            state={state}
            setField={setField}
            errors={errors}
            setCourseInterest={(courses) => setField("course_interest", courses)}
          />
        )}
        {step === 5 && <Step5Review state={state} setField={setField} />}

        {showDraftEmailPrompt && (
          <DraftEmailPrompt
            initialEmail={state.draft_email || state.guardian1_email}
            onCancel={() => setShowDraftEmailPrompt(false)}
            onSave={(email, token) => saveDraft(email, token)}
            isSaving={submission.type === "saving"}
          />
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || submission.type === "saving" || submission.type === "submitting"}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={submission.type === "saving" || submission.type === "submitting"}
              className="text-sm font-semibold text-brand-navy underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submission.type === "saving" ? "Saving draft…" : "Save and continue later"}
            </button>
          </div>

          {step < stepLabels.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={submission.type === "saving" || submission.type === "submitting"}
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submission.type === "submitting" || submission.type === "saving"}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submission.type === "submitting" ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </div>

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
    </>
  )
}

// ============================================================================
// Step 1 — Student basics
// ============================================================================

function Step1Student({
  state,
  setField,
  errors,
}: {
  state: WizardState
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  errors: FieldErrors
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">
          About the student
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Legal names so we can match the student to prior school records and official documents.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Legal first name"
          name="student_first_name"
          value={state.student_first_name}
          onChange={(v) => setField("student_first_name", v)}
          required
          autoComplete="given-name"
          placeholder="First name"
          error={errors.student_first_name}
        />
        <TextField
          label="Middle name (optional)"
          name="student_middle_name"
          value={state.student_middle_name}
          onChange={(v) => setField("student_middle_name", v)}
          autoComplete="additional-name"
          placeholder="Middle name"
        />
        <TextField
          label="Legal last name"
          name="student_last_name"
          value={state.student_last_name}
          onChange={(v) => setField("student_last_name", v)}
          required
          autoComplete="family-name"
          placeholder="Last name"
          error={errors.student_last_name}
        />
        <TextField
          label="Suffix (optional)"
          name="student_suffix"
          value={state.student_suffix}
          onChange={(v) => setField("student_suffix", v)}
          placeholder="Jr., II, etc."
        />
        <TextField
          label="Preferred name / nickname (optional)"
          name="student_preferred_name"
          value={state.student_preferred_name}
          onChange={(v) => setField("student_preferred_name", v)}
          placeholder="What teachers and friends should call them"
        />
        <TextField
          label="Date of birth"
          name="student_dob"
          value={state.student_dob}
          onChange={(v) => setField("student_dob", v)}
          type="date"
          required
          error={errors.student_dob}
        />
        <SelectField
          label="Gender"
          name="student_gender"
          value={state.student_gender}
          onChange={(v) => setField("student_gender", v)}
          options={genderOptions}
        />
        <TextField
          label="Pronouns (optional)"
          name="student_pronouns"
          value={state.student_pronouns}
          onChange={(v) => setField("student_pronouns", v)}
          placeholder="e.g. she/her, he/him, they/them"
        />
        <TextField
          label="Birthplace"
          name="student_birthplace"
          value={state.student_birthplace}
          onChange={(v) => setField("student_birthplace", v)}
          placeholder="City, state/region, country"
        />
        <TextField
          label="Primary language"
          name="student_primary_language"
          value={state.student_primary_language}
          onChange={(v) => setField("student_primary_language", v)}
          required
          placeholder="English, Mandarin, Spanish, etc."
          error={errors.student_primary_language}
        />
        <TextField
          label="Secondary language (optional)"
          name="student_secondary_language"
          value={state.student_secondary_language}
          onChange={(v) => setField("student_secondary_language", v)}
          placeholder="If applicable"
        />
        <SelectField
          label="English proficiency"
          name="student_english_proficiency"
          value={state.student_english_proficiency}
          onChange={(v) => setField("student_english_proficiency", v)}
          options={englishProficiencyOptions}
          required
          error={errors.student_english_proficiency}
        />
        <SelectField
          label="Current grade"
          name="student_current_grade"
          value={state.student_current_grade}
          onChange={(v) => setField("student_current_grade", v)}
          options={gradeOptions}
          required
          error={errors.student_current_grade}
        />
        <SelectField
          label="Desired entry grade"
          name="student_desired_grade"
          value={state.student_desired_grade}
          onChange={(v) => setField("student_desired_grade", v)}
          options={gradeOptions}
          required
          error={errors.student_desired_grade}
        />
        <TextField
          label="Student personal email (optional)"
          name="student_personal_email"
          value={state.student_personal_email}
          onChange={(v) => setField("student_personal_email", v)}
          type="email"
          placeholder="If the student has their own email"
        />
        <TextField
          label="Student phone (optional)"
          name="student_phone"
          value={state.student_phone}
          onChange={(v) => setField("student_phone", v)}
          type="tel"
          placeholder="If the student has their own phone"
        />
      </div>

      <fieldset className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Student residence
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Street address"
            name="student_address_line1"
            value={state.student_address_line1}
            onChange={(v) => setField("student_address_line1", v)}
            autoComplete="address-line1"
            placeholder="123 Main Street"
            className="sm:col-span-2"
          />
          <TextField
            label="Apt / suite (optional)"
            name="student_address_line2"
            value={state.student_address_line2}
            onChange={(v) => setField("student_address_line2", v)}
            autoComplete="address-line2"
            placeholder="Apartment, suite, unit, etc."
            className="sm:col-span-2"
          />
          <TextField
            label="City"
            name="student_address_city"
            value={state.student_address_city}
            onChange={(v) => setField("student_address_city", v)}
            autoComplete="address-level2"
          />
          <TextField
            label="State / region"
            name="student_address_region"
            value={state.student_address_region}
            onChange={(v) => setField("student_address_region", v)}
            autoComplete="address-level1"
            placeholder="CA, NY, etc."
          />
          <TextField
            label="Postal code"
            name="student_address_postal_code"
            value={state.student_address_postal_code}
            onChange={(v) => setField("student_address_postal_code", v)}
            autoComplete="postal-code"
          />
          <TextField
            label="Country"
            name="student_address_country"
            value={state.student_address_country}
            onChange={(v) => setField("student_address_country", v)}
            autoComplete="country-name"
            placeholder="United States"
          />
        </div>
      </fieldset>
    </div>
  )
}

// ============================================================================
// Step 2 — Guardians + optional homestay
// ============================================================================

function GuardianAddressFields({
  prefix,
  state,
  setField,
}: {
  prefix: "guardian1" | "guardian2" | "homestay"
  state: WizardState
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const lineKey = `${prefix}_address_line1` as keyof WizardState
  const line2Key = `${prefix}_address_line2` as keyof WizardState
  const cityKey = `${prefix}_address_city` as keyof WizardState
  const regionKey = `${prefix}_address_region` as keyof WizardState
  const postalKey = `${prefix}_address_postal_code` as keyof WizardState
  const countryKey = `${prefix}_address_country` as keyof WizardState

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <TextField
        label="Street address"
        name={lineKey}
        value={state[lineKey] as string}
        onChange={(v) => setField(lineKey, v as WizardState[typeof lineKey])}
        className="sm:col-span-2"
      />
      <TextField
        label="Apt / suite (optional)"
        name={line2Key}
        value={state[line2Key] as string}
        onChange={(v) => setField(line2Key, v as WizardState[typeof line2Key])}
        className="sm:col-span-2"
      />
      <TextField
        label="City"
        name={cityKey}
        value={state[cityKey] as string}
        onChange={(v) => setField(cityKey, v as WizardState[typeof cityKey])}
      />
      <TextField
        label="State / region"
        name={regionKey}
        value={state[regionKey] as string}
        onChange={(v) => setField(regionKey, v as WizardState[typeof regionKey])}
      />
      <TextField
        label="Postal code"
        name={postalKey}
        value={state[postalKey] as string}
        onChange={(v) => setField(postalKey, v as WizardState[typeof postalKey])}
      />
      <TextField
        label="Country"
        name={countryKey}
        value={state[countryKey] as string}
        onChange={(v) => setField(countryKey, v as WizardState[typeof countryKey])}
      />
    </div>
  )
}

function Step2Guardians({
  state,
  setField,
  errors,
}: {
  state: WizardState
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  errors: FieldErrors
}) {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">
          Parents / guardians
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          At least one guardian is required. Add a second guardian or a homestay
          family if applicable.
        </p>
      </header>

      {/* Guardian 1 */}
      <fieldset className="space-y-6 rounded-3xl border border-slate-200 p-6">
        <legend className="px-2 text-base font-semibold text-brand-navy">
          Guardian 1 (required)
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Full name"
            name="guardian1_name"
            value={state.guardian1_name}
            onChange={(v) => setField("guardian1_name", v)}
            required
            autoComplete="name"
            error={errors.guardian1_name}
          />
          <SelectField
            label="Relationship to student"
            name="guardian1_relationship"
            value={state.guardian1_relationship}
            onChange={(v) => setField("guardian1_relationship", v)}
            options={relationshipOptions}
            required
            error={errors.guardian1_relationship}
          />
          <TextField
            label="Mobile phone"
            name="guardian1_mobile"
            value={state.guardian1_mobile}
            onChange={(v) => setField("guardian1_mobile", v)}
            required
            type="tel"
            autoComplete="tel"
            error={errors.guardian1_mobile}
          />
          <TextField
            label="Work phone (optional)"
            name="guardian1_work_phone"
            value={state.guardian1_work_phone}
            onChange={(v) => setField("guardian1_work_phone", v)}
            type="tel"
          />
          <TextField
            label="Email"
            name="guardian1_email"
            value={state.guardian1_email}
            onChange={(v) => setField("guardian1_email", v)}
            required
            type="email"
            autoComplete="email"
            error={errors.guardian1_email}
            className="sm:col-span-2"
          />
        </div>

        <CheckboxField
          label="Same address as the student"
          checked={state.guardian1_address_same_as_student}
          onChange={(v) => setField("guardian1_address_same_as_student", v)}
        />

        {!state.guardian1_address_same_as_student && (
          <GuardianAddressFields prefix="guardian1" state={state} setField={setField} />
        )}
      </fieldset>

      {/* Guardian 2 toggle */}
      <fieldset className="space-y-6 rounded-3xl border border-slate-200 p-6">
        <legend className="px-2 text-base font-semibold text-brand-navy">
          Guardian 2 (optional)
        </legend>

        <CheckboxField
          label="Add a second guardian"
          checked={state.guardian2_enabled}
          onChange={(v) => setField("guardian2_enabled", v)}
        />

        {state.guardian2_enabled && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                label="Full name"
                name="guardian2_name"
                value={state.guardian2_name}
                onChange={(v) => setField("guardian2_name", v)}
              />
              <SelectField
                label="Relationship to student"
                name="guardian2_relationship"
                value={state.guardian2_relationship}
                onChange={(v) => setField("guardian2_relationship", v)}
                options={relationshipOptions}
              />
              <TextField
                label="Mobile phone"
                name="guardian2_mobile"
                value={state.guardian2_mobile}
                onChange={(v) => setField("guardian2_mobile", v)}
                type="tel"
              />
              <TextField
                label="Work phone (optional)"
                name="guardian2_work_phone"
                value={state.guardian2_work_phone}
                onChange={(v) => setField("guardian2_work_phone", v)}
                type="tel"
              />
              <TextField
                label="Email"
                name="guardian2_email"
                value={state.guardian2_email}
                onChange={(v) => setField("guardian2_email", v)}
                type="email"
                className="sm:col-span-2"
              />
            </div>

            <CheckboxField
              label="Same address as the student"
              checked={state.guardian2_address_same_as_student}
              onChange={(v) => setField("guardian2_address_same_as_student", v)}
            />

            {!state.guardian2_address_same_as_student && (
              <GuardianAddressFields prefix="guardian2" state={state} setField={setField} />
            )}
          </>
        )}
      </fieldset>

      {/* Homestay toggle */}
      <fieldset className="space-y-6 rounded-3xl border border-slate-200 p-6">
        <legend className="px-2 text-base font-semibold text-brand-navy">
          Homestay (international students)
        </legend>

        <CheckboxField
          label="The student lives with a homestay family while attending HBA"
          checked={state.has_homestay}
          onChange={(v) => setField("has_homestay", v)}
        />

        {state.has_homestay && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                label="Homestay parent / contact name"
                name="homestay_name"
                value={state.homestay_name}
                onChange={(v) => setField("homestay_name", v)}
              />
              <TextField
                label="Relationship to student"
                name="homestay_relationship"
                value={state.homestay_relationship}
                onChange={(v) => setField("homestay_relationship", v)}
                placeholder="Homestay parent, host family, etc."
              />
              <TextField
                label="Mobile phone"
                name="homestay_mobile"
                value={state.homestay_mobile}
                onChange={(v) => setField("homestay_mobile", v)}
                type="tel"
              />
              <TextField
                label="Work phone (optional)"
                name="homestay_work_phone"
                value={state.homestay_work_phone}
                onChange={(v) => setField("homestay_work_phone", v)}
                type="tel"
              />
              <TextField
                label="Email"
                name="homestay_email"
                value={state.homestay_email}
                onChange={(v) => setField("homestay_email", v)}
                type="email"
                className="sm:col-span-2"
              />
            </div>

            <GuardianAddressFields prefix="homestay" state={state} setField={setField} />
          </>
        )}
      </fieldset>
    </div>
  )
}

// ============================================================================
// Step 3 — Prior schools
// ============================================================================

function Step3PriorSchools({
  state,
  setPriorSchools,
}: {
  state: WizardState
  setPriorSchools: (schools: PriorSchool[]) => void
}) {
  const list = state.prior_schools.length > 0 ? state.prior_schools : [{ name: "", note: "" }]

  const [documents, setDocuments] = useState<ApplicationDocumentRecord[]>([])
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [hasLoadedDocs, setHasLoadedDocs] = useState(false)

  const draftToken = state.draft_token

  useEffect(() => {
    if (!draftToken) {
      setDocuments([])
      setHasLoadedDocs(false)
      return
    }

    let cancelled = false
    setHasLoadedDocs(false)

    fetch(`/api/apply/documents?draft_token=${encodeURIComponent(draftToken)}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && Array.isArray(data.documents)) {
          setDocuments(data.documents as ApplicationDocumentRecord[])
        }
        setHasLoadedDocs(true)
      })
      .catch(() => {
        if (cancelled) return
        setHasLoadedDocs(true)
      })

    return () => {
      cancelled = true
    }
  }, [draftToken])

  const updateAt = (index: number, patch: Partial<PriorSchool>) => {
    const next = list.map((school, i) => (i === index ? { ...school, ...patch } : school))
    setPriorSchools(next)
  }

  const remove = (index: number) => {
    const next = list.filter((_, i) => i !== index)
    setPriorSchools(next.length > 0 ? next : [{ name: "", note: "" }])
  }

  const addAnother = () => {
    setPriorSchools([...list, { name: "", note: "" }])
  }

  async function handleFileUpload(file: File, priorSchoolName: string) {
    if (!draftToken) return
    setUploadingFor(priorSchoolName)
    setDocumentsError(null)

    try {
      const initResponse = await fetch("/api/apply/documents/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_token: draftToken,
          kind: "transcript",
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          prior_school_name: priorSchoolName,
        }),
      })

      const initData = (await initResponse.json()) as {
        success: boolean
        signed_url?: string
        storage_path?: string
        error?: string
      }

      if (!initResponse.ok || !initData.success || !initData.signed_url || !initData.storage_path) {
        throw new Error(initData.error ?? "Couldn't start the upload.")
      }

      const uploadResponse = await fetch(initData.signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error("File upload to storage failed.")
      }

      const completeResponse = await fetch("/api/apply/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_token: draftToken,
          kind: "transcript",
          filename: file.name,
          storage_path: initData.storage_path,
          prior_school_name: priorSchoolName,
        }),
      })

      const completeData = (await completeResponse.json()) as {
        success: boolean
        document?: ApplicationDocumentRecord
        error?: string
      }

      if (!completeResponse.ok || !completeData.success || !completeData.document) {
        throw new Error(completeData.error ?? "Couldn't finalize the upload.")
      }

      setDocuments((prev) => [...prev, completeData.document as ApplicationDocumentRecord])
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setUploadingFor(null)
    }
  }

  async function handleFileDelete(documentId: string) {
    if (!draftToken) return
    setDocumentsError(null)

    try {
      const response = await fetch("/api/apply/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_token: draftToken, document_id: documentId }),
      })

      const data = (await response.json()) as { success: boolean; error?: string }

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Couldn't delete the file.")
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : "Delete failed.")
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">
          Prior schools
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          List every school the student has attended (most recent first). Upload
          transcripts as PDFs or images if you have them — you can also add them
          later by returning to your saved draft.
        </p>
      </header>

      {!draftToken && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">Save your draft first to attach transcripts.</strong>{" "}
          Click <em>Save and continue later</em> below — we’ll email you a link so
          you can come back and upload files at any time.
        </div>
      )}

      {documentsError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {documentsError}
        </div>
      )}

      {draftToken && hasLoadedDocs && documents.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 open:border-brand-navy/30">
          <summary className="cursor-pointer text-sm font-semibold text-brand-navy">
            All uploaded transcripts ({documents.length})
          </summary>
          <p className="mt-2 text-xs text-slate-600">
            Every file attached to this draft, regardless of which school it
            was originally filed under. If you renamed a school and a file
            disappeared from its card below, find it here. Delete a file
            here if it was uploaded by mistake.
          </p>
          <ul className="mt-3 space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-slate-500">
                    Filed under:{" "}
                    <span className="font-semibold text-slate-700">
                      {doc.prior_school_name?.trim() || "(no school)"}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileDelete(doc.id)}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-4">
        {list.map((school, index) => {
          const schoolName = school.name.trim()
          const schoolDocuments = schoolName
            ? documents.filter((doc) => doc.prior_school_name === schoolName)
            : []
          const fileInputId = `prior_school_file_${index}`
          const isUploadingHere = uploadingFor === schoolName && schoolName.length > 0
          const canUpload = Boolean(draftToken && schoolName.length > 0)

          return (
            <div
              key={index}
              className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  School {index + 1}
                </span>
                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-sm font-semibold text-rose-700 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <TextField
                label="School name"
                name={`prior_school_name_${index}`}
                value={school.name}
                onChange={(v) => updateAt(index, { name: v })}
                placeholder="e.g. La Jolla Country Day School"
              />
              <TextareaField
                label="Notes about this school (optional)"
                name={`prior_school_note_${index}`}
                value={school.note ?? ""}
                onChange={(v) => updateAt(index, { note: v })}
                rows={2}
                placeholder="Dates attended, grades, anything we should know"
              />

              {draftToken && hasLoadedDocs && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      Transcripts for this school
                    </p>
                    {!canUpload && (
                      <p className="text-xs text-slate-500">
                        Enter the school name first to attach a transcript.
                      </p>
                    )}
                  </div>

                  {schoolDocuments.length > 0 && (
                    <ul className="space-y-2">
                      {schoolDocuments.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span className="truncate font-medium text-slate-800">
                            {doc.filename}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFileDelete(doc.id)}
                            className="text-xs font-semibold text-rose-700 hover:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div>
                    <label
                      htmlFor={fileInputId}
                      className={`inline-flex cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        canUpload
                          ? "border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white"
                          : "cursor-not-allowed border-slate-200 text-slate-400"
                      }`}
                    >
                      {isUploadingHere ? "Uploading…" : "Upload transcript"}
                    </label>
                    <input
                      id={fileInputId}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.heic,.doc,.docx"
                      disabled={!canUpload || isUploadingHere}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          handleFileUpload(file, schoolName)
                        }
                        event.target.value = ""
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={addAnother}
          className="inline-flex items-center justify-center rounded-full border border-brand-navy px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
        >
          Add another school
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Step 4 — Enrollment type + course interest
// ============================================================================

function Step4Enrollment({
  state,
  setField,
  errors,
  setCourseInterest,
}: {
  state: WizardState
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  errors: FieldErrors
  setCourseInterest: (courses: string[]) => void
}) {
  const toggleCourse = (name: string) => {
    if (state.course_interest.includes(name)) {
      setCourseInterest(state.course_interest.filter((c) => c !== name))
    } else {
      setCourseInterest([...state.course_interest, name])
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">
          Enrollment type
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Pick the option that best matches what you’re applying for. You can
          upgrade later (for example, from summer to full-time) by contacting the
          office.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            {
              value: "summer",
              title: "Summer",
              description: "One or two summer courses.",
            },
            {
              value: "part_time",
              title: "Part-time",
              description: "After-school, online async, or single-course enrollment.",
            },
            {
              value: "full_time",
              title: "Full-time",
              description: "Full academic-year enrollment at HBA.",
            },
          ] as const
        ).map((option) => {
          const active = state.enrollment_type === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setField("enrollment_type", option.value)}
              className={`text-left rounded-3xl border px-5 py-5 transition ${
                active
                  ? "border-brand-orange bg-brand-orange/5 ring-2 ring-brand-orange/30"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <p className="text-base font-bold text-brand-navy">{option.title}</p>
              <p className="mt-1 text-sm text-slate-600">{option.description}</p>
            </button>
          )
        })}
      </div>
      {errors.enrollment_type && (
        <p className="text-sm text-rose-700">{errors.enrollment_type}</p>
      )}

      {state.enrollment_type === "summer" && (
        <fieldset className="space-y-6 rounded-3xl border border-slate-200 p-6">
          <legend className="px-2 text-base font-semibold text-brand-navy">
            Summer courses
          </legend>
          <p className="text-sm text-slate-600">
            Pick the summer courses the student would like to enroll in. We’ll
            confirm seat availability after the office reviews the application.
          </p>

          {errors.course_interest && (
            <p className="text-sm text-rose-700">{errors.course_interest}</p>
          )}

          {summerCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <p className="text-sm font-semibold text-brand-navy">{category.label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {category.courses.map((course) => {
                  const checked = state.course_interest.includes(course.name)
                  return (
                    <label
                      key={course.name}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        checked
                          ? "border-brand-orange bg-brand-orange/5"
                          : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCourse(course.name)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">
                          {course.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {course.dates} · {course.time} · {course.price}
                        </span>
                        {course.status && (
                          <span className="mt-1 block text-xs font-semibold text-amber-700">
                            {course.status}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {state.enrollment_type === "part_time" && (
        <fieldset className="space-y-4 rounded-3xl border border-slate-200 p-6">
          <legend className="px-2 text-base font-semibold text-brand-navy">
            Part-time course interest
          </legend>
          <p className="text-sm text-slate-600">
            Describe the courses or formats you’re interested in (after-school
            in-person, online asynchronous, single-period during the day, etc.).
            The office will follow up with available options.
          </p>
          <TextareaField
            label="Courses of interest"
            name="part_time_notes"
            value={state.notes_from_family}
            onChange={(v) => setField("notes_from_family", v)}
            rows={5}
            placeholder="e.g. After-school French 1, online async AP Calculus AB"
          />
        </fieldset>
      )}

      {state.enrollment_type === "full_time" && (
        <fieldset className="space-y-4 rounded-3xl border border-slate-200 p-6">
          <legend className="px-2 text-base font-semibold text-brand-navy">
            Anything we should know
          </legend>
          <p className="text-sm text-slate-600">
            Optional — academic goals, sports/arts interests, or anything that
            helps us understand the student before we meet.
          </p>
          <TextareaField
            label="About the student"
            name="full_time_notes"
            value={state.notes_from_family}
            onChange={(v) => setField("notes_from_family", v)}
            rows={5}
            placeholder="College plans, why HBA, specific programs of interest…"
          />
        </fieldset>
      )}
    </div>
  )
}

// ============================================================================
// Step 5 — Review + submit
// ============================================================================

function Step5Review({
  state,
  setField,
}: {
  state: WizardState
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const summary = useMemo(() => buildReviewSummary(state), [state])
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)

  // The Turnstile script auto-renders widgets that exist when the script
  // first loads. Because Step 5 mounts AFTER the script has already done its
  // initial scan, we have to call window.turnstile.render() explicitly when
  // the component mounts, and clean up on unmount so going back/forward
  // between steps doesn't leak widgets.
  useEffect(() => {
    if (!turnstileSiteKey) return

    // Precompute the render options in the narrowed synchronous flow.
    // TypeScript doesn't carry the `!turnstileSiteKey` narrowing into the
    // nested mount() closure, so capturing it on a typed object is the
    // cleanest way to keep `sitekey: string` valid inside the closure.
    const renderOptions = {
      sitekey: turnstileSiteKey,
      theme: "light" as const,
      size: "flexible" as const,
    }

    let widgetId: string | null = null
    let pollHandle: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    function mount() {
      if (cancelled) return
      if (!turnstileContainerRef.current) return
      if (!window.turnstile) return
      if (widgetId) return

      const id = window.turnstile.render(turnstileContainerRef.current, renderOptions)
      if (id) widgetId = id
    }

    if (window.turnstile) {
      mount()
    } else {
      pollHandle = setInterval(() => {
        if (window.turnstile) {
          if (pollHandle) clearInterval(pollHandle)
          pollHandle = null
          mount()
        }
      }, 100)
    }

    return () => {
      cancelled = true
      if (pollHandle) clearInterval(pollHandle)
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [])

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">
          Review and submit
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Double-check the details below, add anything else we should know, then
          submit.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        {summary.map((row) => (
          <div key={row.label} className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {row.label}
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-800">{row.value || "—"}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <TextField
          label="How did you hear about HBA?"
          name="how_did_you_hear"
          value={state.how_did_you_hear}
          onChange={(v) => setField("how_did_you_hear", v)}
          placeholder="Referral name, school, Google search, social, etc."
        />
        {state.enrollment_type !== "part_time" && state.enrollment_type !== "full_time" && (
          <TextareaField
            label="Anything else we should know"
            name="notes_from_family"
            value={state.notes_from_family}
            onChange={(v) => setField("notes_from_family", v)}
            rows={5}
            placeholder="Goals, questions, or context for the office team"
          />
        )}
      </div>

      <div>
        {turnstileSiteKey ? (
          <div ref={turnstileContainerRef} />
        ) : (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Turnstile is not configured yet.
          </p>
        )}
      </div>
    </div>
  )
}

function buildReviewSummary(state: WizardState): Array<{ label: string; value: string }> {
  const studentName = [
    state.student_first_name,
    state.student_middle_name,
    state.student_last_name,
    state.student_suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()

  const enrollmentLabel =
    state.enrollment_type === "summer"
      ? "Summer"
      : state.enrollment_type === "part_time"
      ? "Part-time"
      : state.enrollment_type === "full_time"
      ? "Full-time"
      : "Not selected"

  return [
    { label: "Student", value: studentName || "—" },
    { label: "Date of birth", value: state.student_dob },
    { label: "Current grade", value: state.student_current_grade },
    { label: "Desired entry grade", value: state.student_desired_grade },
    { label: "Languages", value: [state.student_primary_language, state.student_secondary_language].filter(Boolean).join(", ") },
    { label: "Enrollment type", value: enrollmentLabel },
    {
      label: "Courses of interest",
      value: state.course_interest.join(", "),
    },
    {
      label: "Prior schools",
      value: state.prior_schools.map((s) => s.name).filter(Boolean).join(", "),
    },
    {
      label: "Guardian 1",
      value: [state.guardian1_name, state.guardian1_email, state.guardian1_mobile]
        .filter(Boolean)
        .join(" · "),
    },
    ...(state.guardian2_enabled
      ? [
          {
            label: "Guardian 2",
            value: [state.guardian2_name, state.guardian2_email, state.guardian2_mobile]
              .filter(Boolean)
              .join(" · "),
          },
        ]
      : []),
    ...(state.has_homestay
      ? [
          {
            label: "Homestay",
            value: [state.homestay_name, state.homestay_email, state.homestay_mobile]
              .filter(Boolean)
              .join(" · "),
          },
        ]
      : []),
  ]
}

// ============================================================================
// Inline email prompt for "Save and continue later"
// ============================================================================

function DraftEmailPrompt({
  initialEmail,
  onCancel,
  onSave,
  isSaving,
}: {
  initialEmail: string
  onCancel: () => void
  onSave: (email: string, turnstileToken: string) => void
  isSaving: boolean
}) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string | null>(null)
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!turnstileSiteKey) return

    const renderOptions = {
      sitekey: turnstileSiteKey,
      theme: "light" as const,
      size: "flexible" as const,
    }

    let pollHandle: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    function mount() {
      if (cancelled) return
      if (!turnstileContainerRef.current) return
      if (!window.turnstile) return
      if (widgetIdRef.current) return

      const id = window.turnstile.render(turnstileContainerRef.current, renderOptions)
      if (id) widgetIdRef.current = id
    }

    if (window.turnstile) {
      mount()
    } else {
      pollHandle = setInterval(() => {
        if (window.turnstile) {
          if (pollHandle) clearInterval(pollHandle)
          pollHandle = null
          mount()
        }
      }, 100)
    }

    return () => {
      cancelled = true
      if (pollHandle) clearInterval(pollHandle)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  const handleSave = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.")
      return
    }

    const tokenInput = turnstileContainerRef.current?.querySelector(
      '[name="cf-turnstile-response"]'
    ) as HTMLInputElement | null
    const token = tokenInput?.value ?? ""

    if (!token) {
      setError("Please complete the spam check before saving.")
      return
    }

    setError(null)
    onSave(email.trim(), token)
  }

  return (
    <div className="my-6 space-y-4 rounded-3xl border border-brand-orange/30 bg-brand-orange/5 p-6">
      <div>
        <p className="text-sm font-semibold text-brand-navy">
          Save your progress
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Enter the parent/guardian email so we can send you a link to resume
          this application anytime in the next thirty days.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <TextField
          label="Email"
          name="draft_email_prompt"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          error={error ?? undefined}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Cancel
        </button>
      </div>

      {turnstileSiteKey ? (
        <div ref={turnstileContainerRef} />
      ) : (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Turnstile is not configured yet.
        </p>
      )}
    </div>
  )
}
