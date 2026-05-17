// Live status page for one M365 sync run. The header is server-
// rendered with the latest snapshot; the SyncProgressClient below
// polls /api/admin/m365-sync/[id] every 2 seconds while the run is
// active so the progress bar + counters update in real time.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getM365SyncRun } from "@/lib/m365-sync"
import { SyncProgressClient } from "./SyncProgressClient"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function M365SyncRunPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const { id } = await params
  const initialRun = await getM365SyncRun(id)
  if (!initialRun) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tools"
          className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
        >
          ← Admin tools
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold text-brand-navy">
          M365 sync — {initialRun.id.slice(0, 8)}
        </h1>
        <p className="text-sm text-slate-600">
          Started by{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            {initialRun.started_by_email}
          </code>
          {initialRun.force_photo_resync && (
            <>
              {" "}
              · <strong>Force photo resync</strong>
            </>
          )}
        </p>
      </header>

      <SyncProgressClient initialRun={initialRun} />
    </div>
  )
}
