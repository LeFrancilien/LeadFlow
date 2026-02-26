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
