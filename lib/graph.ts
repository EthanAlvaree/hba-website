import { siteConfig } from "@/lib/site"
import type { ContactSubmissionRecord } from "@/lib/contact-submissions"
import type { ApplicationRecord } from "@/lib/applications"

function getRequiredEnv(name: "GRAPH_CLIENT_ID" | "GRAPH_CLIENT_SECRET" | "GRAPH_TENANT_ID") {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is missing.`)
  }

  return value
}

function getGraphConfig() {
  return {
    graphClientId: getRequiredEnv("GRAPH_CLIENT_ID"),
    graphClientSecret: getRequiredEnv("GRAPH_CLIENT_SECRET"),
    graphTenantId: getRequiredEnv("GRAPH_TENANT_ID"),
    graphMailSender:
      process.env.GRAPH_MAIL_SENDER ?? `noreply@${siteConfig.contact.emailDomain}`,
    notificationRecipients: (process.env.CONTACT_NOTIFICATION_TO ?? siteConfig.contact.infoEmail)
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
    applicationRecipients: (
      process.env.APPLICATION_NOTIFICATION_TO ?? siteConfig.contact.admissionsEmail
    )
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

async function getGraphAccessToken() {
  const { graphClientId, graphClientSecret, graphTenantId } = getGraphConfig()

  const response = await fetch(
    `https://login.microsoftonline.com/${graphTenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: graphClientId,
        client_secret: graphClientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Graph access token: ${response.status}`)
  }

  const data = (await response.json()) as { access_token?: string }

  if (!data.access_token) {
    throw new Error("Graph access token response did not include an access token.")
  }

  return data.access_token
}

function buildContactSubmissionHtml(submission: ContactSubmissionRecord) {
  const tourText = submission.schedule_tour ? "Yes" : "No"
  const howDidYouHear = submission.how_did_you_hear ?? "Not provided"

  return [
    `<p>A new contact form submission was received on the HBA website.</p>`,
    `<p><strong>Parent/guardian name:</strong> ${escapeHtml(submission.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(submission.email)}</p>`,
    `<p><strong>Phone:</strong> ${escapeHtml(submission.phone)}</p>`,
    `<p><strong>Student name:</strong> ${escapeHtml(submission.student_name)}</p>`,
    `<p><strong>Schedule a tour:</strong> ${tourText}</p>`,
    `<p><strong>How did you hear about us?</strong> ${escapeHtml(howDidYouHear)}</p>`,
    `<p><strong>Message:</strong></p>`,
    `<p>${escapeHtml(submission.message).replace(/\n/g, "<br />")}</p>`,
    `<p><strong>Submission ID:</strong> ${escapeHtml(submission.id)}</p>`,
  ].join("")
}

export async function sendContactNotification(submission: ContactSubmissionRecord) {
  const { graphMailSender, notificationRecipients } = getGraphConfig()
  const accessToken = await getGraphAccessToken()

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphMailSender)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: `New HBA contact inquiry from parent ${submission.name}`,
          body: {
            contentType: "HTML",
            content: buildContactSubmissionHtml(submission),
          },
          toRecipients: notificationRecipients.map((email) => ({
            emailAddress: {
              address: email,
            },
          })),
          replyTo: [
            {
              emailAddress: {
                address: submission.email,
                name: submission.name,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const responseText = await response.text()

    throw new Error(`Failed to send Graph notification email: ${response.status} ${responseText}`)
  }
}

// ============================================================================
// Application emails
// ============================================================================

type SendMailOptions = {
  subject: string
  htmlBody: string
  toRecipients: string[]
  replyTo?: { address: string; name?: string }
  /** Override the mailbox we send AS. Defaults to GRAPH_MAIL_SENDER
   *  (typically a no-reply address). Use this for mass-email sends where
   *  you want replies routed to a real shared mailbox like
   *  info@highbluffacademy.com. */
  fromMailbox?: string
}

async function sendMail(options: SendMailOptions) {
  const { graphMailSender } = getGraphConfig()
  const sender = options.fromMailbox?.trim() || graphMailSender
  const accessToken = await getGraphAccessToken()

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: options.subject,
          body: { contentType: "HTML", content: options.htmlBody },
          toRecipients: options.toRecipients.map((email) => ({
            emailAddress: { address: email },
          })),
          ...(options.replyTo
            ? {
                replyTo: [
                  {
                    emailAddress: {
                      address: options.replyTo.address,
                      ...(options.replyTo.name ? { name: options.replyTo.name } : {}),
                    },
                  },
                ],
              }
            : {}),
        },
        saveToSentItems: true,
      }),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(`Failed to send Graph email: ${response.status} ${responseText}`)
  }
}

function describeEnrollmentType(value: string | null) {
  if (value === "summer") return "Summer"
  if (value === "part_time") return "Part-time"
  if (value === "full_time") return "Full-time"
  return "Not selected"
}

function buildApplicationNotificationHtml(
  application: ApplicationRecord,
  dashboardUrl: string
) {
  const studentName =
    [
      application.student_first_name,
      application.student_middle_name,
      application.student_last_name,
    ]
      .filter(Boolean)
      .join(" ") || "(no student name)"

  const parts: string[] = [
    `<p>A new application was submitted on the HBA website.</p>`,
    `<h3>Family</h3>`,
    `<p><strong>Guardian 1:</strong> ${escapeHtml(application.guardian1_name ?? "")}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(application.guardian1_email ?? "")}</p>`,
    `<p><strong>Mobile:</strong> ${escapeHtml(application.guardian1_mobile ?? "")}</p>`,
    `<h3>Student</h3>`,
    `<p><strong>Name:</strong> ${escapeHtml(studentName)}</p>`,
    `<p><strong>DOB:</strong> ${escapeHtml(application.student_dob ?? "")}</p>`,
    `<p><strong>Current grade:</strong> ${escapeHtml(application.student_current_grade ?? "")}</p>`,
    `<p><strong>Desired entry grade:</strong> ${escapeHtml(application.student_desired_grade ?? "")}</p>`,
    `<h3>Enrollment</h3>`,
    `<p><strong>Type:</strong> ${escapeHtml(describeEnrollmentType(application.enrollment_type))}</p>`,
  ]

  if (application.course_interest.length > 0) {
    parts.push(
      `<p><strong>Courses of interest:</strong></p>`,
      `<ul>${application.course_interest
        .map((course) => `<li>${escapeHtml(course)}</li>`)
        .join("")}</ul>`
    )
  }

  if (application.prior_schools.length > 0) {
    parts.push(
      `<p><strong>Prior schools:</strong></p>`,
      `<ul>${application.prior_schools
        .map((school) => `<li>${escapeHtml(school.name)}</li>`)
        .join("")}</ul>`
    )
  }

  if (application.how_did_you_hear) {
    parts.push(
      `<p><strong>How they heard about HBA:</strong> ${escapeHtml(application.how_did_you_hear)}</p>`
    )
  }

  if (application.notes_from_family) {
    parts.push(
      `<p><strong>Notes from family:</strong></p>`,
      `<p>${escapeHtml(application.notes_from_family).replace(/\n/g, "<br />")}</p>`
    )
  }

  parts.push(
    `<p><a href="${escapeHtml(dashboardUrl)}">Open in admin dashboard</a></p>`,
    `<p><strong>Application ID:</strong> ${escapeHtml(application.id)}</p>`
  )

  return parts.join("")
}

export async function sendApplicationNotification(application: ApplicationRecord) {
  const { applicationRecipients } = getGraphConfig()
  const dashboardUrl = `${siteConfig.url}/admin/applications/${application.id}`
  const studentName =
    [application.student_first_name, application.student_last_name]
      .filter(Boolean)
      .join(" ") || "(no student name)"
  const guardianName = application.guardian1_name ?? "(no guardian name)"

  await sendMail({
    subject: `New HBA application — ${guardianName} (for ${studentName})`,
    htmlBody: buildApplicationNotificationHtml(application, dashboardUrl),
    toRecipients: applicationRecipients,
    replyTo: application.guardian1_email
      ? { address: application.guardian1_email, name: guardianName }
      : undefined,
  })
}

function buildMagicLinkHtml(parentName: string, resumeUrl: string) {
  return [
    `<p>Hi ${escapeHtml(parentName)},</p>`,
    `<p>You started an application on the High Bluff Academy website. Use the link below to resume where you left off — it's good for 30 days.</p>`,
    `<p><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:#f37021;color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Continue your application</a></p>`,
    `<p>Or copy and paste this URL into your browser:</p>`,
    `<p>${escapeHtml(resumeUrl)}</p>`,
    `<p>If you didn't start an application, you can safely ignore this email.</p>`,
    `<p>— High Bluff Academy</p>`,
  ].join("")
}

