# LeadFlow Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google Maps scraping via Playwright, lead enrichment via Pappers/Hunter.io/NeverBounce APIs, and automatic scoring to the LeadFlow monolith.

**Architecture:** All server-side in the Next.js monolith. Scraping runs via an API Route (streaming progress). Enrichment and scoring are server actions. New DB tables `scraping_jobs` and `enrichment_logs`. Playwright runs locally (not on Vercel).

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres), Playwright, Zod, shadcn/ui, Tailwind CSS, sonner toasts.

---

### Task 1: Database Migration — Add `scraping_jobs` and `enrichment_logs` tables

**Files:**
- Create: `supabase/migrations/002_phase2_tables.sql`
- Modify: `src/lib/supabase/types.ts` (add new table types)
- Modify: `src/lib/types.ts` (add new type exports)

**Step 1: Create the migration file**

Create `supabase/migrations/002_phase2_tables.sql`:
```sql
-- Scraping jobs table
create table scraping_jobs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  name text not null,
  source_type text not null default 'google_maps',
  config jsonb not null default '{}',
  status text not null check (status in ('pending', 'running', 'completed', 'failed')) default 'pending',
  results jsonb default '[]'::jsonb,
  total_results integer default 0,
  imported_results integer default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz
);

-- Enrichment logs table
create table enrichment_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  lead_id uuid references leads(id) on delete cascade,
  provider text not null,
  data jsonb default '{}'::jsonb,
  status text not null check (status in ('success', 'error', 'skipped')) default 'success'
);

-- Add email_verified column to leads for NeverBounce results
alter table leads add column if not exists email_verified text check (email_verified in ('valid', 'invalid', 'disposable', 'unknown'));

-- Add enriched_at column to leads to track last enrichment
alter table leads add column if not exists enriched_at timestamptz;

-- Indexes
create index scraping_jobs_status_idx on scraping_jobs (status);
create index scraping_jobs_created_at_idx on scraping_jobs (created_at);
create index enrichment_logs_lead_id_idx on enrichment_logs (lead_id);
create index enrichment_logs_provider_idx on enrichment_logs (provider);

-- RLS
alter table scraping_jobs enable row level security;
alter table enrichment_logs enable row level security;

create policy "Authenticated users can do everything on scraping_jobs"
  on scraping_jobs for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on enrichment_logs"
  on enrichment_logs for all
  to authenticated
  using (true)
  with check (true);
```

**Step 2: Run the migration in Supabase**

Go to Supabase Dashboard > SQL Editor > paste and run the migration above.

**Step 3: Update TypeScript types**

Add to `src/lib/supabase/types.ts` — inside `Tables`, after the `imports` block:
```ts
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
```

Also add `email_verified` and `enriched_at` to the `leads` table types:
- In `leads.Row`: add `email_verified: "valid" | "invalid" | "disposable" | "unknown" | null` and `enriched_at: string | null`
- In `leads.Insert`: add `email_verified?: ...` and `enriched_at?: ...`
- In `leads.Update`: add `email_verified?: ...` and `enriched_at?: ...`

**Step 4: Add type exports to `src/lib/types.ts`**

Add after existing exports:
```ts
export type ScrapingJob = Database["public"]["Tables"]["scraping_jobs"]["Row"]
export type ScrapingJobInsert = Database["public"]["Tables"]["scraping_jobs"]["Insert"]
export type EnrichmentLog = Database["public"]["Tables"]["enrichment_logs"]["Row"]

export type ScrapingJobStatus = "pending" | "running" | "completed" | "failed"
export const SCRAPING_JOB_STATUSES: ScrapingJobStatus[] = ["pending", "running", "completed", "failed"]

export type EmailVerified = "valid" | "invalid" | "disposable" | "unknown"
```

**Step 5: Update `.env.example`**

Add:
```env
PAPPERS_API_KEY=
HUNTER_API_KEY=
NEVERBOUNCE_API_KEY=
```

**Step 6: Commit**

