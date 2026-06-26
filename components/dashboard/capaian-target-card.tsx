"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type PenerimaanFilterType, type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

interface CapaianTargetCardProps {
  data: PenerimaanFilteredResult | null
  isPending: boolean
  filterType: PenerimaanFilterType
  filterValue: number
  year: number
  className?: string
}

export function CapaianTargetCard({ data, isPending, filterType, filterValue, year, className }: CapaianTargetCardProps) {
  const BASE_TARGET_TAHUNAN = 28760284000 // 28.760.284.000
  let target = BASE_TARGET_TAHUNAN
  let descLabel = ""

  if (filterType === "bulan") {
    target = BASE_TARGET_TAHUNAN / 12
    descLabel = `Bulan ${MONTHS[filterValue - 1]} ${year}`
  } else if (filterType === "triwulan") {
    target = BASE_TARGET_TAHUNAN / 4
    descLabel = `Triwulan ${filterValue} ${year}`
  } else if (filterType === "semester") {
    target = BASE_TARGET_TAHUNAN / 2
    descLabel = `Semester ${filterValue} ${year}`
  } else {
    descLabel = `Tahun ${year}`
  }

  const total = data?.total ?? null
  const percentage = total !== null ? Math.min(Number(((total / target) * 100).toFixed(1)), 100) : 0
  const displayPercentage = total !== null ? Number(((total / target) * 100).toFixed(1)) : 0
  
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Persentase Capaian Target</CardTitle>
        <CardDescription className="text-xs">{descLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center py-4">
        {isPending || total === null ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="space-y-2 mt-4 flex flex-col items-center">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[200px]" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center h-32 w-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-muted fill-none"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-primary fill-none transition-all duration-1000 ease-in-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{displayPercentage}%</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-foreground">{rupiah(total)}</p>
              <p className="text-xs text-muted-foreground">dari target {rupiah(target)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
