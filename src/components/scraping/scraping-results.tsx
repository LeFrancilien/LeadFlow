"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ScrapingJob } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { importScrapingResults } from "@/lib/actions/scraping"
import { toast } from "sonner"
import { Download, Star } from "lucide-react"

interface GoogleMapsResult {
  name: string
  address: string
  phone: string
  website: string
  rating: number | null
  reviews_count: number | null
  category: string
}

export function ScrapingResults({ job }: { job: ScrapingJob }) {
  const router = useRouter()
  const results = (job.results as unknown as GoogleMapsResult[]) ?? []
  const [selected, setSelected] = useState<Set<number>>(new Set(results.map((_, i) => i)))
  const [importing, setImporting] = useState(false)

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map((_, i) => i)))
    }
  }

  function toggle(index: number) {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)

    const result = await importScrapingResults(job.id, Array.from(selected))
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success(`${result.imported} leads importés, ${result.duplicates} doublons ignorés`)
      router.push("/leads")
    }

    setImporting(false)
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucun résultat trouvé pour ce job.
          {job.error && <p className="mt-2 text-destructive">{job.error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length} résultats — {selected.size} sélectionnés
        </p>
        <Button onClick={handleImport} disabled={importing || selected.size === 0}>
          <Download className="mr-2 h-4 w-4" />
          {importing ? "Import en cours..." : `Importer ${selected.size} leads`}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Résultats</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === results.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Site web</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(idx)}
                      onCheckedChange={() => toggle(idx)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell>
                    {result.category && <Badge variant="outline">{result.category}</Badge>}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{result.address}</TableCell>
                  <TableCell>{result.phone}</TableCell>
                  <TableCell className="max-w-32 truncate">{result.website}</TableCell>
                  <TableCell>
                    {result.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {result.rating}
                        {result.reviews_count && (
                          <span className="text-xs text-muted-foreground">({result.reviews_count})</span>
                        )}
                      </span>
                    )}
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
