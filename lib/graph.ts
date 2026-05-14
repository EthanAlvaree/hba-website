import { randomInt } from "node:crypto"
import { brand, siteConfig } from "@/lib/site"
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
  /** Optional CC list. */
  ccRecipients?: string[]
  replyTo?: { address: string; name?: string }
  /** Override the mailbox we send AS. Defaults to GRAPH_MAIL_SENDER
   *  (typically a no-reply address). Use this for mass-email sends where
   *  you want replies routed to a real shared mailbox like
   *  info@highbluffacademy.com. */
  fromMailbox?: string
  /** Optional file attachments (e.g. an .ics calendar invite). */
  attachments?: Array<{
    name: string
    contentType: string
    /** Raw bytes; the mailer base64-encodes for the Graph payload. */
    content: Buffer | string
  }>
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
          ...(options.ccRecipients && options.ccRecipients.length > 0
            ? {
                ccRecipients: options.ccRecipients.map((email) => ({
                  emailAddress: { address: email },
                })),
              }
            : {}),
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
          ...(options.attachments && options.attachments.length > 0
            ? {
                attachments: options.attachments.map((a) => ({
                  "@odata.type": "#microsoft.graph.fileAttachment",
                  name: a.name,
                  contentType: a.contentType,
                  contentBytes: Buffer.isBuffer(a.content)
                    ? a.content.toString("base64")
                    : Buffer.from(a.content, "utf-8").toString("base64"),
                })),
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
    subject: `New ${siteConfig.shortName} application — ${guardianName} (for ${studentName})`,
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
    `<p>You started an application on the ${escapeHtml(siteConfig.name)} website. Use the link below to resume where you left off — it's good for 30 days.</p>`,
    `<p><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:${brand.orange};color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Continue your application</a></p>`,
    `<p>Or copy and paste this URL into your browser:</p>`,
    `<p>${escapeHtml(resumeUrl)}</p>`,
    `<p>If you didn't start an application, you can safely ignore this email.</p>`,
    `<p>— ${escapeHtml(siteConfig.name)}</p>`,
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
    subject: `Continue your ${siteConfig.name} application`,
    htmlBody: buildMagicLinkHtml(options.parentName, options.resumeUrl),
    toRecipients: [options.toEmail],
  })
}

// Daily inactivity-reminder cron sends this to parents who started an
// application but haven't touched it in a week. Same magic link, softer
// subject — and the body says "no rush, but here's where you left off."
function buildDraftReminderHtml(options: {
  parentName: string
  resumeUrl: string
  daysUntilExpiry: number
}) {
  const { parentName, resumeUrl, daysUntilExpiry } = options
  const expiryLine =
    daysUntilExpiry <= 7
      ? `<p>Your draft expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} — after that you'll need to start over.</p>`
      : `<p>Your draft is saved for another ${daysUntilExpiry} days, so there's no rush — but the longer it sits, the more details you'll have to look up.</p>`
  return [
    `<p>Hi ${escapeHtml(parentName)},</p>`,
    `<p>We noticed you started an application on the ${escapeHtml(siteConfig.name)} website but haven't finished. Whenever you're ready, the link below picks up right where you left off.</p>`,
    `<p><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:${brand.orange};color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Continue your application</a></p>`,
    `<p>Or copy and paste this URL into your browser:</p>`,
    `<p>${escapeHtml(resumeUrl)}</p>`,
    expiryLine,
    `<p>If you've decided not to apply, you can ignore this — we won't email you about it again.</p>`,
    `<p>— ${escapeHtml(siteConfig.name)}</p>`,
  ].join("")
}

