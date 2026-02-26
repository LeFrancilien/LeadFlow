import type { Database } from "@/lib/supabase/types"

export type Lead = Database["public"]["Tables"]["leads"]["Row"]
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"]
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"]
export type Import = Database["public"]["Tables"]["imports"]["Row"]
export type ImportInsert = Database["public"]["Tables"]["imports"]["Insert"]

export type LeadType = "B2B" | "B2C"
export type LeadSource = "scraping" | "landing_page" | "import" | "manual"
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost"

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"]
export const LEAD_SOURCES: LeadSource[] = ["scraping", "landing_page", "import", "manual"]
export const LEAD_TYPES: LeadType[] = ["B2B", "B2C"]
