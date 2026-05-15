import Link from "next/link"

type AcademicsTab =
  | "setup"
  | "terms"
  | "courses"
  | "sections"
  | "teaching-grid"
  | "requirements"
  | "scheduler"
  | "calendar"
  | "conferences"

const tabs: Array<{ id: AcademicsTab; label: string; href: string }> = [
  { id: "setup", label: "New term setup", href: "/admin/academics/setup" },
  { id: "terms", label: "Terms", href: "/admin/academics/terms" },
  { id: "calendar", label: "Calendar", href: "/admin/academics/calendar" },
  { id: "courses", label: "Courses", href: "/admin/academics/courses" },
  { id: "sections", label: "Sections", href: "/admin/academics/sections" },
  {
    id: "teaching-grid",
    label: "Teaching grid",
    href: "/admin/academics/teaching-grid",
  },
  { id: "requirements", label: "Graduation reqs", href: "/admin/academics/requirements" },
  { id: "scheduler", label: "Scheduler", href: "/admin/academics/scheduler" },
  { id: "conferences", label: "Conferences", href: "/admin/academics/conferences" },
]

// Page header for /admin/academics/* pages. The shared admin shell handles
// cross-section navigation + sign-out; this component renders the section
// title plus the sub-tab nav for the Academics namespace.
export default function AcademicsHeader({ active }: { active: AcademicsTab }) {
  return (
    <header className="space-y-3">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">Academics</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Manage academic terms, the course catalog, sections, graduation
          requirements, and the auto-scheduler.
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              tab.id === active
                ? "bg-brand-navy text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
