"use client"

import { usePathname } from "next/navigation"

export default function LaporanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBkuSettings = pathname === "/laporan/pengaturan-dokumen-bku"

  return (
    <div className="flex flex-col gap-6">
      {!isBkuSettings && <div>
        <h1 className="text-lg font-semibold text-foreground">Laporan</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Rekap dan export data penerimaan</p>
      </div>}
      {children}
    </div>
  )
}
