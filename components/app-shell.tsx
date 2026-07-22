"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, LayoutDashboard, BarChart3,
  Users, LogOut, ChevronRight, BookMarked, Search, BookOpen, FolderMinus,
  TrendingUp, TrendingDown, Database,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { actionLogout } from "@/app/actions/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Profile } from "@/lib/session"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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

type MenuGroup = {
  label: string
  items: MenuItem[]
}

function getMenuGroups(role: string): MenuGroup[] {
  const dashboard: MenuItem = { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }

  const penerimaan: MenuItem = {
    label: "Penerimaan", href: "/penerimaan", icon: TrendingUp,
    children: [
      { label: "Daftar Penerimaan", href: "/penerimaan" },
      { label: "Input Baru", href: "/penerimaan/baru" },
      { label: "Import Excel/CSV", href: "/penerimaan/import" },
    ],
  }

  const pengeluaran: MenuItem = {
    label: "Pengeluaran", href: "/pengeluaran", icon: TrendingDown,
    children: [
      { label: "Daftar Pengeluaran", href: "/pengeluaran" },
      { label: "Input Baru", href: "/pengeluaran/baru" },
      { label: "Import Excel/CSV", href: "/pengeluaran/import" },
    ],
  }

  const masterPendapatan: MenuItem = {
    label: "Master Pendapatan", href: "/kategori-pendapatan", icon: BookOpen,
    children: [
      { label: "Kategori Pendapatan", href: "/kategori-pendapatan" },
      { label: "Jenis Pendapatan", href: "/jenis-pendapatan" },
      { label: "Sub Pendapatan", href: "/sub-pendapatan" },
    ],
  }

  const masterPengeluaran: MenuItem = {
    label: "Master Pengeluaran", href: "/kategori-pengeluaran", icon: FolderMinus,
    children: [
      { label: "Kategori Pengeluaran", href: "/kategori-pengeluaran" },
      { label: "Jenis Pengeluaran", href: "/jenis-pengeluaran" },
    ],
  }

  const masterUmum: MenuItem = {
    label: "Master Umum", href: "/unit-kerja", icon: Database,
    children: [
      { label: "Unit Kerja", href: "/unit-kerja" },
      { label: "Rekening Bank", href: "/rekening-bank" },
      { label: "Jenis Pemindahan Kas", href: "/jenis-pemindahan-kas" },
    ],
  }

  const laporan: MenuItem = {
    label: "Laporan", href: "/laporan", icon: BarChart3,
    children: [
      { label: "Laporan Umum", href: "/laporan" },
      { label: "Buku Kas Umum", href: "/laporan/buku-kas-umum" },
      { label: "BKU Penerimaan", href: "/laporan/bku-penerimaan" },
    ],
  }
  const pengguna: MenuItem = { label: "Pengguna", href: "/pengguna", icon: Users }
  const panduan: MenuItem = { label: "Panduan & Aturan", href: "/panduan", icon: BookMarked }

  if (role === "ADMIN") {
    return [
      { label: "Umum", items: [dashboard] },
      { label: "Transaksi", items: [penerimaan, pengeluaran] },
      { label: "Konfigurasi", items: [masterPendapatan, masterPengeluaran, masterUmum, pengguna] },
      { label: "Lainnya", items: [laporan, panduan] },
    ]
  }

  if (role === "OPERATOR") {
    return [
      { label: "Umum", items: [dashboard] },
      { label: "Transaksi", items: [penerimaan, pengeluaran] },
      { label: "Lainnya", items: [panduan] },
    ]
  }

  if (role === "PIMPINAN") {
    return [
      { label: "Umum", items: [dashboard] },
      { label: "Lainnya", items: [laporan, panduan] },
    ]
  }

  return [
    { label: "Umum", items: [dashboard] },
    { label: "Lainnya", items: [panduan] },
  ]
}

// Legacy helper for CommandSearch
function getMenuItems(role: string): MenuItem[] {
  return getMenuGroups(role).flatMap(g => g.items)
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  penerimaan: "Penerimaan",
  pengeluaran: "Pengeluaran",
  baru: "Input Baru",
  import: "Import",
  master: "Master Data",
  "kategori-pendapatan": "Kategori Pendapatan",
  "jenis-pendapatan": "Jenis Pendapatan",
  "sub-pendapatan": "Sub Pendapatan",
  "kategori-pengeluaran": "Kategori Pengeluaran",
  "jenis-pengeluaran": "Jenis Pengeluaran",
  "unit-kerja": "Unit Kerja",
  "rekening-bank": "Rekening Bank",
  "jenis-pemindahan-kas": "Jenis Pemindahan Kas",
  pengguna: "Pengguna",
  laporan: "Laporan",
  "buku-kas-umum": "Buku Kas Umum",
  "bku-penerimaan": "BKU Penerimaan",
  panduan: "Panduan & Aturan",
}

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function HeaderBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          const label = isUUID(seg) ? "Detail" : (SEGMENT_LABELS[seg] ?? seg)
          const href = "/" + segments.slice(0, i + 1).join("/")

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-xs">{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />} className="text-xs">
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function CommandSearch({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const menuItems = getMenuItems(profile.role.kode)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const allItems = useMemo(() => {
    const items: { label: string; href: string }[] = []
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          items.push({ label: `${item.label} — ${child.label}`, href: child.href })
        }
      } else {
        items.push({ label: item.label, href: item.href })
      }
    }
    return items
  }, [menuItems])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cari...</span>
        <kbd className="hidden sm:inline ml-1 rounded bg-muted px-1 text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Navigasi" description="Cari halaman">
        <Command>
          <CommandInput placeholder="Cari halaman..." />
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup heading="Navigasi">
              {allItems.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => {
                    setOpen(false)
                    window.location.href = item.href
                  }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
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
  const menuGroups = getMenuGroups(profile.role.kode)

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
        {menuGroups.map((group, gi) => (
          <SidebarGroup key={gi}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <AppSidebarFooter profile={profile} />
      <SidebarRail />
    </Sidebar>
  )
}

export function AppShell({
  children,
  profile,
  draftCount = 0,
}: {
  children: React.ReactNode
  profile: Profile
  draftCount?: number
}) {
  return (
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <div className="hidden md:flex items-center gap-2">
            <div className="h-4 w-px bg-border" />
            <HeaderBreadcrumb />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {draftCount > 0 && (
              <Link href="/penerimaan?status=draft">
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-auto">
                  {draftCount} draft
                </Badge>
              </Link>
            )}
            <CommandSearch profile={profile} />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-muted/50 transition-colors outline-none">
                <span className="hidden sm:block text-xs text-foreground/60">{profile.nama_lengkap}</span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                    {getInitials(profile.nama_lengkap)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <form action={actionLogout} className="w-full">
                  <DropdownMenuItem nativeButton={true} render={<button type="submit" className="w-full" />}>
                    <LogOut className="h-3.5 w-3.5" />
                    Keluar
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
