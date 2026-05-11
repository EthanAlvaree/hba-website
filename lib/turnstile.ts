type TurnstileVerificationResult = {
  success: boolean
  "error-codes"?: string[]
}

const turnstileSecretKey =
  process.env.NODE_ENV === "production"
    ? getRequiredTurnstileSecret()
    : "1x0000000000000000000000000000000AA"

function getRequiredTurnstileSecret() {
  const rawValue = process.env.TURNSTILE_SECRET_KEY

  if (!rawValue) {
    throw new Error("TURNSTILE_SECRET_KEY is missing.")
  }

  const value = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2")

  if (!value) {
    throw new Error("TURNSTILE_SECRET_KEY is empty after sanitization.")
  }

  return value
}

export async function verifyTurnstileToken(token: string) {
  const formData = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token,
  })

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      cache: "no-store",
    }
  )

  let result: TurnstileVerificationResult | null = null

  try {
    result = (await response.json()) as TurnstileVerificationResult
  } catch {
    result = null
  }

  if (!response.ok) {
    return {
      success: false,
      errors: result?.["error-codes"] ?? [`siteverify-http-${response.status}`],
    }
  }

  return {
    success: result?.success === true,
    errors: result?.["error-codes"] ?? [],
  }
}