// Pings the office when a student finishes their course-request list
// and submits for scheduling. Reuses the application recipient pool
// since they're the same office team that runs the scheduler.
export async function sendCourseRequestsSubmittedNotification(options: {
  studentName: string
  studentEmail: string | null
  termName: string
  coreCount: number
  electiveCount: number
  alternateCount: number
  dashboardUrl: string
}) {
  const {
    studentName,
    studentEmail,
    termName,
    coreCount,
    electiveCount,
    alternateCount,
    dashboardUrl,
  } = options
  const html = [
    `<p>${escapeHtml(studentName)} submitted course requests for <strong>${escapeHtml(termName)}</strong>.</p>`,
    `<ul>`,
    `<li>Core: ${coreCount}</li>`,
    `<li>Elective: ${electiveCount}</li>`,
    `<li>Alternate: ${alternateCount}</li>`,
    `</ul>`,
    studentEmail
      ? `<p>Student email: ${escapeHtml(studentEmail)}</p>`
      : "",
    `<p><a href="${escapeHtml(dashboardUrl)}">Open in admin dashboard</a></p>`,
    `<p>— ${escapeHtml(siteConfig.name)}</p>`,
  ].join("")

  const { applicationRecipients } = getGraphConfig()
  if (applicationRecipients.length === 0) return
  await sendMail({
    subject: `${siteConfig.shortName} course requests — ${studentName} (${termName})`,
    htmlBody: html,
    toRecipients: applicationRecipients,
  })
}

export async function sendApplicationDraftReminder(options: {
  toEmail: string
  parentName: string
  resumeUrl: string
  daysUntilExpiry: number
}) {
  await sendMail({
    subject: `Your ${siteConfig.name} application is waiting`,
    htmlBody: buildDraftReminderHtml({
      parentName: options.parentName,
      resumeUrl: options.resumeUrl,
      daysUntilExpiry: options.daysUntilExpiry,
    }),
    toRecipients: [options.toEmail],
  })
}

