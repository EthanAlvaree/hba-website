"use client"

// Chip-input typeahead for the messaging composer's individual
// recipients. As the admin types, hits /api/admin/profiles/search
// (debounced 200ms) and renders the top matches in a dropdown.
// Clicking adds an emerald chip with the profile's name + email.
// Typing a raw email + Enter/comma also adds a chip even if no
// profile matches (so admins can paste prospect emails).
//
// The selected emails are serialised into a hidden <input
// name="extra_emails"> value as a newline-joined string — that's
// the same shape the messaging server actions read, so no action
// changes are needed.

import { useEffect, useRef, useState } from "react"

type Hit = {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  roles: string[]
}

function hitLabel(hit: Hit): string {
  const name =
    hit.display_name?.trim() ||
    [hit.first_name, hit.last_name].filter(Boolean).join(" ").trim()
  return name || hit.email
}

function roleSummary(hit: Hit): string {
  if (hit.roles.length === 0) return ""
  return hit.roles.join(" · ")
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RecipientChipInput({
  emails,
  labels,
  onChange,
}: {
  emails: string[]
  labels: Record<string, string>
  onChange: (emails: string[], labels: Record<string, string>) => void
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Debounced fetch as the admin types.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setHits([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/profiles/search?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" }
        )
        const json = (await res.json()) as { ok: boolean; hits?: Hit[] }
        if (json.ok && json.hits) {
          // Drop hits whose email is already selected.
          const filtered = json.hits.filter((h) => !emails.includes(h.email.toLowerCase()))
          setHits(filtered)
          setOpen(filtered.length > 0)
          setHighlight(0)
        }
      } catch {
        // Network hiccup — silently degrade to no-suggestions; admin can
        // still type a literal email + Enter.
        setHits([])
        setOpen(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, emails])

  function addEmail(email: string, label?: string) {
    const normalized = email.trim().toLowerCase()
    if (!normalized || emails.includes(normalized)) return
    const nextEmails = [...emails, normalized]
    const nextLabels = label ? { ...labels, [normalized]: label } : labels
    onChange(nextEmails, nextLabels)
    setQuery("")
    setHits([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeEmail(email: string) {
    const nextEmails = emails.filter((e) => e !== email)
    const nextLabels = { ...labels }
    delete nextLabels[email]
    onChange(nextEmails, nextLabels)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && open) {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, hits.length - 1))
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && hits[highlight]) {
        const hit = hits[highlight]
        addEmail(hit.email, hitLabel(hit))
      } else if (EMAIL_RX.test(query.trim())) {
        addEmail(query.trim())
      }
    } else if (e.key === ",") {
      e.preventDefault()
      if (EMAIL_RX.test(query.trim())) addEmail(query.trim())
    } else if (e.key === "Backspace" && query.length === 0 && emails.length > 0) {
      removeEmail(emails[emails.length - 1])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {emails.map((email) => {
            const label = labels[email]
            return (
              <span
                key={email}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
              >
                <span>
                  {label ? (
                    <>
                      {label}{" "}
                      <span className="font-mono text-[10px] font-normal text-emerald-700/70">
                        ({email})
                      </span>
                    </>
                  ) : (
                    <span className="font-mono">{email}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  aria-label={`Remove ${email}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-200/60"
                >
                  ×
                </button>
              </span>
            )
          })}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onFocus={() => {
              if (hits.length > 0) setOpen(true)
            }}
            placeholder={
              emails.length === 0
                ? "Start typing a name or email…"
                : "Add another…"
            }
            className="flex-1 min-w-[180px] border-0 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {open && hits.length > 0 && (
        <ul className="rounded-2xl border border-slate-200 bg-white shadow-md">
          {hits.map((hit, i) => (
            <li
              key={hit.id}
              onMouseDown={(e) => {
                e.preventDefault()
                addEmail(hit.email, hitLabel(hit))
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer rounded-2xl px-3 py-2 text-sm ${
                i === highlight ? "bg-slate-100" : ""
              }`}
            >
              <div className="font-semibold text-slate-900">{hitLabel(hit)}</div>
              <div className="text-xs text-slate-500">
                <span className="font-mono">{hit.email}</span>
                {roleSummary(hit) && (
                  <span className="ml-2 text-slate-400">· {roleSummary(hit)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-500">
        Type a name to find a profile. Press <kbd className="rounded bg-slate-100 px-1">Enter</kbd> or{" "}
        <kbd className="rounded bg-slate-100 px-1">,</kbd> to add the typed email
        even if no profile matches. Backspace removes the last chip.
      </p>
    </div>
  )
}
