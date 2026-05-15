"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Avatar from "@/components/ui/Avatar"
import { siteConfig } from "@/lib/site"
import { signOutPortalAction } from "./portal-sign-out-action"

export type PortalNavItem = {
  id: string
  label: string
  href: string
  children?: Array<{ id: string; label: string; href: string }>
  /** Optional count badge — e.g. number of applications awaiting
   *  triage. Rendered as a small pill on the right of the nav item.
   *  0 or undefined renders nothing. */
  badge?: number
}

export type PortalAudience = "admin" | "faculty" | "student" | "parent"

const audienceLabels: Record<PortalAudience, string> = {
  admin: "Admin",
  faculty: "Faculty portal",
  student: "Student portal",
  parent: "Family portal",
}

export type PreviewBanner = {
  // Friendly label shown in the banner: "Previewing as Anna Smith"
  asLabel: string
  // Where to return after the preview is done.
  returnHref: string
}

export type CrossPortalLink = {
  label: string
  href: string
}

function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  return pathname.startsWith(href + "/")
}

export default function PortalShell({
  audience,
  userEmail,
  userPhotoUrl,
  userInitials,
  navSections,
  crossPortalLinks,
  preview,
  children,
}: {
  audience: PortalAudience
  userEmail: string
  /** Optional: signed-in user's profile photo URL. Renders an Avatar
   *  in the header. Pass null if the user has no photo set. */
  userPhotoUrl?: string | null
  /** Initials fallback when no photo is set. */
  userInitials?: string
  navSections: PortalNavItem[]
  // Links shown in a small "Other portals" footer of the sidebar. Admins
  // typically get all three other portals; faculty/parents/students typically
  // get nothing or just "Back to admin" if they're also an admin.
  crossPortalLinks?: CrossPortalLink[]
  // When an admin is viewing a non-admin portal as another user, show the
  // banner so the admin doesn't forget they're impersonating.
  preview?: PreviewBanner
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ""

  return (
    <div className="min-h-screen bg-slate-100">
      {preview && (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900 sm:px-6">
          Previewing as <strong>{preview.asLabel}</strong> ·{" "}
          <Link href={preview.returnHref} className="underline-offset-4 hover:underline">
            Return to admin
          </Link>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-brand-navy text-white shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <label
              htmlFor="portal-sidebar-toggle"
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

            <Link href={navSections[0]?.href ?? "/"} className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight">{siteConfig.shortName}</span>
              <span className="hidden text-xs uppercase tracking-[0.18em] text-white/70 sm:inline">
                {audienceLabels[audience]}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {(userPhotoUrl || userInitials) && (
              <Avatar
                photoUrl={userPhotoUrl ?? null}
                initials={userInitials ?? ""}
                alt={userEmail}
                size="sm"
              />
            )}
            <span className="hidden text-xs text-white/85 sm:inline">{userEmail}</span>
            <form action={signOutPortalAction}>
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

      <input id="portal-sidebar-toggle" type="checkbox" className="peer hidden" />

      <div className="lg:flex">
        <nav
          className="fixed inset-y-0 left-0 top-12 z-10 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 peer-checked:block lg:sticky lg:top-12 lg:block lg:h-[calc(100vh-3rem)] lg:shrink-0"
          aria-label={`${audienceLabels[audience]} sections`}
        >
          <ul className="space-y-1">
            {navSections.map((section) => {
              const sectionActive = isPathActive(pathname, section.href)
              return (
                <li key={section.id}>
                  <Link
                    href={section.href}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      sectionActive
                        ? "bg-brand-navy text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{section.label}</span>
                    {typeof section.badge === "number" && section.badge > 0 && (
                      <span
                        className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                          sectionActive
                            ? "bg-white text-brand-navy"
                            : "bg-brand-orange text-white"
                        }`}
                        aria-label={`${section.badge} need attention`}
                      >
                        {section.badge > 99 ? "99+" : section.badge}
                      </span>
                    )}
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

          {crossPortalLinks && crossPortalLinks.length > 0 && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Other portals</p>
              <ul className="mt-2 space-y-1">
                {crossPortalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-brand-navy underline-offset-4 hover:underline"
                    >
                      {link.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <label
          htmlFor="portal-sidebar-toggle"
          className="fixed inset-0 z-0 hidden bg-slate-900/40 peer-checked:block lg:hidden"
          aria-hidden
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
