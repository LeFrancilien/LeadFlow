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
