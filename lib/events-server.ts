// lib/events-server.ts
// Server-only event loader. Reads content/events.json from disk.

import "server-only"
import fs from "fs"
import path from "path"
import { SchoolEvent } from "./events"

interface EventStore {
  events: SchoolEvent[]
}

export function getAllEvents(): SchoolEvent[] {
  const jsonPath = path.join(process.cwd(), "content", "events.json")
  const raw = fs.readFileSync(jsonPath, "utf8")
  const parsed: EventStore = JSON.parse(raw)
  return [...parsed.events].sort((a, b) => a.start.localeCompare(b.start))
}
