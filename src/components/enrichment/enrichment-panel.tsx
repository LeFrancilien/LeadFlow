"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Lead } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { enrichLeadsBatch } from "@/lib/actions/enrichment"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

export function EnrichmentPanel({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  async function handleEnrich() {
    if (selected.size === 0) return
    setEnriching(true)

    const results = await enrichLeadsBatch(Array.from(selected))
    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (successCount > 0) toast.success(`${successCount} leads enrichis`)
    if (failCount > 0) toast.error(`${failCount} erreurs`)

    setSelected(new Set())
    setEnriching(false)
    router.refresh()
  }

  const scoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    if (score > 70) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leads.length} leads — {selected.size} sélectionnés
        </p>
        <Button onClick={handleEnrich} disabled={enriching || selected.size === 0}>
          {enriching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enrichissement...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enrichir {selected.size > 0 ? `${selected.size} leads` : ""}
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Leads à enrichir</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === leads.length && leads.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Enrichi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggle(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {lead.first_name} {lead.last_name}
                  </TableCell>
                  <TableCell>{lead.company_name}</TableCell>
                  <TableCell>{lead.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={scoreColor(lead.score)}>
                      {lead.score ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.enriched_at
                      ? new Date(lead.enriched_at).toLocaleDateString("fr-FR")
                      : <span className="text-muted-foreground">Non</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
