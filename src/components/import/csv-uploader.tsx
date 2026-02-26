"use client"

import { useState, useCallback } from "react"
import Papa from "papaparse"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { ColumnMapper } from "./column-mapper"

export function CsvUploader() {
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState("")

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as Record<string, string>[]
        setCsvData(data)
        setHeaders(results.meta.fields ?? [])
      },
    })
  }, [])

  if (csvData.length > 0) {
    return <ColumnMapper headers={headers} data={csvData} fileName={fileName} />
  }

  return (
    <Card>
      <CardHeader><CardTitle>Importer un fichier CSV</CardTitle></CardHeader>
      <CardContent>
        <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer hover:bg-accent">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Cliquez pour selectionner un fichier CSV</p>
          <p className="text-sm text-muted-foreground mt-1">ou glissez-deposez</p>
          <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </label>
      </CardContent>
    </Card>
  )
}
