# LeadFlow - Design Document

## Vue d'ensemble

Application de generation de leads B2B/B2C pour usage personnel (Cyril DE LA RUE). Collecte via scraping, landing pages, import CSV. Enrichissement, scoring, campagnes email/SMS, export CRM.

## Architecture

- **Approche** : Monolithe Next.js + Supabase
- **Deploiement** : Vercel
- **DB / Auth / Storage** : Supabase (Postgres)

```
┌─────────────────────────────────────┐
│         Next.js App (App Router)    │
├──────────┬──────────┬───────────────┤
│ Frontend │ API Routes│ Cron Jobs    │
│ (React)  │ (scraping,│ (enrichment, │
│          │ enrichment│  campaigns)  │
│          │ import)   │              │
├──────────┴──────────┴───────────────┤
│            Supabase                  │
│  (Postgres + Auth + Storage)         │
└──────────────────────────────────────┘
```

## Stack technique

| Couche | Techno |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| DB / Auth / Storage | Supabase |
| Scraping | Playwright + Cheerio |
| Enrichissement email | Pattern matching + verification SMTP |
| Donnees entreprise | API Pappers |
| Detection technos | Wappalyzer |
| Email | Nodemailer + SMTP (Brevo/Mailgun) |
| SMS | Twilio |
| Graphiques | Recharts |
| Landing page builder | React DnD + templates |
| Cron / Jobs | Vercel Cron |
| Deploiement | Vercel |
| Validations | Zod |
| State | React Server Components + TanStack Query |

## Modele de donnees

### leads
- id, created_at, updated_at
- type (B2B | B2C), source (scraping | landing_page | import | manual)
- status (new | contacted | qualified | converted | lost), score (0-100)
- first_name, last_name, email, phone
- company_name, job_title, siren, siret, company_size, revenue, sector
- address, city, postal_code, country
- website, linkedin_url, twitter_url, facebook_url
- technologies (jsonb), tags (text[]), notes (text), raw_data (jsonb)

### scraping_jobs
- id, name, source_type, config (jsonb), status, last_run, schedule

### landing_pages
- id, name, slug, template, config (jsonb), published, visits, conversions

### campaigns
- id, name, type (email | sms), status, config (jsonb), scheduled_at

### campaign_leads
- campaign_id, lead_id, status (pending | sent | opened | clicked | replied)

### imports
- id, filename, file_url, status, total_rows, imported_rows, duplicates, errors (jsonb)

### enrichment_logs
- id, lead_id, provider, data (jsonb), created_at

## Pages et navigation

```
/                     -> Dashboard
/leads                -> Liste des leads
/leads/[id]           -> Fiche lead
/scraping             -> Jobs de scraping
/scraping/new         -> Nouveau job
/landing-pages        -> Liste landing pages
/landing-pages/[id]   -> Editeur landing page
/lp/[slug]            -> Landing page publique
/import               -> Import CSV
/enrichment           -> Enrichissement batch
/campaigns            -> Liste campagnes
/campaigns/new        -> Nouvelle campagne
/campaigns/[id]       -> Detail campagne
/export               -> Export et integrations
/settings             -> Configuration
```

## Fonctionnalites

### Dashboard
- KPIs : total leads, leads/mois, taux conversion, score moyen
- Graphiques : leads par source, statut, evolution temporelle
- Leads recents avec recherche/filtres

### Scraping
- Google Maps, LinkedIn, annuaires, sites custom
- Selecteurs CSS configurables
- Planification ponctuelle ou recurrente
- Deduplication automatique

### Landing Page Builder
- Templates (formulaire simple, quiz, multi-etapes)
- Editeur drag & drop
- Hebergement sur /lp/[slug]
- Tracking visites/conversions

### Import CSV
- Upload, mapping colonnes, previsualisation
- Deduplication par email/telephone/SIREN
- Rapport d'import

### Enrichissement
- Email par pattern + verification SMTP
- Donnees entreprise via API Pappers
- Detection technos via Wappalyzer
- Batch ou unitaire

### Scoring
- Score auto : completude profil, source, engagement, donnees entreprise
- Regles configurables
- Chaud (>70) / Tiede (40-70) / Froid (<40)

### Campagnes
- Email via SMTP (Brevo/Mailgun), templates, personnalisation
- SMS via Twilio
- Export vers Mailchimp, Brevo, Lemlist
- Sequences multi-etapes
- Tracking : ouverture, clic, reponse

### Export
- CSV, Excel
- Integration CRM (Hubspot, Pipedrive)

## Phasage

### Phase 1 - Fondations + Dashboard + Leads
- Setup projet, auth, modele de donnees, CRUD leads, dashboard, import CSV

### Phase 2 - Scraping + Enrichissement
- Moteur scraping, planification, deduplication, enrichissement, scoring

### Phase 3 - Landing Pages + Campagnes
- Builder, tracking, campagnes email/SMS, export outils externes

### Phase 4 - Export + Integrations + Polish
- Export CSV/Excel, CRM, optimisations UI/UX, graphiques avances
