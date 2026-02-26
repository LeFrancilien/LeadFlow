"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Lead } from "@/lib/types"
import { LEAD_TYPES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/types"
import { createLead, updateLead } from "@/lib/actions/leads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function LeadForm({ lead }: { lead?: Lead }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEdit = !!lead

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = Object.fromEntries(new FormData(e.currentTarget))
    const data = {
      ...formData,
      tags: formData.tags ? String(formData.tags).split(",").map((t) => t.trim()).filter(Boolean) : [],
      score: Number(formData.score) || 0,
    }

    const result = isEdit ? await updateLead(lead.id, data) : await createLead(data)

    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erreur de validation")
      setLoading(false)
      return
    }

    toast.success(isEdit ? "Lead mis a jour" : "Lead cree")
    router.push("/leads")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Identite</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prenom</Label>
            <Input id="first_name" name="first_name" defaultValue={lead?.first_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom</Label>
            <Input id="last_name" name="last_name" defaultValue={lead?.last_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telephone</Label>
            <Input id="phone" name="phone" defaultValue={lead?.phone ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Entreprise</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom entreprise</Label>
            <Input id="company_name" name="company_name" defaultValue={lead?.company_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Poste</Label>
            <Input id="job_title" name="job_title" defaultValue={lead?.job_title ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siren">SIREN</Label>
            <Input id="siren" name="siren" defaultValue={lead?.siren ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" name="siret" defaultValue={lead?.siret ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sector">Secteur</Label>
            <Input id="sector" name="sector" defaultValue={lead?.sector ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_size">Taille</Label>
            <Input id="company_size" name="company_size" defaultValue={lead?.company_size ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Adresse</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" name="address" defaultValue={lead?.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" defaultValue={lead?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Code postal</Label>
            <Input id="postal_code" name="postal_code" defaultValue={lead?.postal_code ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input id="country" name="country" defaultValue={lead?.country ?? "France"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Web et Reseaux sociaux</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input id="website" name="website" defaultValue={lead?.website ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input id="linkedin_url" name="linkedin_url" defaultValue={lead?.linkedin_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter_url">Twitter</Label>
            <Input id="twitter_url" name="twitter_url" defaultValue={lead?.twitter_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook_url">Facebook</Label>
            <Input id="facebook_url" name="facebook_url" defaultValue={lead?.facebook_url ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={lead?.type ?? "B2B"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select name="source" defaultValue={lead?.source ?? "manual"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select name="status" defaultValue={lead?.status ?? "new"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="score">Score (0-100)</Label>
            <Input id="score" name="score" type="number" min={0} max={100} defaultValue={lead?.score ?? 0} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="tags">Tags (separes par des virgules)</Label>
            <Input id="tags" name="tags" defaultValue={lead?.tags?.join(", ") ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea name="notes" rows={4} defaultValue={lead?.notes ?? ""} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : isEdit ? "Mettre a jour" : "Creer le lead"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
