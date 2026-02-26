# LeadFlow Phase 1 - Fondations + Dashboard + Leads

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the Next.js + Supabase project with auth, leads CRUD, dashboard with KPIs, and CSV import.

**Architecture:** Next.js 15 App Router monolith with Supabase for Postgres DB, auth, and file storage. Server Components by default, client components only when interactivity is needed. Tailwind CSS + shadcn/ui for the UI.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth + Storage), Zod, Recharts, TanStack Query, Vercel.

---

### Task 1: Project Setup - Next.js + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This scaffolds the entire project.

**Step 2: Verify the app runs**

Run: `npm run dev`
Expected: App starts on http://localhost:3000 with the Next.js default page.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with TypeScript and Tailwind"
```

---

### Task 2: Install and Configure shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/lib/utils.ts`
- Create: `components.json`

**Step 1: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init
```

Select: New York style, Zinc color, CSS variables: yes.

**Step 2: Install core components we'll need**

Run:
```bash
npx shadcn@latest add button card input label table badge dialog select textarea tabs separator dropdown-menu sheet sidebar toast sonner
```

**Step 3: Verify a component renders**

Edit `src/app/page.tsx`:
```tsx
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button>LeadFlow</Button>
    </main>
  )
}
```

Run: `npm run dev`
Expected: A styled button appears on the page.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure shadcn/ui with core components"
```

---

### Task 3: Supabase Setup + Database Schema

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `.env.local` (NOT committed)

**Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Create Supabase project**

Go to https://supabase.com/dashboard and create a new project named "LeadFlow".
Copy the project URL and anon key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

**Step 3: Create Supabase client utilities**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

Create `src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/lp") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

Create `src/middleware.ts`:
```ts
import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

**Step 4: Create database migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Leads table
create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  type text not null check (type in ('B2B', 'B2C')) default 'B2B',
  source text not null check (source in ('scraping', 'landing_page', 'import', 'manual')) default 'manual',
  status text not null check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')) default 'new',
  score integer default 0 check (score >= 0 and score <= 100),
  first_name text,
  last_name text,
  email text,
  phone text,
  company_name text,
  job_title text,
  siren text,
  siret text,
  company_size text,
  revenue text,
  sector text,
  address text,
  city text,
  postal_code text,
  country text default 'France',
  website text,
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  technologies jsonb default '[]'::jsonb,
  tags text[] default '{}',
  notes text,
  raw_data jsonb default '{}'::jsonb
);

-- Imports table
create table imports (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  filename text not null,
  file_url text,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  total_rows integer default 0,
  imported_rows integer default 0,
  duplicates integer default 0,
  errors jsonb default '[]'::jsonb
);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- Indexes
create index leads_email_idx on leads (email);
create index leads_status_idx on leads (status);
create index leads_source_idx on leads (source);
create index leads_type_idx on leads (type);
create index leads_score_idx on leads (score);
create index leads_created_at_idx on leads (created_at);
create index leads_company_name_idx on leads (company_name);
create index leads_siren_idx on leads (siren);

-- RLS
alter table leads enable row level security;
alter table imports enable row level security;

create policy "Authenticated users can do everything on leads"
  on leads for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on imports"
  on imports for all
  to authenticated
  using (true)
  with check (true);
```

**Step 5: Run the migration on Supabase**

Go to Supabase Dashboard > SQL Editor, paste the migration SQL, and run it.
Alternatively, if Supabase CLI is installed: `npx supabase db push`

**Step 6: Verify connection**

Edit `src/app/page.tsx` temporarily to test:
```tsx
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const { count } = await supabase.from("leads").select("*", { count: "exact", head: true })
  return <p>Leads count: {count ?? 0}</p>
}
```

Run: `npm run dev`
Expected: Page shows "Leads count: 0"

**Step 7: Commit**

```bash
git add -A -- ':!.env.local'
git commit -m "feat: configure Supabase with initial database schema"
```

---

### Task 4: Generate TypeScript Types from Supabase

**Files:**
- Create: `src/lib/supabase/types.ts`

**Step 1: Install Supabase CLI and generate types**

Run:
```bash
npm install -D supabase
npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
```

Replace `<your-project-id>` with the ID from your Supabase dashboard URL.

**Step 2: Create type helpers**

Create `src/lib/types.ts`:
```ts
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
```

**Step 3: Commit**

```bash
git add src/lib/supabase/types.ts src/lib/types.ts
git commit -m "feat: add Supabase TypeScript types and helpers"
```

---

### Task 5: Authentication - Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`

