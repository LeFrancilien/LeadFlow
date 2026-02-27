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

export type ScrapingJob = Database["public"]["Tables"]["scraping_jobs"]["Row"]
export type ScrapingJobInsert = Database["public"]["Tables"]["scraping_jobs"]["Insert"]
export type EnrichmentLog = Database["public"]["Tables"]["enrichment_logs"]["Row"]

export type ScrapingJobStatus = "pending" | "running" | "completed" | "failed"
export const SCRAPING_JOB_STATUSES: ScrapingJobStatus[] = ["pending", "running", "completed", "failed"]

export type EmailVerified = "valid" | "invalid" | "disposable" | "unknown"
