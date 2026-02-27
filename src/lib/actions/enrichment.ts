"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { calculateScore } from "@/lib/scoring"
import { searchCompanyBySiren, searchCompanyByName, mapPappersToLead } from "@/lib/enrichment/pappers"
import { findEmail, extractDomain } from "@/lib/enrichment/hunter"
import { verifyEmail } from "@/lib/enrichment/neverbounce"
import type { Lead } from "@/lib/types"

async function logEnrichment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  provider: string,
  data: unknown,
  status: "success" | "error" | "skipped"
) {
  await supabase.from("enrichment_logs").insert({
    lead_id: leadId,
    provider,
    data: data as Record<string, unknown>,
    status,
  })
}

export async function enrichLead(leadId: string) {
  const supabase = await createClient()
  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).single()
  if (error || !lead) return { error: "Lead introuvable" }

  const updates: Record<string, unknown> = {}
  const results: { provider: string; status: string; data?: unknown }[] = []

  // 1. Pappers: enrich company data
  if (lead.siren || lead.company_name) {
    const pappers = lead.siren
      ? await searchCompanyBySiren(lead.siren)
      : await searchCompanyByName(lead.company_name!)

    if (pappers) {
      const mapped = mapPappersToLead(pappers)
      Object.assign(updates, mapped)
      await logEnrichment(supabase, leadId, "pappers", pappers, "success")
      results.push({ provider: "pappers", status: "success", data: mapped })
    } else {
      await logEnrichment(supabase, leadId, "pappers", null, "skipped")
      results.push({ provider: "pappers", status: "skipped" })
    }
  }

  // 2. Hunter.io: find email
  const website = (updates.website as string) || lead.website
  if (website && lead.first_name && lead.last_name && !lead.email) {
    const domain = extractDomain(website)
    const hunterResult = await findEmail(domain, lead.first_name, lead.last_name)

    if (hunterResult?.email) {
      updates.email = hunterResult.email
      await logEnrichment(supabase, leadId, "hunter", hunterResult, "success")
      results.push({ provider: "hunter", status: "success", data: { email: hunterResult.email } })
    } else {
      await logEnrichment(supabase, leadId, "hunter", null, "skipped")
      results.push({ provider: "hunter", status: "skipped" })
    }
  }

  // 3. NeverBounce: verify email
  const email = (updates.email as string) || lead.email
  if (email) {
    const verification = await verifyEmail(email)
    updates.email_verified = verification
    await logEnrichment(supabase, leadId, "neverbounce", { email, result: verification }, verification === "unknown" ? "skipped" : "success")
    results.push({ provider: "neverbounce", status: "success", data: { result: verification } })
  }

  // 4. Update lead with enriched data + new score
  updates.enriched_at = new Date().toISOString()
  const merged = { ...lead, ...updates }
  const { total } = calculateScore(merged as Partial<Lead>)
  updates.score = total

  const { error: updateError } = await supabase.from("leads").update(updates).eq("id", leadId)
  if (updateError) return { error: updateError.message }

  revalidatePath("/leads")
  revalidatePath(`/leads/${leadId}`)
  revalidatePath("/enrichment")
  return { success: true, results }
}

export async function enrichLeadsBatch(leadIds: string[]) {
  const results: { leadId: string; success: boolean; error?: string }[] = []

  for (const id of leadIds) {
    const result = await enrichLead(id)
    results.push({
      leadId: id,
      success: !("error" in result),
      error: "error" in result ? (result.error as string) : undefined,
    })
  }

  return results
}

export async function getEnrichmentLogs(leadId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("enrichment_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (leadId) query = query.eq("lead_id", leadId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
