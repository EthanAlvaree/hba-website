// Dynamic email signature page. URL: /email-signatures/<faculty-slug>.
//
// Replaces the static public/email-signatures/signatures/<slug>.html
// files. The HTML is server-rendered from lib/faculty.ts + siteConfig
// and the photo URL points at /api/email-signatures/photo/<email>
// which always serves the current SIS photo. Net effect: the email
// signature is permanent (the URL doesn't change) but the rendered
// content (photo especially) stays in sync with what's in M365 / SIS.

import { notFound } from "next/navigation"
import Link from "next/link"
import { getFacultyBySlug } from "@/lib/faculty"
import { siteConfig } from "@/lib/site"
import SignatureTemplate from "@/components/email-signatures/SignatureTemplate"
import CopyHtmlButton from "./CopyHtmlButton"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const member = await getFacultyBySlug(slug)
  return {
    title: member ? `${member.name} — Email signature` : "Email signature",
  }
}

export default async function FacultySignaturePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const member = await getFacultyBySlug(slug)
  if (!member) notFound()

  // Derive email from the slug: first segment before the first hyphen,
  // lowercased, then `@<domain>`. Mirrors the convention used by
  // lib/scheduler.ts when it matches bios to profiles.
  const firstName = slug.split("-")[0]?.toLowerCase() ?? ""
  const email = `${firstName}@${siteConfig.contact.emailDomain}`

  return (
    <main className="bg-gray-50 min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/email-signatures"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← All signatures
          </Link>
          <CopyHtmlButton />
        </div>

        <h1 className="text-2xl font-extrabold text-brand-navy">
          {member.name} &mdash; email signature
        </h1>
        <p className="text-sm text-slate-600">
          This signature pulls{" "}
          <span className="font-mono text-xs">{email}</span>&rsquo;s current
          photo from the SIS automatically. To install in Outlook: click
          <strong> Copy HTML</strong> above, open Outlook → File → Options →
          Mail → Signatures, create a new signature, and paste with{" "}
          <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">
            Ctrl+V
          </kbd>
          .
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SignatureTemplate
            name={member.name}
            title={member.title}
            email={email}
          />
        </div>
      </div>
    </main>
  )
}
