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
