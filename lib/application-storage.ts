// Application document uploads — signed-URL pattern so the browser uploads
// directly to the Supabase Storage `application-documents` bucket without
// going through the Next.js function (no 4.5MB body-size limit).

import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"
import { z } from "zod"
import { getApplicationByDraftToken } from "@/lib/applications"

const bucketName = "application-documents"

const applicationDocumentKindSchema = z.enum(["transcript"])
export type ApplicationDocumentKind = z.infer<typeof applicationDocumentKindSchema>

export const applicationDocumentInitSchema = z.object({
  draft_token: z.string().trim().min(1, "Save your draft first to upload files."),
  kind: applicationDocumentKindSchema,
  filename: z.string().trim().min(1).max(200),
  content_type: z.string().trim().min(1).max(120),
  prior_school_name: z.string().trim().max(200).optional(),
})

export const applicationDocumentCompleteSchema = z.object({
  draft_token: z.string().trim().min(1),
  kind: applicationDocumentKindSchema,
  filename: z.string().trim().min(1).max(200),
  storage_path: z.string().trim().min(1).max(500),
  prior_school_name: z.string().trim().max(200).optional(),
})

export const applicationDocumentDeleteSchema = z.object({
  draft_token: z.string().trim().min(1),
  document_id: z.uuid(),
})

export type ApplicationDocumentInit = z.infer<typeof applicationDocumentInitSchema>
export type ApplicationDocumentComplete = z.infer<
  typeof applicationDocumentCompleteSchema
>
export type ApplicationDocumentDelete = z.infer<typeof applicationDocumentDeleteSchema>

export type ApplicationDocumentRecord = {
  id: string
  application_id: string
  kind: ApplicationDocumentKind
  prior_school_name: string | null
  filename: string
  storage_path: string
  uploaded_at: string
}

const allowedContentTypePrefixes = [
  "application/pdf",
  "image/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

const maxFilenameLength = 200
const filenameUnsafe = /[^A-Za-z0-9._\- ()]/g

function sanitizeFilename(raw: string): string {
  const trimmed = raw.trim().replace(filenameUnsafe, "_").slice(0, maxFilenameLength)
  return trimmed.length > 0 ? trimmed : "file"
}

function isAllowedContentType(contentType: string): boolean {
  return allowedContentTypePrefixes.some((prefix) => contentType.startsWith(prefix))
}

// ============================================================================
// Lazy Supabase client (mirrors lib/applications.ts pattern)
// ============================================================================

function createServerSupabaseClient() {
  const supabaseUrl = process.env.HBA_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let cachedSupabase: ReturnType<typeof createServerSupabaseClient> | undefined

function getSupabase() {
  if (!cachedSupabase) {
    cachedSupabase = createServerSupabaseClient()
  }
  return cachedSupabase
}

// ============================================================================
// Public API
// ============================================================================

export type CreateSignedUploadResult = {
  signed_url: string
  storage_path: string
  token: string
  application_id: string
}

export async function createApplicationDocumentUploadUrl(
  input: ApplicationDocumentInit
): Promise<CreateSignedUploadResult> {
  if (!isAllowedContentType(input.content_type)) {
    throw new Error("File type not allowed. Upload a PDF, image, or document.")
  }

  const application = await getApplicationByDraftToken(input.draft_token)

  if (!application) {
    throw new Error("Draft not found or expired. Save your draft and try again.")
  }

  const sanitized = sanitizeFilename(input.filename)
  const id = randomBytes(8).toString("hex")
  const storage_path = `applications/${application.id}/${input.kind}/${id}-${sanitized}`

  const { data, error } = await getSupabase()
    .storage.from(bucketName)
    .createSignedUploadUrl(storage_path)

  if (error || !data) {
    throw new Error(
      `Failed to create signed upload URL: ${error?.message ?? "unknown error"}`
    )
  }

  return {
    signed_url: data.signedUrl,
    storage_path: data.path,
    token: data.token,
    application_id: application.id,
  }
}

export async function recordApplicationDocument(input: ApplicationDocumentComplete) {
  const application = await getApplicationByDraftToken(input.draft_token)

  if (!application) {
    throw new Error("Draft not found or expired.")
  }

  if (!input.storage_path.startsWith(`applications/${application.id}/`)) {
    throw new Error("Storage path does not match this application.")
  }

  const { data, error } = await getSupabase()
    .from("application_documents")
    .insert({
      application_id: application.id,
      kind: input.kind,
      prior_school_name: input.prior_school_name?.trim() || null,
      filename: input.filename.slice(0, 200),
      storage_path: input.storage_path,
    })
    .select("id, application_id, kind, prior_school_name, filename, storage_path, uploaded_at")
    .single<ApplicationDocumentRecord>()

  if (error) {
    throw new Error(`Failed to record document: ${error.message}`)
  }

  return data
}

export async function listApplicationDocumentsForDraft(draftToken: string) {
  const application = await getApplicationByDraftToken(draftToken)

  if (!application) {
    return []
  }

  const { data, error } = await getSupabase()
    .from("application_documents")
    .select("id, application_id, kind, prior_school_name, filename, storage_path, uploaded_at")
    .eq("application_id", application.id)
    .order("uploaded_at", { ascending: true })
    .returns<ApplicationDocumentRecord[]>()

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`)
  }

  return data
}

export async function listApplicationDocumentsForAdmin(applicationId: string) {
  const { data, error } = await getSupabase()
    .from("application_documents")
    .select("id, application_id, kind, prior_school_name, filename, storage_path, uploaded_at")
    .eq("application_id", applicationId)
    .order("uploaded_at", { ascending: true })
    .returns<ApplicationDocumentRecord[]>()

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`)
  }

  return data
}

