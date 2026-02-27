import { getScrapingJob } from "@/lib/actions/scraping"
import { ScrapingResults } from "@/components/scraping/scraping-results"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function ScrapingJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let job
  try {
    job = await getScrapingJob(id)
  } catch {
    notFound()
  }

  const config = job.config as { query?: string }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/scraping"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{job.name}</h1>
          <p className="text-muted-foreground">Recherche : {config.query}</p>
        </div>
      </div>
      <ScrapingResults job={job} />
    </div>
  )
}
