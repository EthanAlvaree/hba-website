import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  getStudentDetail,
} from "@/lib/sis"
import { getHealthRecord } from "@/lib/health-records"
import { saveParentHealthRecordAction } from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}

export default async function ParentHealthRecordPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const { id: studentId } = await params
  const raw = await searchParams

  const isAdmin = session.isAdmin === true
  if (!isAdmin) {
    if (!profile.roles.includes("parent")) redirect("/admin/sign-in")
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) notFound()
  }

  const [student, record] = await Promise.all([
    getStudentDetail(studentId),
    getHealthRecord(studentId),
  ])
  if (!student) notFound()

  const displayName = student.preferred_name?.trim()
    ? `${student.preferred_name} ${student.legal_last_name}`
    : `${student.legal_first_name} ${student.legal_last_name}`

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/parent/students/${studentId}`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to {displayName}
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Health record
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {displayName}&rsquo;s health record
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Keep this up to date so we can act quickly in an emergency. The
          office sees everything here except this note; office-only internal
          notes are not editable from the family portal.
        </p>
      </header>

      {raw.saved === "1" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900 shadow-sm">
          Health record saved.
        </section>
      )}
      {raw.error && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-900 shadow-sm">
          {raw.error}
        </section>
      )}

      <form
        action={saveParentHealthRecordAction}
        className="space-y-6 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <input type="hidden" name="student_id" value={studentId} />

        <Group title="Medical">
          <TextArea
            label="Allergies"
            name="allergies"
            defaultValue={record?.allergies ?? ""}
            placeholder="Peanuts (EpiPen in nurse's office). Penicillin."
          />
          <TextArea
            label="Medications"
            name="medications"
            defaultValue={record?.medications ?? ""}
            placeholder="Daily Adderall 20mg AM. Albuterol inhaler as needed."
          />
          <TextArea
            label="Conditions"
            name="conditions"
            defaultValue={record?.conditions ?? ""}
            placeholder="Mild asthma. Type 1 diabetes (pump on left hip)."
          />
          <TextArea
            label="Dietary restrictions"
            name="dietary_restrictions"
            defaultValue={record?.dietary_restrictions ?? ""}
          />
        </Group>

        <Group title="Immunizations">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="immunizations_on_file"
              defaultChecked={record?.immunizations_on_file ?? false}
              className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>Immunization records on file with the school</span>
          </label>
          <TextArea
            label="Immunization notes"
            name="immunization_notes"
            defaultValue={record?.immunization_notes ?? ""}
            placeholder="Up to date as of 2026-08-12. Tdap booster due 2027."
          />
        </Group>

        <Group title="Emergency contact (besides parents)">
          <p className="text-xs text-slate-500">
            Someone the office can call if guardians can&rsquo;t be reached —
            grandparent, neighbor, family friend, etc.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              name="emergency_contact_name"
              defaultValue={record?.emergency_contact_name ?? ""}
            />
            <Input
              label="Relationship"
              name="emergency_contact_relationship"
              defaultValue={record?.emergency_contact_relationship ?? ""}
              placeholder="Grandmother, neighbor, etc."
            />
            <Input
              label="Phone"
              name="emergency_contact_phone"
              defaultValue={record?.emergency_contact_phone ?? ""}
              type="tel"
            />
            <Input
              label="Email"
              name="emergency_contact_email"
              defaultValue={record?.emergency_contact_email ?? ""}
              type="email"
            />
          </div>
        </Group>

        <Group title="Primary care + insurance">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Physician name"
              name="primary_physician_name"
              defaultValue={record?.primary_physician_name ?? ""}
            />
            <Input
              label="Physician phone"
              name="primary_physician_phone"
              defaultValue={record?.primary_physician_phone ?? ""}
              type="tel"
            />
            <Input
              label="Insurance provider"
              name="insurance_provider"
              defaultValue={record?.insurance_provider ?? ""}
            />
            <Input
              label="Policy number"
              name="insurance_policy_number"
              defaultValue={record?.insurance_policy_number ?? ""}
            />
          </div>
        </Group>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save health record
        </button>
      </form>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand-navy">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Input({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  )
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 2,
}: {
  label: string
  name: string
  defaultValue: string
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  )
}