// Fires the moment an applicant submits. They worry "did it go through?"
// the way every applicant does — this is the email that answers yes.
// Reply-to is the office so they can ask a follow-up question from the
// same thread.
export async function sendApplicationSubmittedConfirmation(options: {
  application: ApplicationRecord
}) {
  const { application } = options
  const guardianEmails: string[] = []
  if (application.guardian1_email) guardianEmails.push(application.guardian1_email)
  if (application.guardian2_email) guardianEmails.push(application.guardian2_email)
  if (guardianEmails.length === 0) return // nothing to do

  const studentName =
    [application.student_first_name, application.student_last_name]
      .filter(Boolean)
      .join(" ") || "your student"
  const parentName = application.guardian1_name?.trim() || "there"

  const subject = `We received ${studentName}'s ${siteConfig.shortName} application`
  const html = [
    `<p>Hi ${escapeHtml(parentName)},</p>`,
    `<p>This is just a quick note to confirm we received your application for <strong>${escapeHtml(studentName)}</strong>. The admissions team typically responds within one business day to set up a conversation.</p>`,
    `<p style="margin:24px 0;padding:16px 20px;border-left:4px solid ${brand.navy};background:#f5f7fb;">`,
    `<strong>Reference:</strong><br />`,
    `<span style="font-family:Consolas,Menlo,monospace;font-size:13px;color:${brand.navy};">${escapeHtml(application.id)}</span>`,
    `</p>`,
    `<p style="font-size:14px;color:#555;">A few things to know:</p>`,
    `<ul style="font-size:14px;color:#555;line-height:1.6;">`,
    `<li>Reply to this email any time — it routes back to the admissions office and we'd love to hear what drew you to ${escapeHtml(siteConfig.name)}.</li>`,
    `<li>If you have additional documents (recent transcripts, recommendation letters), feel free to send them as attachments.</li>`,
    `<li>For international families: please have your child's passport and prior transcripts ready in PDF for the F-1 paperwork.</li>`,
    `</ul>`,
    `<p style="font-size:14px;color:#555;">Warmly,<br />The ${escapeHtml(siteConfig.name)} admissions team</p>`,
  ].join("")

  const { applicationRecipients } = getGraphConfig()
  await sendMail({
    subject,
    htmlBody: html,
    toRecipients: guardianEmails,
    replyTo: applicationRecipients[0]
      ? { address: applicationRecipients[0] }
      : undefined,
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

// Friendly labels for the document codes the admin form collects.
// Kept here next to the email template so labels stay consistent with
// the prose families read.
const DOCUMENT_LABELS: Record<string, string> = {
  transcripts: "Recent transcripts from the past two years",
  test_scores: "Standardized test scores (PSAT, SAT, or ACT)",
  recommendation_letters: "One or more letters of recommendation",
  writing_sample: "A personal essay or recent writing sample",
  disciplinary_record: "Your current school's disciplinary record",
  iep_504_docs: "Any IEP / 504 plan or accommodation documentation",
  english_proficiency:
    "An English-language proficiency test result (for international applicants)",
  passport_visa:
    "A copy of the student's passport plus F-1 visa documents (for international applicants)",
}

function buildFamilyStatusHtml(
  parentName: string,
  studentName: string,
  status: FamilyNotifiableStatus,
  internalNote?: string | null,
  requestedDocuments?: string[]
): { subject: string; html: string } {
  const greeting = `<p>Hi ${escapeHtml(parentName)},</p>`
  const signature = `<p>Warmly,<br />The ${escapeHtml(siteConfig.name)} admissions team</p>`
  const noteBlock = internalNote
    ? `<p style="margin-top:16px;padding:12px 16px;border-left:4px solid ${brand.orange};background:#fff7ed;color:#7a3e0c;"><strong>Note from the office:</strong><br />${escapeHtml(internalNote).replace(/\n/g, "<br />")}</p>`
    : ""

  // Render the requested-documents checklist as a bulleted list,
  // dropping any codes the admin sent that we don't recognize.
  const docLabels = (requestedDocuments ?? [])
    .map((code) => DOCUMENT_LABELS[code])
    .filter(Boolean)
  const docsBlock =
    docLabels.length > 0
      ? `<p style="margin-top:16px;color:#1f2937;"><strong>Could you please send us the following?</strong></p>` +
        `<ul style="margin-top:6px;color:#444;line-height:1.6;">${docLabels.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` +
        `<p style="margin-top:6px;color:#666;font-size:13px;">PDFs or scans attached to your reply are fine. If anything is hard to track down, just let us know — we'll work around it.</p>`
      : ""

  const replyHint = `<p style="color:#666;font-size:14px;">Reply to this email if you have any questions. We typically respond within one business day.</p>`

  switch (status) {
    case "info_requested":
      return {
        subject: `Update on ${studentName}'s ${siteConfig.shortName} application — we need a bit more information`,
        html: [
          greeting,
          `<p>Thank you for submitting an application for <strong>${escapeHtml(studentName)}</strong>. We&rsquo;ve started our review and need a bit more information before we can move forward.</p>`,
          docsBlock,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
    case "admit_offered":
      return {
        subject: `Congratulations — ${studentName} has been offered admission to ${siteConfig.shortName}`,
        html: [
          greeting,
          `<p>We are delighted to offer <strong>${escapeHtml(studentName)}</strong> a place in the ${escapeHtml(siteConfig.name)} community.</p>`,
          `<p>Our office will follow up with the next steps for accepting the offer and beginning the enrollment process. If you have questions in the meantime, please reach out to us directly.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
    case "accepted":
      return {
        subject: `Welcome to ${siteConfig.name}, ${studentName}!`,
        html: [
          greeting,
          `<p>Thank you for accepting our offer of admission. We&rsquo;re thrilled that <strong>${escapeHtml(studentName)}</strong> will be joining the ${escapeHtml(siteConfig.name)} community.</p>`,
          `<p>You&rsquo;ll hear from our office shortly with onboarding details — schedule, orientation, and the practical bits of getting set up.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
    case "declined":
      return {
        subject: `Update on ${studentName}'s ${siteConfig.shortName} application`,
        html: [
          greeting,
          `<p>Thank you for taking the time to apply to ${escapeHtml(siteConfig.name)}. After careful consideration, we are unable to offer <strong>${escapeHtml(studentName)}</strong> a place this year.</p>`,
          `<p>This decision is never an easy one. We wish you and your family the very best, and we&rsquo;d be glad to talk more if you have questions about our reasoning or next steps.</p>`,
          noteBlock,
          replyHint,
          signature,
        ].join(""),
      }
  }
}

// Sent the moment an admin enrolls an accepted applicant — i.e. the student
// now has an HBA Microsoft account waiting for them. The family gets the
// new email + a pointer at /welcome, which walks them through Authenticator
// setup and installing the Microsoft 365 apps. Best-effort: the enrollment
// itself succeeded; a Graph send failure shouldn't roll back the DB.
export async function sendEnrollmentWelcomeToFamily(options: {
  application: ApplicationRecord
  studentHbaEmail: string
  /** Set when enrollment just created the M365 account. null when an
   *  existing account was reused (the family already has a password). */
  tempPassword?: string | null
}) {
  const { application, studentHbaEmail, tempPassword } = options

  const guardianEmails: string[] = []
  if (application.guardian1_email) guardianEmails.push(application.guardian1_email)
  if (application.guardian2_email) guardianEmails.push(application.guardian2_email)
  if (guardianEmails.length === 0) {
    throw new Error("No guardian email on file; cannot send enrollment welcome.")
  }

  const studentName =
    [application.student_first_name, application.student_last_name]
      .filter(Boolean)
      .join(" ") || "your student"
  const parentName = application.guardian1_name?.trim() || "there"

  const welcomeUrl = `${siteConfig.url}/welcome`
  const subject = `${studentName} is enrolled — here's how to set up the school account`

  const credentialsBlock = tempPassword
    ? [
        `<p style="margin:24px 0;padding:16px 20px;border-left:4px solid ${brand.navy};background:#f5f7fb;">`,
        `<strong>Their school email:</strong><br />`,
        `<span style="font-family:Consolas,Menlo,monospace;font-size:16px;color:${brand.navy};">${escapeHtml(studentHbaEmail)}</span>`,
        `<br /><br /><strong>Temporary password:</strong><br />`,
        `<span style="font-family:Consolas,Menlo,monospace;font-size:16px;color:${brand.navy};">${escapeHtml(tempPassword)}</span>`,
        `<br /><br /><span style="font-size:13px;color:#555;">You'll be asked to set a new password the first time you sign in. This temporary one works only once.</span>`,
        `</p>`,
      ].join("")
    : [
        `<p style="margin:24px 0;padding:16px 20px;border-left:4px solid ${brand.navy};background:#f5f7fb;">`,
        `<strong>Their school email:</strong><br />`,
        `<span style="font-family:Consolas,Menlo,monospace;font-size:16px;color:${brand.navy};">${escapeHtml(studentHbaEmail)}</span>`,
        `<br /><br /><span style="font-size:13px;color:#555;">This account already exists — sign in with the existing password. If it's been forgotten, the walkthrough below covers resetting it.</span>`,
        `</p>`,
      ].join("")

  const html = [
    `<p>Hi ${escapeHtml(parentName)},</p>`,
    `<p>Welcome to ${escapeHtml(siteConfig.name)}! <strong>${escapeHtml(studentName)}</strong> is now formally enrolled and has a school Microsoft 365 account waiting for them.</p>`,
    credentialsBlock,
    `<p>Before the first day, please set up the account using our short walkthrough. It takes about 15 minutes and covers signing in, installing Microsoft Authenticator (required for security), and getting the Microsoft apps on the phone and computer.</p>`,
    `<p style="margin:24px 0;">`,
    `<a href="${welcomeUrl}" style="display:inline-block;padding:12px 24px;background:${brand.navy};color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">Open the setup walkthrough</a>`,
    `</p>`,
    `<p style="color:#666;font-size:14px;">Or paste this link into your browser: <a href="${welcomeUrl}">${escapeHtml(welcomeUrl)}</a></p>`,
    `<p style="color:#666;font-size:14px;">Reply to this email with any questions — the office team is happy to walk you through it on the phone or in person.</p>`,
    `<p>Warmly,<br />The ${escapeHtml(siteConfig.name)} admissions team</p>`,
  ].join("")

  const { applicationRecipients } = getGraphConfig()
  await sendMail({
    subject,
    htmlBody: html,
    toRecipients: guardianEmails,
    replyTo: applicationRecipients[0]
      ? { address: applicationRecipients[0] }
      : undefined,
  })
}

// Sent (optionally) when an admin withdraws a student. Confirms the
// withdrawal date, the reason if the admin recorded one, and what
// happens to records (transcripts available on request; data
// retention per policy). Reply-to is the office for any follow-up
// questions.
export async function sendWithdrawalNotificationToFamily(options: {
  studentName: string
  withdrawnAt: string
  reason: string | null
  parentEmails: string[]
}) {
  if (options.parentEmails.length === 0) return

  const subject = `Confirmation of ${options.studentName}'s withdrawal from ${siteConfig.shortName}`
  const html = [
    `<p>Hi,</p>`,
    `<p>This message confirms that <strong>${escapeHtml(options.studentName)}</strong>'s withdrawal from ${escapeHtml(siteConfig.name)} has been recorded as of <strong>${escapeHtml(options.withdrawnAt)}</strong>.</p>`,
    options.reason
      ? `<p style="margin:24px 0;padding:16px 20px;border-left:4px solid ${brand.navy};background:#f5f7fb;color:#1f2937;"><strong>Reason on file:</strong><br />${escapeHtml(options.reason).replace(/\n/g, "<br />")}</p>`
      : "",
    `<p>A few practical notes:</p>`,
    `<ul style="line-height:1.6;color:#444;">`,
    `<li><strong>Transcripts</strong> remain available on request — visit <a href="${siteConfig.url}/transcripts">${escapeHtml(siteConfig.domain)}/transcripts</a> to order one (sealed transcripts can ship directly to a receiving school).</li>`,
    `<li><strong>Records retention</strong> follows our standard policy; please reach out if you need anything specific.</li>`,
    `<li><strong>Account access</strong> to the family / student portal is disabled effective today.</li>`,
    `</ul>`,
    `<p style="color:#444;">If anything about this is unexpected, or if there's anything we can help with as your family transitions, please reply to this email — it routes back to the office.</p>`,
    `<p>Warmly,<br />The ${escapeHtml(siteConfig.name)} admissions team</p>`,
  ].join("")

  const { applicationRecipients } = getGraphConfig()
  await sendMail({
    subject,
    htmlBody: html,
    toRecipients: options.parentEmails,
    replyTo: applicationRecipients[0]
      ? { address: applicationRecipients[0] }
      : undefined,
  })
}

export async function sendApplicationStatusUpdateToFamily(options: {
  application: ApplicationRecord
  newStatus: FamilyNotifiableStatus
  /** Optional internal note that should be surfaced to the family. Usually
   *  this is empty — admin office decides per case. */
  noteToFamily?: string | null
  /** Document codes the admin ticked when transitioning the application
   *  to info_requested. Empty array (or omitted) for other transitions.
   *  See DOCUMENT_LABELS in this file for the canonical list. */
  requestedDocuments?: string[]
}) {
  const { application, newStatus, noteToFamily, requestedDocuments } = options

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

  const { subject, html } = buildFamilyStatusHtml(
    parentName,
    studentName,
    newStatus,
    noteToFamily,
    requestedDocuments
  )

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

// ============================================================================
// Student account provisioning
// ============================================================================
//
// Enrollment auto-creates the student's M365 account (first.last.YY@…) and
// assigns the Office 365 A1 for Students license. An existing account is
// reused (re-enrollment after a gap). Needs the Graph app to have
// User.ReadWrite.All + Organization.Read.All consented in Entra.

const STUDENT_LICENSE_PART_NUMBER =
  process.env.M365_STUDENT_LICENSE_SKU ?? "STANDARDWOFFPACK_STUDENT"

/** Lowercase, strip diacritics + non-alphanumerics. "Alvarée" -> "alvaree". */
export function normalizeNamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/** Build the standard student UPN: first.last.YY@<domain>. YY is the 2-digit
 *  graduation year (enrollmentYear + 12 - entryGrade). Falls back to
 *  first.last@<domain> when the grade can't be parsed — the admin can add
 *  the suffix on the enroll form. */
export function studentUpnFromApplication(
  application: {
    student_first_name: string | null
    student_last_name: string | null
    student_desired_grade: string | null
    student_current_grade: string | null
  },
  enrollmentYear: number
): string {
  const first = normalizeNamePart(application.student_first_name ?? "")
  const last = normalizeNamePart(application.student_last_name ?? "")
  const base = [first, last].filter(Boolean).join(".") || "student"
  const domain = siteConfig.contact.emailDomain
  const gradeText =
    application.student_desired_grade ?? application.student_current_grade ?? ""
  const gradeMatch = gradeText.match(/\d+/)
  if (!gradeMatch) return `${base}@${domain}`
  const grade = parseInt(gradeMatch[0], 10)
  if (!Number.isFinite(grade) || grade < 1 || grade > 12) {
    return `${base}@${domain}`
  }
  const gradYear = enrollmentYear + (12 - grade)
  return `${base}.${String(gradYear).slice(-2)}@${domain}`
}

type GraphProvisionUser = {
  id: string
  userPrincipalName: string
  assignedLicenses?: Array<{ skuId: string }>
}

export type ProvisionResult = {
  upn: string
  created: boolean
  /** Set only when this call created the account. null when an existing
   *  account was reused. */
  tempPassword: string | null
}

/** Turn a non-ok Graph response into a friendly error, calling out the
 *  permission-consent case explicitly (the most likely first-run failure). */
async function graphProvisionError(
  response: Response,
  whatWeTried: string
): Promise<Error> {
  const body = await response.text().catch(() => "")
  if (response.status === 403) {
    return new Error(
      `Microsoft rejected the request to ${whatWeTried} (403). The Graph app ` +
        `needs the User.ReadWrite.All and Organization.Read.All application ` +
        `permissions granted with admin consent in Entra.`
    )
  }
  return new Error(`Failed to ${whatWeTried}: ${response.status} ${body}`.trim())
}

/** GET /users/{upn}; null on 404. */
async function findM365UserByUpn(
  upn: string,
  accessToken: string
): Promise<GraphProvisionUser | null> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}?$select=id,userPrincipalName,assignedLicenses`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  )
  if (response.status === 404) return null
  if (!response.ok) {
    throw await graphProvisionError(response, "look up the student account")
  }
  return (await response.json()) as GraphProvisionUser
}

/** Resolve the Office 365 A1 for Students sku id from /subscribedSkus. */
async function resolveStudentLicenseSkuId(
  accessToken: string
): Promise<string> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber",
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  )
  if (!response.ok) {
    throw await graphProvisionError(response, "read the tenant's license SKUs")
  }
  const data = (await response.json()) as {
    value: Array<{ skuId: string; skuPartNumber: string }>
  }
  const wanted = STUDENT_LICENSE_PART_NUMBER.toLowerCase()
  // The env override may be a part number or a GUID — match either.
  const match = data.value.find(
    (s) =>
      s.skuPartNumber.toLowerCase() === wanted ||
      s.skuId.toLowerCase() === wanted
  )
  if (!match) {
    const available = data.value.map((s) => s.skuPartNumber).join(", ")
    throw new Error(
      `Couldn't find the student license SKU "${STUDENT_LICENSE_PART_NUMBER}". ` +
        `Available in this tenant: ${available || "(none)"}. Set ` +
        `M365_STUDENT_LICENSE_SKU to the correct part number or GUID.`
    )
  }
  return match.skuId
}

/** Random 16-char password meeting Entra complexity (all 4 character classes;
 *  ambiguous glyphs like 0/O/1/l excluded). */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const digit = "23456789"
  const symbol = "!@#$%^&*?"
  const all = upper + lower + digit + symbol
  const pick = (set: string) => set[randomInt(set.length)]
  const chars = [pick(upper), pick(lower), pick(digit), pick(symbol)]
  while (chars.length < 16) chars.push(pick(all))
  // Fisher–Yates shuffle so the guaranteed characters aren't always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

/** Ensure the student has an M365 account (created if absent) AND the Office
 *  365 A1 for Students license. Idempotent — safe to re-run after a partial
 *  failure: an existing account is reused and a missing license is filled in. */
export async function provisionStudentM365Account(input: {
  upn: string
  displayName: string
}): Promise<ProvisionResult> {
  const accessToken = await getGraphAccessToken()
  const upn = input.upn.trim().toLowerCase()

  const skuId = await resolveStudentLicenseSkuId(accessToken)
  let user = await findM365UserByUpn(upn, accessToken)
  let created = false
  let tempPassword: string | null = null

  if (!user) {
    tempPassword = generateTempPassword()
    const localPart = upn.split("@")[0] ?? upn
    const response = await fetch("https://graph.microsoft.com/v1.0/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        accountEnabled: true,
        displayName: input.displayName,
        mailNickname: localPart,
        userPrincipalName: upn,
        usageLocation: "US",
        passwordProfile: {
          password: tempPassword,
          forceChangePasswordNextSignIn: true,
        },
      }),
    })
    if (!response.ok) {
      throw await graphProvisionError(response, "create the student account")
    }
    user = (await response.json()) as GraphProvisionUser
    created = true
  }

  // Ensure the student license is assigned. Skip if already present so a
  // re-run on an existing, already-licensed account is a no-op.
  const hasLicense = (user.assignedLicenses ?? []).some(
    (l) => l.skuId.toLowerCase() === skuId.toLowerCase()
  )
  if (!hasLicense) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user.id)}/assignLicense`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          addLicenses: [{ skuId, disabledPlans: [] }],
          removeLicenses: [],
        }),
      }
    )
    if (!response.ok) {
      throw await graphProvisionError(
        response,
        "assign the Office 365 A1 for Students license"
      )
    }
  }

  return { upn, created, tempPassword }
}

// Push a profile photo TO Microsoft Graph for the given user. PUT to
// /users/{email}/photo/$value with the binary in the body.
//
// REQUIRES the Azure app to have `User.ReadWrite.All` granted with
// admin consent. The default HBA Graph Mailer app only has
// `User.Read.All`, which is enough for the M365 → SIS pull but not for
// this push. If the scope hasn't been granted, Graph returns 403 and
// we degrade gracefully (caller catches the thrown error).
//
// Use case: when an admin uploads a profile photo for a faculty
// member in the SIS, push it back to M365 so it also appears in
// Outlook + Teams + signatures.highbluffacademy.com (which reads
// from M365). Two-way sync without ever needing the user to upload
// twice.
//
// Returns a small status flag the caller can audit: "synced" |
// "skipped_permission" (we saw a 403, no panic) | "skipped_not_found"
// (the email doesn't exist in M365 — likely a non-HBA email, fine).
export type M365PhotoPushResult =
  | { ok: true; status: "synced" }
  | { ok: false; status: "skipped_permission" | "skipped_not_found" | "error"; message: string }

export async function pushPhotoToM365(
  userEmail: string,
  buffer: Buffer,
  contentType: string
): Promise<M365PhotoPushResult> {
  // Graph only accepts a handful of image MIME types for /photo/$value.
  // JPEG is universally accepted; for anything else we'd transcode
  // upstream. This function trusts the caller to pass an acceptable
  // type (the profile-photos pipeline always outputs WebP, which Graph
  // accepts via image/webp on modern tenants but sometimes complains.
  // If we see real-world rejections we can convert to JPEG just for
  // the M365 push.)
  const accessToken = await getGraphAccessToken()
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/photo/$value`

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
    cache: "no-store",
  })

  if (response.ok) return { ok: true, status: "synced" }

  const text = await response.text().catch(() => "")

  if (response.status === 403) {
    return {
      ok: false,
      status: "skipped_permission",
      message: "Graph push refused (403). The Azure app needs User.ReadWrite.All with admin consent for two-way photo sync.",
    }
  }
  if (response.status === 404) {
    return {
      ok: false,
      status: "skipped_not_found",
      message: `User ${userEmail} not found in M365.`,
    }
  }
  return {
    ok: false,
    status: "error",
    message: `Graph push failed: ${response.status} ${text}`,
  }
}

// Fetch a user's profile photo from Microsoft Graph. Returns the binary
// (always JPEG per Graph spec) or null if the user has no photo set.
// Requires User.Read.All app permission which we already have.
//
// Graph returns 404 for users without a photo (very common — most staff
// never set one). We treat that as "no photo, nothing to sync" rather
// than an error.
export async function fetchM365UserPhoto(
  userEmail: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const accessToken = await getGraphAccessToken()
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/photo/$value`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  if (response.status === 404) return null
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Failed to fetch M365 photo for ${userEmail}: ${response.status} ${text}`)
  }

  const arrayBuf = await response.arrayBuffer()
  const contentType = response.headers.get("content-type") || "image/jpeg"
  return { buffer: Buffer.from(arrayBuf), contentType }
}