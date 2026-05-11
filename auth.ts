import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { isAllowedAdminEmail } from "@/lib/admin"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.GRAPH_CLIENT_ID,
      clientSecret: process.env.GRAPH_CLIENT_SECRET,
      issuer: process.env.GRAPH_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/v2.0`
        : undefined,
    }),
  ],
  callbacks: {
    signIn({ profile, user }) {
      const email = user.email ?? profile?.email ?? profile?.preferred_username

      return isAllowedAdminEmail(email)
    },
    async jwt({ token, user, profile }) {
      const email = user?.email ?? profile?.email ?? profile?.preferred_username ?? token.email

      token.email = email
      token.isAdmin = isAllowedAdminEmail(email)

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