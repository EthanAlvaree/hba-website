import Link from "next/link"
import { getFacultyMembers } from "@/lib/faculty"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Email signatures",
}

export default async function EmailSignaturesIndexPage() {
  const faculty = await getFacultyMembers()
  const sorted = [...faculty].sort((a, b) => a.name.localeCompare(b.name))

  // Group leadership first for easy office discovery.
  const leadership = sorted.filter((f) => f.leadership)
  const rest = sorted.filter((f) => !f.leadership)

  return (
    <main className="bg-gray-50 min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            {siteConfig.shortName} Email Signatures
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Each signature renders the current SIS profile photo, which
            mirrors Microsoft 365. Update your photo once (in M365 or
            via the SIS admin upload) and every signature updates the
            next time it&rsquo;s opened in a mail client.
          </p>
        </header>

        {leadership.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
              Leadership
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {leadership.map((f) => (
                <SignatureLink key={f.slug} slug={f.slug} name={f.name} title={f.title} />
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            Faculty &amp; staff
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rest.map((f) => (
              <SignatureLink key={f.slug} slug={f.slug} name={f.name} title={f.title} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}

function SignatureLink({
  slug,
  name,
  title,
}: {
  slug: string
  name: string
  title: string
}) {
  return (
    <li>
      <Link
        href={`/email-signatures/${slug}`}
        className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md"
      >
        <p className="text-base font-semibold text-brand-navy">{name}</p>
        <p className="text-xs text-slate-600">{title}</p>
      </Link>
    </li>
  )
}
