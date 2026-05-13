"use client"

import { useState } from "react"
import { createAnnouncementAction } from "@/app/faculty-portal/sections/[id]/announcements/actions"

// Common phrasings teachers reach for repeatedly. Each template lands
// in the title + body fields when clicked; the teacher edits in place.
// Placeholders use {curly} so the teacher's eye catches them and they
// don't accidentally send the literal "{date}" to a class.
const TEMPLATES: Array<{
  id: string
  label: string
  title: string
  body: string
  pinned?: boolean
}> = [
  {
    id: "test-moved",
    label: "Test/quiz moved",
    title: "Quiz moved to {new date}",
    body:
      "Heads up — the quiz originally scheduled for {original date} has been moved to {new date}. " +
      "Same material, same format. Bring a pencil and a calculator.",
  },
  {
    id: "permission-slip",
    label: "Permission slip due",
    title: "Permission slip due by {date}",
    body:
      "Reminder: the permission slip for {trip / event name} is due by {date}. " +
      "Please return it signed to the front office or directly to me. " +
      "Students without a slip on file can't attend.",
    pinned: true,
  },
  {
    id: "homework-reminder",
    label: "Homework reminder",
    title: "Homework reminder: {assignment}",
    body:
      "Just a reminder that {assignment} is due {date}. " +
      "Please submit through {how}. Reach out if you're stuck.",
  },
  {
    id: "assignment-rescheduled",
    label: "Assignment rescheduled",
    title: "{assignment} due date moved",
    body:
      "The due date for {assignment} has shifted from {old date} to {new date} to make room for {reason}. " +
      "No penalty — same expectations, just more breathing room.",
  },
  {
    id: "substitute",
    label: "Substitute teacher",
    title: "Substitute teacher on {date}",
    body:
      "I'll be out on {date}. {Sub name} will be covering class. " +
      "Please be respectful and complete {assignment / activity}. " +
      "Email me with any questions — I'll respond by end of day.",
  },
  {
    id: "class-canceled",
    label: "Class canceled",
    title: "Class canceled on {date}",
    body:
      "Class on {date} is canceled due to {reason}. " +
      "We'll pick up where we left off on {next class date}. " +
      "Use the time to {what to do meanwhile} if you can.",
    pinned: true,
  },
  {
    id: "makeup-session",
    label: "Extra help / make-up session",
    title: "Extra help session on {date}",
    body:
      "Offering an optional extra help session on {date} at {time} in {room}. " +
      "Bring questions about {topic}. Open to anyone who wants to come.",
  },
  {
    id: "welcome",
    label: "Welcome to the course",
    title: "Welcome to {course name}!",
    body:
      "Welcome to {course name}. I'm looking forward to a great term with you all. " +
      "A few quick things:\n\n" +
      "• Class meets {when}\n" +
      "• Materials needed: {list}\n" +
      "• Best way to reach me: {how}\n\n" +
      "Excited to get started.",
    pinned: true,
  },
]

export default function AnnouncementComposer({
  sectionId,
}: {
  sectionId: string
}) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)

  return (
    <form
      action={createAnnouncementAction}
      className="mt-4 space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <input type="hidden" name="section_id" value={sectionId} />

      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-700">
          Quick start (optional)
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setTitle(tpl.title)
                setBody(tpl.body)
                if (tpl.pinned !== undefined) setPinned(tpl.pinned)
              }}
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/20 bg-white px-3 py-1 text-[11px] font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              title={`Populate with the "${tpl.label}" template`}
            >
              {tpl.label}
            </button>
          ))}
          {(title || body) && (
            <button
              type="button"
              onClick={() => {
                setTitle("")
                setBody("")
                setPinned(false)
              }}
              className="inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600 underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Each template fills the title + body with placeholders in{" "}
          <code className="rounded bg-slate-200 px-1">{"{curly braces}"}</code>{" "}
          — edit those before posting.
        </p>
      </div>

      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Title</span>
        <input
          name="title"
          required
          maxLength={200}
          placeholder="Quiz moved to Friday"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Body</span>
        <textarea
          name="body"
          required
          rows={4}
          maxLength={8000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          name="pinned"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
        />
        <span>Pin to top</span>
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Post announcement
      </button>
    </form>
  )
}
