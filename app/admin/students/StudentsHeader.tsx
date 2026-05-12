import Link from "next/link"
import { signOutStudentsAdminAction } from "./actions"

export default function StudentsHeader({ adminEmail }: { adminEmail: string }) {
  return (
    <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            Admin dashboard
          </p>
          <h1 className="text-4xl font-extrabold">Students</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">
            All HBA students, their family contacts, and their section
            enrollments. Demographics come from the original application; admin
            fields (status, grade, notes) are editable here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85">
            Signed in as {adminEmail}
          </div>
          <Link
            href="/admin/applications"
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
          >
            Applications
          </Link>
          <Link
            href="/admin/academics"
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
          >
            Academics
          </Link>
          <Link
            href="/admin/profiles"
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
          >
            Profiles
          </Link>
          <Link
            href="/admin/contact-submissions"
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
          >
            Contact submissions
          </Link>
          <form action={signOutStudentsAdminAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
