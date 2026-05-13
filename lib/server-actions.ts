// lib/server-actions.ts
//
// DRY helpers for admin server actions. Every admin action repeats the
// same prelude: verify the caller is an admin, parse FormData through a
// Zod schema, run business logic, optionally write an audit row,
// revalidate some paths, and either redirect or return a discriminated
// result. These helpers collapse that prelude to one function call so
// each action focuses on the business logic only.
//
// Two variants because admin actions come in two flavors:
//
//   1. Form actions used inside `<form action={fn}>`. They redirect on
//      success and throw on failure (Next.js renders the error UI).
//      Use {@link withAdminFormAction}.
//
//   2. State actions used inside useActionState. They return a
//      discriminated `{ ok: true, ... } | { ok: false; error: string }`
//      result so the client can render inline feedback without throwing.
//      Use {@link withAdminStateAction}.

import "server-only"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { z } from "zod"
import { auth } from "@/auth"
import { logAdminAuditEvent } from "@/lib/audit"

export type AdminActionContext = {
  /** Email of the signed-in admin, lowercased. Empty string if missing
   *  (shouldn't happen if the assertAdmin gate is intact). */
  actorEmail: string
  /** Raw FormData — useful for actions that need fields the schema
   *  doesn't (e.g. File uploads, where Zod isn't a great fit). */
  formData: FormData
}

type AuditSpec = {
  action: string
  target_kind?: string | null
  target_id?: string | null
  details?: Record<string, unknown> | null
}

type RevalidateSpec = string | string[] | null | undefined

type CommonConfig<Schema extends z.ZodType, Input = z.infer<Schema>, Result = unknown> = {
  /** Zod schema validating the parsed FormData. */
  schema: Schema
  /** Optional audit-log entry written after the handler succeeds.
   *  Receives the parsed input and the handler's return value so
   *  target IDs / details can come from either side. */
  audit?: (input: Input, result: Result, ctx: AdminActionContext) => AuditSpec | null
  /** Optional list of revalidatePath() targets called after success. */
  revalidate?: (input: Input, result: Result) => RevalidateSpec
}

// Parse a FormData into a Record<string, unknown>. Mirrors the standard
// pattern of `Object.fromEntries(formData)` but unwraps single-value
// arrays the way most schemas expect.
function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key in out) {
      // Collect multi-values into an array (rare but supported).
      const prev = out[key]
      if (Array.isArray(prev)) prev.push(value)
      else out[key] = [prev, value]
    } else {
      out[key] = value
    }
  }
  return out
}

async function adminContext(formData: FormData): Promise<AdminActionContext> {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return {
    actorEmail: (session.user?.email ?? "").toLowerCase(),
    formData,
  }
}

function applyRevalidate(spec: RevalidateSpec): void {
  if (!spec) return
  if (typeof spec === "string") {
    revalidatePath(spec)
    return
  }
  for (const path of spec) revalidatePath(path)
}

// ============================================================================
// State action — for useActionState
// ============================================================================

/**
 * Build an admin action suitable for `useActionState`. The handler
 * returns a discriminated result; this wrapper additionally returns
 * `{ ok: false; error: string }` for the schema-validation case.
 *
 * @example
 *   export const updateAssignmentAction = withAdminStateAction({
 *     schema: assignmentUpdateSchema,
 *     audit: (input) => ({
 *       action: ADMIN_AUDIT_ACTIONS.gradebook_assignment_update,
 *       target_kind: "assignment",
 *       target_id: input.id,
 *     }),
 *     revalidate: (input) => [`/admin/.../sections/${input.section_id}/gradebook`],
 *     handler: async (input) => {
 *       await updateAssignment(input)
 *       return { ok: true }
 *     },
 *   })
 */
export function withAdminStateAction<
  Schema extends z.ZodType,
  Success extends { ok: true },
>(
  config: CommonConfig<Schema, z.infer<Schema>, Success> & {
    handler: (
      input: z.infer<Schema>,
      ctx: AdminActionContext
    ) => Promise<Success>
  }
): (
  prev: Success | { ok: false; error: string } | null,
  formData: FormData
) => Promise<Success | { ok: false; error: string }> {
  return async function action(_prev, formData) {
    const ctx = await adminContext(formData)

    const parsed = config.schema.safeParse(formDataToObject(formData))
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      }
    }

    let result: Success
    try {
      result = await config.handler(parsed.data, ctx)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed."
      return { ok: false as const, error: message }
    }

    if (config.audit) {
      const spec = config.audit(parsed.data, result, ctx)
      if (spec) {
        await logAdminAuditEvent({
          action: spec.action,
          target_kind: spec.target_kind ?? null,
          target_id: spec.target_id ?? null,
          details: spec.details ?? null,
        })
      }
    }

    applyRevalidate(config.revalidate?.(parsed.data, result))

    return result
  }
}

// ============================================================================
// Form action — for <form action={fn}> with redirect on success
// ============================================================================

/**
 * Build an admin action suitable for plain `<form action={fn}>` usage.
 * Throws on schema-validation failure (Next renders the error UI).
 * The handler decides whether to redirect; the wrapper handles audit
 * + revalidatePath after a successful return.
 */
export function withAdminFormAction<Schema extends z.ZodType>(
  config: CommonConfig<Schema, z.infer<Schema>, void> & {
    handler: (
      input: z.infer<Schema>,
      ctx: AdminActionContext
    ) => Promise<void>
    /** Path to redirect to after success. If omitted, no redirect is
     *  performed — the handler is expected to call redirect() itself. */
    redirectTo?: (input: z.infer<Schema>) => string
  }
): (formData: FormData) => Promise<void> {
  return async function action(formData) {
    const ctx = await adminContext(formData)

    const parsed = config.schema.safeParse(formDataToObject(formData))
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.")
    }

    await config.handler(parsed.data, ctx)

    if (config.audit) {
      const spec = config.audit(parsed.data, undefined, ctx)
      if (spec) {
        await logAdminAuditEvent({
          action: spec.action,
          target_kind: spec.target_kind ?? null,
          target_id: spec.target_id ?? null,
          details: spec.details ?? null,
        })
      }
    }

    applyRevalidate(config.revalidate?.(parsed.data, undefined))

    if (config.redirectTo) {
      redirect(config.redirectTo(parsed.data))
    }
  }
}
