"use client"

import { useState, useEffect, useTransition } from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { getPenerimaanFiltered, type PenerimaanFilterType } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig: ChartConfig = {
  total: { label: "Verified", color: "var(--chart-1)" },
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

function getChartData(trendData: number[], filterType: PenerimaanFilterType, filterValue: number, year: number) {
  return trendData.map((val, i) => {
    let label = String(i + 1)
    if (filterType === "tahun") {
      label = `${MONTHS_SHORT[i]} ${String(year).slice(-2)}`
    } else if (filterType === "triwulan") {
      const startMonth = (filterValue - 1) * 3
      label = `${MONTHS_SHORT[startMonth + i]} ${String(year).slice(-2)}`
    } else if (filterType === "semester") {
      const startMonth = filterValue === 1 ? 0 : 6
      label = `${MONTHS_SHORT[startMonth + i]} ${String(year).slice(-2)}`
    } else if (filterType === "bulan") {
      label = String(i + 1)
    }
    return { label, total: val }
  })
}

interface TrenPendapatanChartProps {
  filterType: PenerimaanFilterType
  filterValue: number
  year: number
}

export function TrenPendapatanChart({ filterType, filterValue, year }: TrenPendapatanChartProps) {
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

  const chartData = data ? getChartData(data.trendData, filterType, filterValue, year) : []

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tren Pendapatan</CardTitle>
        <CardDescription className="text-xs">Tren berdasarkan rentang waktu yang dipilih</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0 pb-4 px-4">
        {isPending || !data ? (
          <div className="h-52 w-full flex items-center justify-center">
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-52 w-full">
            <LineChart data={chartData} accessibilityLayer margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => {
                  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(0)}M`
                  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
                  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
                  if (v === 0) return "0"
                  return String(v)
                }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => rupiah(Number(value))}
                  />
                }
              />
              <Line
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-total)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
