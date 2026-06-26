"use client"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const rupiahCompact = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`
  return `Rp ${n}`
}

// Color palette matching the donut chart
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

interface ProporsiJenisChartProps {
  data: PenerimaanFilteredResult | null
  isPending: boolean
}

export function ProporsiJenisChart({ data, isPending }: ProporsiJenisChartProps) {
  const items = data?.jenisBreakdown ?? []
  const total = items.reduce((s, d) => s + d.value, 0)
  const maxValue = items[0]?.value ?? 1 // largest value for bar scaling

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Proporsi per Jenis Pendapatan</CardTitle>
        <CardDescription className="text-xs">Breakdown berdasarkan jenis &amp; akun pendapatan</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-0 pt-0 pb-4 px-4">
        {isPending || !data ? (
          <div className="flex flex-col gap-4 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/30">
            {items.map((item, i) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0
              const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0
              const color = getColor(i)

              return (
                <div key={item.kode} className="py-3.5 flex flex-col gap-2">
                  {/* Row: name + akun badge + value + pct */}
                  <div className="flex items-center gap-2">
                    {/* Dot */}
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    {/* Name */}
                    <span className="text-sm text-foreground/80 flex-1 min-w-0 leading-tight">
                      {item.nama}
                    </span>

                    {/* Akun badge */}
                    {item.akun && (
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50 leading-tight">
                        {item.akun}
                      </span>
                    )}

                    {/* Percentage — right aligned, colored */}
                    <span
                      className="shrink-0 text-sm font-bold tabular-nums w-12 text-right"
                      style={{ color }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                  </div>

                  {/* Amount */}
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {rupiahCompact(item.value)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
