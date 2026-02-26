import { LeadForm } from "@/components/leads/lead-form"

export default function NewLeadPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Nouveau lead</h1>
      <LeadForm />
    </div>
  )
}
