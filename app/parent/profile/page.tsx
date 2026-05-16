import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, listStudentsLinkedToParent } from "@/lib/sis"
import { updateOwnProfileAction } from "./actions"

export const dynamic = "force-dynamic"

export const metadata = { title: "My profile — HBA family portal" }

type PageProps = {
  searchParams: Promise<{ saved?: string }>
}

export default async function ParentOwnProfilePage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const raw = await searchParams
  const linked = await listStudentsLinkedToParent(profile.id)

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          My profile
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          Your contact information
        </h1>
        <p className="text-sm text-slate-600">
          We use this to reach you about school events, billing, and
          emergencies. Please keep it current — if you move or change
          phone numbers, update it here.
        </p>
      </header>

      {raw.saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Saved. Thanks for keeping your info up to date.
        </div>
      )}

      <form
        action={updateOwnProfileAction}
        className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Sign-in email
          </p>
          <p className="text-sm text-slate-800">{profile.email}</p>
          <p className="text-xs text-slate-500">
            Set by Microsoft; not editable from here.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">First name</span>
            <input
              name="first_name"
              defaultValue={profile.first_name ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Last name</span>
            <input
              name="last_name"
              defaultValue={profile.last_name ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
            <span className="block">Display name (optional)</span>
            <input
              name="display_name"
              defaultValue={profile.display_name ?? ""}
              placeholder="How you'd like to appear in directories"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Mobile phone</span>
            <input
              name="mobile_phone"
              type="tel"
              defaultValue={profile.mobile_phone ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Work phone</span>
            <input
              name="work_phone"
              type="tel"
              defaultValue={profile.work_phone ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
            <span className="block">Personal email (alternate)</span>
            <input
              name="personal_email"
              type="email"
              defaultValue={profile.personal_email ?? ""}
              placeholder="Optional secondary email"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Mailing address
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">Street address</span>
              <input
                name="address_line1"
                defaultValue={profile.address_line1 ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
              <span className="block">Apartment / suite (optional)</span>
              <input
                name="address_line2"
                defaultValue={profile.address_line2 ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">City</span>
              <input
                name="address_city"
                defaultValue={profile.address_city ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">State / region</span>
              <input
                name="address_region"
                defaultValue={profile.address_region ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Postal code</span>
              <input
                name="address_postal_code"
                defaultValue={profile.address_postal_code ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Country</span>
              <input
                name="address_country"
                defaultValue={profile.address_country ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save my info
        </button>
      </form>

      {linked.length > 0 && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Update your children&rsquo;s information
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            We also need accurate demographic and contact info for each
            student. Click any child below to review and update.
          </p>
          <ul className="mt-4 space-y-2">
            {linked.map((link) => {
              const display =
                link.preferred_name?.trim() ||
                `${link.legal_first_name} ${link.legal_last_name}`.trim()
              return (
                <li
                  key={link.student_id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
                >
                  <Link
                    href={`/parent/students/${link.student_id}/edit-info`}
                    className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
                  >
                    Update info for {display} →
                  </Link>
                  {link.relationship && (
                    <span className="text-xs text-slate-600">
                      ({link.relationship})
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