export async function listApplicationDocumentsByIds(applicationIds: string[]) {
  if (applicationIds.length === 0) return new Map<string, ApplicationDocumentRecord[]>()

  const { data, error } = await getSupabase()
    .from("application_documents")
    .select("id, application_id, kind, prior_school_name, filename, storage_path, uploaded_at")
    .in("application_id", applicationIds)
    .order("uploaded_at", { ascending: true })
    .returns<ApplicationDocumentRecord[]>()

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`)
  }

  const byApplication = new Map<string, ApplicationDocumentRecord[]>()
  for (const record of data ?? []) {
    const list = byApplication.get(record.application_id) ?? []
    list.push(record)
    byApplication.set(record.application_id, list)
  }
  return byApplication
}

export async function getApplicationDocumentById(documentId: string) {
  const { data, error } = await getSupabase()
    .from("application_documents")
    .select("id, application_id, kind, prior_school_name, filename, storage_path, uploaded_at")
    .eq("id", documentId)
    .maybeSingle<ApplicationDocumentRecord>()

  if (error) {
    throw new Error(`Failed to load document: ${error.message}`)
  }

  return data
}

export async function deleteApplicationDocument(input: ApplicationDocumentDelete) {
  const application = await getApplicationByDraftToken(input.draft_token)

  if (!application) {
    throw new Error("Draft not found or expired.")
  }

  const { data: existing, error: lookupError } = await getSupabase()
    .from("application_documents")
    .select("id, application_id, storage_path")
    .eq("id", input.document_id)
    .eq("application_id", application.id)
    .maybeSingle<{ id: string; application_id: string; storage_path: string }>()

  if (lookupError) {
    throw new Error(`Failed to look up document: ${lookupError.message}`)
  }

  if (!existing) {
    throw new Error("Document not found.")
  }

  const { error: storageError } = await getSupabase()
    .storage.from(bucketName)
    .remove([existing.storage_path])

  if (storageError) {
    console.error("Failed to remove storage object:", storageError)
  }

  const { error: deleteError } = await getSupabase()
    .from("application_documents")
    .delete()
    .eq("id", existing.id)

  if (deleteError) {
    throw new Error(`Failed to delete document: ${deleteError.message}`)
  }
}

// ============================================================================
// Admin-only document management (no draft-token check — caller asserts admin)
// ============================================================================

// Removes the storage object AND the application_documents row. Used by
// admins editing a submitted application to swap a wrong PDF for a correct
// one. Unlike the family-facing deleteApplicationDocument, this doesn't
// require a draft_token because the application is past draft state.
export async function adminDeleteApplicationDocument(documentId: string) {
  const existing = await getApplicationDocumentById(documentId)
  if (!existing) {
    throw new Error("Document not found.")
  }

  const { error: storageError } = await getSupabase()
    .storage.from(bucketName)
    .remove([existing.storage_path])

  if (storageError) {
    console.error("Failed to remove storage object:", storageError)
  }

  const { error: deleteError } = await getSupabase()
    .from("application_documents")
    .delete()
    .eq("id", documentId)

  if (deleteError) {
    throw new Error(`Failed to delete document: ${deleteError.message}`)
  }
}

const adminUploadInputSchema = z.object({
  application_id: z.uuid(),
  kind: applicationDocumentKindSchema,
  filename: z.string().trim().min(1).max(200),
  content_type: z.string().trim().min(1).max(120),
  prior_school_name: z.string().trim().max(200).optional().nullable(),
})

export type AdminUploadInput = {
  application_id: string
  kind: ApplicationDocumentKind
  filename: string
  content_type: string
  prior_school_name?: string | null
  data: ArrayBuffer | Uint8Array | Buffer
}

// Uploads a file to Supabase Storage and records it in application_documents.
// Direct server-side upload because the caller (admin server action) already
// holds the service-role key and can write to the bucket without a signed
// URL round trip.
export async function adminUploadApplicationDocument(input: AdminUploadInput) {
  // Parse the metadata fields through the same validation the family-facing
  // init endpoint uses; ensures filename + content-type stay reasonable.
  const parsed = adminUploadInputSchema.safeParse({
    application_id: input.application_id,
    kind: input.kind,
    filename: input.filename,
    content_type: input.content_type,
    prior_school_name: input.prior_school_name ?? null,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid upload metadata.")
  }
  if (!isAllowedContentType(parsed.data.content_type)) {
    throw new Error("File type not allowed. Upload a PDF, image, or document.")
  }

  const sanitized = sanitizeFilename(parsed.data.filename)
  const id = randomBytes(8).toString("hex")
  const storage_path = `applications/${parsed.data.application_id}/${parsed.data.kind}/${id}-${sanitized}`

  const supabase = getSupabase()

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storage_path, input.data, {
      contentType: parsed.data.content_type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload to storage: ${uploadError.message}`)
  }

  const { data, error: insertError } = await supabase
    .from("application_documents")
    .insert({
      application_id: parsed.data.application_id,
      kind: parsed.data.kind,
      prior_school_name: parsed.data.prior_school_name?.trim() || null,
      filename: parsed.data.filename.slice(0, 200),
      storage_path,
    })
    .select("id, application_id, kind, prior_school_name, filename, storage_path, uploaded_at")
    .single<ApplicationDocumentRecord>()

  if (insertError) {
    // Best-effort cleanup if the DB insert fails after the storage write
    // succeeded. Mismatched storage/DB state is the worst outcome here.
    await supabase.storage.from(bucketName).remove([storage_path]).catch(() => {})
    throw new Error(`Failed to record document: ${insertError.message}`)
  }

  return data
}

export async function createAdminDownloadUrl(storagePath: string, expiresInSeconds = 300) {
  const { data, error } = await getSupabase()
    .storage.from(bucketName)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data) {
    throw new Error(
      `Failed to create download URL: ${error?.message ?? "unknown error"}`
    )
  }

  return data.signedUrl
}
