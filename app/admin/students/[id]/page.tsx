import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getStudentDetail,
  studentStatusSchema,
  type EnrollmentStatus,
  type SectionModality,
  type SectionPeriod,
  type StudentDetailEnrollment,
  type StudentDetailParentLink,
  type StudentStatus,
} from "@/lib/sis"
import {
  getPostEnrollmentData,
  listStudentDocuments,
  studentDocumentKindLabels,
} from "@/lib/post-enrollment"
import StudentsHeader from "../StudentsHeader"
import {
  setPostEnrollmentVerifiedAction,
  updateParentLinkAction,
  updateProfileContactAction,
  updateStudentAdminAction,
  updateStudentDemographicsAction,
} from "../actions"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function formatTimestamp(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

function statusLabel(status: StudentStatus): string {
  switch (status) {
    case "active":
      return "Active"
    case "graduated":
      return "Graduated"
    case "withdrawn":
      return "Withdrawn"
  }
}

function enrollmentBadgeClass(status: EnrollmentStatus) {
  switch (status) {
    case "enrolled":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "audit":
      return "border border-sky-200 bg-sky-50 text-sky-700"
    case "completed":
      return "border border-slate-200 bg-slate-100 text-slate-700"
    case "dropped":
    case "withdrawn":
      return "border border-rose-200 bg-rose-50 text-rose-700"
  }
}

function enrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "Enrolled"
    case "dropped":
      return "Dropped"
    case "withdrawn":
      return "Withdrawn"
    case "completed":
      return "Completed"
    case "audit":
      return "Audit"
  }
}

function periodShortLabel(period: SectionPeriod | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
}

function modalityShortLabel(modality: SectionModality): string {
  switch (modality) {
    case "in_person":
      return "In person"
    case "online_async":
      return "Online async"
    case "online_sync":
      return "Online sync"
    case "hybrid":
      return "Hybrid"
  }
}

function teacherShortName(
  teacher: StudentDetailEnrollment["section"] extends infer S
    ? S extends { teacher: infer T }
      ? T
      : never
    : never
): string {
  if (!teacher) return "Unassigned"
  const full = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ").trim()
  return full || teacher.display_name || teacher.email
}

function parentName(link: StudentDetailParentLink): string {
  const parent = link.parent
  if (!parent) return "(unknown)"
  const full = [parent.first_name, parent.last_name].filter(Boolean).join(" ").trim()
  return full || parent.display_name || parent.email
}

function parentRoleLabel(link: StudentDetailParentLink): string {
  if (link.is_homestay) return "Homestay"
  if (link.is_primary) return "Primary guardian"
  return "Guardian"
}

