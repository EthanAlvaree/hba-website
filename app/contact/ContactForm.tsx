"use client"

import { useState } from "react"
import Script from "next/script"

declare global {
  interface Window {
    turnstile?: {
      reset: () => void
    }
  }
}

type SubmissionState =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; notificationDelivered: boolean }

const turnstileSiteKey =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : "1x00000000000000000000AA"

export default function ContactForm() {
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ type: "idle" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(() => Date.now().toString())

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setIsSubmitting(true)
    setSubmissionState({ type: "idle" })

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      })

      const result = (await response.json()) as {
        success: boolean
        error?: string
        notificationDelivered?: boolean
      }

      if (!response.ok || !result.success) {
        setSubmissionState({
          type: "error",
          message: result.error ?? "Something went wrong. Please try again.",
        })
        window.turnstile?.reset()
        return
      }

      form.reset()
      window.turnstile?.reset()
      setSubmittedAt(Date.now().toString())
      setSubmissionState({
        type: "success",
        notificationDelivered: result.notificationDelivered !== false,
      })
    } catch {
      setSubmissionState({
        type: "error",
        message: "Something went wrong. Please try again.",
      })
      window.turnstile?.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="space-y-2 text-left">
              <span className="block text-sm font-semibold text-slate-900">Parent/guardian name</span>
              <input
                required
                name="name"
                autoComplete="name"
                placeholder="Parent or guardian full name"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2 text-left">
              <span className="block text-sm font-semibold text-slate-900">Email</span>
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2 text-left">
              <span className="block text-sm font-semibold text-slate-900">Phone</span>
              <input
                required
                type="tel"
                name="phone"
                autoComplete="tel"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2 text-left">
              <span className="block text-sm font-semibold text-slate-900">Student name</span>
              <input
                required
                name="studentName"
                autoComplete="off"
                placeholder="Student full name"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>
          </div>

          <label className="space-y-2 text-left">
            <span className="block text-sm font-semibold text-slate-900">Message</span>
            <textarea
              required
              name="message"
              rows={6}
              className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </label>

          <label className="space-y-2 text-left">
            <span className="block text-sm font-semibold text-slate-900">How did you hear about us?</span>
            <input
              name="howDidYouHear"
              autoComplete="off"
              placeholder="Referral name, school, social post, Google search, etc."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </label>

          <fieldset className="space-y-3 text-left">
            <legend className="text-sm font-semibold text-slate-900">
              I would like to schedule a tour
            </legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-900">
                <input
                  required
                  type="radio"
                  name="scheduleTour"
                  value="yes"
                  className="h-4 w-4 border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-900">
                <input
                  required
                  type="radio"
                  name="scheduleTour"
                  value="no"
                  defaultChecked
                  className="h-4 w-4 border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                No
              </label>
            </div>
          </fieldset>

          <input type="hidden" name="submittedAt" value={submittedAt} />
          <label className="hidden" aria-hidden="true">
            Website
            <input name="website" autoComplete="off" tabIndex={-1} />
          </label>

          <div className="space-y-4">
            {turnstileSiteKey ? (
              <div
                className="cf-turnstile"
                data-sitekey={turnstileSiteKey}
                data-theme="light"
                data-size="flexible"
              />
            ) : (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Turnstile is not configured yet.
              </p>
            )}

            {submissionState.type === "error" && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submissionState.message}
              </p>
            )}

            {submissionState.type === "success" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">Thanks. Your message was sent.</p>
                <p className="mt-1">
                  We typically respond within one business day.
                  {!submissionState.notificationDelivered && " Your submission was saved even though the email alert was delayed."}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      </div>

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
    </>
  )
}