**Step 1: Create login page**

Create `src/app/login/page.tsx`:
```tsx
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">LeadFlow</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Create auth callback route**

Create `src/app/auth/callback/route.ts`:
```ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(origin)
}
```

**Step 3: Create your user in Supabase**

Go to Supabase Dashboard > Authentication > Users > Add User.
Create a user with your email and password.

**Step 4: Test login flow**

Run: `npm run dev`, go to http://localhost:3000
Expected: Redirected to /login. Login with credentials. Redirected to /.

**Step 5: Commit**

```bash
git add src/app/login/ src/app/auth/
git commit -m "feat: add authentication with login page"
```

---

### Task 6: App Layout with Sidebar Navigation

**Files:**
- Create: `src/components/app-sidebar.tsx`
- Create: `src/components/app-header.tsx`
- Create: `src/app/(app)/layout.tsx`
- Move: dashboard and other pages will go under `src/app/(app)/`

**Step 1: Create sidebar component**

Create `src/components/app-sidebar.tsx`:
```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Globe,
  FileUp,
  Sparkles,
  Mail,
  Download,
  Settings,
  FileText,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Scraping", href: "/scraping", icon: Globe },
  { title: "Landing Pages", href: "/landing-pages", icon: FileText },
  { title: "Import", href: "/import", icon: FileUp },
  { title: "Enrichissement", href: "/enrichment", icon: Sparkles },
  { title: "Campagnes", href: "/campaigns", icon: Mail },
  { title: "Export", href: "/export", icon: Download },
  { title: "Parametres", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

**Step 2: Create header component**

Create `src/components/app-header.tsx`:
```tsx
"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function AppHeader() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <SidebarTrigger />
      <Button variant="ghost" size="icon" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )
}
```

**Step 3: Create app layout with sidebar**

Create `src/app/(app)/layout.tsx`:
```tsx
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { Toaster } from "@/components/ui/sonner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}
```

**Step 4: Install lucide-react**

Run:
```bash
npm install lucide-react
```

**Step 5: Move the home page under (app)**

Create `src/app/(app)/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">Bienvenue sur LeadFlow</p>
    </div>
  )
}
```

Delete the old `src/app/page.tsx` (move it to trash).

**Step 6: Test layout**

Run: `npm run dev`, login, verify sidebar appears with all navigation items.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app layout with sidebar navigation"
```

---

### Task 7: Leads - Zod Schemas + Server Actions

**Files:**
- Create: `src/lib/schemas/lead.ts`
- Create: `src/lib/actions/leads.ts`

**Step 1: Install Zod**

Run:
```bash
npm install zod
```

**Step 2: Create Zod schemas for leads**

Create `src/lib/schemas/lead.ts`:
```ts
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
```

**Step 3: Create server actions for leads CRUD**

Create `src/lib/actions/leads.ts`:
```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { leadSchema } from "@/lib/schemas/lead"
import { revalidatePath } from "next/cache"

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

  const supabase = await createClient()
  const { error } = await supabase.from("leads").insert(parsed.data)

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
```

**Step 4: Commit**

```bash
git add src/lib/schemas/ src/lib/actions/
git commit -m "feat: add Zod schemas and server actions for leads CRUD"
```

---

### Task 8: Leads List Page

**Files:**
- Create: `src/app/(app)/leads/page.tsx`
- Create: `src/components/leads/leads-table.tsx`
- Create: `src/components/leads/leads-filters.tsx`

**Step 1: Create leads filters component**

Create `src/components/leads/leads-filters.tsx`:
```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LEAD_STATUSES, LEAD_SOURCES, LEAD_TYPES } from "@/lib/types"

