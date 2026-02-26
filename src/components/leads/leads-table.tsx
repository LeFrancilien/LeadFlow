"use client"

import { useState } from "react"
import Link from "next/link"
import type { Lead } from "@/lib/types"
import { deleteLeads } from "@/lib/actions/leads"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  converted: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
}

const scoreColor = (score: number) => {
  if (score >= 70) return "text-green-600"
  if (score >= 40) return "text-yellow-600"
  return "text-red-600"
}

export function LeadsTable({ leads, total }: { leads: Lead[]; total: number }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggleAll = () => {
    setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id))
  }

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  async function handleDelete() {
    if (selected.length === 0) return
    const result = await deleteLeads(selected)
    if (result.error) {
      toast.error("Erreur lors de la suppression")
    } else {
      toast.success(`${selected.length} lead(s) supprime(s)`)
      setSelected([])
    }
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.length} selectionne(s)</span>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={selected.length === leads.length && leads.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun lead trouve
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggle(lead.id)} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.first_name} {lead.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.company_name}</TableCell>
                  <TableCell><Badge variant="outline">{lead.source}</Badge></TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status] ?? ""}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${scoreColor(lead.score ?? 0)}`}>{lead.score}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{total} lead(s) au total</p>
    </div>
  )
}