// Generic send. Use sparingly — most callers should add a dedicated helper
// in this file so the subject + body live in one place. Currently used by
// the parent activity digest cron where the body is dynamically generated.
export async function sendCustomEmail(options: SendMailOptions) {
  await sendMail(options)
}

export async function sendApplicationDraftMagicLink(options: {
  toEmail: string
  parentName: string
  resumeUrl: string
}) {
  await sendMail({
    subject: "Continue your High Bluff Academy application",
    htmlBody: buildMagicLinkHtml(options.parentName, options.resumeUrl),
    toRecipients: [options.toEmail],
  })
}

// ============================================================================
// Application status updates (family-facing)
// ============================================================================

export type FamilyNotifiableStatus =
  | "info_requested"
  | "admit_offered"
  | "accepted"
  | "declined"

const familyNotifiableStatuses: ReadonlyArray<FamilyNotifiableStatus> = [
  "info_requested",
  "admit_offered",
  "accepted",
  "declined",
]

export function isFamilyNotifiableStatus(s: string): s is FamilyNotifiableStatus {
  return (familyNotifiableStatuses as ReadonlyArray<string>).includes(s)
}

function buildFamilyStatusHtml(
  parentName: string,
  studentName: string,
  status: FamilyNotifiableStatus,
  internalNote?: string | null
): { subject: string; html: string } {
  const greeting = `<p>Hi ${escapeHtml(parentName)},</p>`
  const signature = `<p>Warmly,<br />The High Bluff Academy admissions team</p>`
  const noteBlock = internalNote
    ? `<p style="margin-top:16px;padding:12px 16px;border-left:4px solid #f37021;background:#fff7ed;color:#7a3e0c;"><strong>Note from the office:</strong><br />${escapeHtml(internalNote).replace(/\n/g, "<br />")}</p>`
    : ""

  const replyHint = `<p style="color:#666;font-size:14px;">Reply to this email if you have any questions. We typically respond within one business day.</p>`

  switch (status) {
    case "info_requested":
      return {
        subject: `Update on ${studentName}'s HBA application — we need a bit more information`,
        html: [
          greeting,
          `<p>Thank you for submitting an application for <strong>${escapeHtml(studentName)}</strong>. We&rsquo;ve started our review and need a bit more information before we can move forward.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
    case "admit_offered":
      return {
        subject: `Congratulations — ${studentName} has been offered admission to HBA`,
        html: [
          greeting,
          `<p>We are delighted to offer <strong>${escapeHtml(studentName)}</strong> a place in the High Bluff Academy community.</p>`,
          `<p>Our office will follow up with the next steps for accepting the offer and beginning the enrollment process. If you have questions in the meantime, please reach out to us directly.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
    case "accepted":
      return {
        subject: `Welcome to High Bluff Academy, ${studentName}!`,
        html: [
          greeting,
          `<p>Thank you for accepting our offer of admission. We&rsquo;re thrilled that <strong>${escapeHtml(studentName)}</strong> will be joining the High Bluff Academy community.</p>`,
          `<p>You&rsquo;ll hear from our office shortly with onboarding details — schedule, orientation, and the practical bits of getting set up.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
    case "declined":
      return {
        subject: `Update on ${studentName}'s HBA application`,
        html: [
          greeting,
          `<p>Thank you for taking the time to apply to High Bluff Academy. After careful consideration, we are unable to offer <strong>${escapeHtml(studentName)}</strong> a place this year.</p>`,
          `<p>This decision is never an easy one. We wish you and your family the very best, and we&rsquo;d be glad to talk more if you have questions about our reasoning or next steps.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
  }
}

export async function sendApplicationStatusUpdateToFamily(options: {
  application: ApplicationRecord
  newStatus: FamilyNotifiableStatus
  /** Optional internal note that should be surfaced to the family. Usually
   *  this is empty — admin office decides per case. */
  noteToFamily?: string | null
}) {
  const { application, newStatus, noteToFamily } = options

  const guardianEmails: string[] = []
  if (application.guardian1_email) guardianEmails.push(application.guardian1_email)
  if (application.guardian2_email) guardianEmails.push(application.guardian2_email)
  if (guardianEmails.length === 0) {
    throw new Error("No guardian email on file; cannot send family status update.")
  }

  const studentName =
    [application.student_first_name, application.student_last_name]
      .filter(Boolean)
      .join(" ") || "your student"
  const parentName = application.guardian1_name?.trim() || "there"

  const { subject, html } = buildFamilyStatusHtml(parentName, studentName, newStatus, noteToFamily)

  const { applicationRecipients } = getGraphConfig()
  await sendMail({
    subject,
    htmlBody: html,
    toRecipients: guardianEmails,
    // The office address is on reply-to so families can respond directly to
    // admissions instead of the no-reply sender.
    replyTo: applicationRecipients[0]
      ? { address: applicationRecipients[0] }
      : undefined,
  })
}

// ============================================================================
// M365 directory sync
// ============================================================================
//
// Uses the HBA Graph Mailer app's User.Read.All permission to enumerate every
// user in the HBA tenant. Caller is expected to filter to HBA-domain emails
// and ignore external guests.

export type M365User = {
  id: string
  mail: string | null
  userPrincipalName: string
  displayName: string | null
  givenName: string | null
  surname: string | null
  accountEnabled: boolean
}

type GraphUsersResponse = {
  value: M365User[]
  "@odata.nextLink"?: string
}

// Paginates `/users` via @odata.nextLink. HBA's tenant is small (likely under
// a few hundred users including students), so iterating all pages is fine.
export async function listM365Users(): Promise<M365User[]> {
  const accessToken = await getGraphAccessToken()

  const select = "id,mail,userPrincipalName,displayName,givenName,surname,accountEnabled"
  let nextUrl: string | undefined =
    `https://graph.microsoft.com/v1.0/users?$select=${select}&$top=999`

  const users: M365User[] = []

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(`Failed to list M365 users: ${response.status} ${responseText}`)
    }

    const page = (await response.json()) as GraphUsersResponse
    users.push(...page.value)
    nextUrl = page["@odata.nextLink"]
  }

  return users
}

// Resolves a Graph user to a canonical lowercase email. Prefers `mail` when
// set; falls back to `userPrincipalName`. Returns null when neither is usable.
export function emailFromM365User(user: M365User): string | null {
  const candidate = user.mail || user.userPrincipalName
  if (!candidate) return null
  const lowered = candidate.toLowerCase().trim()
  return lowered.length > 0 ? lowered : null
}