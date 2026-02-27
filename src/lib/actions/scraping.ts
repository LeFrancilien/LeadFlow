"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { calculateScore } from "@/lib/scoring"
import type { Lead } from "@/lib/types"

export async function getScrapingJobs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scraping_jobs")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getScrapingJob(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scraping_jobs")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createScrapingJob(data: { name: string; query: string; maxResults: number }) {
  const supabase = await createClient()
  const { data: job, error } = await supabase
    .from("scraping_jobs")
    .insert({
      name: data.name,
      source_type: "google_maps",
      config: { query: data.query, maxResults: data.maxResults },
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath("/scraping")
  return { success: true, jobId: job.id }
}

export async function updateScrapingJobStatus(
  id: string,
  status: "pending" | "running" | "completed" | "failed",
  extra?: { results?: unknown[]; total_results?: number; error?: string }
) {
  const supabase = await createClient()
  const update: Record<string, unknown> = { status }

  if (status === "running") update.started_at = new Date().toISOString()
  if (status === "completed" || status === "failed") update.completed_at = new Date().toISOString()
  if (extra?.results) update.results = extra.results
  if (extra?.total_results !== undefined) update.total_results = extra.total_results
  if (extra?.error) update.error = extra.error

  const { error } = await supabase.from("scraping_jobs").update(update).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/scraping")
  return { success: true }
}

export async function importScrapingResults(jobId: string, selectedIndices: number[]) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from("scraping_jobs")
    .select("results")
    .eq("id", jobId)
    .single()

  if (!job) return { error: "Job introuvable" }

  const results = (job.results as Array<Record<string, string>>) ?? []
  let imported = 0
  let duplicates = 0

  for (const idx of selectedIndices) {
    const result = results[idx]
    if (!result) continue

    // Deduplicate by company_name + phone
    if (result.phone) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", result.phone)
        .limit(1)
        .single()
      if (existing) { duplicates++; continue }
    }
    if (result.name) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("company_name", result.name)
        .limit(1)
        .single()
      if (existing) { duplicates++; continue }
    }

    const leadData = {
      company_name: result.name ?? "",
      address: result.address ?? "",
      phone: result.phone ?? "",
      website: result.website ?? "",
      sector: result.category ?? "",
      source: "scraping" as const,
      type: "B2B" as const,
      status: "new" as const,
      raw_data: result,
    }

    const { total } = calculateScore(leadData as unknown as Partial<Lead>)
    const { error } = await supabase.from("leads").insert({ ...leadData, score: total })

    if (!error) imported++
  }

  await supabase.from("scraping_jobs").update({ imported_results: imported }).eq("id", jobId)

  revalidatePath("/leads")
  revalidatePath("/scraping")
  return { imported, duplicates, total: selectedIndices.length }
}

export async function deleteScrapingJob(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("scraping_jobs").delete().eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/scraping")
  return { success: true }
}
