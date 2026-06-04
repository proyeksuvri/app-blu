"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"

type ChartRow = { tgl: string; label: string; verified: number; draft: number }

const chartConfig: ChartConfig = {
  verified: { label: "Terverifikasi", color: "var(--chart-1)" },
  draft:    { label: "Draft",         color: "var(--chart-2)" },
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export function DashboardChart({ data }: { data: ChartRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="border-b px-5 py-3.5">
        <CardTitle className="text-sm font-medium text-foreground/60">Penerimaan 7 Hari Terakhir</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <BarChart data={data} barGap={2} barCategoryGap="30%" accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
                return String(v)
              }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => rupiah(Number(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="verified" fill="var(--color-verified)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="draft"    fill="var(--color-draft)"    radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
