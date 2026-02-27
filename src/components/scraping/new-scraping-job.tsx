"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createScrapingJob } from "@/lib/actions/scraping"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"

export function NewScrapingJob() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [maxResults, setMaxResults] = useState(20)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !query) return

    setLoading(true)

    // 1. Create the job record
    const result = await createScrapingJob({ name, query, maxResults })
    if ("error" in result) {
      toast.error(result.error as string)
      setLoading(false)
      return
    }

    // 2. Launch scraping via API route
    setScraping(true)
    setProgress("Lancement du scraping...")

    try {
      const response = await fetch("/api/scraping/google-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: result.jobId, query, maxResults }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erreur lors du scraping")
      } else {
        toast.success(`${data.count} résultats trouvés !`)
        router.push(`/scraping/${result.jobId}`)
      }
    } catch {
      toast.error("Erreur réseau lors du scraping")
    } finally {
      setLoading(false)
      setScraping(false)
      setProgress("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau job de scraping</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du job</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Plombiers Paris 2024"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="query">Recherche Google Maps</Label>
            <Input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: plombier Paris"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxResults">Nombre max de résultats</Label>
            <Input
              id="maxResults"
              type="number"
              min={5}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            />
          </div>

          {scraping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {scraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Lancer le scraping
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
