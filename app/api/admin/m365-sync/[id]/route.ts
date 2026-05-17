// Status endpoint for a single M365 sync run. The UI polls this
// every 2 seconds while a run is active to show progress.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getM365SyncRun } from "@/lib/m365-sync"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const run = await getM365SyncRun(id)
  if (!run) {
    return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, run })
}
