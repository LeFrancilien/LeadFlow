export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          type: "B2B" | "B2C"
          source: "scraping" | "landing_page" | "import" | "manual"
          status: "new" | "contacted" | "qualified" | "converted" | "lost"
          score: number | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          company_name: string | null
          job_title: string | null
          siren: string | null
          siret: string | null
          company_size: string | null
          revenue: string | null
          sector: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          country: string | null
          website: string | null
          linkedin_url: string | null
          twitter_url: string | null
          facebook_url: string | null
          technologies: Json
          tags: string[]
          notes: string | null
          raw_data: Json
          email_verified: "valid" | "invalid" | "disposable" | "unknown" | null
          enriched_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          type?: "B2B" | "B2C"
          source?: "scraping" | "landing_page" | "import" | "manual"
          status?: "new" | "contacted" | "qualified" | "converted" | "lost"
          score?: number | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          company_name?: string | null
          job_title?: string | null
          siren?: string | null
          siret?: string | null
          company_size?: string | null
          revenue?: string | null
          sector?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          country?: string | null
          website?: string | null
          linkedin_url?: string | null
          twitter_url?: string | null
          facebook_url?: string | null
          technologies?: Json
          tags?: string[]
          notes?: string | null
          raw_data?: Json
          email_verified?: "valid" | "invalid" | "disposable" | "unknown" | null
          enriched_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          type?: "B2B" | "B2C"
          source?: "scraping" | "landing_page" | "import" | "manual"
          status?: "new" | "contacted" | "qualified" | "converted" | "lost"
          score?: number | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          company_name?: string | null
          job_title?: string | null
          siren?: string | null
          siret?: string | null
          company_size?: string | null
          revenue?: string | null
          sector?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          country?: string | null
          website?: string | null
          linkedin_url?: string | null
          twitter_url?: string | null
          facebook_url?: string | null
          technologies?: Json
          tags?: string[]
          notes?: string | null
          raw_data?: Json
          email_verified?: "valid" | "invalid" | "disposable" | "unknown" | null
          enriched_at?: string | null
        }
      }
      imports: {
        Row: {
          id: string
          created_at: string
          filename: string
          file_url: string | null
          status: "pending" | "processing" | "completed" | "failed"
          total_rows: number
          imported_rows: number
          duplicates: number
          errors: Json
        }
        Insert: {
          id?: string
          created_at?: string
          filename: string
          file_url?: string | null
          status?: "pending" | "processing" | "completed" | "failed"
          total_rows?: number
          imported_rows?: number
          duplicates?: number
          errors?: Json
        }
        Update: {
          id?: string
          created_at?: string
          filename?: string
          file_url?: string | null
          status?: "pending" | "processing" | "completed" | "failed"
          total_rows?: number
          imported_rows?: number
          duplicates?: number
          errors?: Json
        }
      }
      scraping_jobs: {
        Row: {
          id: string
          created_at: string
          name: string
          source_type: string
          config: Json
          status: "pending" | "running" | "completed" | "failed"
          results: Json
          total_results: number
          imported_results: number
          error: string | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          source_type?: string
          config?: Json
          status?: "pending" | "running" | "completed" | "failed"
          results?: Json
          total_results?: number
          imported_results?: number
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          source_type?: string
          config?: Json
          status?: "pending" | "running" | "completed" | "failed"
          results?: Json
          total_results?: number
          imported_results?: number
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      enrichment_logs: {
        Row: {
          id: string
          created_at: string
          lead_id: string
          provider: string
          data: Json
          status: "success" | "error" | "skipped"
        }
        Insert: {
          id?: string
          created_at?: string
          lead_id: string
          provider: string
          data?: Json
          status?: "success" | "error" | "skipped"
        }
        Update: {
          id?: string
          created_at?: string
          lead_id?: string
          provider?: string
          data?: Json
          status?: "success" | "error" | "skipped"
        }
      }
    }
  }
}