export function LeadsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page")
    router.push(`/leads?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Rechercher..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="w-64"
      />
      <Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem>
          {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("source") ?? "all"} onValueChange={(v) => updateParam("source", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes sources</SelectItem>
          {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("type") ?? "all"} onValueChange={(v) => updateParam("type", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous types</SelectItem>
          {LEAD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
```

**Step 2: Create leads table component**

Create `src/components/leads/leads-table.tsx`:
```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import type { Lead } from "@/lib/types"
import { deleteLeads } from "@/lib/actions/leads"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  converted: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
}

const scoreColor = (score: number) => {
  if (score >= 70) return "text-green-600"
  if (score >= 40) return "text-yellow-600"
  return "text-red-600"
}

export function LeadsTable({ leads, total }: { leads: Lead[]; total: number }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggleAll = () => {
    setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id))
  }

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  async function handleDelete() {
    if (selected.length === 0) return
    const result = await deleteLeads(selected)
    if (result.error) {
      toast.error("Erreur lors de la suppression")
    } else {
      toast.success(`${selected.length} lead(s) supprime(s)`)
      setSelected([])
    }
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.length} selectionne(s)</span>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={selected.length === leads.length && leads.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun lead trouve
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggle(lead.id)} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.first_name} {lead.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.company_name}</TableCell>
                  <TableCell><Badge variant="outline">{lead.source}</Badge></TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status] ?? ""}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${scoreColor(lead.score ?? 0)}`}>{lead.score}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{total} lead(s) au total</p>
    </div>
  )
}
```

**Step 3: Create leads list page**

Create `src/app/(app)/leads/page.tsx`:
```tsx
import { getLeads } from "@/lib/actions/leads"
import { LeadsTable } from "@/components/leads/leads-table"
import { LeadsFilters } from "@/components/leads/leads-filters"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; source?: string; type?: string; page?: string }>
}) {
  const params = await searchParams
  const { leads, total } = await getLeads({
    search: params.search,
    status: params.status,
    source: params.source,
    type: params.type,
    page: params.page ? parseInt(params.page) : 1,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button asChild>
          <Link href="/leads/new"><Plus className="mr-2 h-4 w-4" /> Nouveau lead</Link>
        </Button>
      </div>
      <LeadsFilters />
      <LeadsTable leads={leads} total={total} />
    </div>
  )
}
```

**Step 4: Add checkbox to shadcn**

Run:
```bash
npx shadcn@latest add checkbox
```

**Step 5: Test the leads page**

Run: `npm run dev`, navigate to /leads.
Expected: Empty table with filters and "Nouveau lead" button.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add leads list page with filters and table"
```

---

### Task 9: Lead Creation + Edit Forms

**Files:**
- Create: `src/app/(app)/leads/new/page.tsx`
- Create: `src/app/(app)/leads/[id]/page.tsx`
- Create: `src/components/leads/lead-form.tsx`

**Step 1: Create lead form component**

Create `src/components/leads/lead-form.tsx`:
```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Lead } from "@/lib/types"
import { LEAD_TYPES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/types"
import { createLead, updateLead } from "@/lib/actions/leads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function LeadForm({ lead }: { lead?: Lead }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEdit = !!lead

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = Object.fromEntries(new FormData(e.currentTarget))
    const data = {
      ...formData,
      tags: formData.tags ? String(formData.tags).split(",").map((t) => t.trim()).filter(Boolean) : [],
      score: Number(formData.score) || 0,
    }

    const result = isEdit ? await updateLead(lead.id, data) : await createLead(data)

    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erreur de validation")
      setLoading(false)
      return
    }

    toast.success(isEdit ? "Lead mis a jour" : "Lead cree")
    router.push("/leads")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Identite</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prenom</Label>
            <Input id="first_name" name="first_name" defaultValue={lead?.first_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom</Label>
            <Input id="last_name" name="last_name" defaultValue={lead?.last_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telephone</Label>
            <Input id="phone" name="phone" defaultValue={lead?.phone ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Entreprise</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom entreprise</Label>
            <Input id="company_name" name="company_name" defaultValue={lead?.company_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Poste</Label>
            <Input id="job_title" name="job_title" defaultValue={lead?.job_title ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siren">SIREN</Label>
            <Input id="siren" name="siren" defaultValue={lead?.siren ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" name="siret" defaultValue={lead?.siret ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sector">Secteur</Label>
            <Input id="sector" name="sector" defaultValue={lead?.sector ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_size">Taille</Label>
            <Input id="company_size" name="company_size" defaultValue={lead?.company_size ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Adresse</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" name="address" defaultValue={lead?.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" defaultValue={lead?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Code postal</Label>
            <Input id="postal_code" name="postal_code" defaultValue={lead?.postal_code ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input id="country" name="country" defaultValue={lead?.country ?? "France"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Web & Reseaux sociaux</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input id="website" name="website" defaultValue={lead?.website ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input id="linkedin_url" name="linkedin_url" defaultValue={lead?.linkedin_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter_url">Twitter</Label>
            <Input id="twitter_url" name="twitter_url" defaultValue={lead?.twitter_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook_url">Facebook</Label>
            <Input id="facebook_url" name="facebook_url" defaultValue={lead?.facebook_url ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={lead?.type ?? "B2B"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select name="source" defaultValue={lead?.source ?? "manual"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select name="status" defaultValue={lead?.status ?? "new"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="score">Score (0-100)</Label>
            <Input id="score" name="score" type="number" min={0} max={100} defaultValue={lead?.score ?? 0} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="tags">Tags (separes par des virgules)</Label>
            <Input id="tags" name="tags" defaultValue={lead?.tags?.join(", ") ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea name="notes" rows={4} defaultValue={lead?.notes ?? ""} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : isEdit ? "Mettre a jour" : "Creer le lead"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
```

**Step 2: Create new lead page**

Create `src/app/(app)/leads/new/page.tsx`:
```tsx
import { LeadForm } from "@/components/leads/lead-form"

export default function NewLeadPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Nouveau lead</h1>
      <LeadForm />
    </div>
  )
}
```

**Step 3: Create lead detail/edit page**

Create `src/app/(app)/leads/[id]/page.tsx`:
```tsx
import { getLead } from "@/lib/actions/leads"
import { LeadForm } from "@/components/leads/lead-form"
import { notFound } from "next/navigation"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const lead = await getLead(id)
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">
          {lead.first_name} {lead.last_name}
        </h1>
        <LeadForm lead={lead} />
      </div>
    )
  } catch {
    notFound()
  }
}
```

**Step 4: Test lead creation**

Run: `npm run dev`, navigate to /leads/new, fill in the form, submit.
Expected: Lead created, redirected to /leads, lead appears in table.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add lead creation and edit forms"
```

---

### Task 10: Dashboard with KPIs and Charts

**Files:**
- Modify: `src/app/(app)/page.tsx`
- Create: `src/lib/actions/dashboard.ts`
- Create: `src/components/dashboard/kpi-cards.tsx`
- Create: `src/components/dashboard/leads-by-source-chart.tsx`
- Create: `src/components/dashboard/leads-by-status-chart.tsx`
- Create: `src/components/dashboard/recent-leads.tsx`

**Step 1: Install Recharts**

Run:
```bash
npm install recharts
```

**Step 2: Create dashboard server actions**

Create `src/lib/actions/dashboard.ts`:
```ts
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
```

**Step 3: Create KPI cards component**

Create `src/components/dashboard/kpi-cards.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, TrendingUp, Star } from "lucide-react"