// Groups a flat enrollment list into buckets keyed by term, ordered by term
// start_date descending (most recent term first). Enrollments without an
// associated section/term are dropped into an "Other" bucket.
function groupEnrollmentsByTerm(enrollments: StudentDetailEnrollment[]) {
  const buckets = new Map<
    string,
    {
      key: string
      label: string
      sortKey: string
      enrollments: StudentDetailEnrollment[]
    }
  >()

  for (const enrollment of enrollments) {
    const term = enrollment.section?.term
    const key = term?.id ?? "__none__"
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: term?.name ?? "Other / unscheduled",
        sortKey: term?.start_date ?? "0000-00-00",
        enrollments: [],
      })
    }
    buckets.get(key)!.enrollments.push(enrollment)
  }

  return [...buckets.values()].sort((left, right) =>
    right.sortKey.localeCompare(left.sortKey)
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="text-sm text-slate-800">{value || <span className="text-slate-400">—</span>}</p>
    </div>
  )
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id } = await params

  const student = await getStudentDetail(id)
  if (!student) {
    notFound()
  }

  const [postEnrollmentData, studentDocuments] = await Promise.all([
    getPostEnrollmentData(id),
    listStudentDocuments(id),
  ])

  const displayName = student.preferred_name?.trim()
    ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
    : `${student.legal_first_name} ${student.legal_last_name}`

  const fullLegalName = [
    student.legal_first_name,
    student.legal_middle_name,
    student.legal_last_name,
    student.suffix,
  ]
    .filter(Boolean)
    .join(" ")

  const address = [
    student.address_line1,
    student.address_line2,
    student.address_city,
    student.address_region,
    student.address_postal_code,
    student.address_country,
  ]
    .filter(Boolean)
    .join(", ")

  const enrollmentBuckets = groupEnrollmentsByTerm(student.enrollments)
  const activeEnrollments = student.enrollments.filter((e) => e.status === "enrolled")

  return (
    <div className="space-y-6">
        <StudentsHeader />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/students"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to students
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/portal?as=${id}`}
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              Preview portal →
            </Link>
            <Link
              href={`/admin/students/${id}/transcript`}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              View transcript →
            </Link>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-extrabold text-brand-navy">{displayName}</h2>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                  {statusLabel(student.status)}
                </span>
                {student.enrollment_type && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {student.enrollment_type === "full_time"
                      ? "Full-time"
                      : student.enrollment_type === "part_time"
                      ? "Part-time"
                      : "Summer"}
                  </span>
                )}
                {student.current_grade && (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    Grade {student.current_grade}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600">
                {activeEnrollments.length} active enrollment
                {activeEnrollments.length === 1 ? "" : "s"}
                {student.application_id && (
                  <>
                    {" "}&middot;{" "}
                    <Link
                      href="/admin/applications"
                      className="text-brand-navy underline-offset-4 hover:underline"
                    >
                      Original application
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-brand-navy">Student</h3>
            <div className="mt-4 space-y-3">
              <DetailRow label="Legal name" value={fullLegalName} />
              <DetailRow label="Preferred name" value={student.preferred_name} />
              <DetailRow label="Date of birth" value={formatDate(student.dob)} />
              <DetailRow
                label="Gender / pronouns"
                value={[student.gender, student.pronouns].filter(Boolean).join(" · ")}
              />
              <DetailRow label="Birthplace" value={student.birthplace} />
              <DetailRow
                label="Languages"
                value={[student.primary_language, student.secondary_language]
                  .filter(Boolean)
                  .join(", ")}
              />
              <DetailRow
                label="English proficiency"
                value={student.english_proficiency}
              />
              <DetailRow label="Residence" value={address} />
            </div>

            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-navy">
                Edit student details (fix typos, fill omissions)
              </summary>
              <form
                action={updateStudentDemographicsAction}
                className="space-y-3 border-t border-slate-200 px-4 py-4"
              >
                <input type="hidden" name="id" value={student.id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Legal first name</span>
                    <input
                      name="legal_first_name"
                      required
                      defaultValue={student.legal_first_name}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Legal middle name</span>
                    <input
                      name="legal_middle_name"
                      defaultValue={student.legal_middle_name ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Legal last name</span>
                    <input
                      name="legal_last_name"
                      required
                      defaultValue={student.legal_last_name}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Suffix</span>
                    <input
                      name="suffix"
                      defaultValue={student.suffix ?? ""}
                      placeholder="Jr., III, etc."
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    <span className="block">Preferred name / nickname</span>
                    <input
                      name="preferred_name"
                      defaultValue={student.preferred_name ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Date of birth</span>
                    <input
                      name="dob"
                      type="date"
                      defaultValue={student.dob ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Gender</span>
                    <input
                      name="gender"
                      defaultValue={student.gender ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Pronouns</span>
                    <input
                      name="pronouns"
                      defaultValue={student.pronouns ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Enrollment type</span>
                    <select
                      name="enrollment_type"
                      defaultValue={student.enrollment_type ?? ""}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="">Not set</option>
                      <option value="summer">Summer</option>
                      <option value="part_time">Part-time</option>
                      <option value="full_time">Full-time</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    <span className="block">Birthplace</span>
                    <input
                      name="birthplace"
                      defaultValue={student.birthplace ?? ""}
                      placeholder="City, state/region, country"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Primary language</span>
                    <input
                      name="primary_language"
                      defaultValue={student.primary_language ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span className="block">Secondary language</span>
                    <input
                      name="secondary_language"
                      defaultValue={student.secondary_language ?? ""}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    <span className="block">English proficiency</span>
                    <input
                      name="english_proficiency"
                      defaultValue={student.english_proficiency ?? ""}
                      placeholder="native / fluent / proficient / intermediate / beginner"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                </div>

                <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <legend className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Student residence
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                      <span className="block">Street address</span>
                      <input
                        name="address_line1"
                        defaultValue={student.address_line1 ?? ""}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                      <span className="block">Address line 2</span>
                      <input
                        name="address_line2"
                        defaultValue={student.address_line2 ?? ""}
                        placeholder="Apt, suite, unit, etc."
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span className="block">City</span>
                      <input
                        name="address_city"
                        defaultValue={student.address_city ?? ""}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span className="block">State / region</span>
                      <input
                        name="address_region"
                        defaultValue={student.address_region ?? ""}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span className="block">Postal code</span>
                      <input
                        name="address_postal_code"
                        defaultValue={student.address_postal_code ?? ""}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span className="block">Country</span>
                      <input
                        name="address_country"
                        defaultValue={student.address_country ?? ""}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  </div>
                </fieldset>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                >
                  Save student details
                </button>
              </form>
            </details>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-brand-navy">Profile</h3>
            {student.profile ? (
              <div className="mt-4 space-y-3">
                <DetailRow label="HBA email" value={student.profile.email} />
                <DetailRow label="Display name" value={student.profile.display_name} />
                <DetailRow
                  label="Roles"
                  value={student.profile.roles.join(", ") || "—"}
                />
                <DetailRow
                  label="Entra OID"
                  value={
                    student.profile.entra_oid ? (
                      <code className="font-mono text-xs">{student.profile.entra_oid}</code>
                    ) : (
                      <span className="text-slate-400">
                        Not yet (set on first M365 sign-in)
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="Active"
                  value={student.profile.active ? "Yes" : "No"}
                />
                <DetailRow
                  label="Personal email"
                  value={student.profile.personal_email}
                />
                <DetailRow
                  label="Mobile"
                  value={student.profile.mobile_phone}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No profile attached. This shouldn&rsquo;t happen &mdash; flag it
                to engineering if you see it.
              </p>
            )}
          </section>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">Family</h3>
          {student.parent_links.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No parent links yet. Parent profiles are created during the Enroll
              workflow from the application&rsquo;s guardian fields.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {student.parent_links.map((link) => (
                <div
                  key={link.id}
                  className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">
                      {parentName(link)}
                    </p>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                      {parentRoleLabel(link)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {link.parent?.email ?? "—"}
                    {link.parent?.mobile_phone && (
                      <> &middot; {link.parent.mobile_phone}</>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {link.relationship ? `Relationship: ${link.relationship}` : null}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sees grades: {link.can_view_grades ? "yes" : "no"} &middot;
                    {" "}Attendance: {link.can_view_attendance ? "yes" : "no"} &middot;
                    {" "}Comms: {link.can_receive_communications ? "yes" : "no"}
                  </p>

                  {link.parent && (
                    <details className="rounded-2xl border border-slate-200 bg-white">
                      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-brand-navy">
                        Edit contact + permissions
                      </summary>
                      <div className="space-y-4 border-t border-slate-200 px-3 py-3">
                        <form action={updateProfileContactAction} className="space-y-2">
                          <input type="hidden" name="id" value={link.parent.id} />
                          <input type="hidden" name="student_id" value={student.id} />
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Contact details
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="space-y-1 text-xs font-medium text-slate-700">
                              <span className="block">First name</span>
                              <input
                                name="first_name"
                                defaultValue={link.parent.first_name ?? ""}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-slate-700">
                              <span className="block">Last name</span>
                              <input
                                name="last_name"
                                defaultValue={link.parent.last_name ?? ""}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
                              <span className="block">Display name</span>
                              <input
                                name="display_name"
                                defaultValue={link.parent.display_name ?? ""}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-slate-700">
                              <span className="block">Mobile phone</span>
                              <input
                                name="mobile_phone"
                                type="tel"
                                defaultValue={link.parent.mobile_phone ?? ""}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-slate-700">
                              <span className="block">Work phone</span>
                              <input
                                name="work_phone"
                                type="tel"
                                defaultValue={link.parent.work_phone ?? ""}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
                              <span className="block">
                                Personal email (alternate; the row&rsquo;s login
                                email is shown above and isn&rsquo;t edited here)
                              </span>
                              <input
                                name="personal_email"
                                type="email"
                                defaultValue={link.parent.personal_email ?? ""}
                                placeholder="optional secondary email"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              />
                            </label>
                          </div>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
                          >
                            Save contact
                          </button>
                        </form>

                        <form action={updateParentLinkAction} className="space-y-2">
                          <input type="hidden" name="id" value={link.id} />
                          <input type="hidden" name="student_id" value={student.id} />
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Relationship + portal permissions
                          </p>
                          <label className="space-y-1 text-xs font-medium text-slate-700">
                            <span className="block">Relationship label</span>
                            <input
                              name="relationship"
                              defaultValue={link.relationship ?? ""}
                              placeholder="Mother, Father, Guardian, etc."
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="is_primary"
                                defaultChecked={link.is_primary}
                                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                              />
                              <span>Primary guardian</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="is_homestay"
                                defaultChecked={link.is_homestay}
                                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                              />
                              <span>Homestay</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="is_emergency_contact"
                                defaultChecked={link.is_emergency_contact}
                                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                              />
                              <span>Emergency contact</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="can_view_grades"
                                defaultChecked={link.can_view_grades}
                                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                              />
                              <span>Can view grades</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="can_view_attendance"
                                defaultChecked={link.can_view_attendance}
                                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                              />
                              <span>Can view attendance</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="can_receive_communications"
                                defaultChecked={link.can_receive_communications}
                                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                              />
                              <span>Receives communications</span>
                            </label>
                          </div>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
                          >
                            Save permissions
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <PostEnrollmentFileCard
          studentId={student.id}
          data={postEnrollmentData}
          documents={studentDocuments}
        />

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">Enrollments</h3>
          <p className="mt-1 text-sm text-slate-600">
            Section enrollments across every term. To change a status, open the
            section&rsquo;s detail page from the academics dashboard.
          </p>
          {enrollmentBuckets.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Not enrolled in any sections yet.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {enrollmentBuckets.map((bucket) => (
                <div key={bucket.key} className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{bucket.label}</p>
                  <div className="space-y-2">
                    {bucket.enrollments.map((enrollment) => {
                      const section = enrollment.section
                      const course = section?.course
                      const finalGrade =
                        enrollment.final_grade_letter ??
                        (typeof enrollment.final_grade_percentage === "number"
                          ? `${Number(enrollment.final_grade_percentage).toFixed(1)}%`
                          : null)
                      return (
                        <div
                          key={enrollment.id}
                          className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">
                                {course?.name ?? "(deleted course)"}
                              </p>
                              {course && (
                                <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  {course.code}
                                </code>
                              )}
                              {section?.section_code && (
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                                  Sec {section.section_code}
                                </span>
                              )}
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${enrollmentBadgeClass(enrollment.status)}`}
                              >
                                {enrollmentStatusLabel(enrollment.status)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {periodShortLabel(section?.period ?? null)} &middot;{" "}
                              {section ? modalityShortLabel(section.modality) : "—"}
                              {section?.room && <> &middot; Room {section.room}</>}
                            </p>
                          </div>
                          <p className="text-sm text-slate-600">
                            {section ? teacherShortName(section.teacher) : "—"}
                          </p>
                          <div className="text-xs text-slate-500 sm:text-right">
                            {finalGrade && (
                              <p className="font-semibold text-slate-800">
                                Final: {finalGrade}
                              </p>
                            )}
                            {section && (
                              <Link
                                href={`/admin/academics/sections/${section.id}`}
                                className="font-semibold text-brand-navy underline-offset-4 hover:underline"
                              >
                                Open section →
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-brand-navy/15 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">
            Admin fields
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Office-only fields. The demographics above came from the original
            application and aren&rsquo;t editable here yet.
          </p>

          <form action={updateStudentAdminAction} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={student.id} />

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Status</span>
              <select
                name="status"
                defaultValue={student.status}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                {studentStatusSchema.options.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Current grade</span>
              <input
                name="current_grade"
                defaultValue={student.current_grade ?? ""}
                placeholder="9, 10, 11, 12, etc."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Registered at HBA</span>
              <input
                name="registered_at_hba"
                type="date"
                defaultValue={student.registered_at_hba ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Assigned admin (optional)</span>
              <input
                name="assigned_to"
                defaultValue={student.assigned_to ?? ""}
                placeholder="Office staff name or email"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              <span className="block">Internal notes</span>
              <textarea
                name="internal_notes"
                rows={5}
                defaultValue={student.internal_notes ?? ""}
                placeholder="Office-only notes about this student: accommodations, family situation, follow-ups, etc."
                className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            {(student.graduated_at || student.withdrawn_at) && (
              <p className="sm:col-span-2 text-xs text-slate-500">
                {student.graduated_at && (
                  <>Graduated on {formatDate(student.graduated_at)}. </>
                )}
                {student.withdrawn_at && (
                  <>Withdrew on {formatDate(student.withdrawn_at)}.</>
                )}
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Save admin fields
              </button>
            </div>
          </form>
        </section>
    </div>
  )
}

type PostEnrollmentFileData = Awaited<ReturnType<typeof getPostEnrollmentData>>
type StudentDocsList = Awaited<ReturnType<typeof listStudentDocuments>>

function PostEnrollmentFileCard({
  studentId,
  data,
  documents,
}: {
  studentId: string
  data: PostEnrollmentFileData
  documents: StudentDocsList
}) {
  const submittedAt = data?.family_completed_at ?? null
  const verifiedAt = data?.admin_verified_at ?? null
  const status = !data
    ? "not_started"
    : verifiedAt
    ? "verified"
    : submittedAt
    ? "submitted"
    : "in_progress"

  const statusLabel = {
    not_started: "Not started",
    in_progress: "In progress",
    submitted: "Submitted, awaiting review",
    verified: "Verified",
  }[status]

  const statusClass = {
    not_started: "border border-slate-200 bg-slate-100 text-slate-700",
    in_progress: "border border-amber-200 bg-amber-50 text-amber-800",
    submitted: "border border-sky-200 bg-sky-50 text-sky-700",
    verified: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  }[status]

  const filledSections = data ? countFilledSections(data) : 0

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-extrabold text-brand-navy">
              Post-enrollment file
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Immunizations, medical history, insurance, accommodations, and
            citizenship/visa data collected from the family after admission.
            Edited by parents on /parent/students/{studentId.slice(0, 8)}…/complete-file.
          </p>
          <p className="text-xs text-slate-500">
            {filledSections} of 6 sections have data
            {data?.family_completed_at && (
              <> &middot; Submitted {formatTimestamp(data.family_completed_at)}</>
            )}
            {data?.admin_verified_at && (
              <>
                {" "}&middot; Verified {formatTimestamp(data.admin_verified_at)} by{" "}
                {data.admin_verified_by ?? "unknown"}
              </>
            )}
          </p>
        </div>

        {data && (
          <form action={setPostEnrollmentVerifiedAction}>
            <input type="hidden" name="student_id" value={studentId} />
            <input type="hidden" name="verified" value={verifiedAt ? "0" : "1"} />
            <button
              type="submit"
              className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold shadow-md transition ${
                verifiedAt
                  ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  : "bg-emerald-700 text-white hover:brightness-110"
              }`}
            >
              {verifiedAt ? "Clear verification" : "Mark verified"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SectionStatusRow label="Immunizations" filled={hasImmunizations(data)} />
        <SectionStatusRow label="Medical history" filled={hasMedical(data)} />
        <SectionStatusRow label="Medical insurance" filled={hasInsurance(data)} />
        <SectionStatusRow label="Financial aid" filled={hasFinancialAid(data)} />
        <SectionStatusRow label="Accommodations / IEP" filled={hasAccommodations(data)} />
        <SectionStatusRow label="Citizenship / visa" filled={hasCitizenship(data)} />
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Documents on file ({documents.length})
        </p>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No documents uploaded yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-800">
                  📎 {doc.filename}{" "}
                  <span className="text-xs text-slate-500">
                    ({studentDocumentKindLabels[doc.kind]})
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  Uploaded {formatTimestamp(doc.uploaded_at)}
                  {doc.uploaded_by && <> by {doc.uploaded_by}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function SectionStatusRow({ label, filled }: { label: string; filled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
      <span className="text-slate-800">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
          filled
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-slate-200 bg-white text-slate-500"
        }`}
      >
        {filled ? "Filled" : "Empty"}
      </span>
    </div>
  )
}

function countFilledSections(data: NonNullable<PostEnrollmentFileData>): number {
  let count = 0
  if (hasImmunizations(data)) count++
  if (hasMedical(data)) count++
  if (hasInsurance(data)) count++
  if (hasFinancialAid(data)) count++
  if (hasAccommodations(data)) count++
  if (hasCitizenship(data)) count++
  return count
}

function hasImmunizations(data: PostEnrollmentFileData): boolean {
  if (!data) return false
  return (
    data.immunizations_complete ||
    Boolean(data.immunizations_notes) ||
    Boolean(data.immunizations_exemption_reason)
  )
}

function hasMedical(data: PostEnrollmentFileData): boolean {
  if (!data) return false
  return Boolean(
    data.medical_blood_type ||
      data.medical_allergies ||
      data.medical_conditions ||
      data.medical_medications ||
      data.medical_emergency_contact_name ||
      data.medical_pediatrician_name ||
      data.medical_notes
  )
}

function hasInsurance(data: PostEnrollmentFileData): boolean {
  if (!data) return false
  return Boolean(
    data.insurance_provider ||
      data.insurance_policy_number ||
      data.insurance_subscriber_name
  )
}

function hasFinancialAid(data: PostEnrollmentFileData): boolean {
  if (!data) return false
  return data.financial_aid_requested || Boolean(data.financial_aid_notes)
}

function hasAccommodations(data: PostEnrollmentFileData): boolean {
  if (!data) return false
  return (
    data.has_iep ||
    data.has_504 ||
    Boolean(data.accommodations_needed) ||
    Boolean(data.accommodation_notes)
  )
}

function hasCitizenship(data: PostEnrollmentFileData): boolean {
  if (!data) return false
  return Boolean(
    data.citizenship_country ||
      data.visa_type ||
      data.i20_number ||
      data.passport_number
  )
}
