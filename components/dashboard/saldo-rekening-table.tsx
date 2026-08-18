"use client"

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"

const formatRupiah = (amount: number) => {
  const isNegative = amount < 0
  const absoluteAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(absoluteAmount)
  return isNegative ? `-${formatted}` : formatted
}

const COLORS = [
  "bg-pink-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-indigo-500"
]

interface SaldoRekeningTableProps {
  data?: PenerimaanFilteredResult | null
  isPending?: boolean
}

export function SaldoRekeningTable({ data, isPending }: SaldoRekeningTableProps) {
  const items = data?.rekeningBreakdown ?? []

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">Saldo Rekening Bank</CardTitle>
        <Button variant="outline" size="sm" className="h-8 rounded-md px-4 text-xs">
          View All
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full overflow-auto">
          {isPending || (!data && items.length === 0) ? (
            <div className="flex flex-col gap-4 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-1/4">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada data rekening
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="pb-3 font-medium">Rekening</th>
                  <th className="pb-3 font-medium">No. Rekening</th>
                  <th className="pb-3 font-medium max-wxs">Nama Akun</th>
                  <th className="pb-3 text-right font-medium">Total Penerimaan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const initial = item.bank.charAt(0).toUpperCase()
                  const color = COLORS[index % COLORS.length]
                  
                  return (
                    <tr key={item.kode} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {item.bank.toLowerCase().includes("bsi") || item.bank.toLowerCase().includes("syariah indonesia") ? (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden bg-white border border-border/50">
                              <img src="/bsi-logo.svg" alt="BSI" className="h-6 w-6 object-contain" />
                            </div>
                          ) : (
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white font-medium ${color}`}>
                              {initial}
                            </div>
                          )}
                          <span className="font-medium text-foreground">{item.bank}</span>
                        </div>
                      </td>
                      <td className="py-4 text-muted-foreground">{item.noRekening}</td>
                      <td className="py-4">
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground max-w-[200px] truncate" title={item.namaRekening}>
                          {item.namaRekening}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium">
                        <span className={item.value < 0 ? "text-red-500" : "text-emerald-500"}>
                          {formatRupiah(item.value)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
