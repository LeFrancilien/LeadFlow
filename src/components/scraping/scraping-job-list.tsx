"use client"

import type { ScrapingJob } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Eye } from "lucide-react"
import { deleteScrapingJob } from "@/lib/actions/scraping"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function ScrapingJobList({ jobs }: { jobs: ScrapingJob[] }) {
  const router = useRouter()

  async function handleDelete(id: string) {
    const result = await deleteScrapingJob(id)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Job supprimé")
      router.refresh()
    }
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucun job de scraping. Créez-en un pour commencer.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Jobs de scraping</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Requête</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Résultats</TableHead>
              <TableHead>Importés</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const config = job.config as { query?: string }
              return (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>{config.query ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[job.status] ?? ""}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.total_results}</TableCell>
                  <TableCell>{job.imported_results}</TableCell>
                  <TableCell>{new Date(job.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {job.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/scraping/${job.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
