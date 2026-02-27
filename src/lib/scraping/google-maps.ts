import { chromium, type Page } from "playwright"

export interface GoogleMapsResult {
  name: string
  address: string
  phone: string
  website: string
  rating: number | null
  reviews_count: number | null
  category: string
  place_url: string
}

async function autoScroll(page: Page, maxResults: number): Promise<void> {
  const feedSelector = 'div[role="feed"]'
  await page.waitForSelector(feedSelector, { timeout: 10000 })

  let previousCount = 0
  let sameCountTries = 0

  while (sameCountTries < 3) {
    const currentCount = await page.locator('div[role="feed"] > div > div > a').count()
    if (currentCount >= maxResults) break

    if (currentCount === previousCount) {
      sameCountTries++
    } else {
      sameCountTries = 0
    }
    previousCount = currentCount

    await page.evaluate((selector) => {
      const feed = document.querySelector(selector)
      if (feed) feed.scrollTop = feed.scrollHeight
    }, feedSelector)

    await page.waitForTimeout(1500)
  }
}

async function extractResults(page: Page, maxResults: number): Promise<GoogleMapsResult[]> {
  const results: GoogleMapsResult[] = []
  const items = page.locator('div[role="feed"] > div > div > a')
  const count = Math.min(await items.count(), maxResults)

  for (let i = 0; i < count; i++) {
    try {
      await items.nth(i).click()
      await page.waitForTimeout(1500)

      const name = await page.locator('h1.DUwDvf').textContent().catch(() => null)
      if (!name) continue

      const address = await page.locator('button[data-item-id="address"] div.fontBodyMedium').textContent().catch(() => "")
      const phone = await page.locator('button[data-item-id^="phone"] div.fontBodyMedium').textContent().catch(() => "")
      const website = await page.locator('a[data-item-id="authority"] div.fontBodyMedium').textContent().catch(() => "")
      const ratingText = await page.locator('div.F7nice span[aria-hidden="true"]').first().textContent().catch(() => null)
      const reviewsText = await page.locator('div.F7nice span span').textContent().catch(() => null)
      const category = await page.locator('button.DkEaL').textContent().catch(() => "")

      results.push({
        name: name.trim(),
        address: address?.trim() ?? "",
        phone: phone?.trim() ?? "",
        website: website?.trim() ?? "",
        rating: ratingText ? parseFloat(ratingText.replace(",", ".")) : null,
        reviews_count: reviewsText ? parseInt(reviewsText.replace(/[^0-9]/g, "")) : null,
        category: category?.trim() ?? "",
        place_url: page.url(),
      })
    } catch {
      continue
    }
  }

  return results
}

export async function scrapeGoogleMaps(
  query: string,
  maxResults: number = 20,
  onProgress?: (current: number, total: number) => void
): Promise<GoogleMapsResult[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    locale: "fr-FR",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  })
  const page = await context.newPage()

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`
    await page.goto(searchUrl, { waitUntil: "networkidle" })

    // Accept cookies if prompt appears
    const acceptBtn = page.locator('button:has-text("Tout accepter")')
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click()
      await page.waitForTimeout(1000)
    }

    await autoScroll(page, maxResults)
    onProgress?.(50, 100)

    const results = await extractResults(page, maxResults)
    onProgress?.(100, 100)

    return results
  } finally {
    await browser.close()
  }
}
