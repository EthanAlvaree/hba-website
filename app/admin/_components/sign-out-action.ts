"use server"

import { signOut } from "@/auth"

export async function signOutAdminGlobalAction() {
  await signOut({ redirectTo: "/admin/sign-in" })
}
