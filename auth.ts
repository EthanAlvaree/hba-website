import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { isAdmin, isAllowedAdminEmail, isHbaEmail } from "@/lib/admin"
import { bootstrapProfileForSignIn, getProfileByEmail } from "@/lib/sis"

function readClaim(profile: unknown, key: string): string | null {
  if (!profile || typeof profile !== "object") return null
  const value = (profile as Record<string, unknown>)[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    MicrosoftEntraID({
      // Reads from the SIS Auth app registration. Kept distinct from the
      // GRAPH_* vars which belong to the HBA Graph Mailer app (Mail.Send
      // application permission, single-tenant). Splitting the apps lets the
      // mailer stay single-tenant while sign-in is multi-tenant + personal
      // accounts.
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET,
      // /common accepts both organizational (Entra) accounts and personal
      // Microsoft accounts. The signIn callback gates who can actually
      // sign in. Default to /common if the env var is missing.
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "common"}/v2.0`,
    }),
  ],
  callbacks: {
    async signIn({ profile, user }) {
      const email =
        user.email ?? readClaim(profile, "email") ?? readClaim(profile, "preferred_username")

      if (!email) return false

      const allowed = await isSignInAllowed(email)
      if (!allowed) return false

      try {
        await bootstrapProfileForSignIn({
          email,
          entra_oid: readClaim(profile, "oid") ?? readClaim(profile, "sub"),
          display_name: user.name ?? readClaim(profile, "name"),
          first_name: readClaim(profile, "given_name"),
          last_name: readClaim(profile, "family_name"),
        })
      } catch (error) {
        // Don't block sign-in on a profile-bootstrap failure — log it and let
        // the user through. An admin can fix the row by hand if needed.
        console.error("Profile bootstrap failed during sign-in.", error)
      }

      return true
    },
    async jwt({ token, user, profile }) {
      const email =
        user?.email ??
        readClaim(profile, "email") ??
        readClaim(profile, "preferred_username") ??
        token.email

      token.email = email

      // Compute the expensive profile-aware admin check only at sign-in time
      // (when `user` is present). Subsequent requests read the cached flag
      // off the JWT. Bootstrap-list admins are recomputed on every refresh
      // since that's a cheap sync check — guarantees they never get locked
      // out of an old session even if their token was stale.
      if (user) {
        token.isAdmin = await isAdmin(email)
      } else if (isAllowedAdminEmail(email)) {
        token.isAdmin = true
      } else if (typeof token.isAdmin !== "boolean") {
        token.isAdmin = false
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email
      }

      session.isAdmin = token.isAdmin === true

      return session
    },
  },
  pages: {
    signIn: "/admin/sign-in",
  },
})

// Who can sign in:
//   - HBA-domain emails (existing behavior — admins, faculty, students)
//   - Any email that already has a profile in our DB with role 'parent'
//     (created by `enrollAcceptedApplication` from the application's guardian
//      email). Strangers with random Microsoft accounts can't sign in even
//      though /common accepts their tokens — the gate is here in our code.
async function isSignInAllowed(email: string): Promise<boolean> {
  if (isHbaEmail(email)) return true

  try {
    const profile = await getProfileByEmail(email)
    return profile !== null && profile.roles.includes("parent")
  } catch (error) {
    console.error("isSignInAllowed lookup failed", error)
    return false
  }
}