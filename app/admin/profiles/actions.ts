"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { runM365Sync } from "@/lib/m365-sync"
import {
  createStudentFromExistingProfile,
  deleteProfile,
  getProfileById,
  getStudentByProfileId,
  listStudentsLinkedToParent,
  profileActiveUpdateSchema,
  profileContactUpdateSchema,
  profileRoleSchema,
  profileRolesUpdateSchema,
  updateProfileActive,
  updateProfileContact,
  updateProfileRoles,
} from "@/lib/sis"
import { sendProfileUpdateRequestToParent } from "@/lib/graph"
import { z } from "zod"
import { seedTeacherQualificationsFromBios } from "@/lib/scheduler"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateProfiles() {
  revalidatePath("/admin/profiles")
}

// Read an optional redirectTo from the form; only honour it when it's a
// same-origin /admin path so we don't bounce off the dashboard.
function readSafeRedirect(formData: FormData): string | null {
  const raw = formData.get("redirectTo")
  if (typeof raw !== "string") return null
  if (!raw.startsWith("/admin/")) return null
  return raw
}

// One save for the whole profile card: roles (incl. admin) + the active
// flag, all in a single form. updateProfileRoles and updateProfileActive
// each keep their own last-admin guards, so the DB still refuses to leave
// zero active admins regardless of which field triggered it.
export async function saveProfileAction(formData: FormData) {
  const session = await assertAdmin()
  const redirectTo = readSafeRedirect(formData)

  const rawRoles = formData.getAll("roles").map(String)
  const parsedRoles: string[] = []
  for (const role of rawRoles) {
    const check = profileRoleSchema.safeParse(role)
    if (check.success) parsedRoles.push(check.data)
  }
  const dedup = Array.from(new Set(parsedRoles))

  const parsed = profileRolesUpdateSchema.safeParse({
    id: formData.get("id"),
    roles: dedup,
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Save failed."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  const activeParsed = profileActiveUpdateSchema.safeParse({
    id: parsed.data.id,
    active: formData.get("active") === "on",
  })
  if (!activeParsed.success) {
    const message = activeParsed.error.issues[0]?.message ?? "Save failed."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  // Snapshot the admin-role transition before we write — drives the audit
  // log entry and the self-demotion sign-out below.
  const target = await getProfileById(parsed.data.id)
  if (!target) {
    redirect(`/admin/profiles?error=${encodeURIComponent("Profile not found.")}`)
  }
  const wasAdmin = target.roles.includes("admin")
  const willBeAdmin = parsed.data.roles.includes("admin")
  const isSelf =
    !!session.user?.email &&
    target.email.toLowerCase() === session.user.email.toLowerCase()

  try {
    await updateProfileRoles(parsed.data)
    await updateProfileActive(activeParsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  if (wasAdmin !== willBeAdmin) {
    await logAdminAuditEvent({
      action: willBeAdmin
        ? ADMIN_AUDIT_ACTIONS.admin_promote
        : ADMIN_AUDIT_ACTIONS.admin_demote,
      target_kind: "profile",
      target_id: target.id,
      details: { target_email: target.email, self: isSelf },
    })
  }

  // Role-driven students row: if the profile now carries the student
  // role, make sure a students row exists. Don't auto-delete on un-set
  // — that's destructive (cascades to enrollments + parent links) and
  // is handled by the dedicated Withdraw workflow instead.
  let createdStudentId: string | null = null
  if (parsed.data.roles.includes("student")) {
    const existing = await getStudentByProfileId(parsed.data.id)
    if (!existing) {
      try {
        const student = await createStudentFromExistingProfile(parsed.data.id)
        createdStudentId = student.id
        await logAdminAuditEvent({
          action: ADMIN_AUDIT_ACTIONS.student_record_create_manual,
          target_kind: "student",
          target_id: student.id,
          details: {
            profile_id: parsed.data.id,
            trigger: "role_set",
          },
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Profile saved but couldn't create student record."
        redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
      }
    }
  }

  revalidateProfiles()
  revalidatePath("/admin/students")
  if (redirectTo) revalidatePath(redirectTo)

  if (wasAdmin && !willBeAdmin && isSelf) {
    // Self-demotion: sign out so the user doesn't keep a stale
    // session.isAdmin until their next JWT refresh.
    await signOut({ redirectTo: "/" })
  }

  if (createdStudentId) {
    if (redirectTo) {
      redirect(
        `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}student_created=${encodeURIComponent(createdStudentId)}`
      )
    }
    redirect(
      `/admin/profiles?student_created=${encodeURIComponent(createdStudentId)}`
    )
  }
  if (redirectTo) {
    redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}role_ok=1`
    )
  }
  redirect("/admin/profiles?role_ok=1")
}

export async function updateProfileContactAction(formData: FormData) {
  await assertAdmin()

  const parsed = profileContactUpdateSchema.safeParse({
    id: formData.get("id"),
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    display_name: formData.get("display_name") ?? "",
    personal_email: formData.get("personal_email") ?? "",
    mobile_phone: formData.get("mobile_phone") ?? "",
    work_phone: formData.get("work_phone") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    address_city: formData.get("address_city") ?? "",
    address_region: formData.get("address_region") ?? "",
    address_postal_code: formData.get("address_postal_code") ?? "",
    address_country: formData.get("address_country") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Contact update failed.")
  }

  await updateProfileContact(parsed.data)
  revalidateProfiles()

  // Re-render any student detail page that might show this parent profile,
  // too. We can't know which student(s) reference this profile without a
  // join — easier to revalidate the whole students directory.
  revalidatePath("/admin/students")

  const redirectTo = readSafeRedirect(formData)
  if (redirectTo) {
    revalidatePath(redirectTo)
    redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}contact_saved=1`
    )
  }
  redirect("/admin/profiles")
}

const requestProfileUpdateSchema = z.object({
  id: z.uuid(),
  note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
})

// Admin nudge to a parent: "please review your contact info + your
// student's demographics." Sends an email pointing at /parent/profile
// (which lists the parent's linked students). Used for bulk migration
// from legacy SIS data and for annual data-freshness sweeps.
export async function requestProfileUpdateFromFamilyAction(formData: FormData) {
  const session = await assertAdmin()
  const redirectTo = readSafeRedirect(formData)

  const parsed = requestProfileUpdateSchema.safeParse({
    id: formData.get("id"),
    note: formData.get("note") ?? "",
  })
  if (!parsed.success) {
    redirect(`/admin/profiles?error=${encodeURIComponent("Invalid request.")}`)
  }

  const profile = await getProfileById(parsed.data.id)
  if (!profile) {
    redirect(`/admin/profiles?error=${encodeURIComponent("Profile not found.")}`)
  }
  if (!profile.roles.includes("parent")) {
    redirect(
      `/admin/profiles?error=${encodeURIComponent("This profile isn't a parent — update requests only go to parent accounts.")}`
    )
  }

  const linked = await listStudentsLinkedToParent(profile.id)
  const studentNames = linked.map((l) => {
    return (
      l.preferred_name?.trim() ||
      `${l.legal_first_name} ${l.legal_last_name}`.trim()
    )
  })

  try {
    await sendProfileUpdateRequestToParent({
      parentEmail: profile.email,
      parentDisplayName:
        profile.display_name ??
        [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ??
        null,
      linkedStudentNames: studentNames,
      noteFromAdmin: parsed.data.note,
      actorEmail: session.user?.email ?? null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send update request."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.profile_update_request_sent,
    target_kind: "profile",
    target_id: profile.id,
    details: {
      to: profile.email,
      linked_students: studentNames,
      had_custom_note: parsed.data.note !== null,
    },
  })

  revalidateProfiles()
  if (redirectTo) {
    revalidatePath(redirectTo)
    redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}update_request_sent=${encodeURIComponent(profile.email)}`
    )
  }
  redirect(
    `/admin/profiles?update_request_sent=${encodeURIComponent(profile.email)}`
  )
}

export async function syncM365Action(formData: FormData) {
  await assertAdmin()
  const force = formData.get("force_photo_resync") === "1"

  const result = await runM365Sync({ forcePhotoResync: force })

  if (!result.ok) {
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.m365_sync_manual,
      target_kind: "m365_sync",
      details: { ok: false, step: result.step, message: result.message },
    })
    redirect(`/admin/tools?sync_error=${encodeURIComponent(result.message)}`)
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.m365_sync_manual,
    target_kind: "m365_sync",
    details: {
      ok: true,
      forced_photo_resync: force,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      filtered: result.filtered,
      photos_pulled: result.photos_pulled,
      photos_failed: result.photos_failed,
    },
  })

  revalidateProfiles()

  const params = new URLSearchParams({
    sync_ok: "1",
    created: String(result.created),
    updated: String(result.updated),
    skipped: String(result.skipped),
    filtered: String(result.filtered),
    photos_pulled: String(result.photos_pulled),
    photos_failed: String(result.photos_failed),
  })
  if (force) params.set("forced", "1")
  redirect(`/admin/tools?${params.toString()}`)
}

export async function seedQualificationsFromBiosAction() {
  await assertAdmin()

  let result
  try {
    result = await seedTeacherQualificationsFromBios()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bio seed failed"
    redirect(`/admin/tools?bio_seed_error=${encodeURIComponent(message)}`)
  }

  revalidateProfiles()

  const params = new URLSearchParams({
    bio_seed_ok: "1",
    bios_matched: String(result.bios_matched_to_profile),
    bios_total: String(result.bios_total),
    inserted: String(result.courses_inserted),
    existing: String(result.courses_skipped_existing),
    no_profile_count: String(result.bios_no_profile.length),
    no_course_count: String(result.courses_no_match.length),
    // Truncate the freetext arrays so URL doesn't explode on big mismatches.
    no_profile: result.bios_no_profile.slice(0, 8).join(", "),
    no_course: result.courses_no_match.slice(0, 12).join(" | "),
  })
  redirect(`/admin/tools?${params.toString()}`)
}

const deleteProfileSchema = z.object({ id: z.uuid() })

export async function deleteProfileAction(formData: FormData) {
  const session = await assertAdmin()
  const parsed = deleteProfileSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) redirect(`/admin/profiles?error=${encodeURIComponent("Invalid request.")}`)

  // Capture whether this is a self-delete BEFORE we destroy the row.
  const target = await getProfileById(parsed.data.id)
  const isSelf = Boolean(
    target && session.user?.email && target.email.toLowerCase() === session.user.email.toLowerCase()
  )

  try {
    await deleteProfile(parsed.data.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete profile."
    redirect(`/admin/profiles?error=${encodeURIComponent(message)}`)
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.profile_delete,
    target_kind: "profile",
    target_id: parsed.data.id,
    details: {
      target_email: target?.email ?? null,
      target_roles: target?.roles ?? [],
      self: isSelf,
    },
  })

  revalidateProfiles()

  if (isSelf) {
    // The admin just deleted their own profile. Sign them out so they don't
    // sit in a broken session pointing at a missing row.
    await signOut({ redirectTo: "/" })
  }
  redirect("/admin/profiles?deleted=1")
}

export async function signOutProfilesAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
