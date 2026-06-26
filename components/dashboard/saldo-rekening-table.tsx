"use client"

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const MOCK_DATA = [
  {
    id: 1,
    bank: "Bank BNI",
    initial: "B",
    color: "bg-pink-500",
    noRekening: "0123456789",
    jenis: "Penerimaan",
    saldo: 1640260000,
  },
  {
    id: 2,
    bank: "Bank Mandiri",
    initial: "M",
    color: "bg-emerald-500",
    noRekening: "9876543210",
    jenis: "Pengeluaran",
    saldo: -7264000,
  },
  {
    id: 3,
    bank: "Bank BRI",
    initial: "B",
    color: "bg-amber-500",
    noRekening: "1122334455",
    jenis: "Pengeluaran",
    saldo: -8650000,
  },
  {
    id: 4,
    bank: "Bank BSI",
    initial: "B",
    color: "bg-purple-500",
    noRekening: "5544332211",
    jenis: "Operasional",
    saldo: 842500000,
  },
  {
    id: 5,
    bank: "Bank BCA",
    initial: "B",
    color: "bg-red-500",
    noRekening: "9988776655",
    jenis: "Pengeluaran",
    saldo: -1852000,
  },
  {
    id: 6,
    bank: "Bank Jateng",
    initial: "J",
    color: "bg-blue-500",
    noRekening: "1231231230",
    jenis: "Pengeluaran",
    saldo: -12000000,
  },
  {
    id: 7,
    bank: "Bank BPD",
    initial: "B",
    color: "bg-green-500",
    noRekening: "4564564560",
    jenis: "Penerimaan",
    saldo: 980750000,
  },
]

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

export function SaldoRekeningTable() {
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
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="pb-3 font-medium">Rekening</th>
                <th className="pb-3 font-medium">No. Rekening</th>
                <th className="pb-3 font-medium">Jenis</th>
                <th className="pb-3 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DATA.map((item) => (
                <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white font-medium ${item.color}`}>
                        {item.initial}
                      </div>
                      <span className="font-medium text-foreground">{item.bank}</span>
                    </div>
                  </td>
                  <td className="py-4 text-muted-foreground">{item.noRekening}</td>
                  <td className="py-4">
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {item.jenis}
                    </span>
                  </td>
                  <td className="py-4 text-right font-medium">
                    <span className={item.saldo < 0 ? "text-red-500" : "text-emerald-500"}>
                      {formatRupiah(item.saldo)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
