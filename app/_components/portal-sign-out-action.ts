"use server"

import { signOut } from "@/auth"

// Shared sign-out for the faculty/student/parent portals. Routes back to
// the unified sign-in page (which then redirects users to their correct
// portal next time they sign in).
export async function signOutPortalAction() {
  await signOut({ redirectTo: "/admin/sign-in" })
}
