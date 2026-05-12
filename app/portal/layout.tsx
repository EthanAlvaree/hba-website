import { redirect } from "next/navigation"
import { auth } from "@/auth"
import PortalShell, { type CrossPortalLink, type PortalNavItem } from "@/app/_components/PortalShell"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
  type StudentRecord,
} from "@/lib/sis"

export default async function StudentPortalLayout({
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

  const isStudent = profile.roles.includes("student")
  const isAdmin = session.isAdmin === true

  // Faculty and parents who somehow land on /portal get routed to their
  // own portals. Faculty bug-fix from the previous user report lives here.
  if (!isStudent && !isAdmin) {
    if (profile.roles.includes("faculty")) redirect("/faculty-portal")
    if (profile.roles.includes("parent")) redirect("/parent")
    redirect("/admin/sign-in")
  }

  // Determine which student's data we're rendering for. Students see their
  // own; admins see whoever is set in the page's preview state (the layout
  // doesn't read ?as= — the page does). We just configure the shell here.
  let studentForShell: StudentRecord | null = null
  if (isStudent) {
    const stub = await getStudentByProfileId(profile.id)
    if (stub) {
      studentForShell = await getStudentDetail(stub.id)
    }
  }

  const isFullTime = studentForShell?.enrollment_type === "full_time"

  const studentNav: PortalNavItem[] = [
    { id: "home", label: "My schedule", href: "/portal" },
    ...(isFullTime
      ? [{ id: "requests", label: "Course requests", href: "/portal/course-requests" }]
      : []),
    { id: "transcript", label: "Transcript", href: "/portal/transcript" },
  ]

  const cross: CrossPortalLink[] = isAdmin
    ? [
        { label: "Admin dashboard", href: "/admin/applications" },
        { label: "Faculty portal", href: "/faculty-portal" },
        { label: "Parent portal", href: "/parent" },
      ]
    : []

  return (
    <PortalShell
      audience="student"
      userEmail={profile.email}
      navSections={studentNav}
      crossPortalLinks={cross}
    >
      {children}
    </PortalShell>
  )
}
