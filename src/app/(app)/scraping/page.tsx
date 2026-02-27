export const dynamic = "force-dynamic"

import { getScrapingJobs } from "@/lib/actions/scraping"
import { ScrapingJobList } from "@/components/scraping/scraping-job-list"
import { NewScrapingJob } from "@/components/scraping/new-scraping-job"

export default async function ScrapingPage() {
  const jobs = await getScrapingJobs()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Scraping</h1>
      <NewScrapingJob />
      <ScrapingJobList jobs={jobs} />
    </div>
  )
}
