// lib/health-records.ts — student health records
//
// One row per student. Minimal "enough for an emergency, not a full
// clinical record." Editable by admins from the student detail page.

import "server-only"
import { z } from "zod"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

export type HealthRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  allergies: string | null
  medications: string | null
  conditions: string | null
  dietary_restrictions: string | null
  immunizations_on_file: boolean
  immunization_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  primary_physician_name: string | null
  primary_physician_phone: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  internal_notes: string | null
}

const columns = "*"

export async function getHealthRecord(studentId: string): Promise<HealthRecord | null> {
  const { data, error } = await getSupabase()
    .from("student_health_records")
    .select(columns)
    .eq("student_id", studentId)
    .maybeSingle<HealthRecord>()
  if (error) throw new Error(`Failed to load health record: ${error.message}`)
  return data
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v && v.length > 0 ? v : null))

export const healthRecordUpsertSchema = z.object({
  student_id: z.uuid(),
  allergies: optionalText(2000),
  medications: optionalText(2000),
  conditions: optionalText(2000),
  dietary_restrictions: optionalText(1000),
  immunizations_on_file: z.coerce.boolean().default(false),
  immunization_notes: optionalText(2000),
  emergency_contact_name: optionalText(200),
  emergency_contact_relationship: optionalText(80),
  emergency_contact_phone: optionalText(50),
  emergency_contact_email: optionalText(200),
  primary_physician_name: optionalText(200),
  primary_physician_phone: optionalText(50),
  insurance_provider: optionalText(200),
  insurance_policy_number: optionalText(100),
  internal_notes: optionalText(4000),
})
export type HealthRecordUpsertInput = z.infer<typeof healthRecordUpsertSchema>

export async function upsertHealthRecord(input: HealthRecordUpsertInput): Promise<HealthRecord> {
  const { data, error } = await getSupabase()
    .from("student_health_records")
    .upsert(input, { onConflict: "student_id" })
    .select(columns)
    .single<HealthRecord>()
  if (error) throw new Error(`Failed to save health record: ${error.message}`)
  return data
}
