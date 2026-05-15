import { redirect } from "next/navigation"
import { auth } from "@/auth"
import PortalShell, { type CrossPortalLink, type PortalNavItem } from "@/app/_components/PortalShell"
import { getProfileByEmail } from "@/lib/sis"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"

const facultyNav: PortalNavItem[] = [
  { id: "home", label: "My sections", href: "/faculty-portal" },
  { id: "schedule", label: "Weekly schedule", href: "/faculty-portal/schedule" },
  { id: "conferences", label: "Conferences", href: "/faculty-portal/conferences" },
  { id: "teaching", label: "Teaching profile", href: "/faculty-portal/teaching" },
]

export default async function FacultyPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  // Admins are allowed in (they can preview / oversee). Faculty pass through.
  // Everyone else gets routed to where they belong.
  const isFaculty = profile.roles.includes("faculty")
  const isAdmin = session.isAdmin === true

  if (!isFaculty && !isAdmin) {
    if (profile.roles.includes("student")) redirect("/portal")
    if (profile.roles.includes("parent")) redirect("/parent")
    redirect("/admin/sign-in")
  }

  const cross: CrossPortalLink[] = isAdmin
    ? [
        { label: "Admin dashboard", href: "/admin/applications" },
        { label: "Student portal", href: "/portal" },
        { label: "Parent portal", href: "/parent" },
      ]
    : []

  return (
    <PortalShell
      audience="faculty"
      userEmail={profile.email}
      userPhotoUrl={profilePhotoUrl(profile.photo_path)}
      userInitials={initialsFor({
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name,
        email: profile.email,
      })}
      navSections={facultyNav}
      crossPortalLinks={cross}
    >
      {children}
    </PortalShell>
  )
}
