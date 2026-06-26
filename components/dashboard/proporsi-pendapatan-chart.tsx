"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    notation: n >= 1_000_000_000 ? "compact" : "standard",
    compactDisplay: "short",
  }).format(n)

const rupiahFull = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

// Curated palette
const PALETTE = [
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // red
  "#a78bfa", // violet
  "#22d3ee", // cyan
  "#fb923c", // orange
  "#f472b6", // pink
]

function getColor(index: number) {
  return PALETTE[index % PALETTE.length]
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

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { fill: string } }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border/50 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm text-xs">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground mt-0.5">{rupiahFull(item.value)}</p>
    </div>
  )
}

interface ProporsiPendapatanChartProps {
  data: PenerimaanFilteredResult | null
  isPending: boolean
}

export function ProporsiPendapatanChart({ data, isPending }: ProporsiPendapatanChartProps) {
  const isDark = useIsDark()

  const rawData = data?.kategoriBreakdown || []
  const total = rawData.reduce((s, d) => s + d.value, 0)

  const mappedData = rawData.map((d, i) => ({
    ...d,
    fill: getColor(i),
  }))

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Proporsi Pendapatan</CardTitle>
        <CardDescription className="text-xs">Breakdown berdasarkan kategori</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 pt-0 pb-5 px-4">
        {isPending || !data ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-[180px] w-[180px] rounded-full mt-2" />
            <div className="grid grid-cols-2 gap-2 w-full">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          </div>
        ) : mappedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data
          </div>
        ) : (
          <>
            {/* Donut chart with center label */}
            <div className="relative flex items-center justify-center" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={mappedData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="transparent"
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {mappedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center label overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground font-medium">Total</span>
                <span className="text-lg font-bold text-foreground leading-tight mt-0.5">
                  {rupiah(total)}
                </span>
              </div>
            </div>

            {/* 2-column legend grid */}
            <div className="grid grid-cols-2 gap-2">
              {mappedData.map((d, i) => {
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 bg-muted/40 dark:bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="shrink-0 inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: d.fill }}
                      />
                      <span className="text-xs text-foreground/70 truncate">{d.name}</span>
                    </div>
                    <span
                      className="text-xs font-bold shrink-0 tabular-nums"
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
