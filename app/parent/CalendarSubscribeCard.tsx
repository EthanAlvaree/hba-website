"use client"

import { useEffect, useState } from "react"

// Lightweight client card that lets a parent copy or open a personal
// calendar subscription URL. The URL is built server-side and passed
// in as a prop; the client only handles the clipboard + "copied"
// confirmation.

export default function CalendarSubscribeCard({ icsUrl }: { icsUrl: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <h2 className="text-base font-extrabold text-brand-navy">
            Subscribe to your school calendar
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            School events plus any parent-teacher conferences booked for
            your students, in your phone or computer calendar. Copy the URL
            and paste into Outlook / Google Calendar / Apple Calendar →
            &ldquo;Add subscription&rdquo;.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(icsUrl)
                setCopied(true)
              } catch (err) {
                console.error("Copy failed:", err)
              }
            }}
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <a
            href={icsUrl}
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            title="Download the .ics file once"
          >
            Download .ics
          </a>
        </div>
      </div>
      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-brand-navy">
          Show the URL
        </summary>
        <p className="mt-2 break-all rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-700">
          {icsUrl}
        </p>
      </details>
    </section>
  )
}
