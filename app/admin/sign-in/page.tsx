import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, signIn, signOut } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"

export default async function AdminSignInPage() {
  const session = await auth()
  const signedInEmail = session?.user?.email ?? null

  if (session?.isAdmin) {
    redirect("/admin/contact-submissions")
  }

  // For signed-in non-admins, route to whichever portal matches their role.
  // Faculty go to /faculty-portal, parents to /parent, students to /portal.
  // Anyone else gets the "signed in but admin-only" branch below.
  if (signedInEmail) {
    const profile = await getProfileByEmail(signedInEmail)
    if (profile?.roles.includes("faculty")) {
      redirect("/faculty-portal")
    }
    if (profile?.roles.includes("parent")) {
      redirect("/parent")
    }
    if (profile?.roles.includes("student")) {
      redirect("/portal")
    }
  }

  const isFacultySignedIn = Boolean(signedInEmail) && !session?.isAdmin

  return (
    <main className="min-h-[70vh] bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Admin sign-in
        </p>

        {isFacultySignedIn ? (
          <>
            <h1 className="mt-4 text-4xl font-extrabold text-brand-navy">
              You&rsquo;re signed in, but this dashboard is admin-only.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Signed in as <span className="font-semibold">{signedInEmail}</span>.
              The admin dashboard is limited to approved office accounts. If you
              should have access, ask the office to add your email to the admin
              allowlist.
            </p>

            <form
              className="mt-8"
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-4xl font-extrabold text-brand-navy">
              Sign in with your HBA Microsoft account.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              This dashboard is limited to approved school admin accounts.
            </p>

            <form
              className="mt-8"
              action={async () => {
                "use server"
                await signIn("microsoft-entra-id", {
                  redirectTo: "/admin/contact-submissions",
                })
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-8 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl active:translate-y-0 active:brightness-100"
              >
                Continue with Microsoft 365
              </button>
            </form>

            <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
              <p>
                New here?{" "}
                <Link
                  href="/welcome"
                  className="font-semibold text-brand-navy underline-offset-4 hover:underline"
                >
                  Start with the new-student account setup →
                </Link>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Walks you through your HBA email, installing Microsoft
                Authenticator, and getting the Microsoft 365 apps on your phone
                and computer. About 15 minutes.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
