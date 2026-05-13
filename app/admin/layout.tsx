import { auth } from "@/auth"
import PortalShell, { type CrossPortalLink, type PortalNavItem } from "@/app/_components/PortalShell"

const adminNav: PortalNavItem[] = [
  { id: "applications", label: "Applications", href: "/admin/applications" },
  { id: "students", label: "Students", href: "/admin/students" },
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
  { id: "profiles", label: "Profiles", href: "/admin/profiles" },
  {
    id: "contact-submissions",
    label: "Contact submissions",
    href: "/admin/contact-submissions",
  },
  { id: "messaging", label: "Messaging", href: "/admin/messaging" },
  { id: "reports", label: "Reports", href: "/admin/reports" },
  { id: "audit-log", label: "Audit log", href: "/admin/audit-log" },
]

const adminCrossPortal: CrossPortalLink[] = [
  { label: "Faculty portal", href: "/faculty-portal" },
  { label: "Student portal", href: "/portal" },
  { label: "Parent portal", href: "/parent" },
]

// Wraps every /admin/* route. If the user is a signed-in admin we render
// the shared portal shell with admin nav; otherwise we just pass through
// so /admin/sign-in renders bare and unauthenticated users hitting other
// /admin routes are redirected by each page's own auth check.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAdmin = session?.isAdmin === true

  if (!isAdmin) {
    return <>{children}</>
  }

  return (
    <PortalShell
      audience="admin"
      userEmail={session.user?.email ?? ""}
      navSections={adminNav}
      crossPortalLinks={adminCrossPortal}
    >
      {children}
    </PortalShell>
  )
}
