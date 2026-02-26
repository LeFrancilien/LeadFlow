"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardStats() {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [totalResult, monthResult, convertedResult, scoreResult] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
    supabase.from("leads").select("score"),
  ])

  const total = totalResult.count ?? 0
  const thisMonth = monthResult.count ?? 0
  const converted = convertedResult.count ?? 0
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
  const scores = scoreResult.data?.map((l) => l.score ?? 0) ?? []
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return { total, thisMonth, conversionRate, avgScore }
}

export async function getLeadsBySource() {
  const supabase = await createClient()
  const { data } = await supabase.from("leads").select("source")
  if (!data) return []

  const counts: Record<string, number> = {}
  data.forEach((l) => { counts[l.source] = (counts[l.source] ?? 0) + 1 })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export async function getLeadsByStatus() {
  const supabase = await createClient()
  const { data } = await supabase.from("leads").select("status")
  if (!data) return []

  const counts: Record<string, number> = {}
  data.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1 })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export async function getRecentLeads() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("leads")
    .select("id, first_name, last_name, email, company_name, status, score, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  return data ?? []
}
