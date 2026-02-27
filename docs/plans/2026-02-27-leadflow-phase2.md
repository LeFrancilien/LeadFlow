# LeadFlow Phase 2 - Scraping + Enrichissement + Scoring

## Vue d'ensemble

Phase 2 ajoute 3 modules au monolithe Next.js :
1. **Scraping Google Maps** via Playwright (headless browser)
2. **Enrichissement** via Pappers + Hunter.io + NeverBounce
3. **Scoring automatique** basé sur la complétude du profil

Architecture : tout côté serveur (API Routes + Server Actions). Lancement manuel uniquement. Dev local pour Playwright, Browserless.io pour la prod future.

## 1. Scraping Google Maps

### Flux utilisateur
1. `/scraping` → "Nouveau job"
2. Configure : requête (ex: "plombier Paris"), nombre max résultats (10-100)
3. Lance le job → barre de progression
4. Preview résultats → sélection → import comme leads
5. Déduplication par email/téléphone/nom entreprise

### Données extraites
- Nom entreprise, adresse, téléphone, site web
- Note Google, catégorie, horaires

### Architecture
- Table `scraping_jobs` : config, statut (pending/running/completed/failed), résultats (JSONB)
- API Route `/api/scraping/google-maps` : Playwright headless
- Pagination par batches de 10-20 pour éviter timeouts
- Playwright en local (pas compatible Vercel)

## 2. Enrichissement

### Sources

| Service | API | Données | Clé env |
|---|---|---|---|
| Pappers | api.pappers.fr | SIREN, SIRET, CA, effectifs, dirigeants, secteur NAF | `PAPPERS_API_KEY` |
| Hunter.io | api.hunter.io | Email pro (domaine + nom) | `HUNTER_API_KEY` |
| NeverBounce | api.neverbounce.com | Vérification email (valid/invalid/disposable) | `NEVERBOUNCE_API_KEY` |

### Flux
- Unitaire : bouton "Enrichir" sur fiche lead
- Batch : sélection depuis `/enrichment`

### Pipeline par lead
1. `company_name` ou `siren` → Pappers → données entreprise
2. `website` + `first_name` + `last_name` → Hunter.io → email pro
3. `email` trouvé → NeverBounce → vérification
4. Log chaque étape dans `enrichment_logs`

### Fichiers
- `src/lib/enrichment/pappers.ts`
- `src/lib/enrichment/hunter.ts`
- `src/lib/enrichment/neverbounce.ts`
- `src/lib/actions/enrichment.ts`

## 3. Scoring automatique

### Règles (0-100)

| Critère | Points |
|---|---|
| Email présent et vérifié | +20 |
| Email présent non vérifié | +10 |
| Téléphone présent | +10 |
| Nom complet (prénom + nom) | +10 |
| Entreprise renseignée | +10 |
| SIREN/SIRET présent | +10 |
| Site web présent | +5 |
| LinkedIn présent | +5 |
| Données Pappers enrichies | +10 |
| Secteur renseigné | +5 |
| Ville renseignée | +5 |

### Catégories
- Chaud : >70
- Tiède : 40-70
- Froid : <40

### Déclenchement
Recalcul automatique à chaque modification du lead (création, enrichissement, update).

### Fichier
- `src/lib/scoring.ts` → `calculateScore(lead): number`

## Tables DB à ajouter/modifier

### scraping_jobs (nouvelle)
```sql
CREATE TABLE scraping_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'google_maps',
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  results JSONB DEFAULT '[]',
  total_results INTEGER DEFAULT 0,
  imported_results INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### enrichment_logs (nouvelle)
```sql
CREATE TABLE enrichment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'success'
);
```

## Variables d'environnement
```env
PAPPERS_API_KEY=
HUNTER_API_KEY=
NEVERBOUNCE_API_KEY=
```
