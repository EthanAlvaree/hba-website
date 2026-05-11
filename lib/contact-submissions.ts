import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

export const contactSubmissionStatusSchema = z.enum([
  "new",
  "contacted",
  "archived",
])

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
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
  website: z.string().trim().max(0).optional().catch(""),
  submittedAt: z.string().trim(),
  turnstileToken: z.string().trim().min(1, "Please complete the spam check."),
})

export const contactSubmissionUpdateSchema = z.object({
  id: z.string().trim().min(1),
  status: contactSubmissionStatusSchema,
  notes: z.string().trim().max(4000),
})

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>
export type ContactSubmissionRequest = z.infer<typeof contactSubmissionRequestSchema>
export type ContactSubmissionStatus = z.infer<typeof contactSubmissionStatusSchema>
export type ContactSubmissionUpdate = z.infer<typeof contactSubmissionUpdateSchema>

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
  newCount: number
  contactedCount: number
  archivedCount: number
  activeTourRequestedCount: number
}

const supabaseUrl = process.env.HBA_SUPABASE_URL
const supabaseServiceRoleKey = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase server environment variables are missing.")
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function normalizeHowDidYouHear(value?: string) {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

export async function createContactSubmission(input: ContactSubmissionInput) {
  const { data, error } = await supabase
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
  status?: ContactSubmissionStatus | "all"
  tour?: "yes" | "no" | "all"
}) {
  let query = supabase
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
    query = query.eq("status", filters.status)
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
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("status, schedule_tour")
    .returns<Array<Pick<ContactSubmissionRecord, "status" | "schedule_tour">>>()

  if (error) {
    throw new Error(`Failed to load contact submission summary: ${error.message}`)
  }

  return (data ?? []).reduce<ContactSubmissionSummary>(
    (summary, submission) => {
      if (submission.status === "archived") {
        summary.archivedCount += 1
        return summary
      }

      summary.activeCount += 1

      if (submission.status === "new") {
        summary.newCount += 1
      }

      if (submission.status === "contacted") {
        summary.contactedCount += 1
      }

      if (submission.schedule_tour) {
        summary.activeTourRequestedCount += 1
      }

      return summary
    },
    {
      activeCount: 0,
      newCount: 0,
      contactedCount: 0,
      archivedCount: 0,
      activeTourRequestedCount: 0,
    }
  )
}

export async function updateContactSubmission(input: ContactSubmissionUpdate) {
  const archivedAt = input.status === "archived" ? new Date().toISOString() : null

  const { data, error } = await supabase
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