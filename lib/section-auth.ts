// Authorization helpers that gate access to a course section's data:
// grade entry, attendance, roster. The rule is "admin can do anything;
// faculty can only act on sections they teach." Used by server actions
// under both /admin/academics/sections/* and /faculty-portal/sections/*.

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getCourseSectionById, getProfileByEmail, type CourseSectionRecord } from "@/lib/sis"

export type SectionAuthorization = {
  /** Caller's email, lowercased. */
  email: string
  section: CourseSectionRecord
  /** True when the signed-in user is an admin (and may not be the section teacher). */
  isAdmin: boolean
  /** True when the signed-in user is the section's assigned teacher. */
  isTeacher: boolean
  /** The signed-in user's profile id, if we resolved one. */
  profileId: string | null
}

// Loads the section, then checks "admin OR teacher of this section."
// Redirects to sign-in if the user is anonymous and to the faculty portal
// home if they're authenticated but don't have permission for this section.
export async function assertCanEditSection(
  sectionId: string
): Promise<SectionAuthorization> {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const section = await getCourseSectionById(sectionId)
  if (!section) {
    redirect("/faculty-portal")
  }

  const isAdmin = session.isAdmin === true

  let profileId: string | null = null
  let isTeacher = false
  if (!isAdmin) {
    const profile = await getProfileByEmail(session.user.email)
    profileId = profile?.id ?? null
    isTeacher = Boolean(profile && section.teacher_profile_id === profile.id)
  } else {
    // Resolve admin's own profile.id (useful for "current user" UI hints) but
    // don't require it to exist — bootstrap admins might not have a row yet.
    const profile = await getProfileByEmail(session.user.email).catch(() => null)
    profileId = profile?.id ?? null
    // An admin who also happens to be the teacher of record is still admin
    // from an authz standpoint, but UI may want to know they teach it too.
    isTeacher = Boolean(profile && section.teacher_profile_id === profile.id)
  }

  if (!isAdmin && !isTeacher) {
    redirect("/faculty-portal")
  }

  return {
    email: session.user.email.toLowerCase(),
    section,
    isAdmin,
    isTeacher,
    profileId,
  }
}
