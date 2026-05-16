import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  getStudentById,
} from "@/lib/sis"
import { updateStudentInfoAsParentAction } from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

export default async function ParentEditStudentInfoPage({
  params,
  searchParams,
}: PageProps) {
  const { id: studentId } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  if (!session.isAdmin) {
    const profile = await getProfileByEmail(session.user.email)
    if (!profile || !profile.roles.includes("parent")) {
      redirect("/admin/sign-in")
    }
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) redirect("/parent")
  }

  const student = await getStudentById(studentId)
  if (!student) notFound()

  const raw = await searchParams
  const studentDisplay =
    student.preferred_name?.trim() ||
    `${student.legal_first_name} ${student.legal_last_name}`.trim()

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Edit student info
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {studentDisplay}
        </h1>
        <p className="text-sm text-slate-600">
          Please review and update — we use this for class rosters,
          paperwork, and emergencies. Anything you don&rsquo;t know, just
          leave blank and we&rsquo;ll follow up.
        </p>
        <Link
          href="/parent/profile"
          className="inline-block text-xs font-semibold text-brand-navy hover:text-brand-orange"
        >
          ← Back to my profile
        </Link>
      </header>

      {raw.saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Saved. Thank you.
        </div>
      )}

      <form
        action={updateStudentInfoAsParentAction}
        className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <input type="hidden" name="id" value={studentId} />

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Legal name
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Legal first name <span className="text-rose-700">*</span></span>
              <input
                name="legal_first_name"
                required
                defaultValue={student.legal_first_name ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Legal middle name</span>
              <input
                name="legal_middle_name"
                defaultValue={student.legal_middle_name ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Legal last name <span className="text-rose-700">*</span></span>
              <input
                name="legal_last_name"
                required
                defaultValue={student.legal_last_name ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Suffix (Jr., III, etc.)</span>
              <input
                name="suffix"
                defaultValue={student.suffix ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">Preferred name (what teachers call them)</span>
              <input
                name="preferred_name"
                defaultValue={student.preferred_name ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Demographics
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Date of birth</span>
              <input
                name="dob"
                type="date"
                defaultValue={student.dob ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Birthplace</span>
              <input
                name="birthplace"
                defaultValue={student.birthplace ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Gender</span>
              <input
                name="gender"
                defaultValue={student.gender ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Pronouns</span>
              <input
                name="pronouns"
                defaultValue={student.pronouns ?? ""}
                placeholder="she/her, he/him, they/them, etc."
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Primary language at home</span>
              <input
                name="primary_language"
                defaultValue={student.primary_language ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Secondary language</span>
              <input
                name="secondary_language"
                defaultValue={student.secondary_language ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">English proficiency</span>
              <input
                name="english_proficiency"
                defaultValue={student.english_proficiency ?? ""}
                placeholder="native, fluent, advanced, intermediate, beginner"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">Enrollment type</span>
              <select
                name="enrollment_type"
                defaultValue={student.enrollment_type ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Not set</option>
                <option value="summer">Summer</option>
                <option value="part_time">Part-time</option>
                <option value="full_time">Full-time</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Student mailing address
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">Street address</span>
              <input
                name="address_line1"
                defaultValue={student.address_line1 ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">Apartment / suite (optional)</span>
              <input
                name="address_line2"
                defaultValue={student.address_line2 ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">City</span>
              <input
                name="address_city"
                defaultValue={student.address_city ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">State / region</span>
              <input
                name="address_region"
                defaultValue={student.address_region ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Postal code</span>
              <input
                name="address_postal_code"
                defaultValue={student.address_postal_code ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
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
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save changes
        </button>
      </form>
    </main>
  )
}