```bash
git add supabase/migrations/002_phase2_tables.sql src/lib/supabase/types.ts src/lib/types.ts .env.example
git commit -m "feat: add scraping_jobs and enrichment_logs tables for Phase 2"
```

---

### Task 2: Scoring Engine

**Files:**
- Create: `src/lib/scoring.ts`
- Modify: `src/lib/actions/leads.ts` (auto-score on create/update)

**Step 1: Create the scoring module**

Create `src/lib/scoring.ts`:
```ts
import type { Lead } from "@/lib/types"

export interface ScoreBreakdown {
  total: number
  details: { criterion: string; points: number }[]
  category: "hot" | "warm" | "cold"
}

export function calculateScore(lead: Partial<Lead>): ScoreBreakdown {
  const details: { criterion: string; points: number }[] = []

  // Email: +20 if verified, +10 if present but not verified
  if (lead.email) {
    if (lead.email_verified === "valid") {
      details.push({ criterion: "Email vérifié", points: 20 })
    } else {
      details.push({ criterion: "Email présent", points: 10 })
    }
  }

  if (lead.phone) details.push({ criterion: "Téléphone", points: 10 })
  if (lead.first_name && lead.last_name) details.push({ criterion: "Nom complet", points: 10 })
  if (lead.company_name) details.push({ criterion: "Entreprise", points: 10 })
  if (lead.siren || lead.siret) details.push({ criterion: "SIREN/SIRET", points: 10 })
  if (lead.website) details.push({ criterion: "Site web", points: 5 })
  if (lead.linkedin_url) details.push({ criterion: "LinkedIn", points: 5 })
  if (lead.enriched_at) details.push({ criterion: "Enrichi Pappers", points: 10 })
  if (lead.sector) details.push({ criterion: "Secteur", points: 5 })
  if (lead.city) details.push({ criterion: "Ville", points: 5 })

  const total = Math.min(100, details.reduce((sum, d) => sum + d.points, 0))
  const category = total > 70 ? "hot" : total >= 40 ? "warm" : "cold"

  return { total, details, category }
}
```

**Step 2: Integrate scoring into lead create/update**

In `src/lib/actions/leads.ts`, add import at top:
```ts
import { calculateScore } from "@/lib/scoring"
```

In `createLead`, before the insert, add score calculation:
```ts
  const { total } = calculateScore(parsed.data as Partial<Lead>)
  const dataWithScore = { ...parsed.data, score: total }
```
Then use `dataWithScore` instead of `parsed.data` in the insert.

In `updateLead`, after parsing, fetch the current lead, merge, and recalculate:
```ts
  const supabase = await createClient()
  const { data: currentLead } = await supabase.from("leads").select("*").eq("id", id).single()
  if (!currentLead) return { error: "Lead introuvable" }

  const merged = { ...currentLead, ...parsed.data }
  const { total } = calculateScore(merged as Partial<Lead>)
  const dataWithScore = { ...parsed.data, score: total }
```
Then use `dataWithScore` instead of `parsed.data` in the update.

**Step 3: Commit**

```bash
git add src/lib/scoring.ts src/lib/actions/leads.ts
git commit -m "feat: add automatic lead scoring engine"
```

---

### Task 3: Install Playwright

**Step 1: Install Playwright package**

Run:
```bash
npm install playwright
```

Note: We only need `playwright` (not `@playwright/test`). This is for browser automation, not testing.

**Step 2: Install Chromium browser**

Run:
```bash
npx playwright install chromium
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Playwright for Google Maps scraping"
```

---

### Task 4: Google Maps Scraping Engine

**Files:**
- Create: `src/lib/scraping/google-maps.ts`

**Step 1: Create the scraping module**

Create `src/lib/scraping/google-maps.ts`:
```ts
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
```

**Step 2: Commit**

```bash
git add src/lib/scraping/google-maps.ts
git commit -m "feat: add Google Maps scraping engine with Playwright"
```

---

