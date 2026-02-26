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
