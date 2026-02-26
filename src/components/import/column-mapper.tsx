"use client"

import { useState } from "react"
import { importLeads } from "@/lib/actions/import"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

const LEAD_FIELDS = [
  { value: "ignore", label: "-- Ignorer --" },
  { value: "first_name", label: "Prenom" },
  { value: "last_name", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telephone" },
  { value: "company_name", label: "Entreprise" },
  { value: "job_title", label: "Poste" },
  { value: "siren", label: "SIREN" },
  { value: "siret", label: "SIRET" },
  { value: "sector", label: "Secteur" },
  { value: "address", label: "Adresse" },
  { value: "city", label: "Ville" },
  { value: "postal_code", label: "Code postal" },
  { value: "country", label: "Pays" },
  { value: "website", label: "Site web" },
  { value: "linkedin_url", label: "LinkedIn" },
  { value: "notes", label: "Notes" },
]

interface ColumnMapperProps {
  headers: string[]
  data: Record<string, string>[]
  fileName: string
}

export function ColumnMapper({ headers, data, fileName }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const auto: Record<string, string> = {}
    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z]/g, "")
      const match = LEAD_FIELDS.find((f) => f.value !== "ignore" && f.value.replace("_", "").includes(lower))
      if (match) auto[h] = match.value
    })
    return auto
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: { row: number; error: string }[]; total: number } | null>(null)

  async function handleImport() {
    setLoading(true)
    const res = await importLeads(data, mapping)
    setResult(res)
    setLoading(false)
    toast.success(`${res.imported} lead(s) importe(s)`)
  }

  if (result) {
    return (
      <Card>
        <CardHeader><CardTitle>Resultat de l import</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p>Total : {result.total} lignes</p>
          <p className="text-green-600">Importes : {result.imported}</p>
          <p className="text-yellow-600">Doublons : {result.duplicates}</p>
          <p className="text-red-600">Erreurs : {result.errors.length}</p>
          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded border p-3 text-sm">
              {result.errors.map((e, i) => (
                <p key={i}>Ligne {e.row}: {e.error}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapping des colonnes - {fileName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{data.length} lignes detectees. Associez chaque colonne CSV a un champ lead.</p>
          <div className="grid grid-cols-2 gap-3">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-sm font-medium w-40 truncate">{h}</span>
                <Select value={mapping[h] ?? "ignore"} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Ignorer" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Apercu (5 premieres lignes)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => <TableCell key={h}>{row[h]}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleImport} disabled={loading} size="lg">
        {loading ? "Import en cours..." : `Importer ${data.length} lignes`}
      </Button>
    </div>
  )
}
