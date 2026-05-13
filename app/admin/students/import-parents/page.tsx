import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ImportClient } from "./ImportClient"

export const dynamic = "force-dynamic"

export default async function ImportParentsPage() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/students"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to students
        </Link>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          Import parent links
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Bulk-attach parents to existing students via CSV. Useful for
          onboarding a new cohort, importing legacy GradeLink data, or
          assigning homestay hosts in batch.
        </p>
      </header>

      <ImportClient />
    </div>
  )
}
