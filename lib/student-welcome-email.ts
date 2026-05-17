// Premium welcome email for newly-provisioned student M365 accounts.
//
// Used after the Gradelink migration to deliver each student's M365
// credentials. For many of these students this is the first message
// from HBA in years — the design needs to feel personal, polished,
// and unmistakably HBA, not transactional.
//
// Composition notes:
//   - Tables for layout (Outlook 2007+ still doesn't grok flexbox
//     or grid). Single 600px column, mobile-friendly.
//   - All CSS inline. Some clients (Gmail, Apple Mail iOS) strip
//     <style> tags or rewrite them aggressively.
//   - Logo served from the marketing site so it works regardless of
//     where the recipient opens the email. WebP is the modern path;
//     legacy Outlook may show alt text, which is fine.
//   - Brand color tokens pulled from siteConfig.brand so a PCI swap
//     in the future just changes the palette.
//
// The builder returns { subject, html } only — the actual sendMail
// call happens in the caller (so dry-run mode can preview to
// stdout/disk without sending).

import { brand, siteConfig } from "@/lib/site"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export type StudentWelcomeEmailInput = {
  /** Preferred name when set, else legal first name. Used in the greeting. */
  greeting_name: string
  /** Legal full name, used in the credentials box for clarity. */
  legal_full_name: string
  /** UPN — e.g. audrey.guo.28@highbluffacademy.com. */
  upn: string
  /** Temp password — exact string the student will paste. */
  temp_password: string
}

