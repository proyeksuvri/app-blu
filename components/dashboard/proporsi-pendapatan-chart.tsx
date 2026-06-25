"use client"

import { useState, useEffect, useTransition } from "react"
import { PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { getPenerimaanFiltered, type PenerimaanFilterType } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

// Curated colorful palette — works on both dark & light mode
const PALETTE = [
  { light: "#3b82f6", dark: "#60a5fa" }, // blue
  { light: "#10b981", dark: "#34d399" }, // emerald
  { light: "#f59e0b", dark: "#fbbf24" }, // amber
  { light: "#ef4444", dark: "#f87171" }, // red
  { light: "#8b5cf6", dark: "#a78bfa" }, // violet
  { light: "#06b6d4", dark: "#22d3ee" }, // cyan
  { light: "#f97316", dark: "#fb923c" }, // orange
  { light: "#ec4899", dark: "#f472b6" }, // pink
]

function getColor(index: number, isDark: boolean) {
  const p = PALETTE[index % PALETTE.length]
  return isDark ? p.dark : p.light
}

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

// Custom label rendered inside the arc — shows percentage
interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  index: number
  isDark: boolean
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, isDark }: LabelProps) {
  if (percent < 0.05) return null // skip tiny slices
  const RADIAN = Math.PI / 180
  // place label outside the arc
  const radius = outerRadius + 22
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const pct = `${(percent * 100).toFixed(1)}%`

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      fill={getColor(index, isDark)}
    >
      {pct}
    </text>
  )
}

interface ProporsiPendapatanChartProps {
  filterType: PenerimaanFilterType
  filterValue: number
  year: number
}

export function ProporsiPendapatanChart({ filterType, filterValue, year }: ProporsiPendapatanChartProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<{ kategoriBreakdown?: { name: string; value: number }[] } | null>(null)
  const isDark = useIsDark()

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

  const rawData = data?.kategoriBreakdown || []
  const total = rawData.reduce((s, d) => s + d.value, 0)

  const mappedData = rawData.map((d, i) => ({
    ...d,
    fill: getColor(i, isDark),
  }))

  const chartConfig = mappedData.reduce((acc, curr, index) => {
    acc[`cat_${index}`] = { label: curr.name, color: curr.fill }
    return acc
  }, {} as ChartConfig)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Proporsi Pendapatan</CardTitle>
        <CardDescription className="text-xs">Breakdown berdasarkan kategori</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pt-0 pb-4 px-4">
        {isPending || !data ? (
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          </div>
        ) : mappedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data
          </div>
        ) : (
          <>
            {/* Donut chart */}
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        rupiah(Number(value)),
                        String(name),
                      ]}
                      hideLabel
                    />
                  }
                />
                <Pie
                  data={mappedData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="transparent"
                  labelLine={false}
                  label={(props) => (
                    <CustomLabel {...props} isDark={isDark} />
                  )}
                >
                  {mappedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend list */}
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-36">
              {mappedData.map((d, i) => {
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"
                return (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <span
                      className="shrink-0 inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: d.fill }}
                    />
                    <span className="text-xs text-foreground/70 truncate flex-1 min-w-0">{d.name}</span>
                    <span
                      className="text-xs font-semibold shrink-0 tabular-nums"
                      style={{ color: d.fill }}
                    >
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
