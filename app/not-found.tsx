import Link from "next/link"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Building2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
      </div>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>
        Kembali ke Dashboard
      </Button>
    </div>
  )
}
