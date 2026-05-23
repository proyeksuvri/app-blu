"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, LayoutDashboard, BarChart3,
  Users, LogOut, ChevronRight, Banknote, BookOpen,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { actionLogout } from "@/app/actions/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Profile } from "@/lib/session"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

type MenuItem = {
  label: string
  href: string
  icon: React.ElementType
  children?: { label: string; href: string }[]
}

function getMenuItems(role: string): MenuItem[] {
  const common: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ]
  const adminMenu: MenuItem[] = [
    {
      label: "Penerimaan", href: "/penerimaan", icon: Banknote,
      children: [
        { label: "Daftar Penerimaan", href: "/penerimaan" },
        { label: "Input Baru", href: "/penerimaan/baru" },
        { label: "Import Excel/CSV", href: "/penerimaan/import" },
      ],
    },
    {
      label: "Master Data", href: "/master", icon: BookOpen,
      children: [
        { label: "Kategori Pendapatan", href: "/master/kategori-pendapatan" },
        { label: "Jenis Pendapatan", href: "/master/jenis-pendapatan" },
        { label: "Sub Pendapatan", href: "/master/sub-pendapatan" },
        { label: "Unit Kerja", href: "/master/unit-kerja" },
        { label: "Rekening Bank", href: "/master/rekening-bank" },
        { label: "Jenis Pemindahan Kas", href: "/master/jenis-pemindahan-kas" },
      ],
    },
    { label: "Pengguna", href: "/pengguna", icon: Users },
    { label: "Laporan", href: "/laporan", icon: BarChart3 },
  ]
  const operatorMenu: MenuItem[] = [
    {
      label: "Penerimaan", href: "/penerimaan", icon: Banknote,
      children: [
        { label: "Daftar Penerimaan", href: "/penerimaan" },
        { label: "Input Baru", href: "/penerimaan/baru" },
        { label: "Import Excel/CSV", href: "/penerimaan/import" },
      ],
    },
  ]
  const pimpinanMenu: MenuItem[] = [
    { label: "Laporan", href: "/laporan", icon: BarChart3 },
  ]
  if (role === "ADMIN") return [...common, ...adminMenu]
  if (role === "OPERATOR") return [...common, ...operatorMenu]
  if (role === "PIMPINAN") return [...common, ...pimpinanMenu]
  return common
}

function NavItem({ item }: { item: MenuItem }) {
  const pathname = usePathname()
  const Icon = item.icon
  const isParentActive = item.children
    ? item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))
    : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

  const [open, setOpen] = useState(isParentActive)

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={item.href} />}
          isActive={isParentActive}
          tooltip={item.label}
        >
          <Icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isParentActive}
        tooltip={item.label}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon />
        <span>{item.label}</span>
        <ChevronRight
          className={cn(
            "ml-auto transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub>
          {item.children.map((child) => {
            const isChildActive =
              pathname === child.href || pathname.startsWith(child.href + "/")
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  render={<Link href={child.href} />}
                  isActive={isChildActive}
                >
                  <span>{child.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

function AppSidebarFooter({ profile }: { profile: Profile }) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className={cn("rounded-lg bg-sidebar-accent px-3 py-2 flex items-center gap-2.5", collapsed && "justify-center px-1.5")}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                {getInitials(profile.nama_lengkap)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground/80">
                  {profile.nama_lengkap}
                </p>
                <p className="truncate text-[10px] text-sidebar-foreground/30">
                  {profile.role.nama}
                </p>
              </div>
            )}
          </div>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <ThemeToggle collapsed={collapsed} />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <form action={actionLogout} className="w-full">
            <SidebarMenuButton
              render={<button type="submit" className="w-full" />}
              tooltip="Keluar"
            >
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </form>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

function AppSidebar({ profile }: { profile: Profile }) {
  const menuItems = getMenuItems(profile.role.kode)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">BLU UIN Palopo</span>
                <span className="truncate text-xs text-sidebar-foreground/40">
                  Penerimaan Dana
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <AppSidebarFooter profile={profile} />
      <SidebarRail />
    </Sidebar>
  )
}

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode
  profile: Profile
}) {
  return (
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium text-foreground/70 md:hidden">BLU UIN Palopo</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-xs text-foreground/60">{profile.nama_lengkap}</span>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                {getInitials(profile.nama_lengkap)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
