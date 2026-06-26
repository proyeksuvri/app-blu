"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { type PenerimaanFilterType, type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

function useIsDark() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

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
  data: PenerimaanFilteredResult | null
  isPending: boolean
  filterType: PenerimaanFilterType
  filterValue: number
  year: number
}

export function TrenPendapatanChart({ data, isPending, filterType, filterValue, year }: TrenPendapatanChartProps) {
  const isDark = useIsDark()
  const chartData = data ? getChartData(data.trendData, filterType, filterValue, year) : []

  // Line color: white on dark, near-black on light — matches reference
  const lineColor = isDark ? "#e5e7eb" : "#111827"
  // Grid lines: subtle in both themes
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
  // Axis text color
  const axisColor = isDark ? "#6b7280" : "#9ca3af"

  const chartConfig: ChartConfig = {
    total: { label: "Verified", color: lineColor },
  }

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
              <CartesianGrid
                vertical={false}
                stroke={gridColor}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fill: axisColor, fontSize: 11 }}
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
                tick={{ fill: axisColor, fontSize: 11 }}
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
                stroke={lineColor}
                strokeWidth={1.5}
                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
