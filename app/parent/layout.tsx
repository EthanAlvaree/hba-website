import { redirect } from "next/navigation"
import { auth } from "@/auth"
import PortalShell, { type CrossPortalLink, type PortalNavItem } from "@/app/_components/PortalShell"
import { getProfileByEmail } from "@/lib/sis"
import { initialsFor, profilePhotoUrl } from "@/lib/profile-photos"

const parentNav: PortalNavItem[] = [
  { id: "home", label: "My children", href: "/parent" },
  { id: "profile", label: "My profile", href: "/parent/profile" },
  { id: "conferences", label: "Conferences", href: "/parent/conferences" },
]

export default async function ParentPortalLayout({
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

  const isParent = profile.roles.includes("parent")
  const isAdmin = session.isAdmin === true

  if (!isParent && !isAdmin) {
    if (profile.roles.includes("student")) redirect("/portal")
    if (profile.roles.includes("faculty")) redirect("/faculty-portal")
    redirect("/admin/sign-in")
  }

  const cross: CrossPortalLink[] = isAdmin
    ? [
        { label: "Admin dashboard", href: "/admin/applications" },
        { label: "Faculty portal", href: "/faculty-portal" },
        { label: "Student portal", href: "/portal" },
      ]
    : []

  return (
    <PortalShell
      audience="parent"
      userEmail={profile.email}
      userPhotoUrl={profilePhotoUrl(profile.photo_path)}
      userInitials={initialsFor({
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name,
        email: profile.email,
      })}
      navSections={parentNav}
      crossPortalLinks={cross}
    >
      {children}
    </PortalShell>
  )
}
