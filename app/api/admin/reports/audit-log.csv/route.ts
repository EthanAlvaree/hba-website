// CSV export of the admin audit log. Carries the same filters as
// /admin/audit-log so "what you see is what you download" — useful for
// "what happened in Q3?" or "list every grade change by Mrs. X this
// year" questions. Limit is bumped to 10k rows for export.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { csvResponse, csvRows } from "@/lib/csv"
import { listAdminAuditEvents } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.isAdmin) return new NextResponse("Unauthorized", { status: 401 })

  const url = new URL(request.url)
  const events = await listAdminAuditEvents({
    action: url.searchParams.get("action") ?? undefined,
    actor_email: url.searchParams.get("actor") ?? undefined,
    target_kind: url.searchParams.get("target_kind") ?? undefined,
    target_id: url.searchParams.get("target_id") ?? undefined,
    date_from: url.searchParams.get("date_from") ?? undefined,
    date_to: url.searchParams.get("date_to") ?? undefined,
    limit: 10_000,
  })

  const csv = csvRows(
    [
      "created_at_utc",
      "actor_email",
      "action",
      "target_kind",
      "target_id",
      "ip",
      "user_agent",
      "details_json",
    ],
    events.map((e) => [
      e.created_at,
      e.actor_email,
      e.action,
      e.target_kind ?? "",
      e.target_id ?? "",
      e.ip ?? "",
      e.user_agent ?? "",
      e.details ? JSON.stringify(e.details) : "",
    ])
  )

  // Date-stamp the filename so repeated exports don't overwrite each other
  // in the user's Downloads folder.
  const stamp = new Date().toISOString().slice(0, 10)
  return csvResponse(csv, `audit-log-${stamp}.csv`)
}
