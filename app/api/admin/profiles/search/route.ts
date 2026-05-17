// Admin-only typeahead for the messaging composer's individual-
// recipients chip input. Search matches email, first_name, last_name,
// and display_name (case-insensitive contains). Capped at 8 results
// to keep the dropdown short.
//
// Auth: admin session required — these are SIS profiles, not public
// data, and we don't want this endpoint discoverable from outside
// the dashboard.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type Hit = {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  roles: string[]
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = (url.searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ ok: true, hits: [] })
  }

  const supabase = getServiceSupabase()
  // PostgREST's ilike OR over a few columns. The %term% pattern is
  // applied client-side because Supabase string templating leaves the
  // % alone and ilike needs them inline.
  const term = `%${q.replace(/[%_]/g, "\\$&")}%`
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, first_name, last_name, roles, active")
    .eq("active", true)
    .or(
      `email.ilike.${term},display_name.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`
    )
    .order("display_name", { ascending: true, nullsFirst: false })
    .limit(8)
    .returns<Array<Hit & { active: boolean }>>()

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    hits: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      first_name: row.first_name,
      last_name: row.last_name,
      roles: row.roles,
    })) satisfies Hit[],
  })
}
