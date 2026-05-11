import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

export const contactSubmissionStatusSchema = z.enum([
  "new",
  "contacted",
  "follow_up",
  "tour_scheduled",
  "tour_completed",
  "archived",
])

export const contactSubmissionWorkflowStatusSchema = z.enum([
  "new",
  "follow_up",
  "tour_scheduled",
  "tour_completed",
  "archived",
])

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Please enter a parent or guardian name.").max(120),
  email: z.email("Please enter a valid email address.").max(320),
  phone: z.string().trim().min(7, "Please enter a phone number.").max(40),
  studentName: z
    .string()
    .trim()
    .min(2, "Please enter the student’s name.")
    .max(120),
  message: z.string().trim().min(10, "Please share a short message.").max(4000),
  scheduleTour: z.enum(["yes", "no"]),
  howDidYouHear: z.string().trim().max(200).optional().catch(""),
})

export const contactSubmissionRequestSchema = contactSubmissionSchema.extend({
  submittedAt: z.string().trim(),
  turnstileToken: z.string().trim().min(1, "Please complete the spam check."),
})

export const contactSubmissionUpdateSchema = z.object({
  id: z.string().trim().min(1),
  status: contactSubmissionWorkflowStatusSchema,
  notes: z.string().trim().max(4000),
})

export const contactSubmissionDeleteSchema = z.object({
  id: z.string().trim().min(1),
})

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>
export type ContactSubmissionRequest = z.infer<typeof contactSubmissionRequestSchema>
export type ContactSubmissionStatus = z.infer<typeof contactSubmissionStatusSchema>
export type ContactSubmissionWorkflowStatus = z.infer<
  typeof contactSubmissionWorkflowStatusSchema
>
export type ContactSubmissionUpdate = z.infer<typeof contactSubmissionUpdateSchema>
export type ContactSubmissionDelete = z.infer<typeof contactSubmissionDeleteSchema>

export type ContactSubmissionRecord = {
  id: string
  created_at: string
  name: string
  email: string
  phone: string
  student_name: string
  message: string
  schedule_tour: boolean
  how_did_you_hear: string | null
  status: ContactSubmissionStatus
  assigned_to: string | null
  notes: string | null
  source: string
  spam_provider: string
  spam_verified: boolean
  archived_at: string | null
}

export type ContactSubmissionSummary = {
  activeCount: number
  needsResponseCount: number
  followUpCount: number
  tourScheduledCount: number
  tourCompletedCount: number
  archivedCount: number
}

export function normalizeContactSubmissionStatus(
  status: ContactSubmissionStatus
): ContactSubmissionWorkflowStatus {
  return status === "contacted" ? "follow_up" : status
}

function createServerSupabaseClient() {
  const supabaseUrl = process.env.HBA_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

let cachedSupabase: ReturnType<typeof createServerSupabaseClient> | undefined

function getSupabase() {
  if (!cachedSupabase) {
    cachedSupabase = createServerSupabaseClient()
  }

  return cachedSupabase
}

function normalizeHowDidYouHear(value?: string) {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

export async function createContactSubmission(input: ContactSubmissionInput) {
  const { data, error } = await getSupabase()
    .from("contact_submissions")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      student_name: input.studentName,
      message: input.message,
      schedule_tour: input.scheduleTour === "yes",
      how_did_you_hear: normalizeHowDidYouHear(input.howDidYouHear),
      status: "new",
      assigned_to: null,
      notes: null,
      source: "contact-page",
      spam_provider: "cloudflare-turnstile",
      spam_verified: true,
      archived_at: null,
    })
    .select(
      "id, created_at, name, email, phone, student_name, message, schedule_tour, how_did_you_hear, status, assigned_to, notes, source, spam_provider, spam_verified, archived_at"
    )
    .single<ContactSubmissionRecord>()

  if (error) {
    throw new Error(`Failed to create contact submission: ${error.message}`)
  }

  return data
}

export async function listContactSubmissions(filters?: {
  view?: "active" | "archived" | "all"
  status?: ContactSubmissionWorkflowStatus | "all"
  tour?: "yes" | "no" | "all"
}) {
  let query = getSupabase()
    .from("contact_submissions")
    .select(
      "id, created_at, name, email, phone, student_name, message, schedule_tour, how_did_you_hear, status, assigned_to, notes, source, spam_provider, spam_verified, archived_at"
    )
    .order("created_at", { ascending: false })

  if (filters?.view === "active") {
    query = query.neq("status", "archived")
  }

  if (filters?.view === "archived") {
    query = query.eq("status", "archived")
  }

  if (filters?.status && filters.status !== "all") {
    if (filters.status === "follow_up") {
      query = query.in("status", ["follow_up", "contacted"])
    } else {
      query = query.eq("status", filters.status)
    }
  }

  if (filters?.tour === "yes") {
    query = query.eq("schedule_tour", true)
  }

  if (filters?.tour === "no") {
    query = query.eq("schedule_tour", false)
  }

  const { data, error } = await query.returns<ContactSubmissionRecord[]>()

  if (error) {
    throw new Error(`Failed to load contact submissions: ${error.message}`)
  }

  return data
}

export async function getContactSubmissionSummary() {
  const { data, error } = await getSupabase()
    .from("contact_submissions")
    .select("status, schedule_tour")
    .returns<Array<Pick<ContactSubmissionRecord, "status" | "schedule_tour">>>()

  if (error) {
    throw new Error(`Failed to load contact submission summary: ${error.message}`)
  }

  return (data ?? []).reduce<ContactSubmissionSummary>(
    (summary, submission) => {
      const normalizedStatus = normalizeContactSubmissionStatus(submission.status)

      if (normalizedStatus === "archived") {
        summary.archivedCount += 1
        return summary
      }

      summary.activeCount += 1

      if (normalizedStatus === "new") {
        summary.needsResponseCount += 1
      }

      if (normalizedStatus === "follow_up") {
        summary.followUpCount += 1
      }

      if (normalizedStatus === "tour_scheduled") {
        summary.tourScheduledCount += 1
      }

      if (normalizedStatus === "tour_completed") {
        summary.tourCompletedCount += 1
      }

      return summary
    },
    {
      activeCount: 0,
      needsResponseCount: 0,
      followUpCount: 0,
      tourScheduledCount: 0,
      tourCompletedCount: 0,
      archivedCount: 0,
    }
  )
}

export async function updateContactSubmission(input: ContactSubmissionUpdate) {
  const archivedAt = input.status === "archived" ? new Date().toISOString() : null

  const { data, error } = await getSupabase()
    .from("contact_submissions")
    .update({
      status: input.status,
      notes: input.notes || null,
      archived_at: archivedAt,
    })
    .eq("id", input.id)
    .select(
      "id, created_at, name, email, phone, student_name, message, schedule_tour, how_did_you_hear, status, assigned_to, notes, source, spam_provider, spam_verified, archived_at"
    )
    .single<ContactSubmissionRecord>()

  if (error) {
    throw new Error(`Failed to update contact submission: ${error.message}`)
  }

  return data
}

export async function deleteArchivedContactSubmission(id: string) {
  const { error, count } = await getSupabase()
    .from("contact_submissions")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("status", "archived")

  if (error) {
    throw new Error(`Failed to delete archived contact submission: ${error.message}`)
  }

  if (!count) {
    throw new Error("Archived contact submission not found.")
  }
}