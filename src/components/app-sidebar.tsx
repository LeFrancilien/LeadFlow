"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Globe,
  FileUp,
  Sparkles,
  Mail,
  Download,
  Settings,
  FileText,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Scraping", href: "/scraping", icon: Globe },
  { title: "Landing Pages", href: "/landing-pages", icon: FileText },
  { title: "Import", href: "/import", icon: FileUp },
  { title: "Enrichissement", href: "/enrichment", icon: Sparkles },
  { title: "Campagnes", href: "/campaigns", icon: Mail },
  { title: "Export", href: "/export", icon: Download },
  { title: "Parametres", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
