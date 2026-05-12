"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import { persistDraft, solveScheduleForTerm } from "@/lib/scheduler-solver"
import { createClient } from "@supabase/supabase-js"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateScheduler() {
  revalidatePath("/admin/academics/scheduler")
}

const generateSchema = z.object({
  term_id: z.uuid(),
  min_section_size: z.coerce.number().int().min(1).max(50).optional().default(2),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})

export async function generateScheduleDraftAction(formData: FormData) {
  const session = await assertAdmin()

  const parsed = generateSchema.safeParse({
    term_id: formData.get("term_id"),
    min_section_size: formData.get("min_section_size") ?? 2,
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.")
  }

  let result
  try {
    result = await solveScheduleForTerm({
      term_id: parsed.data.term_id,
      min_section_size: parsed.data.min_section_size,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Solver failed"
    redirect(`/admin/academics/scheduler?solver_error=${encodeURIComponent(message)}`)
  }

  const persisted = await persistDraft({
    term_id: parsed.data.term_id,
    created_by: session?.user?.email ?? null,
    result,
    notes: parsed.data.notes,
  })

  revalidateScheduler()
  redirect(`/admin/academics/scheduler?draft_id=${persisted.id}`)
}

const draftStatusSchema = z.object({
  draft_id: z.uuid(),
  status: z.enum(["proposed", "reviewed", "committed", "discarded"]),
})

export async function setDraftStatusAction(formData: FormData) {
  await assertAdmin()
  const parsed = draftStatusSchema.safeParse({
    draft_id: formData.get("draft_id"),
    status: formData.get("status"),
  })
  if (!parsed.success) throw new Error("Invalid request.")

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabase
    .from("schedule_drafts")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.draft_id)

  if (error) throw new Error(`Failed to update draft status: ${error.message}`)

  revalidateScheduler()
  redirect(`/admin/academics/scheduler?draft_id=${parsed.data.draft_id}`)
}

export async function signOutSchedulerAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
