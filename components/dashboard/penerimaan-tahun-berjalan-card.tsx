"use client"

import { useState, useEffect, useTransition } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getPenerimaanFiltered, type PenerimaanFilterType } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

interface PenerimaanTahunBerjalanCardProps {
  filterType: PenerimaanFilterType
  filterValue: number
  year: number
  className?: string
}

export function PenerimaanTahunBerjalanCard({ filterType, filterValue, year, className }: PenerimaanTahunBerjalanCardProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<{ total: number; prevTotal: number; prevYearTotal: number; trendData: number[] } | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getPenerimaanFiltered(filterType, filterValue, year)
        setData(result)
      } catch (error) {
        console.error("Failed to fetch filtered penerimaan", error)
      }
    })
  }, [filterType, filterValue, year])

  const growth = data?.prevTotal ? Math.round(((data.total - data.prevTotal) / data.prevTotal) * 100) : null
  const isPositive = growth !== null && growth > 0
  const isNegative = growth !== null && growth < 0

  const growthYear = data?.prevYearTotal ? Math.round(((data.total - data.prevYearTotal) / data.prevYearTotal) * 100) : null
  const isPositiveYear = growthYear !== null && growthYear > 0
  const isNegativeYear = growthYear !== null && growthYear < 0

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Penerimaan Berjalan</CardTitle>
            <CardDescription className="text-xs">Filter penerimaan berdasarkan periode</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending || !data ? (
          <div className="flex flex-col gap-2 py-4">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-3xl font-bold tracking-tight text-primary">
                  {rupiah(data.total)}
                </p>
                <div className="flex flex-col text-xs text-muted-foreground gap-1.5 mt-2">
                  <div className="flex items-center gap-1.5">
                    {growth !== null ? (
                      <>
                        <span className={`flex items-center font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : isNegative ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                          {Math.abs(growth)}%
                        </span>
                        <span>vs periode sebelumnya</span>
                      </>
                    ) : (
                      <span>Periode sebelumnya {rupiah(data.prevTotal)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {growthYear !== null ? (
                      <>
                        <span className={`flex items-center font-medium ${isPositiveYear ? 'text-green-600' : isNegativeYear ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {isPositiveYear ? '+' : isNegativeYear ? '-' : ''}{Math.abs(growthYear)}%
                        </span>
                        <span>vs tahun lalu</span>
                      </>
                    ) : (
                      <span>Tahun lalu {rupiah(data.prevYearTotal)}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="h-[60px] w-[120px] shrink-0 opacity-80 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendData.map((val, i) => ({ val, index: i }))}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Line 
                      type="monotone" 
                      dataKey="val" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2.5} 
                      dot={false}
                      isAnimationActive={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
