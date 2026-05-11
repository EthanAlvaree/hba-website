import { siteConfig } from "@/lib/site"
import type { ContactSubmissionRecord } from "@/lib/contact-submissions"

function getRequiredEnv(name: "GRAPH_CLIENT_ID" | "GRAPH_CLIENT_SECRET" | "GRAPH_TENANT_ID") {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is missing.`)
  }

  return value
}

const graphClientId = getRequiredEnv("GRAPH_CLIENT_ID")
const graphClientSecret = getRequiredEnv("GRAPH_CLIENT_SECRET")
const graphTenantId = getRequiredEnv("GRAPH_TENANT_ID")

const graphMailSender = process.env.GRAPH_MAIL_SENDER ?? `noreply@${siteConfig.contact.emailDomain}`
const notificationRecipients = (process.env.CONTACT_NOTIFICATION_TO ?? siteConfig.contact.infoEmail)
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean)

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

async function getGraphAccessToken() {
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
    `<p><strong>Name:</strong> ${escapeHtml(submission.name)}</p>`,
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
          subject: `New HBA contact form inquiry from ${submission.name}`,
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