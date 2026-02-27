import type { Lead } from "@/lib/types"

export interface ScoreBreakdown {
  total: number
  details: { criterion: string; points: number }[]
  category: "hot" | "warm" | "cold"
}

export function calculateScore(lead: Partial<Lead>): ScoreBreakdown {
  const details: { criterion: string; points: number }[] = []

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
