import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Banknote, Clock, TrendingUp, ArrowRight, Plus } from "lucide-react"
import { getDashboardStats } from "@/app/actions/dashboard"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardContent, CardAction, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardChart } from "./_chart"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  if (!stats) redirect("/")

  const isAdmin = stats.role === "ADMIN"
  const isPimpinan = stats.role === "PIMPINAN"
  const isOperator = stats.role === "OPERATOR"

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Selamat datang, {stats.nama}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {stats.role === "ADMIN" ? "Administrator"
            : stats.role === "PIMPINAN" ? "Pimpinan"
            : `Operator${stats.unitNama ? ` — ${stats.unitNama}` : ""}`}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total Verified Bulan Ini"
          value={rupiah(stats.totalBulanIni)}
          color="green"
        />
        <StatCard
          icon={<Banknote className="h-4 w-4" />}
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
            icon={<Clock className="h-4 w-4" />}
            label="Menunggu Verifikasi"
            value={String(stats.draftCount)}
            sub="transaksi draft"
            color={stats.draftCount > 0 ? "amber" : "default"}
            href={isAdmin ? "/penerimaan?status=draft" : undefined}
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
      {(isAdmin || isPimpinan) && (
        <DashboardChart data={stats.chartData} />
      )}

      {/* Transaksi terbaru */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b px-5 py-3.5">
          <CardTitle className="text-sm font-medium text-foreground/60">Transaksi Terbaru</CardTitle>
          <CardAction>
            <Link href="/penerimaan" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/70 transition-colors">
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
  icon, label, value, sub, color, href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: "green" | "blue" | "amber" | "default"
  href?: string
}) {
  const colors = {
    green:   "text-green-400  bg-green-500/10  ring-green-500/20",
    blue:    "text-blue-400   bg-blue-500/10   ring-blue-500/20",
    amber:   "text-amber-400  bg-amber-500/10  ring-amber-500/20",
    default: "text-muted-foreground bg-muted/50 ring-border",
  }

  const inner = (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
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