### Task 5: Scraping Server Actions

**Files:**
- Create: `src/lib/actions/scraping.ts`

**Step 1: Create scraping server actions**

Create `src/lib/actions/scraping.ts`:
```ts
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
```

**Step 2: Commit**

```bash
git add src/lib/actions/scraping.ts
git commit -m "feat: add scraping server actions (CRUD + import results)"
```

---

### Task 6: Scraping API Route (runs Playwright)

**Files:**
- Create: `src/app/api/scraping/google-maps/route.ts`

**Step 1: Create the API route**

Create `src/app/api/scraping/google-maps/route.ts`:
```ts
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
```

**Step 2: Commit**

```bash
git add src/app/api/scraping/google-maps/route.ts
git commit -m "feat: add Google Maps scraping API route"
```

---

### Task 7: Scraping UI — Job List + New Job Form

**Files:**
- Modify: `src/app/(app)/scraping/page.tsx`
- Create: `src/components/scraping/scraping-job-list.tsx`
- Create: `src/components/scraping/new-scraping-job.tsx`

**Step 1: Create the job list component**

Create `src/components/scraping/scraping-job-list.tsx`:
```tsx
"use client"

import type { ScrapingJob } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Eye } from "lucide-react"
import { deleteScrapingJob } from "@/lib/actions/scraping"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function ScrapingJobList({ jobs }: { jobs: ScrapingJob[] }) {
  const router = useRouter()

  async function handleDelete(id: string) {
    const result = await deleteScrapingJob(id)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Job supprimé")
      router.refresh()
    }
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucun job de scraping. Créez-en un pour commencer.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Jobs de scraping</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Requête</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Résultats</TableHead>
              <TableHead>Importés</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const config = job.config as { query?: string }
              return (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>{config.query ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[job.status] ?? ""}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.total_results}</TableCell>
                  <TableCell>{job.imported_results}</TableCell>
                  <TableCell>{new Date(job.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {job.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/scraping/${job.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create the new job form component**

Create `src/components/scraping/new-scraping-job.tsx`:
```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createScrapingJob } from "@/lib/actions/scraping"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"

