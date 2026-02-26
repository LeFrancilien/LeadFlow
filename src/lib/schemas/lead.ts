import { z } from "zod"

export const leadSchema = z.object({
  type: z.enum(["B2B", "B2C"]).default("B2B"),
  source: z.enum(["scraping", "landing_page", "import", "manual"]).default("manual"),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).default("new"),
  score: z.coerce.number().min(0).max(100).default(0),
  first_name: z.string().optional().default(""),
  last_name: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  company_name: z.string().optional().default(""),
  job_title: z.string().optional().default(""),
  siren: z.string().optional().default(""),
  siret: z.string().optional().default(""),
  company_size: z.string().optional().default(""),
  revenue: z.string().optional().default(""),
  sector: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  country: z.string().optional().default("France"),
  website: z.string().url().optional().or(z.literal("")),
  linkedin_url: z.string().optional().default(""),
  twitter_url: z.string().optional().default(""),
  facebook_url: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
})

export type LeadFormData = z.infer<typeof leadSchema>
