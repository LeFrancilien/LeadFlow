import { NextRequest, NextResponse } from "next/server"
import { scrapeGoogleMaps } from "@/lib/scraping/google-maps"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 300 // 5 minutes max (Vercel Pro)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const body = await request.json()
  const { jobId, query, maxResults = 20 } = body

  if (!jobId || !query) {
    return NextResponse.json({ error: "jobId et query requis" }, { status: 400 })
  }

  // Mark job as running
  await supabase.from("scraping_jobs").update({
    status: "running",
    started_at: new Date().toISOString(),
  }).eq("id", jobId)

  try {
    const results = await scrapeGoogleMaps(query, maxResults)

    await supabase.from("scraping_jobs").update({
      status: "completed",
      results,
      total_results: results.length,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId)

    return NextResponse.json({ success: true, results, count: results.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue"

    await supabase.from("scraping_jobs").update({
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