export function buildStudentWelcomeEmail(
  input: StudentWelcomeEmailInput
): { subject: string; html: string } {
  const subject = `Welcome to ${siteConfig.name} — your account is ready`

  const greeting = escapeHtml(input.greeting_name)
  const legalName = escapeHtml(input.legal_full_name)
  const upn = escapeHtml(input.upn)
  const tempPassword = escapeHtml(input.temp_password)
  const signInUrl = "https://office.com"

  // Hosted on the marketing site so the email works for every
  // recipient regardless of which mailbox / device opens it.
  const logoUrl = `${siteConfig.url}/images/hba/brand/hba-logo-color.webp`
  const tagline = escapeHtml(siteConfig.tagline)
  const phone = escapeHtml(siteConfig.contact.phone)
  const phoneTel = escapeHtml(siteConfig.contact.phoneTel)
  const addr = siteConfig.address
  const addressLine = escapeHtml(
    `${addr.streetLine1}, ${addr.locality}, ${addr.regionCode} ${addr.postalCode}`
  )
  const siteUrl = escapeHtml(siteConfig.url)
  const infoEmail = escapeHtml(siteConfig.contact.infoEmail)

  const social = siteConfig.social
  const socials: Array<{ label: string; url: string }> = []
  if (social.instagram?.url)
    socials.push({ label: "Instagram", url: social.instagram.url })
  if (social.facebook?.url)
    socials.push({ label: "Facebook", url: social.facebook.url })
  if (social.youtube?.url)
    socials.push({ label: "YouTube", url: social.youtube.url })
  if (social.linkedin?.url)
    socials.push({ label: "LinkedIn", url: social.linkedin.url })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d2433;">
<!-- preheader: shown as preview text in most clients, hidden in the body -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  Your ${escapeHtml(siteConfig.shortName)} account is ready. Sign in with your username and temporary password to get started.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1ea;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(31,63,102,0.08);">

        <!-- ============ HERO BAND ============ -->
        <tr>
          <td style="background:linear-gradient(135deg,${brand.navyDeep} 0%,${brand.navy} 70%,#2a5c8e 100%);padding:40px 32px 28px 32px;text-align:center;">
            <img src="${logoUrl}" alt="${escapeHtml(siteConfig.name)}" width="120" height="120" style="display:inline-block;width:120px;height:auto;border:0;outline:none;text-decoration:none;background:#ffffff;border-radius:50%;padding:14px;" />
            <p style="margin:24px 0 4px 0;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.7);font-weight:600;">${escapeHtml(siteConfig.shortName)} · Welcome</p>
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">Welcome to ${escapeHtml(siteConfig.name)}</h1>
          </td>
        </tr>

        <!-- ============ ORANGE ACCENT BAR ============ -->
        <tr>
          <td style="height:4px;background:${brand.orange};line-height:4px;font-size:0;">&nbsp;</td>
        </tr>

        <!-- ============ GREETING ============ -->
        <tr>
          <td style="padding:36px 40px 8px 40px;">
            <p style="margin:0 0 16px 0;font-size:17px;line-height:1.55;color:#1d2433;">Hi <strong>${greeting}</strong>,</p>
            <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#3a4a63;">Whether you're joining ${escapeHtml(siteConfig.shortName)} for the first time or returning after some time away, we're delighted to have you here. Your school account is set up and ready whenever you are.</p>
          </td>
        </tr>

        <!-- ============ CREDENTIALS CARD ============ -->
        <tr>
          <td style="padding:8px 40px 24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f4ef;border:1px solid #e8dfd0;border-radius:14px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${brand.navy};font-weight:700;">Your sign-in</p>
                  <p style="margin:0 0 18px 0;font-size:13px;color:#5a6577;">For <strong>${legalName}</strong></p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px;">
                  <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8a93a3;font-weight:600;">Username</p>
                  <p style="margin:0 0 18px 0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:15px;color:#1d2433;word-break:break-all;font-weight:600;">${upn}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;">
                  <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8a93a3;font-weight:600;">Temporary password</p>
                  <p style="margin:0 0 8px 0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:15px;color:#1d2433;background:#ffffff;border:1px dashed #c7b89d;border-radius:8px;padding:12px 14px;word-break:break-all;font-weight:600;letter-spacing:0.5px;">${tempPassword}</p>
                  <p style="margin:6px 0 0 0;font-size:12px;color:#6a7585;">You'll be asked to choose a new password the first time you sign in.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ============ CTA BUTTON ============ -->
        <tr>
          <td align="center" style="padding:8px 40px 32px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${brand.orange};border-radius:9999px;">
                  <a href="${signInUrl}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Sign in to your account →</a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0 0;font-size:12px;color:#6a7585;">Or visit <a href="${signInUrl}" style="color:${brand.navy};text-decoration:underline;">office.com</a> in your browser</p>
          </td>
        </tr>

        <!-- ============ WHAT YOU GET ============ -->
        <tr>
          <td style="padding:0 40px 32px 40px;">
            <p style="margin:0 0 14px 0;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:${brand.navy};font-weight:700;">What's included</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top" style="padding:0 0 14px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="top" width="36" style="padding-right:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:${brand.navy};color:#ffffff;font-size:16px;font-weight:700;line-height:32px;text-align:center;">T</div>
                      </td>
                      <td valign="top" style="font-size:15px;line-height:1.5;color:#3a4a63;">
                        <strong style="color:#1d2433;">Microsoft Teams</strong> — where you'll meet your teachers and classmates
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td valign="top" style="padding:0 0 14px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="top" width="36" style="padding-right:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:${brand.navy};color:#ffffff;font-size:16px;font-weight:700;line-height:32px;text-align:center;">O</div>
                      </td>
                      <td valign="top" style="font-size:15px;line-height:1.5;color:#3a4a63;">
                        <strong style="color:#1d2433;">Outlook email</strong> — your school inbox; we'll use this to reach you
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td valign="top" style="padding:0 0 14px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="top" width="36" style="padding-right:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:${brand.navy};color:#ffffff;font-size:16px;font-weight:700;line-height:32px;text-align:center;">D</div>
                      </td>
                      <td valign="top" style="font-size:15px;line-height:1.5;color:#3a4a63;">
                        <strong style="color:#1d2433;">OneDrive</strong> — your personal cloud storage for school work
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td valign="top" style="padding:0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="top" width="36" style="padding-right:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:${brand.navy};color:#ffffff;font-size:16px;font-weight:700;line-height:32px;text-align:center;">365</div>
                      </td>
                      <td valign="top" style="font-size:15px;line-height:1.5;color:#3a4a63;">
                        <strong style="color:#1d2433;">Microsoft 365</strong> — Word, Excel, PowerPoint, OneNote, all free for you
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ============ HELP ============ -->
        <tr>
          <td style="padding:0 40px 36px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ee;border-left:4px solid ${brand.orange};border-radius:6px;">
              <tr>
                <td style="padding:18px 22px;">
                  <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#1d2433;">Need help signing in?</p>
                  <p style="margin:0;font-size:14px;line-height:1.55;color:#3a4a63;">Just reply to this email — it goes straight to our office, and we usually get back to you within an hour during the school day.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ============ SIGNOFF ============ -->
        <tr>
          <td style="padding:0 40px 40px 40px;">
            <p style="margin:0 0 4px 0;font-size:15px;color:#3a4a63;">Welcome aboard,</p>
            <p style="margin:0;font-size:15px;color:#1d2433;font-weight:600;">The ${escapeHtml(siteConfig.name)} Team</p>
          </td>
        </tr>

        <!-- ============ FOOTER ============ -->
        <tr>
          <td style="background:${brand.navyDeep};padding:28px 40px;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;">${escapeHtml(siteConfig.name)}</p>
            <p style="margin:0 0 4px 0;font-size:12px;color:rgba(255,255,255,0.6);font-style:italic;">${tagline}</p>
            <p style="margin:14px 0 4px 0;font-size:12px;color:rgba(255,255,255,0.7);">${addressLine}</p>
            <p style="margin:0 0 14px 0;font-size:12px;color:rgba(255,255,255,0.7);">
              <a href="tel:${phoneTel}" style="color:rgba(255,255,255,0.85);text-decoration:none;">${phone}</a>
              &nbsp;·&nbsp;
              <a href="mailto:${infoEmail}" style="color:rgba(255,255,255,0.85);text-decoration:none;">${infoEmail}</a>
              &nbsp;·&nbsp;
              <a href="${siteUrl}" style="color:rgba(255,255,255,0.85);text-decoration:none;">highbluffacademy.com</a>
            </p>
            ${
              socials.length > 0
                ? `<p style="margin:8px 0 0 0;font-size:12px;color:rgba(255,255,255,0.6);">${socials
                    .map(
                      (s) =>
                        `<a href="${escapeHtml(s.url)}" style="color:rgba(255,255,255,0.75);text-decoration:none;margin:0 6px;">${escapeHtml(s.label)}</a>`
                    )
                    .join("·")}</p>`
                : ""
            }
          </td>
        </tr>

      </table>

      <p style="margin:18px 0 0 0;font-size:11px;color:#8a93a3;max-width:600px;line-height:1.55;">
        You're receiving this because an account was created for you in ${escapeHtml(siteConfig.name)}'s Microsoft 365 tenant. If you believe this was sent in error, please reply and let us know.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`

  return { subject, html }
}
