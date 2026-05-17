// lib/email-signature.ts
//
// Server-side HTML signature for SIS-triggered emails (note to family
// on a status update, request-update request, contact reply, mass-email
// send), so the family sees who specifically reached out. Returns null
// when the admin has no faculty bio set up — the caller skips the
// append rather than show a half-rendered block.
//
// Why an inline template instead of rendering components/email-signatures
// /SignatureTemplate: that React component is shared with the public
// /email-signatures/<slug> page (which is correct), but importing
// react-dom/server from a module that also lands in server-component
// bundles trips Next.js's "don't include the server renderer in
// shared code" guard. The markup is small enough to maintain twice;
// the two are pure-template renders of the same data shape.
//
// Photo lives at /api/email-signatures/photo/<email>; the recipient's
// mail client fetches it on display so the signature stays current
// without re-embedding bytes.

import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"

type SignatureRow = {
  name: string | null
  title: string | null
  profile: { email: string } | null
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderSignatureHtml(args: {
  name: string
  title: string
  email: string
}): string {
  const { name, title, email } = args
  const photoUrl = `${siteConfig.url}/api/email-signatures/photo/${encodeURIComponent(email)}`
  const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`
  const logoUrl = `${siteConfig.url}/email-signatures/images/high_bluff_academy_wide_transparent.png`
  const iconBase = `${siteConfig.url}/email-signatures/images/icons`
  const addr = siteConfig.address

  return `
<div id="Signature" style="font-family:Calibri,Helvetica,sans-serif;font-size:11pt;color:#000">
  <table style="width:500px;background:#fff;color:rgb(72,95,133);border-collapse:collapse">
    <tbody>
      <tr>
        <td style="padding-right:20px;border-right:1.5px solid #c5cede;vertical-align:middle;text-align:center">
          <table style="width:223px;border-collapse:collapse"><tbody>
            <tr><td style="padding-bottom:10px">
              <img src="${photoUrl}" alt="${escapeHtml(name)}" width="87" style="width:87px;border-radius:50%;display:block;margin:0 auto" />
            </td></tr>
            <tr><td style="line-height:22.5px;color:#000;font-family:'Courier New',monospace">
              <span style="font-size:17.7px;font-weight:600">${escapeHtml(name)}<br /></span>
            </td></tr>
            <tr><td style="line-height:16.1px;padding-top:5px;color:#000;font-family:'Courier New',monospace">
              <span style="font-size:12.6px;font-weight:200;white-space:pre-line">${escapeHtml(title)}
at ${escapeHtml(siteConfig.name)}</span>
            </td></tr>
            <tr><td style="padding-top:12px">
              <a href="${teamsUrl}" target="_blank" style="text-decoration:none;display:inline-block">
                <table cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1.5px solid #c5cede;border-radius:999px;background:#fff;width:207px">
                  <tbody><tr>
                    <td style="padding:6px 6px 6px 11px;vertical-align:middle">
                      <img src="${iconBase}/teams.png" alt="Microsoft Teams" width="24" style="width:24px;height:24px;display:block;border:0" />
                    </td>
                    <td style="padding:6px 13px 6px 5px;vertical-align:middle;font-family:'Courier New',monospace;font-size:11px;color:#485f85;white-space:nowrap;font-weight:600;letter-spacing:.1px">
                      Chat me on Microsoft Teams
                    </td>
                  </tr></tbody>
                </table>
              </a>
            </td></tr>
          </tbody></table>
        </td>
        <td style="padding-left:20px;vertical-align:middle;text-align:center">
          <table style="width:233px;border-collapse:collapse;font-family:'Courier New',monospace;font-size:12.6px;color:#000"><tbody>
            <tr><td style="padding-bottom:5px">${escapeHtml(siteConfig.contact.phone)}</td></tr>
            <tr><td style="padding-bottom:5px">${escapeHtml(email)}</td></tr>
            <tr><td style="padding-bottom:5px">
              <a href="${siteConfig.url}" target="_blank" style="color:rgb(72,95,133);text-decoration:none">${escapeHtml(siteConfig.domain)}</a>
            </td></tr>
            <tr><td style="padding-top:5px">
              ${escapeHtml(addr.streetLine1)}<br />
              ${escapeHtml(addr.locality)}, ${escapeHtml(addr.regionCode)} ${escapeHtml(addr.postalCode)}
            </td></tr>
            <tr><td style="padding-top:10px">
              <a href="${siteConfig.url}" target="_blank">
                <img src="${logoUrl}" alt="${escapeHtml(siteConfig.name)} logo" width="165" style="width:165px;height:auto;margin:0 auto;display:block;border:0" />
              </a>
            </td></tr>
          </tbody></table>
        </td>
      </tr>
    </tbody>
  </table>
</div>`
}

export async function renderAdminSignatureHtml(
  adminEmail: string | null | undefined
): Promise<string | null> {
  if (!adminEmail) return null
  const normalized = adminEmail.trim().toLowerCase()
  if (!normalized) return null

  // The Graph mailer can fire with synthetic actor emails like
  // "system:stripe-webhook" — those aren't real profiles and we
  // shouldn't try to render a signature for them.
  if (normalized.startsWith("system:")) return null

  const { data, error } = await getServiceSupabase()
    .from("faculty_bios")
    .select("name, title, profile:profiles!inner(email)")
    .ilike("profile.email", normalized)
    .maybeSingle<SignatureRow>()
  if (error || !data || !data.name || !data.title || !data.profile?.email) {
    return null
  }

  // Use the standard "firstname@<domain>" convention the signature
  // pages use, not the M365 UPN (which is often "first.last.YY@..."
  // for students). For staff the UPN happens to match this anyway.
  const firstName = (data.name.split(/\s+/)[0] ?? "").toLowerCase()
  const photoEmail = firstName
    ? `${firstName}@${siteConfig.contact.emailDomain}`
    : data.profile.email

  const markup = renderSignatureHtml({
    name: data.name,
    title: data.title,
    email: photoEmail,
  })

  // Wrap in a thin top border + spacing so the signature visually
  // separates from the message body without depending on the email
  // body's own formatting choices.
  return `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">${markup}</div>`
}