export function NewScrapingJob() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [maxResults, setMaxResults] = useState(20)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !query) return

    setLoading(true)

    // 1. Create the job record
    const result = await createScrapingJob({ name, query, maxResults })
    if ("error" in result) {
      toast.error(result.error as string)
      setLoading(false)
      return
    }

    // 2. Launch scraping via API route
    setScraping(true)
    setProgress("Lancement du scraping...")

    try {
      const response = await fetch("/api/scraping/google-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: result.jobId, query, maxResults }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erreur lors du scraping")
      } else {
        toast.success(`${data.count} résultats trouvés !`)
        router.push(`/scraping/${result.jobId}`)
      }
    } catch {
      toast.error("Erreur réseau lors du scraping")
    } finally {
      setLoading(false)
      setScraping(false)
      setProgress("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau job de scraping</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du job</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Plombiers Paris 2024"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="query">Recherche Google Maps</Label>
            <Input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: plombier Paris"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxResults">Nombre max de résultats</Label>
            <Input
              id="maxResults"
              type="number"
              min={5}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            />
          </div>

          {scraping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {scraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Lancer le scraping
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Update the scraping page**

Replace `src/app/(app)/scraping/page.tsx`:
```tsx
export const dynamic = "force-dynamic"

import { getScrapingJobs } from "@/lib/actions/scraping"
import { ScrapingJobList } from "@/components/scraping/scraping-job-list"
import { NewScrapingJob } from "@/components/scraping/new-scraping-job"

export default async function ScrapingPage() {
  const jobs = await getScrapingJobs()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Scraping</h1>
      <NewScrapingJob />
      <ScrapingJobList jobs={jobs} />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/(app)/scraping/page.tsx src/components/scraping/
git commit -m "feat: add scraping UI with job list and new job form"
```

---

### Task 8: Scraping Results Page (preview + import)

**Files:**
- Create: `src/app/(app)/scraping/[id]/page.tsx`
- Create: `src/components/scraping/scraping-results.tsx`

**Step 1: Create the results component**

Create `src/components/scraping/scraping-results.tsx`:
```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ScrapingJob } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { importScrapingResults } from "@/lib/actions/scraping"
import { toast } from "sonner"
import { Download, Star } from "lucide-react"

interface GoogleMapsResult {
  name: string
  address: string
  phone: string
  website: string
  rating: number | null
  reviews_count: number | null
  category: string
}

export function ScrapingResults({ job }: { job: ScrapingJob }) {
  const router = useRouter()
  const results = (job.results ?? []) as GoogleMapsResult[]
  const [selected, setSelected] = useState<Set<number>>(new Set(results.map((_, i) => i)))
  const [importing, setImporting] = useState(false)

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map((_, i) => i)))
    }
  }

  function toggle(index: number) {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)

    const result = await importScrapingResults(job.id, Array.from(selected))
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success(`${result.imported} leads importés, ${result.duplicates} doublons ignorés`)
      router.push("/leads")
    }

    setImporting(false)
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucun résultat trouvé pour ce job.
          {job.error && <p className="mt-2 text-destructive">{job.error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length} résultats — {selected.size} sélectionnés
        </p>
        <Button onClick={handleImport} disabled={importing || selected.size === 0}>
          <Download className="mr-2 h-4 w-4" />
          {importing ? "Import en cours..." : `Importer ${selected.size} leads`}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Résultats</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === results.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Site web</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(idx)}
                      onCheckedChange={() => toggle(idx)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell>
                    {result.category && <Badge variant="outline">{result.category}</Badge>}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{result.address}</TableCell>
                  <TableCell>{result.phone}</TableCell>
                  <TableCell className="max-w-32 truncate">{result.website}</TableCell>
                  <TableCell>
                    {result.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {result.rating}
                        {result.reviews_count && (
                          <span className="text-xs text-muted-foreground">({result.reviews_count})</span>
                        )}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Create the results page**

Create `src/app/(app)/scraping/[id]/page.tsx`:
```tsx
import { getScrapingJob } from "@/lib/actions/scraping"
import { ScrapingResults } from "@/components/scraping/scraping-results"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function ScrapingJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let job
  try {
    job = await getScrapingJob(id)
  } catch {
    notFound()
  }

  const config = job.config as { query?: string }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/scraping"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{job.name}</h1>
          <p className="text-muted-foreground">Recherche : {config.query}</p>
        </div>
      </div>
      <ScrapingResults job={job} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(app)/scraping/[id]/ src/components/scraping/scraping-results.tsx
git commit -m "feat: add scraping results page with preview and import"
```

---

### Task 9: Enrichment Services — Pappers Client

**Files:**
- Create: `src/lib/enrichment/pappers.ts`

**Step 1: Create the Pappers client**

Create `src/lib/enrichment/pappers.ts`:
```ts
export interface PappersCompanyData {
  siren: string
  siret_siege: string
  denomination: string
  nom_entreprise: string
  code_naf: string
  libelle_code_naf: string
  tranche_effectif: string
  date_creation: string
  categorie_juridique: string
  dirigeants: Array<{ nom: string; prenom: string; fonction: string }>
  chiffre_affaires?: number
  effectifs?: string
  adresse_ligne_1?: string
  code_postal?: string
  ville?: string
}

export async function searchCompanyBySiren(siren: string): Promise<PappersCompanyData | null> {
  const apiKey = process.env.PAPPERS_API_KEY
  if (!apiKey) return null

  const url = `https://api.pappers.fr/v2/entreprise?api_token=${apiKey}&siren=${siren}`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function searchCompanyByName(name: string): Promise<PappersCompanyData | null> {
  const apiKey = process.env.PAPPERS_API_KEY
  if (!apiKey) return null

  const url = `https://api.pappers.fr/v2/recherche?api_token=${apiKey}&q=${encodeURIComponent(name)}&page=1&par_page=1`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (!data.resultats || data.resultats.length === 0) return null
    return data.resultats[0]
  } catch {
    return null
  }
}

export function mapPappersToLead(pappers: PappersCompanyData) {
  return {
    siren: pappers.siren ?? "",
    siret: pappers.siret_siege ?? "",
    sector: pappers.libelle_code_naf ?? "",
    company_size: pappers.tranche_effectif ?? pappers.effectifs ?? "",
    revenue: pappers.chiffre_affaires ? String(pappers.chiffre_affaires) : "",
    address: pappers.adresse_ligne_1 ?? "",
    postal_code: pappers.code_postal ?? "",
    city: pappers.ville ?? "",
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/enrichment/pappers.ts
git commit -m "feat: add Pappers API client for company enrichment"
```

---

### Task 10: Enrichment Services — Hunter.io Client

**Files:**
- Create: `src/lib/enrichment/hunter.ts`

**Step 1: Create the Hunter.io client**

Create `src/lib/enrichment/hunter.ts`:
```ts
export interface HunterEmailResult {
  email: string
  score: number
  first_name: string
  last_name: string
  position: string
  domain: string
}

export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string
): Promise<HunterEmailResult | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (!data.data?.email) return null
    return data.data
  } catch {
    return null
  }
}

/** Extract domain from a URL string */
export function extractDomain(website: string): string {
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`)
    return url.hostname.replace("www.", "")
  } catch {
    return website.replace("www.", "")
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/enrichment/hunter.ts
git commit -m "feat: add Hunter.io API client for email finding"
```

---

### Task 11: Enrichment Services — NeverBounce Client

**Files:**
- Create: `src/lib/enrichment/neverbounce.ts`

**Step 1: Create the NeverBounce client**

Create `src/lib/enrichment/neverbounce.ts`:
```ts
export type EmailVerificationResult = "valid" | "invalid" | "disposable" | "unknown"

export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  const apiKey = process.env.NEVERBOUNCE_API_KEY
  if (!apiKey) return "unknown"

  const url = `https://api.neverbounce.com/v4/single/check`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: apiKey, email }),
    })

    if (!response.ok) return "unknown"

    const data = await response.json()

    // NeverBounce result codes: 0=valid, 1=invalid, 2=disposable, 3=catchall, 4=unknown
    const resultMap: Record<number, EmailVerificationResult> = {
      0: "valid",
      1: "invalid",
      2: "disposable",
      3: "valid", // catch-all treated as valid
      4: "unknown",
    }

    return resultMap[data.result] ?? "unknown"
  } catch {
    return "unknown"
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/enrichment/neverbounce.ts
git commit -m "feat: add NeverBounce API client for email verification"
```

---

### Task 12: Enrichment Server Actions (pipeline)

**Files:**
- Create: `src/lib/actions/enrichment.ts`

**Step 1: Create enrichment server actions**

Create `src/lib/actions/enrichment.ts`:
```ts
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
```

**Step 2: Commit**

```bash
git add src/lib/actions/enrichment.ts
git commit -m "feat: add enrichment pipeline (Pappers + Hunter + NeverBounce)"
```

---

### Task 13: Enrichment UI — Page + Batch Controls

**Files:**
- Modify: `src/app/(app)/enrichment/page.tsx`
- Create: `src/components/enrichment/enrichment-panel.tsx`

**Step 1: Create the enrichment panel component**

Create `src/components/enrichment/enrichment-panel.tsx`:
```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Lead } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { enrichLeadsBatch } from "@/lib/actions/enrichment"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

export function EnrichmentPanel({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  async function handleEnrich() {
    if (selected.size === 0) return
    setEnriching(true)

    const results = await enrichLeadsBatch(Array.from(selected))
    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (successCount > 0) toast.success(`${successCount} leads enrichis`)
    if (failCount > 0) toast.error(`${failCount} erreurs`)

    setSelected(new Set())
    setEnriching(false)
    router.refresh()
  }

  const scoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    if (score > 70) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leads.length} leads — {selected.size} sélectionnés
        </p>
        <Button onClick={handleEnrich} disabled={enriching || selected.size === 0}>
          {enriching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enrichissement...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enrichir {selected.size > 0 ? `${selected.size} leads` : ""}
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Leads à enrichir</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === leads.length && leads.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Enrichi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggle(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {lead.first_name} {lead.last_name}
                  </TableCell>
                  <TableCell>{lead.company_name}</TableCell>
                  <TableCell>{lead.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={scoreColor(lead.score)}>
                      {lead.score ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.enriched_at
                      ? new Date(lead.enriched_at).toLocaleDateString("fr-FR")
                      : <span className="text-muted-foreground">Non</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Update the enrichment page**

Replace `src/app/(app)/enrichment/page.tsx`:
```tsx
export const dynamic = "force-dynamic"

import { getLeads } from "@/lib/actions/leads"
import { EnrichmentPanel } from "@/components/enrichment/enrichment-panel"

export default async function EnrichmentPage() {
  const { leads } = await getLeads({ perPage: 100 })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Enrichissement</h1>
      <p className="text-muted-foreground">
        Sélectionnez des leads pour les enrichir via Pappers, Hunter.io et NeverBounce.
      </p>
      <EnrichmentPanel leads={leads} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(app)/enrichment/page.tsx src/components/enrichment/
git commit -m "feat: add enrichment UI with batch selection and progress"
```

---

### Task 14: Add "Enrichir" button to lead detail page

**Files:**
- Modify: `src/app/(app)/leads/[id]/page.tsx`
- Create: `src/components/leads/enrich-button.tsx`

**Step 1: Create the enrich button component**

Create `src/components/leads/enrich-button.tsx`:
```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { enrichLead } from "@/lib/actions/enrichment"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

export function EnrichButton({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEnrich() {
    setLoading(true)
    const result = await enrichLead(leadId)

    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      const providers = result.results?.filter((r) => r.status === "success").map((r) => r.provider) ?? []
      toast.success(
        providers.length > 0
          ? `Enrichi via ${providers.join(", ")}`
          : "Aucune donnée trouvée"
      )
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleEnrich} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enrichissement...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Enrichir
        </>
      )}
    </Button>
  )
}
```

**Step 2: Update lead detail page**

Modify `src/app/(app)/leads/[id]/page.tsx` to add the button:
```tsx
import { getLead } from "@/lib/actions/leads"
import { LeadForm } from "@/components/leads/lead-form"
import { EnrichButton } from "@/components/leads/enrich-button"
import { notFound } from "next/navigation"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let lead
  try {
    lead = await getLead(id)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {lead.first_name} {lead.last_name}
        </h1>
        <EnrichButton leadId={lead.id} />
      </div>
      <LeadForm lead={lead} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/leads/enrich-button.tsx src/app/(app)/leads/[id]/page.tsx
git commit -m "feat: add Enrichir button to lead detail page"
```

---

### Task 15: Final — Build check + integration commit

**Step 1: Add env vars to `.env.local`**

Add (with empty values for now):
```env
PAPPERS_API_KEY=
HUNTER_API_KEY=
NEVERBOUNCE_API_KEY=
```

**Step 2: Run build check**

Run:
```bash
npm run build
```

Expected: Build succeeds. Fix any TypeScript or import errors.

**Step 3: Run lint**

Run:
```bash
npm run lint
```

Expected: No errors. Fix any lint issues.

**Step 4: Manual test**

1. Go to `/scraping` — verify new job form and empty job list render
2. Go to `/enrichment` — verify leads table renders with checkboxes
3. Go to `/leads/[id]` — verify "Enrichir" button appears
4. Create a lead manually — verify score is auto-calculated

**Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build and lint issues for Phase 2"
```
