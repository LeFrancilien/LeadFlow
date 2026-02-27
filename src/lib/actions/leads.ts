"use server"

import { createClient } from "@/lib/supabase/server"
import { leadSchema } from "@/lib/schemas/lead"
import { revalidatePath } from "next/cache"
import { calculateScore } from "@/lib/scoring"
import type { Lead } from "@/lib/types"

export async function getLeads(params?: {
  search?: string
  status?: string
  source?: string
  type?: string
  page?: number
  perPage?: number
}) {
  const supabase = await createClient()
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (params?.search) {
    query = query.or(
      `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%,company_name.ilike.%${params.search}%`
    )
  }
  if (params?.status) query = query.eq("status", params.status)
  if (params?.source) query = query.eq("source", params.source)
  if (params?.type) query = query.eq("type", params.type)

  const { data, count, error } = await query

  if (error) throw error
  return { leads: data ?? [], total: count ?? 0 }
}

export async function getLead(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export async function createLead(formData: unknown) {
  const parsed = leadSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { total } = calculateScore(parsed.data as unknown as Partial<Lead>)
  const dataWithScore = { ...parsed.data, score: total }

  const supabase = await createClient()
  const { error } = await supabase.from("leads").insert(dataWithScore)

  if (error) return { error: error.message }
  revalidatePath("/leads")
  return { success: true }
}

export async function updateLead(id: string, formData: unknown) {
  const parsed = leadSchema.partial().safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.from("leads").update(parsed.data).eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/leads")
  revalidatePath(`/leads/${id}`)
  return { success: true }
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("leads").delete().eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/leads")
  return { success: true }
}

export async function deleteLeads(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.from("leads").delete().in("id", ids)

  if (error) return { error: error.message }
  revalidatePath("/leads")
  return { success: true }
}
