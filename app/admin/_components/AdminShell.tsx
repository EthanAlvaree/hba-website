"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOutAdminGlobalAction } from "./sign-out-action"

type NavSection = {
  id: string
  label: string
  href: string
  // Optional sub-pages: if the current pathname matches one of these,
  // this section is considered active and the children get rendered as
  // a nested list below the section.
  children?: Array<{ id: string; label: string; href: string }>
}

const navSections: NavSection[] = [
  {
    id: "applications",
    label: "Applications",
    href: "/admin/applications",
  },
  {
    id: "students",
    label: "Students",
    href: "/admin/students",
  },
  {
    id: "academics",
    label: "Academics",
    href: "/admin/academics",
    children: [
      { id: "terms", label: "Terms", href: "/admin/academics/terms" },
      { id: "courses", label: "Courses", href: "/admin/academics/courses" },
      { id: "sections", label: "Sections", href: "/admin/academics/sections" },
      {
        id: "requirements",
        label: "Graduation reqs",
        href: "/admin/academics/requirements",
      },
      { id: "scheduler", label: "Scheduler", href: "/admin/academics/scheduler" },
    ],
  },
  {
    id: "profiles",
    label: "Profiles",
    href: "/admin/profiles",
  },
  {
    id: "contact-submissions",
    label: "Contact submissions",
    href: "/admin/contact-submissions",
  },
]

function isPathActive(pathname: string, href: string): boolean {
  // /admin/academics matches both /admin/academics and /admin/academics/terms,
  // but /admin/applications must NOT match /admin/applications-archive.
  if (pathname === href) return true
  return pathname.startsWith(href + "/")
}

export default function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ""

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-brand-navy text-white shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle — pure CSS hamburger using a checkbox */}
            <label
              htmlFor="admin-sidebar-toggle"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M3 5h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2z" />
              </svg>
            </label>

            <Link href="/admin/applications" className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight">HBA</span>
              <span className="hidden text-xs uppercase tracking-[0.18em] text-white/70 sm:inline">
                SIS
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/85 sm:inline">{adminEmail}</span>
            <form action={signOutAdminGlobalAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-brand-navy"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Hidden checkbox drives mobile sidebar open/close — pure CSS, no JS */}
      <input
        id="admin-sidebar-toggle"
        type="checkbox"
        className="peer hidden"
      />

      <div className="lg:flex">
        {/* Sidebar */}
        <nav
          className={`fixed inset-y-0 left-0 top-12 z-10 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 peer-checked:block lg:sticky lg:top-12 lg:block lg:h-[calc(100vh-3rem)] lg:shrink-0`}
          aria-label="Admin sections"
        >
          <ul className="space-y-1">
            {navSections.map((section) => {
              const sectionActive = isPathActive(pathname, section.href)
              return (
                <li key={section.id}>
                  <Link
                    href={section.href}
                    className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      sectionActive
                        ? "bg-brand-navy text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {section.label}
                  </Link>
                  {section.children && sectionActive && (
                    <ul className="mt-1 ml-3 space-y-0.5 border-l border-slate-200 pl-3">
                      {section.children.map((child) => {
                        const childActive = isPathActive(pathname, child.href)
                        return (
                          <li key={child.id}>
                            <Link
                              href={child.href}
                              className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                childActive
                                  ? "bg-brand-navy/10 text-brand-navy"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Other portals</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/faculty-portal" className="text-brand-navy underline-offset-4 hover:underline">
                  Faculty portal →
                </Link>
              </li>
              <li>
                <Link href="/portal" className="text-brand-navy underline-offset-4 hover:underline">
                  Student portal →
                </Link>
              </li>
              <li>
                <Link href="/parent" className="text-brand-navy underline-offset-4 hover:underline">
                  Parent portal →
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Backdrop on mobile when sidebar is open */}
        <label
          htmlFor="admin-sidebar-toggle"
          className="fixed inset-0 z-0 hidden bg-slate-900/40 peer-checked:block lg:hidden"
          aria-hidden
        />

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
