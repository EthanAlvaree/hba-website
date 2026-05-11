import { redirect } from "next/navigation"
import { auth, signIn } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"

export default async function AdminSignInPage() {
  const session = await auth()

  if (isAllowedAdminEmail(session?.user?.email)) {
    redirect("/admin/contact-submissions")
  }

  return (
    <main className="min-h-[70vh] bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Admin sign-in
        </p>
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
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-8 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Continue with Microsoft 365
          </button>
        </form>
      </div>
    </main>
  )
}