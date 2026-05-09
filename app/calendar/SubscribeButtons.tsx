// app/calendar/SubscribeButtons.tsx
"use client"

import { useState } from "react"
import { SITE_URL, siteConfig } from "@/lib/site"

const ICS_PATH = "/calendar.ics"

export default function SubscribeButtons() {
  const httpsUrl = `${SITE_URL}${ICS_PATH}`
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:")

  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    httpsUrl,
  )}`
  const outlookUrl = `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(
    httpsUrl,
  )}&name=${encodeURIComponent(siteConfig.name)}`

  const [copied, setCopied] = useState(false)

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignored — fall back to manual copy
    }
  }

  return (
    <section className="py-24 bg-brand-navy">
      <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 space-y-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
            Stay in sync
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            Subscribe to the live calendar.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light">
            One tap and the HBA calendar lives in your phone. When we update it,
            your calendar updates automatically — no app, no logins.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <a
            href={webcalUrl}
            className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white hover:bg-white hover:text-brand-navy transition-colors flex flex-col gap-2 shadow-2xl"
          >
            <div className="text-[10px] font-bold tracking-widest uppercase opacity-80">
              iPhone, iPad, Mac
            </div>
            <div className="text-xl font-extrabold">Apple Calendar</div>
            <div className="text-sm opacity-80 group-hover:opacity-100">
              Opens in the Calendar app on iOS and macOS.
            </div>
          </a>

          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white hover:bg-white hover:text-brand-navy transition-colors flex flex-col gap-2 shadow-2xl"
          >
            <div className="text-[10px] font-bold tracking-widest uppercase opacity-80">
              Android &amp; web
            </div>
            <div className="text-xl font-extrabold">Google Calendar</div>
            <div className="text-sm opacity-80 group-hover:opacity-100">
              Adds the feed under “Other calendars.”
            </div>
          </a>

          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white hover:bg-white hover:text-brand-navy transition-colors flex flex-col gap-2 shadow-2xl"
          >
            <div className="text-[10px] font-bold tracking-widest uppercase opacity-80">
              Microsoft 365
            </div>
            <div className="text-xl font-extrabold">Outlook</div>
            <div className="text-sm opacity-80 group-hover:opacity-100">
              Adds the feed via “Subscribe from web.”
            </div>
          </a>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-wrap items-center gap-4 justify-between">
          <div className="space-y-1 min-w-0">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/70">
              Or copy the feed URL
            </div>
            <code className="text-sm text-white/95 break-all font-mono">
              {httpsUrl}
            </code>
          </div>
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-white font-semibold text-xs shadow-lg hover:brightness-110 transition shrink-0"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
        </div>
      </div>
    </section>
  )
}
