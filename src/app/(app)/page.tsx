export const dynamic = "force-dynamic"

import { getDashboardStats, getLeadsBySource, getLeadsByStatus, getRecentLeads } from "@/lib/actions/dashboard"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart"
import { LeadsByStatusChart } from "@/components/dashboard/leads-by-status-chart"
import { RecentLeads } from "@/components/dashboard/recent-leads"

export default async function DashboardPage() {
  const [stats, bySource, byStatus, recentLeads] = await Promise.all([
    getDashboardStats(),
    getLeadsBySource(),
    getLeadsByStatus(),
    getRecentLeads(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <KpiCards {...stats} />
      <div className="grid gap-6 md:grid-cols-2">
        <LeadsBySourceChart data={bySource} />
        <LeadsByStatusChart data={byStatus} />
      </div>
      <RecentLeads leads={recentLeads} />
    </div>
  )
}
