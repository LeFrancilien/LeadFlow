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
