"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function AppHeader() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <SidebarTrigger />
      <Button variant="ghost" size="icon" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )
}
