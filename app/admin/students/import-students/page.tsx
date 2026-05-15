import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ImportClient } from "./ImportClient"

export const dynamic = "force-dynamic"

export default async function ImportStudentsPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/students"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to students
        </Link>
        <h1 className="text-3xl font-extrabold text-brand-navy">Import students</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Bulk-create student records from a CSV. Use this for onboarding a
          new cohort or year-end roster updates. For attaching parents to
          existing students, use the separate{" "}
          <Link
            href="/admin/students/import-parents"
            className="font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            parent-link CSV importer
          </Link>
          .
        </p>
      </header>

      <ImportClient />
    </div>
  )
}
