import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { siteConfig } from "@/lib/site"
import BulkPhotoUploadClient from "./BulkPhotoUploadClient"

export const dynamic = "force-dynamic"

export default async function BulkPhotoUploadPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/profiles"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to profiles
        </Link>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          Bulk profile photo upload
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Drag a .zip of photos here at the start of the school year and
          they&rsquo;ll be matched to profiles by filename. Saves an hour
          of one-at-a-time uploading.
        </p>
      </header>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm space-y-4">
        <h2 className="text-lg font-extrabold text-brand-navy">How it works</h2>
        <ol className="ml-5 list-decimal space-y-2 text-sm text-slate-700">
          <li>
            Name each photo file with the person&rsquo;s school username
            (the part before the @). For example,{" "}
            <span className="font-mono font-semibold">jane.doe.27.jpg</span> for{" "}
            <span className="font-mono">
              jane.doe.27@{siteConfig.contact.emailDomain}
            </span>
            .
          </li>
          <li>
            Supported formats: JPEG, PNG, WebP, HEIC, HEIF. Up to 10 MB
            per photo. Each photo is automatically resized and re-encoded
            as WebP before storage.
          </li>
          <li>
            Zip them all into one file. macOS: select all → right-click →
            Compress. Windows: select all → right-click → Send to →
            Compressed folder. Zip cap: 50 MB.
          </li>
          <li>
            Upload below. The page shows a per-file result so you know
            which photos matched and which didn&rsquo;t.
          </li>
        </ol>
      </section>

      <BulkPhotoUploadClient />
    </div>
  )
}
