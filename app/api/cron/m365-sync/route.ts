// Nightly M365 → profiles sync. Scheduled in vercel.json. Vercel signs
// cron requests with `Authorization: Bearer $CRON_SECRET` (where CRON_SECRET
// is set in the Vercel project env). We reject anything that doesn't match.
//
// Same logic as the admin UI "Sync from M365" button (see
// app/admin/profiles/actions.ts → syncM365Action). Returns JSON for the
// cron logs.

import { NextResponse } from "next/server"
import { runM365Sync } from "@/lib/m365-sync"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  // Vercel cron auth: when the project has CRON_SECRET set, Vercel injects
  // `Authorization: Bearer <secret>` on the scheduled GET. We reject anything
  // else so this endpoint can't be hammered from the public internet.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured. Refusing to run." },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const result = await runM365Sync()

  if (!result.ok) {
    console.error(`M365 cron sync failed at ${result.step}: ${result.message}`)
    return NextResponse.json(result, { status: 500 })
  }

  console.log(
    `M365 cron sync ok: +${result.created} created, ${result.updated} updated, ${result.skipped} unchanged, ${result.filtered} filtered.`
  )
  return NextResponse.json(result)
}
