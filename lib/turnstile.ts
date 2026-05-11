type TurnstileVerificationResult = {
  success: boolean
  "error-codes"?: string[]
}

const turnstileSecretKey =
  process.env.NODE_ENV === "production"
    ? getRequiredTurnstileSecret()
    : "1x0000000000000000000000000000000AA"

function getRequiredTurnstileSecret() {
  const value = process.env.TURNSTILE_SECRET_KEY

  if (!value) {
    throw new Error("TURNSTILE_SECRET_KEY is missing.")
  }

  return value
}

export async function verifyTurnstileToken(token: string, remoteIp?: string | null) {
  const formData = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token,
  })

  if (remoteIp) {
    formData.set("remoteip", remoteIp)
  }

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

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with status ${response.status}`)
  }

  const result = (await response.json()) as TurnstileVerificationResult

  return {
    success: result.success,
    errors: result["error-codes"] ?? [],
  }
}