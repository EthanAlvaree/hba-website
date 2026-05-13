// Shared empty state for portal pages that need a students row but the
// signed-in profile doesn't have one yet. Bare-profile scenario: M365
// sync created the profile + the office promoted them to role 'student',
// but the enrollment workflow that creates the students row hasn't run.
//
// Used by /portal, /portal/schedule, /portal/transcript so all three
// fail the same way (gentle "contact the office" — not 404, not a
// redirect to the marketing site).

import Link from "next/link"
import { siteConfig } from "@/lib/site"

export default function NoStudentRecord({
  title = "Your student record isn’t set up yet",
}: {
  title?: string
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          You can sign in (so you&rsquo;re seeing this page), but no
          student record has been linked to your account yet. The office
          finishes that step as part of enrollment. If you think it
          should be done already, drop them a line and they&rsquo;ll
          sort it out.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`mailto:${siteConfig.contact.infoEmail}`}
          className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Email the office
        </Link>
        <Link
          href={`tel:${siteConfig.contact.phoneTel}`}
          className="inline-flex items-center justify-center rounded-full border border-brand-navy text-brand-navy px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-navy hover:text-white"
        >
          Call {siteConfig.contact.phone}
        </Link>
      </div>
    </div>
  )
}
