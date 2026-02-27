export type EmailVerificationResult = "valid" | "invalid" | "disposable" | "unknown"

export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  const apiKey = process.env.NEVERBOUNCE_API_KEY
  if (!apiKey) return "unknown"

  const url = `https://api.neverbounce.com/v4/single/check`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: apiKey, email }),
    })

    if (!response.ok) return "unknown"

    const data = await response.json()

    // NeverBounce result codes: 0=valid, 1=invalid, 2=disposable, 3=catchall, 4=unknown
    const resultMap: Record<number, EmailVerificationResult> = {
      0: "valid",
      1: "invalid",
      2: "disposable",
      3: "valid", // catch-all treated as valid
      4: "unknown",
    }

    return resultMap[data.result] ?? "unknown"
  } catch {
    return "unknown"
  }
}
