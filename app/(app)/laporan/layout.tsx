export default function LaporanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Laporan</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Rekap dan export data penerimaan</p>
      </div>
      {children}
    </div>
  )
}
