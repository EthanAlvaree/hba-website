const allowedAdminEmails = [
  "molly@highbluffacademy.com",
  "kristin@highbluffacademy.com",
  "ethan@highbluffacademy.com",
  "kun@highbluffacademy.com",
] as const

const allowedAdminEmailSet = new Set(allowedAdminEmails)

export const adminEmails = allowedAdminEmails

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) {
    return false
  }

  return allowedAdminEmailSet.has(email.toLowerCase() as (typeof allowedAdminEmails)[number])
}