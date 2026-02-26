"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface ImportRow {
  [key: string]: string
}

interface ColumnMapping {
  [csvColumn: string]: string
}

export async function importLeads(rows: ImportRow[], mapping: ColumnMapping, source: string = "import") {
  const supabase = await createClient()

  let imported = 0
  let duplicates = 0
  const errors: { row: number; error: string }[] = []

  const { data: importRecord } = await supabase
    .from("imports")
    .insert({ filename: "csv-import", status: "processing", total_rows: rows.length })
    .select()
    .single()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lead: Record<string, string> = { source }

    for (const [csvCol, leadField] of Object.entries(mapping)) {
      if (leadField && leadField !== "ignore" && row[csvCol]) {
        lead[leadField] = row[csvCol]
      }
    }

    if (!lead.email && !lead.company_name && !lead.phone) {
      errors.push({ row: i + 1, error: "Aucun identifiant (email, entreprise ou telephone)" })
      continue
    }

    if (lead.email) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("email", lead.email)
        .limit(1)
        .single()

      if (existing) {
        duplicates++
        continue
      }
    }

    const { error } = await supabase.from("leads").insert(lead)
    if (error) {
      errors.push({ row: i + 1, error: error.message })
    } else {
      imported++
    }
  }

  if (importRecord) {
    await supabase.from("imports").update({
      status: "completed",
      imported_rows: imported,
      duplicates,
      errors: errors,
    }).eq("id", importRecord.id)
  }

  revalidatePath("/leads")
  revalidatePath("/")
  return { imported, duplicates, errors, total: rows.length }
}
