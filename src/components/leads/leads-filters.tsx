"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LEAD_STATUSES, LEAD_SOURCES, LEAD_TYPES } from "@/lib/types"

export function LeadsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page")
    router.push(`/leads?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Rechercher..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="w-64"
      />
      <Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem>
          {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("source") ?? "all"} onValueChange={(v) => updateParam("source", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes sources</SelectItem>
          {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("type") ?? "all"} onValueChange={(v) => updateParam("type", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous types</SelectItem>
          {LEAD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
