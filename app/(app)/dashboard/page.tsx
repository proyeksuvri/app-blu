import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getDashboardStats } from "@/app/actions/dashboard"
import { Button } from "@/components/ui/button"
import { PenerimaanCardsContainer } from "@/components/dashboard/penerimaan-cards-container"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>
}) {
  const params = await searchParams
  const stats = await getDashboardStats(params.bulan)
  if (!stats) redirect("/")

  const isOperator = stats.role === "OPERATOR"

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Dashboard Penerimaan
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ringkasan kinerja penerimaan {stats.periode.label} - {stats.nama}
          {stats.role === "OPERATOR" && stats.unitNama ? ` - ${stats.unitNama}` : ""}
        </p>
      </div>

      {/* Main Stats Grid */}
      <PenerimaanCardsContainer />

      {/* Quick actions (operator) */}
      {isOperator && (
        <div className="flex gap-3">
          <Button size="sm" render={<Link href="/penerimaan/baru" />}>
            <Plus className="h-4 w-4" />
            Input Penerimaan
          </Button>
        </div>
      )}

    </div>
  )
}
