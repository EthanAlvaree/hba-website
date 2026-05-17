"use client"

// Client-side filter form for /admin/profiles. Lives next to the page so
// it can auto-submit on change (no "click Search" required) while still
// being server-driven via URL params — the server page reads page/sort/
// role/search/include_inactive from the URL and renders accordingly.
//
// Submits via router.push so the page does a streaming server render
// instead of a full reload. Search input debounces to ~300ms to avoid
// thrashing the DB while the admin is typing.

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import type { ProfileSort } from "@/lib/sis"

const SORT_OPTIONS: Array<{ value: ProfileSort; label: string }> = [
  { value: "name_asc", label: "Name A → Z" },
  { value: "name_desc", label: "Name Z → A" },
  { value: "recently_added", label: "Recently added" },
  { value: "recently_updated", label: "Recently updated" },
]

export function ProfileFiltersForm({
  defaultSearch,
  defaultIncludeInactive,
  defaultSort,
}: {
  defaultSearch: string
  defaultIncludeInactive: boolean
  defaultSort: ProfileSort
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(defaultSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-sync from URL when user navigates externally (e.g. clicking a tab).
  useEffect(() => {
    setSearch(searchParams.get("search") ?? "")
  }, [searchParams])

  function pushWithParam(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k)
      else params.set(k, v)
    }
    // Reset to page 1 whenever filters change.
    params.delete("page")
    const qs = params.toString()
    router.push(qs ? `/admin/profiles?${qs}` : "/admin/profiles")
  }

  function onSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushWithParam({ search: value })
    }, 300)
  }

  function onIncludeInactiveChange(checked: boolean) {
    pushWithParam({ include_inactive: checked ? "on" : null })
  }

  function onSortChange(sort: ProfileSort) {
    pushWithParam({ sort: sort === "name_asc" ? null : sort })
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Search</span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Email, first name, last name, or display name"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Sort by</span>
        <select
          value={defaultSort}
          onChange={(e) => onSortChange(e.target.value as ProfileSort)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={defaultIncludeInactive}
          onChange={(e) => onIncludeInactiveChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
        />
        <span>Include inactive</span>
      </label>
    </div>
  )
}
