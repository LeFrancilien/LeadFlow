import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, TrendingUp, Star } from "lucide-react"

interface KpiCardsProps {
  total: number
  thisMonth: number
  conversionRate: number
  avgScore: number
}

export function KpiCards({ total, thisMonth, conversionRate, avgScore }: KpiCardsProps) {
  const kpis = [
    { title: "Total leads", value: total.toLocaleString("fr-FR"), icon: Users },
    { title: "Ce mois", value: thisMonth.toLocaleString("fr-FR"), icon: UserPlus },
    { title: "Taux conversion", value: `${conversionRate}%`, icon: TrendingUp },
    { title: "Score moyen", value: `${avgScore}/100`, icon: Star },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
