"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getPenerimaanFiltered, type PenerimaanFilterType } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

interface RataRataHarianCardProps {
  filterType: PenerimaanFilterType
  filterValue: number
  year: number
  className?: string
}

export function RataRataHarianCard({ filterType, filterValue, year, className }: RataRataHarianCardProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<{ average: number, uniqueDays: number } | null>(null)
  
  let descLabel = ""
  if (filterType === "bulan") {
    descLabel = `Bulan ${MONTHS[filterValue - 1]} ${year}`
  } else if (filterType === "triwulan") {
    descLabel = `Triwulan ${filterValue} ${year}`
  } else if (filterType === "semester") {
    descLabel = `Semester ${filterValue} ${year}`
  } else {
    descLabel = `Tahun ${year}`
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getPenerimaanFiltered(filterType, filterValue, year)
        const average = result.uniqueDays > 0 ? result.total / result.uniqueDays : 0
        setData({ average, uniqueDays: result.uniqueDays })
      } catch (error) {
        console.error("Failed to fetch rata-rata harian", error)
      }
    })
  }, [filterType, filterValue, year])

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rata-rata Harian</CardTitle>
        <CardDescription className="text-xs">{descLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-4">
        {isPending || data === null ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 py-4">
            <p className="text-3xl font-bold tracking-tight text-primary">
              {rupiah(data.average)}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.uniqueDays} hari aktif
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
