export const dynamic = "force-dynamic"

import { CsvUploader } from "@/components/import/csv-uploader"

export default function ImportPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Import CSV</h1>
      <CsvUploader />
    </div>
  )
}
