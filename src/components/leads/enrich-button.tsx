"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { enrichLead } from "@/lib/actions/enrichment"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

export function EnrichButton({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEnrich() {
    setLoading(true)
    const result = await enrichLead(leadId)

    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      const providers = result.results?.filter((r) => r.status === "success").map((r) => r.provider) ?? []
      toast.success(
        providers.length > 0
          ? `Enrichi via ${providers.join(", ")}`
          : "Aucune donnée trouvée"
      )
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleEnrich} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enrichissement...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Enrichir
        </>
      )}
    </Button>
  )
}
