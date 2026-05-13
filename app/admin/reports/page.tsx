import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

const reports: Array<{ label: string; desc: string; href: string }> = [
  {
    label: "Active students",
    desc: "Every student with status='active'. Includes legal name, preferred name, HBA email, grade, enrollment type, and registration date.",
    href: "/api/admin/reports/students.csv?status=active",
  },
  {
    label: "All students (including graduated/withdrawn)",
    desc: "Same columns as the active report, no status filter.",
    href: "/api/admin/reports/students.csv",
  },
  {
    label: "Parent contact list",
    desc: "Every active parent_link with parent name, email, phone, student name, and the parent role flags (primary/homestay/emergency contact).",
    href: "/api/admin/reports/parent-contacts.csv",
  },
  {
    label: "Section roster (all sections, current term)",
    desc: "One row per (section, enrolled student). Useful for end-of-term review or office spot-checks.",
    href: "/api/admin/reports/section-rosters.csv",
  },
  {
    label: "Faculty + assigned sections",
    desc: "One row per (teacher, section) for the current term. Used to confirm staffing and double-check workload.",
    href: "/api/admin/reports/faculty-sections.csv",
  },
]

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">Reports</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          One-click CSV downloads of the data most often requested by the
          office. Open in Excel, Google Sheets, or any text editor.
        </p>
      </header>

      <section className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.href}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-brand-navy">{r.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{r.desc}</p>
              </div>
              <Link
                href={r.href}
                prefetch={false}
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Download CSV
              </Link>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