interface KpiCardsProps {
  total: number
  thisMonth: number
  conversionRate: number
  avgScore: number
}

export function KpiCards({ total, thisMonth, conversionRate, avgScore }: KpiCardsProps) {
  const kpis = [
    { title: "Total leads", value: total.toLocaleString("fr-FR"), icon: Users },
    { title: "Ce mois", value: thisMonth.toLocaleString("fr-FR"), icon: UserPlus },
    { title: "Taux conversion", value: `${conversionRate}%`, icon: TrendingUp },
    { title: "Score moyen", value: `${avgScore}/100`, icon: Star },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 4: Create charts components**

Create `src/components/dashboard/leads-by-source-chart.tsx`:
```tsx
"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function LeadsBySourceChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Leads par source</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune donnee</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

Create `src/components/dashboard/leads-by-status-chart.tsx`:
```tsx
"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LeadsByStatusChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Leads par statut</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune donnee</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 5: Create recent leads component**

Create `src/components/dashboard/recent-leads.tsx`:
```tsx
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RecentLead {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  company_name: string | null
  status: string
  score: number | null
  created_at: string
}

export function RecentLeads({ leads }: { leads: RecentLead[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Leads recents</CardTitle></CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Aucun lead</p>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
                <div>
                  <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                  <p className="text-sm text-muted-foreground">{lead.email ?? lead.company_name}</p>
                </div>
                <Badge variant="outline">{lead.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 6: Assemble the dashboard page**

Update `src/app/(app)/page.tsx`:
```tsx
import { getDashboardStats, getLeadsBySource, getLeadsByStatus, getRecentLeads } from "@/lib/actions/dashboard"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart"
import { LeadsByStatusChart } from "@/components/dashboard/leads-by-status-chart"
import { RecentLeads } from "@/components/dashboard/recent-leads"

export default async function DashboardPage() {
  const [stats, bySource, byStatus, recentLeads] = await Promise.all([
    getDashboardStats(),
    getLeadsBySource(),
    getLeadsByStatus(),
    getRecentLeads(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <KpiCards {...stats} />
      <div className="grid gap-6 md:grid-cols-2">
        <LeadsBySourceChart data={bySource} />
        <LeadsByStatusChart data={byStatus} />
      </div>
      <RecentLeads leads={recentLeads} />
    </div>
  )
}
```

**Step 7: Test dashboard**

Run: `npm run dev`, navigate to /. Create a few leads first, then check the dashboard.
Expected: KPIs, charts, and recent leads display correctly.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with KPIs, charts, and recent leads"
```

---

### Task 11: CSV Import

**Files:**
- Create: `src/app/(app)/import/page.tsx`
- Create: `src/components/import/csv-uploader.tsx`
- Create: `src/components/import/column-mapper.tsx`
- Create: `src/lib/actions/import.ts`

**Step 1: Install CSV parser**

Run:
```bash
npm install papaparse
npm install -D @types/papaparse
```

**Step 2: Create import server action**

Create `src/lib/actions/import.ts`:
```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface ImportRow {
  [key: string]: string
}

interface ColumnMapping {
  [csvColumn: string]: string // maps to lead field
}

export async function importLeads(rows: ImportRow[], mapping: ColumnMapping, source: string = "import") {
  const supabase = await createClient()

  let imported = 0
  let duplicates = 0
  const errors: { row: number; error: string }[] = []

  // Create import record
  const { data: importRecord } = await supabase
    .from("imports")
    .insert({ filename: "csv-import", status: "processing", total_rows: rows.length })
    .select()
    .single()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lead: Record<string, string> = { source }

    // Apply mapping
    for (const [csvCol, leadField] of Object.entries(mapping)) {
      if (leadField && row[csvCol]) {
        lead[leadField] = row[csvCol]
      }
    }

    // Skip if no email and no company_name and no phone (no identifier)
    if (!lead.email && !lead.company_name && !lead.phone) {
      errors.push({ row: i + 1, error: "Aucun identifiant (email, entreprise ou telephone)" })
      continue
    }

    // Check for duplicates by email
    if (lead.email) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("email", lead.email)
        .limit(1)
        .single()

      if (existing) {
        duplicates++
        continue
      }
    }

    const { error } = await supabase.from("leads").insert(lead)
    if (error) {
      errors.push({ row: i + 1, error: error.message })
    } else {
      imported++
    }
  }

  // Update import record
  if (importRecord) {
    await supabase.from("imports").update({
      status: "completed",
      imported_rows: imported,
      duplicates,
      errors: errors as unknown as JSON,
    }).eq("id", importRecord.id)
  }

  revalidatePath("/leads")
  revalidatePath("/")
  return { imported, duplicates, errors, total: rows.length }
}
```

**Step 3: Create CSV uploader component**

Create `src/components/import/csv-uploader.tsx`:
```tsx
"use client"

import { useState, useCallback } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { ColumnMapper } from "./column-mapper"

export function CsvUploader() {
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState("")

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as Record<string, string>[]
        setCsvData(data)
        setHeaders(results.meta.fields ?? [])
      },
    })
  }, [])

  if (csvData.length > 0) {
    return <ColumnMapper headers={headers} data={csvData} fileName={fileName} />
  }

  return (
    <Card>
      <CardHeader><CardTitle>Importer un fichier CSV</CardTitle></CardHeader>
      <CardContent>
        <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer hover:bg-accent">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Cliquez pour selectionner un fichier CSV</p>
          <p className="text-sm text-muted-foreground mt-1">ou glissez-deposez</p>
          <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </label>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create column mapper component**

Create `src/components/import/column-mapper.tsx`:
```tsx
"use client"

import { useState } from "react"
import { importLeads } from "@/lib/actions/import"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

const LEAD_FIELDS = [
  { value: "", label: "-- Ignorer --" },
  { value: "first_name", label: "Prenom" },
  { value: "last_name", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telephone" },
  { value: "company_name", label: "Entreprise" },
  { value: "job_title", label: "Poste" },
  { value: "siren", label: "SIREN" },
  { value: "siret", label: "SIRET" },
  { value: "sector", label: "Secteur" },
  { value: "address", label: "Adresse" },
  { value: "city", label: "Ville" },
  { value: "postal_code", label: "Code postal" },
  { value: "country", label: "Pays" },
  { value: "website", label: "Site web" },
  { value: "linkedin_url", label: "LinkedIn" },
  { value: "notes", label: "Notes" },
]

interface ColumnMapperProps {
  headers: string[]
  data: Record<string, string>[]
  fileName: string
}

export function ColumnMapper({ headers, data, fileName }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const auto: Record<string, string> = {}
    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z]/g, "")
      const match = LEAD_FIELDS.find((f) => f.value && f.value.replace("_", "").includes(lower))
      if (match) auto[h] = match.value
    })
    return auto
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: { row: number; error: string }[]; total: number } | null>(null)

  async function handleImport() {
    setLoading(true)
    const res = await importLeads(data, mapping)
    setResult(res)
    setLoading(false)
    toast.success(`${res.imported} lead(s) importe(s)`)
  }

  if (result) {
    return (
      <Card>
        <CardHeader><CardTitle>Resultat de l'import</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p>Total : {result.total} lignes</p>
          <p className="text-green-600">Importes : {result.imported}</p>
          <p className="text-yellow-600">Doublons : {result.duplicates}</p>
          <p className="text-red-600">Erreurs : {result.errors.length}</p>
          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded border p-3 text-sm">
              {result.errors.map((e, i) => (
                <p key={i}>Ligne {e.row}: {e.error}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapping des colonnes - {fileName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{data.length} lignes detectees. Associez chaque colonne CSV a un champ lead.</p>
          <div className="grid grid-cols-2 gap-3">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-sm font-medium w-40 truncate">{h}</span>
                <Select value={mapping[h] ?? ""} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Ignorer" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_FIELDS.map((f) => <SelectItem key={f.value || "ignore"} value={f.value || "ignore"}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Apercu (5 premieres lignes)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => <TableCell key={h}>{row[h]}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleImport} disabled={loading} size="lg">
        {loading ? "Import en cours..." : `Importer ${data.length} lignes`}
      </Button>
    </div>
  )
}
```

**Step 5: Create import page**

Create `src/app/(app)/import/page.tsx`:
```tsx
import { CsvUploader } from "@/components/import/csv-uploader"

export default function ImportPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Import CSV</h1>
      <CsvUploader />
    </div>
  )
}
```

**Step 6: Test CSV import**

Create a test CSV file:
```csv
prenom,nom,email,entreprise,telephone
Jean,Dupont,jean@example.com,Acme Corp,0612345678
Marie,Martin,marie@example.com,Tech SA,0698765432
```

Run: `npm run dev`, navigate to /import, upload the CSV, map columns, import.
Expected: 2 leads imported, visible in /leads.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add CSV import with column mapping and deduplication"
```

---

### Task 12: Placeholder Pages for Future Phases

**Files:**
- Create: `src/app/(app)/scraping/page.tsx`
- Create: `src/app/(app)/landing-pages/page.tsx`
- Create: `src/app/(app)/enrichment/page.tsx`
- Create: `src/app/(app)/campaigns/page.tsx`
- Create: `src/app/(app)/export/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`

**Step 1: Create placeholder pages**

For each page, create a simple placeholder. Example for `src/app/(app)/scraping/page.tsx`:
```tsx
export default function ScrapingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Scraping</h1>
      <p className="text-muted-foreground">Bientot disponible - Phase 2</p>
    </div>
  )
}
```

Repeat the same pattern for: `landing-pages`, `enrichment`, `campaigns`, `export`, `settings` — adjusting title and phase number accordingly:
- Scraping → Phase 2
- Landing Pages → Phase 3
- Enrichment → Phase 2
- Campaigns → Phase 3
- Export → Phase 4
- Settings → `Parametres - Bientot disponible`

**Step 2: Test navigation**

Run: `npm run dev`, click each sidebar link.
Expected: All pages render without 404.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add placeholder pages for future phases"
```

---

### Task 13: Final Cleanup + Deploy Setup

**Files:**
- Create: `vercel.json` (if needed)
- Modify: `.env.local` → document required vars in `.env.example`

**Step 1: Create .env.example**

Create `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Step 2: Run lint and fix issues**

Run:
```bash
npm run lint
```

Fix any lint errors.

**Step 3: Run build**

Run:
```bash
npm run build
```

Fix any TypeScript or build errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: add env example and fix lint/build issues"
```

**Step 5: Deploy to Vercel**

Run:
```bash
npx vercel --prod
```

Or connect the GitHub repo at https://vercel.com/new and set the environment variables.

**Step 6: Push all to GitHub**

```bash
git push origin main
```
