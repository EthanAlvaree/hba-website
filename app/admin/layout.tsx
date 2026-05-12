import { auth } from "@/auth"
import AdminShell from "./_components/AdminShell"

// Wraps every /admin/* route. If the user is a signed-in admin we render
// the shared sidebar + top-bar shell; otherwise we just pass through so
// /admin/sign-in renders bare and unauthenticated users hitting other
// /admin routes are redirected by each page's own auth check.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAdmin = session?.isAdmin === true
  const adminEmail = session?.user?.email ?? ""

  if (!isAdmin) {
    return <>{children}</>
  }

  return <AdminShell adminEmail={adminEmail}>{children}</AdminShell>
}
