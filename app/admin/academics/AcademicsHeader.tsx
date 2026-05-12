import Link from "next/link"
import { signOutAcademicsAdminAction } from "./actions"

type AcademicsTab = "terms" | "courses" | "sections" | "requirements" | "scheduler"

const tabs: Array<{ id: AcademicsTab; label: string; href: string }> = [
  { id: "terms", label: "Terms", href: "/admin/academics/terms" },
  { id: "courses", label: "Courses", href: "/admin/academics/courses" },
  { id: "sections", label: "Sections", href: "/admin/academics/sections" },
  { id: "requirements", label: "Graduation reqs", href: "/admin/academics/requirements" },
  { id: "scheduler", label: "Scheduler", href: "/admin/academics/scheduler" },
]

export default function AcademicsHeader({
  active,
  adminEmail,
}: {
  active: AcademicsTab
  adminEmail: string
}) {
  return (
    <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            Admin dashboard
          </p>
          <h1 className="text-4xl font-extrabold">Academics</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">
            Manage academic terms, the course catalog, and the sections that
            connect a course to a term, a teacher, and a bell-schedule period.
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
            href="/admin/students"
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
          >
            Students
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
          <form action={signOutAcademicsAdminAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab.id === active
                ? "border-white bg-white text-brand-navy"
                : "border-white/20 bg-transparent text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
