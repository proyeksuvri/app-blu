import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { ArrowRight, Plus } from "lucide-react"
import { getDashboardStats } from "@/app/actions/dashboard"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardContent, CardAction, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthlyChart } from "./_monthly-chart"
import { DashboardChart } from "./_chart"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  if (!stats) redirect("/")

  const isAdmin = stats.role === "ADMIN"
  const isPimpinan = stats.role === "PIMPINAN"
  const isOperator = stats.role === "OPERATOR"

  const growth = stats.totalBulanLalu > 0
    ? Math.round(((stats.totalBulanIni - stats.totalBulanLalu) / stats.totalBulanLalu) * 100)
    : null

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {format(new Date(), "MMMM yyyy", { locale: id })}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {stats.nama}
          {stats.role === "OPERATOR" && stats.unitNama ? ` · ${stats.unitNama}` : ""}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total Penerimaan Bulan Ini"
          value={rupiah(stats.totalPenerimaanBulanIni)}
          sub={
            stats.totalPenerimaanDraftBulanIni > 0
              ? `${stats.totalPenerimaanVerifiedBulanIni} verified · ${stats.totalPenerimaanDraftBulanIni} pending`
              : `${stats.totalPenerimaanVerifiedBulanIni} transaksi`
          }
          color="blue"
        />
        <StatCard
          label="Total Verified Bulan Ini"
          value={rupiah(stats.totalBulanIni)}
          sub={growth !== null ? `${growth >= 0 ? "+" : ""}${growth}% vs bulan lalu` : undefined}
          color={stats.totalBulanIni > 0 ? "green" : "default"}
        />
        <StatCard
          label="Penerimaan Hari Ini (Verified)"
          value={rupiah(stats.hariIni.verifiedTotal)}
          sub={
            stats.hariIni.draftCount > 0
              ? `${stats.hariIni.verifiedCount} verified · ${stats.hariIni.draftCount} pending`
              : `${stats.hariIni.verifiedCount} transaksi`
          }
          color="blue"
        />
        {(isAdmin || isPimpinan) && (
          <StatCard
            label="Menunggu Verifikasi"
            value={String(stats.draftCount)}
            sub="transaksi draft"
            color={stats.draftCount > 0 ? "amber" : "default"}
            href={isAdmin ? "/penerimaan?status=draft" : undefined}
          />
        )}
        {(isAdmin || isPimpinan) && stats.voidBulanIni > 0 && (
          <StatCard
            label="Void Bulan Ini"
            value={String(stats.voidBulanIni)}
            sub="transaksi dibatalkan"
            color="red"
            href={isAdmin ? "/penerimaan?status=void" : undefined}
          />
        )}
      </div>

      {/* Quick actions (operator) */}
      {isOperator && (
        <div className="flex gap-3">
          <Button size="sm" render={<Link href="/penerimaan/baru" />}>
            <Plus className="h-4 w-4" />
            Input Penerimaan
          </Button>
        </div>
      )}

      {/* Chart 7 hari */}
      <DashboardChart data={stats.chartData} />

      {/* Tren 12 bulan */}
      {(isAdmin || isPimpinan) && (
        <MonthlyChart data={stats.monthlyData} />
      )}

      {/* Transaksi terbaru */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b px-5 py-3.5">
          <CardTitle className="text-sm font-medium text-foreground/60">Transaksi Terbaru</CardTitle>
          <CardAction>
            <Link href="/penerimaan" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/70 transition-colors py-1.5 -my-1.5 px-1 -mx-1">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </CardAction>
        </CardHeader>

        <CardContent className="p-0">
          {stats.terbaru.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground/70">
              Belum ada transaksi
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Nomor Bukti</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Tanggal</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Jenis</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Unit</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Jumlah</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.terbaru.map((row) => (
                  <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                    <TableCell className="py-3">
                      <Link href={`/penerimaan/${row.id}`} className="text-sm font-mono text-primary hover:underline">
                        {row.nomor_bukti}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/60 py-3">
                      {format(new Date(row.tanggal_terima), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/70 py-3">
                      {row.jenis?.nama ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/50 py-3">
                      {row.unit?.kode ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80 py-3 text-right font-medium">
                      {rupiah(row.jumlah)}
                    </TableCell>
                    <TableCell className="py-3">
                      <PenerimaanStatusBadge status={row.status as "draft" | "verified" | "void"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

function StatCard({
  label, value, sub, color, href,
}: {
  label: string
  value: string
  sub?: string
  color: "green" | "blue" | "amber" | "red" | "default"
  href?: string
}) {
  const valueColors = {
    green:   "text-green-400",
    blue:    "text-foreground",
    amber:   "text-amber-400",
    red:     "text-red-400",
    default: "text-foreground",
  }

  const inner = (
    <Card>
      <CardContent className="flex flex-col gap-1.5 py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold ${valueColors[color]}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    )
  }
  return inner
}
