import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

const reports: Array<{
  label: string
  desc: string
  href: string
  emphasis?: "default" | "emergency"
}> = [
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
    label: "🚨 Emergency parent contact list",
    desc: "Every active parent who's opted in to receive school communications. One row per parent-student link. Use this for school closures, weather notifications, or any all-school urgent message.",
    href: "/api/admin/reports/parent-contacts.csv?status=active&comms_only=1",
    emphasis: "emergency",
  },
  {
    label: "All parent contacts (no filter)",
    desc: "Every active parent_link with parent name, email, phone, student name, and the parent role flags (primary/homestay/emergency contact). Includes parents who haven't opted in to comms.",
    href: "/api/admin/reports/parent-contacts.csv",
  },
  {
    label: "Primary guardians only",
    desc: "One row per primary guardian (skips homestay hosts + secondary parents). Useful for tuition + enrollment correspondence.",
    href: "/api/admin/reports/parent-contacts.csv?primary_only=1",
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

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

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
        {reports.map((r) => {
          const isEmergency = r.emphasis === "emergency"
          return (
            <div
              key={r.href}
              className={`rounded-2xl border px-5 py-4 shadow-sm ${
                isEmergency
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-brand-navy">{r.label}</h2>
                  <p className="mt-1 text-sm text-slate-600">{r.desc}</p>
                </div>
                <Link
                  href={r.href}
                  prefetch={false}
                  className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold shadow-md transition ${
                    isEmergency
                      ? "bg-rose-700 text-white hover:brightness-110"
                      : "bg-brand-navy text-white hover:brightness-110"
                  }`}
                >
                  Download CSV
                </Link>
              </div>
            </div>
          )
        })}
      </section>

      {/* Per-grade parent contact export */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-brand-navy">
              Per-grade parent contact list
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Same shape as the parent contacts list, filtered to one
              grade. Useful for grade-level announcements (e.g. 11th
              grade college-prep night).
            </p>
          </div>
          <form
            action="/api/admin/reports/parent-contacts.csv"
            method="get"
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="status" value="active" />
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Grade</span>
              <select
                name="grade"
                defaultValue="11"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 self-end pb-2">
              <input
                type="checkbox"
                name="comms_only"
                value="1"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
              />
              <span>Comms-opted-in only</span>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Download CSV
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
