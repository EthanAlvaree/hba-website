import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AcademicsHeader from "../AcademicsHeader"
import { SetupWizard } from "./SetupWizard"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    completed?: string
    events_created?: string
    event_errors?: string
    error?: string
  }>
}

export default async function TermSetupPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams

  return (
    <div className="space-y-6">
      <AcademicsHeader active="setup" />

      <header className="space-y-2">
        <h2 className="text-2xl font-extrabold text-brand-navy">
          Term setup wizard
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Set up a new term + its academic calendar events in one pass. After
          you finish, you can add sections from{" "}
          <Link
            href="/admin/academics/sections"
            className="font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            Sections
          </Link>{" "}
          or let the scheduler propose them from student course requests on{" "}
          <Link
            href="/admin/academics/scheduler"
            className="font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            Scheduler
          </Link>
          .
        </p>
      </header>

      {raw.completed && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
          <p className="font-semibold">Term created.</p>
          <p className="mt-1">
            Created {raw.events_created ?? "0"} calendar event
            {raw.events_created === "1" ? "" : "s"}.
          </p>
          {raw.event_errors && (
            <p className="mt-1 text-rose-700">
              Some events couldn&rsquo;t be created: {raw.event_errors}
            </p>
          )}
          <p className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/academics/sections"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Add sections →
            </Link>
            <Link
              href="/admin/academics/calendar"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Edit calendar events →
            </Link>
          </p>
        </section>
      )}
      {raw.error && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-900 shadow-sm">
          {raw.error}
        </section>
      )}

      <SetupWizard />
    </div>
  )
}
