export interface HunterEmailResult {
  email: string
  score: number
  first_name: string
  last_name: string
  position: string
  domain: string
}

export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string
): Promise<HunterEmailResult | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (!data.data?.email) return null
    return data.data
  } catch {
    return null
  }
}

/** Extract domain from a URL string */
export function extractDomain(website: string): string {
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`)
    return url.hostname.replace("www.", "")
  } catch {
    return website.replace("www.", "")
  }
}
