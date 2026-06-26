"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiahCompact = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`
  return `Rp ${n}`
}

const rupiahFull = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

// Grayscale monochromatic palette — like reference
const PALETTE = [
  "#e5e7eb", // gray-200  (lightest)
  "#9ca3af", // gray-400
  "#4b5563", // gray-600
  "#1f2937", // gray-800  (darkest)
  "#d1d5db", // gray-300
  "#6b7280", // gray-500
  "#374151", // gray-700
  "#111827", // gray-900
]

function getColor(index: number) {
  return PALETTE[index % PALETTE.length]
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
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
      <CardContent className="flex-1 flex flex-col justify-center pt-0 pb-5 px-4">
        {isPending || !data ? (
          /* Skeleton — horizontal layout */
          <div className="flex items-center gap-6">
            <Skeleton className="shrink-0 h-[160px] w-[160px] rounded-full" />
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : mappedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data
          </div>
        ) : (
          /* Main content — horizontal: donut left, legend grid right */
          <div className="flex items-center gap-6">
            {/* Donut chart with center total */}
            <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={mappedData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
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
                <span className="text-lg font-bold text-foreground leading-tight">
                  {rupiahCompact(total)}
                </span>
              </div>
            </div>

            {/* Legend — 2-column grid matching reference */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
              {mappedData.map((d, i) => (
                <div key={i} className="flex flex-col gap-0.5 min-w-0">
                  {/* Dot + name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="shrink-0 inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: d.fill }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                  </div>
                  {/* Value */}
                  <span className="text-sm font-bold text-foreground tabular-nums pl-3.5">
                    {rupiahCompact(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
