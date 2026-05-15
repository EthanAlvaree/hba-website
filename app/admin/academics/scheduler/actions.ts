"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import {
  commitDraftToSis,
  moveDraftAssignment,
  persistDraft,
  solveScheduleForTerm,
  updateDraftSection,
} from "@/lib/scheduler-solver"
import { sectionPeriodSchema, sectionModalitySchema } from "@/lib/sis"
import { createClient } from "@supabase/supabase-js"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env"

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

// ============================================================================
// What-if explorer — generate a draft with constraints loosened
// ============================================================================

const whatIfSchema = z.object({
  term_id: z.uuid(),
  min_section_size: z.coerce.number().int().min(1).max(50).optional().default(2),
  ignore_teacher_unavailability: z.array(z.uuid()).default([]),
  ignore_student_unavailability: z.array(z.uuid()).default([]),
  relax_workload_caps: z.boolean().default(false),
})

export async function generateWhatIfDraftAction(formData: FormData) {
  const session = await assertAdmin()

  const parsed = whatIfSchema.safeParse({
    term_id: formData.get("term_id"),
    min_section_size: formData.get("min_section_size") ?? 2,
    ignore_teacher_unavailability: formData
      .getAll("ignore_teacher_unavailability")
      .map(String),
    ignore_student_unavailability: formData
      .getAll("ignore_student_unavailability")
      .map(String),
    relax_workload_caps: formData.get("relax_workload_caps") === "on",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.")
  }

  let result
  try {
    result = await solveScheduleForTerm({
      term_id: parsed.data.term_id,
      min_section_size: parsed.data.min_section_size,
      ignore_teacher_unavailability: parsed.data.ignore_teacher_unavailability,
      ignore_student_unavailability: parsed.data.ignore_student_unavailability,
      relax_workload_caps: parsed.data.relax_workload_caps,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Solver failed"
    redirect(
      `/admin/academics/scheduler/what-if?term_id=${parsed.data.term_id}&solver_error=${encodeURIComponent(message)}`
    )
  }

  // Build a human-readable note describing exactly what was loosened,
  // so the draft is self-documenting in the list + compare views.
  const tweaks: string[] = []
  if (parsed.data.min_section_size !== 2) {
    tweaks.push(`min section size = ${parsed.data.min_section_size}`)
  }
  if (parsed.data.ignore_teacher_unavailability.length > 0) {
    tweaks.push(
      `ignored ${parsed.data.ignore_teacher_unavailability.length} teacher availability constraint(s)`
    )
  }
  if (parsed.data.ignore_student_unavailability.length > 0) {
    tweaks.push(
      `ignored ${parsed.data.ignore_student_unavailability.length} student availability constraint(s)`
    )
  }
  if (parsed.data.relax_workload_caps) {
    tweaks.push("relaxed all teacher workload caps")
  }
  const notes =
    tweaks.length > 0
      ? `What-if draft — ${tweaks.join("; ")}.`
      : "What-if draft — no constraints loosened (baseline)."

  const persisted = await persistDraft({
    term_id: parsed.data.term_id,
    created_by: session?.user?.email ?? null,
    result,
    notes,
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
    getSupabaseUrl()!,
    getSupabaseServiceRoleKey()!,
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

// ============================================================================
// Draft annotations — admin notes on "why we chose this draft"
// ============================================================================

const draftNotesSchema = z.object({
  draft_id: z.uuid(),
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})

export async function updateDraftNotesAction(formData: FormData) {
  await assertAdmin()
  const parsed = draftNotesSchema.safeParse({
    draft_id: formData.get("draft_id"),
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.")
  }

  const supabase = createClient(
    getSupabaseUrl()!,
    getSupabaseServiceRoleKey()!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabase
    .from("schedule_drafts")
    .update({ notes: parsed.data.notes })
    .eq("id", parsed.data.draft_id)

  if (error) throw new Error(`Failed to save draft notes: ${error.message}`)

  revalidateScheduler()
  redirect(
    `/admin/academics/scheduler?draft_id=${parsed.data.draft_id}&notes_saved=1`
  )
}

// ============================================================================
// Commit draft → SIS
// ============================================================================

const commitDraftSchema = z.object({ draft_id: z.uuid() })

export async function commitDraftAction(formData: FormData) {
  await assertAdmin()
  const parsed = commitDraftSchema.safeParse({ draft_id: formData.get("draft_id") })
  if (!parsed.success) throw new Error("Invalid request.")

  try {
    const result = await commitDraftToSis(parsed.data)
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.schedule_draft_commit,
      target_kind: "schedule_draft",
      target_id: parsed.data.draft_id,
      details: {
        sections_created: result.sections_created,
        enrollments_created: result.enrollments_created,
        warnings: result.warnings,
      },
    })
    revalidateScheduler()
    revalidatePath("/admin/academics/sections")
    redirect(
      `/admin/academics/scheduler?draft_id=${parsed.data.draft_id}&committed=${result.sections_created}_${result.enrollments_created}`
    )
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }
    const message = error instanceof Error ? error.message : "Commit failed"
    redirect(
      `/admin/academics/scheduler?draft_id=${parsed.data.draft_id}&commit_error=${encodeURIComponent(message)}`
    )
  }
}

// ============================================================================
// Edit a draft section (teacher / period / room / etc.)
// ============================================================================

const updateDraftSectionSchema = z.object({
  draft_id: z.uuid(),
  draft_section_id: z.uuid(),
  teacher_profile_id: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  period: z
    .union([sectionPeriodSchema, z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  section_code: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  room: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  max_enrollment: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .optional()
    .transform((value) =>
      value === "" || value === null || value === undefined ? null : value
    ),
  modality: sectionModalitySchema.default("in_person"),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
})

export async function updateDraftSectionAction(formData: FormData) {
  await assertAdmin()

  const parsed = updateDraftSectionSchema.safeParse({
    draft_id: formData.get("draft_id"),
    draft_section_id: formData.get("draft_section_id"),
    teacher_profile_id: formData.get("teacher_profile_id") ?? "",
    period: formData.get("period") ?? "",
    section_code: formData.get("section_code") ?? "",
    room: formData.get("room") ?? "",
    max_enrollment: formData.get("max_enrollment") ?? "",
    modality: formData.get("modality") ?? "in_person",
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Update failed.")
  }

  await updateDraftSection({
    draft_section_id: parsed.data.draft_section_id,
    teacher_profile_id: parsed.data.teacher_profile_id,
    period: parsed.data.period,
    section_code: parsed.data.section_code,
    room: parsed.data.room,
    max_enrollment: parsed.data.max_enrollment,
    modality: parsed.data.modality,
    notes: parsed.data.notes,
  })

  revalidateScheduler()
  redirect(
    `/admin/academics/scheduler?draft_id=${parsed.data.draft_id}&section_saved=1`
  )
}

// ============================================================================
// Move a student assignment between draft sections (drag/drop on the board)
// ============================================================================

const moveAssignmentSchema = z.object({
  draft_id: z.uuid(),
  assignment_id: z.uuid(),
  target_section_id: z.uuid(),
})

// Returns a structured result instead of redirecting so the client component
// can show inline feedback (toast) without a full navigation. Errors come
// back as { ok: false, error: "..." } — no exceptions thrown to the client.
export async function moveDraftAssignmentAction(input: {
  draft_id: string
  assignment_id: string
  target_section_id: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertAdmin()

  const parsed = moveAssignmentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }
  }

  try {
    await moveDraftAssignment({
      assignment_id: parsed.data.assignment_id,
      target_section_id: parsed.data.target_section_id,
    })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Move failed." }
  }

  revalidateScheduler()
  return { ok: true }
}

export async function signOutSchedulerAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
