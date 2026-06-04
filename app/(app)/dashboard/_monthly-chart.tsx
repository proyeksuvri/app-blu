"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"

type MonthRow = { key: string; label: string; total: number }

const chartConfig: ChartConfig = {
  total: { label: "Verified", color: "var(--chart-1)" },
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export function MonthlyChart({ data }: { data: MonthRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="border-b px-5 py-3.5">
        <CardTitle className="text-sm font-medium text-foreground/60">Tren Penerimaan 12 Bulan Terakhir</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <LineChart data={data} accessibilityLayer>
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
      </CardContent>
    </Card>
  )
}
