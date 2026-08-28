"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CreditCard, CheckCircle2, Clock, Ban } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { PengeluaranSummary } from "@/app/actions/pengeluaran"
import { cn } from "@/lib/utils"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

interface PengeluaranCardsProps {
  summary: PengeluaranSummary
  activeStatus?: string
}

export function PengeluaranCards({ summary, activeStatus }: PengeluaranCardsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = activeStatus ?? searchParams.get("status") ?? ""

  function handleFilterStatus(statusKey: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")

    if (statusKey === "all") {
      params.delete("status")
    } else if (currentStatus === statusKey) {
      // Toggle off if already selected
      params.delete("status")
    } else {
      params.set("status", statusKey)
    }

    router.push(`?${params.toString()}`)
  }

  const verifiedPercent = summary.totalNominal > 0
    ? Math.round((summary.verifiedNominal / summary.totalNominal) * 100)
    : 0

  const cards = [
    {
      id: "all",
      label: "Total Pengeluaran",
      value: summary.totalNominal,
      count: summary.totalCount,
      subText: `${summary.totalCount.toLocaleString("id-ID")} transaksi`,
      icon: CreditCard,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
      active: !currentStatus,
      activeRing: "ring-2 ring-blue-500/40 border-blue-500/40 dark:border-blue-500/50",
      badgeText: "Semua",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    {
      id: "verified",
      label: "Terverifikasi",
      value: summary.verifiedNominal,
      count: summary.verifiedCount,
      subText: `${summary.verifiedCount.toLocaleString("id-ID")} transaksi (${verifiedPercent}%)`,
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      active: currentStatus === "verified",
      activeRing: "ring-2 ring-emerald-500/40 border-emerald-500/40 dark:border-emerald-500/50",
      badgeText: "Verified",
      badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      id: "draft",
      label: "Menunggu Verifikasi",
      value: summary.draftNominal,
      count: summary.draftCount,
      subText: `${summary.draftCount.toLocaleString("id-ID")} transaksi draft`,
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
      active: currentStatus === "draft",
      activeRing: "ring-2 ring-amber-500/40 border-amber-500/40 dark:border-amber-500/50",
      badgeText: summary.draftCount > 0 ? "Perlu Review" : "Draft",
      badgeClass: summary.draftCount > 0
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      id: "void",
      label: "Dibatalkan (Void)",
      value: summary.voidNominal,
      count: summary.voidCount,
      subText: `${summary.voidCount.toLocaleString("id-ID")} transaksi void`,
      icon: Ban,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
      active: currentStatus === "void",
      activeRing: "ring-2 ring-rose-500/40 border-rose-500/40 dark:border-rose-500/50",
      badgeText: "Void",
      badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <Card
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => handleFilterStatus(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleFilterStatus(c.id)
              }
            }}
            className={cn(
              "group relative overflow-hidden transition-all duration-200 cursor-pointer select-none py-3.5 hover:shadow-md",
              "border bg-card/60 backdrop-blur hover:border-foreground/20",
              c.active && cn(c.activeRing, "bg-card shadow-sm")
            )}
          >
            <CardContent className="flex flex-col gap-2.5 px-4 py-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105", c.iconBg)}>
                    <Icon className={cn("h-4 w-4", c.iconColor)} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground truncate">{c.label}</span>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px]", c.badgeClass)}>
                  {c.badgeText}
                </span>
              </div>

              <div>
                <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl truncate font-heading">
                  {rupiah(c.value)}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.subText}
                  </p>
                  {c.active && (
                    <span className="text-[10px] font-medium text-primary shrink-0">
                      Aktif
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
