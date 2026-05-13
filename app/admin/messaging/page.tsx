import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { createClient } from "@supabase/supabase-js"
import { MessagingClient } from "./MessagingClient"

export const dynamic = "force-dynamic"

export default async function MessagingPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  // Build a section dropdown — current term only so the list is tractable.
  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: sections } = await supabase
    .from("course_sections")
    .select(
      `id, section_code,
       course:courses(code, name),
       term:terms!inner(is_current)`
    )
    .eq("term.is_current", true)
    .returns<
      Array<{
        id: string
        section_code: string | null
        course: { code: string; name: string } | null
        term: { is_current: boolean } | null
      }>
    >()

  const sectionOptions =
    (sections ?? [])
      .map((s) => ({
        id: s.id,
        label: `${s.course?.code ?? ""} — ${s.course?.name ?? "(deleted)"}${s.section_code ? ` · Sec ${s.section_code}` : ""}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">Messaging</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Send a single message to a cohort: parents in 11th grade, students
          in a particular section, or all active families. Two-step: pick a
          cohort, preview the recipient count, then compose and confirm.
        </p>
      </header>

      <MessagingClient sectionOptions={sectionOptions} />
    </div>
  )
}
