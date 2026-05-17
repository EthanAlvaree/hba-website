// Renders the student welcome email in an iframe so admin can preview
// it without sending. Sample data — real values are filled in by the
// send script at delivery time.

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { buildStudentWelcomeEmail } from "@/lib/student-welcome-email"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    greeting_name?: string
    legal_full_name?: string
    upn?: string
    temp_password?: string
  }>
}

export default async function WelcomeEmailPreviewPage({
  searchParams,
}: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const params = await searchParams
  const sample = buildStudentWelcomeEmail({
    greeting_name: params.greeting_name ?? "Audrey",
    legal_full_name: params.legal_full_name ?? "Brennan, Audrey J.",
    upn: params.upn ?? "audrey.brennan.28@highbluffacademy.com",
    temp_password: params.temp_password ?? "Hg7$xK9pLnW4qZ2!",
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          Welcome email preview
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          This is what every newly-provisioned Gradelink student will receive
          when we send welcome emails. Sample data shown — names + credentials
          come from <code className="text-xs">.gradelink-m365-credentials.json</code>{" "}
          at send time. Edit URL params <code className="text-xs">?greeting_name=…&amp;upn=…</code>{" "}
          to test other values.
        </p>
      </header>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Subject
        </p>
        <p className="mt-2 text-base text-slate-900">{sample.subject}</p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm">
        <iframe
          srcDoc={sample.html}
          title="Welcome email preview"
          className="h-[1400px] w-full rounded-[1.75rem] border-0"
          sandbox="allow-same-origin"
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Raw HTML
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-brand-navy hover:underline">
            View source
          </summary>
          <pre className="mt-3 max-h-[400px] overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
            {sample.html}
          </pre>
        </details>
      </section>
    </div>
  )
}
