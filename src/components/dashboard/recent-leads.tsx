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
