import { auth } from "@/auth"
import { avatarForEmail } from "@/lib/profile-photos"
import { getServiceSupabase } from "@/lib/supabase-server"
import PortalShell, { type CrossPortalLink, type PortalNavItem } from "@/app/_components/PortalShell"

// Counts of items awaiting an admin response. Drives the alert badges
// on the admin nav. Best-effort — if either query fails we just don't
// show a badge rather than breaking the whole shell.
async function getAdminAlertCounts(): Promise<{
  applications: number
  contactSubmissions: number
}> {
  try {
    const supabase = getServiceSupabase()
    const [appsRes, contactsRes] = await Promise.all([
      // Applications sitting in 'submitted' — received but not yet triaged.
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      // Contact submissions still in 'new' — no one has responded yet.
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ])
    return {
      applications: appsRes.count ?? 0,
      contactSubmissions: contactsRes.count ?? 0,
    }
  } catch {
    return { applications: 0, contactSubmissions: 0 }
  }
}

function buildAdminNav(counts: {
  applications: number
  contactSubmissions: number
}): PortalNavItem[] {
  return [
    {
      id: "applications",
      label: "Applications",
      href: "/admin/applications",
      badge: counts.applications,
    },
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
      badge: counts.contactSubmissions,
    },
    { id: "messaging", label: "Messaging", href: "/admin/messaging" },
    { id: "reports", label: "Reports", href: "/admin/reports" },
    { id: "tools", label: "Tools", href: "/admin/tools" },
    { id: "orphans", label: "Orphans", href: "/admin/orphans" },
    { id: "audit-log", label: "Audit log", href: "/admin/audit-log" },
  ]
}

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

  const userEmail = session.user?.email ?? ""
  const [avatar, alertCounts] = await Promise.all([
    avatarForEmail(userEmail),
    getAdminAlertCounts(),
  ])

  return (
    <PortalShell
      audience="admin"
      userEmail={userEmail}
      userPhotoUrl={avatar.photoUrl}
      userInitials={avatar.initials}
      navSections={buildAdminNav(alertCounts)}
      crossPortalLinks={adminCrossPortal}
    >
      {children}
    </PortalShell>
  )
}
