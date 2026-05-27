import { Document, Page, Text, View, StyleSheet, Svg, Rect, G } from "@react-pdf/renderer"
import type { FC, ReactNode } from "react"
import "@/components/pdf/register-fonts"

type SvgTxtProps = { x?: number | string; y?: number | string; fill?: string; fontSize?: number; fontFamily?: string; textAnchor?: "start" | "middle" | "end"; children?: ReactNode }
const SvgText = Text as unknown as FC<SvgTxtProps>

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const C = {
  brand:     "#1e3a5f",
  brandLight:"#2563eb",
  surface:   "#f8fafc",
  border:    "#e2e8f0",
  text:      "#0f172a",
  textMuted: "#64748b",
  white:     "#ffffff",
  rowAlt:    "#f1f5f9",
  verified:  "#059669",
  draft:     "#d97706",
  voided:    "#dc2626",
  chart:     ["#2563eb","#0ea5e9","#7c3aed","#059669","#d97706"] as string[],
}

const s = StyleSheet.create({
  page:        { padding: 40, fontSize: 9, fontFamily: "Geist", color: C.text, backgroundColor: C.white },
  orgName:     { fontSize: 16, fontFamily: "Geist", fontWeight: 700, color: C.brand, marginBottom: 2 },
  orgSub:      { fontSize: 8, color: C.textMuted },
  reportTitle: { fontSize: 11, fontFamily: "Geist", fontWeight: 700, color: C.text, marginTop: 8 },
  periodRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  periodText:  { fontSize: 8, color: C.textMuted },
  divider:     { borderBottomWidth: 1.5, borderBottomColor: C.brand, marginTop: 12, marginBottom: 16 },

  cardsRow:    { flexDirection: "row", gap: 8, marginBottom: 16 },
  card:        { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 9, backgroundColor: C.surface },
  cardLabel:   { fontSize: 6.5, color: C.textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 },
  cardValue:   { fontSize: 11, fontFamily: "Geist", fontWeight: 700, color: C.brand },
  cardSub:     { fontSize: 6.5, color: C.textMuted, marginTop: 2 },

  section:     { marginBottom: 14 },
  sectionTitle:{ fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.brand, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },

  tblHeader:   { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 5 },
  tblHCell:    { color: C.white, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700 },
  tblRow:      { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tblRowAlt:   { backgroundColor: C.rowAlt },
  tblCell:     { fontSize: 7.5, color: C.text },
  tblMuted:    { fontSize: 7.5, color: C.textMuted },
  tblRight:    { textAlign: "right" },
  tblBold:     { fontFamily: "Geist", fontWeight: 700 },

  totalRow:    { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 6, marginTop: 1, borderRadius: 3 },
  totalLabel:  { flex: 1, fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white },
  totalValue:  { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white, textAlign: "right" },

  footer:      { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: C.textMuted, fontSize: 7, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 3 },
})

export type HarianRow = {
  nomor_bukti: string; jumlah: number; status: string; nomor_referensi: string | null
  jenis: { nama?: string } | null; unit: { kode?: string } | null
  rekening: { nama_bank?: string } | null; metode: { nama?: string } | null
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  const W = 48, H = 5
  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} rx={2} fill={C.border} />
      <Rect x={0} y={0} width={Math.max(1, (pct / 100) * W)} height={H} rx={2} fill={color} />
    </Svg>
  )
}

function MetodeBarChart({ rows, total }: { rows: HarianRow[]; total: number }) {
  const metodeMap: Record<string, number> = {}
  for (const r of rows) {
    const m = r.metode?.nama ?? "Tidak Diketahui"
    metodeMap[m] = (metodeMap[m] ?? 0) + r.jumlah
  }
  const data = Object.entries(metodeMap)
    .map(([nama, t]) => ({ nama, total: t, pct: total > 0 ? Math.round((t / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.total - a.total)

  if (!data.length) return null
  const W = 515, BAR_H = 13, GAP = 7
  const LABEL_W = 130, VALUE_W = 75
  const BAR_AREA = W - LABEL_W - VALUE_W - 6
  const H = data.length * (BAR_H + GAP) + 4

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {data.map((d, i) => {
        const y = i * (BAR_H + GAP)
        const barW = Math.max(2, (d.total / total) * BAR_AREA)
        const color = C.chart[i % C.chart.length]
        return (
          <G key={d.nama}>
            <SvgText x={0} y={y + BAR_H - 3} fontSize={7} fill={C.text} fontFamily="Geist">
              {d.nama.length > 20 ? d.nama.slice(0, 18) + "…" : d.nama}
            </SvgText>
            <Rect x={LABEL_W} y={y} width={BAR_AREA} height={BAR_H} rx={3} fill={C.border} />
            <Rect x={LABEL_W} y={y} width={barW} height={BAR_H} rx={3} fill={color} />
            {barW > 32 && (
              <SvgText x={LABEL_W + barW - 4} y={y + BAR_H - 3} fontSize={6} fill={C.white} textAnchor="end">{d.pct}%</SvgText>
            )}
            <SvgText x={W} y={y + BAR_H - 3} fontSize={7} fill={C.textMuted} textAnchor="end">{rupiah(d.total)}</SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

function statusColor(status: string) {
  if (status === "verified") return C.verified
  if (status === "void") return C.voided
  return C.draft
}

function statusLabel(status: string) {
  if (status === "verified") return "Verified"
  if (status === "void") return "Void"
  return "Draft"
}

export function LaporanHarianPDF({
  tanggal, rows, total,
}: {
  tanggal: string; rows: HarianRow[]; total: number
}) {
  const tglFormatted = new Intl.DateTimeFormat("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    .format(new Date(tanggal + "T00:00:00"))
  const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
  const count = rows.length

  // Compute metode + unit stats for cards
  const metodeSet = new Set(rows.map((r) => r.metode?.nama).filter(Boolean))
  const unitSet   = new Set(rows.map((r) => r.unit?.kode).filter(Boolean))

  return (
    <Document
      title={`Laporan Harian ${tanggal} — BLU UIN Palopo`}
      author="BLU UIN Palopo"
      subject="Laporan Penerimaan Dana Harian"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View>
          <Text style={s.orgName}>BLU UIN Palopo</Text>
          <Text style={s.orgSub}>Universitas Islam Negeri Palopo — Badan Layanan Umum</Text>
          <Text style={s.reportTitle}>LAPORAN PENERIMAAN DANA HARIAN</Text>
          <View style={s.periodRow}>
            <Text style={s.periodText}>Tanggal: {tglFormatted}</Text>
            <Text style={s.periodText}>Digenerate: {generatedAt}</Text>
          </View>
          <View style={s.divider} />
        </View>

        {/* Stat cards */}
        <View style={s.cardsRow}>
          {[
            { label: "Total Penerimaan", value: rupiah(total), sub: "terverifikasi" },
            { label: "Jumlah Transaksi", value: String(count), sub: "transaksi hari ini" },
            { label: "Metode Pembayaran", value: String(metodeSet.size), sub: "jenis metode aktif" },
            { label: "Unit Kerja", value: String(unitSet.size), sub: "unit berkontribusi" },
          ].map((c) => (
            <View key={c.label} style={s.card}>
              <Text style={s.cardLabel}>{c.label}</Text>
              <Text style={s.cardValue}>{c.value}</Text>
              <Text style={s.cardSub}>{c.sub}</Text>
            </View>
          ))}
        </View>

        {/* Metode bar chart */}
        {rows.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Penerimaan per Metode Pembayaran</Text>
            <MetodeBarChart rows={rows} total={total} />
          </View>
        )}

        {/* Transaction table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Daftar Transaksi</Text>
          {rows.length === 0 ? (
            <Text style={s.tblMuted}>Tidak ada transaksi pada tanggal ini.</Text>
          ) : (
            <View>
              <View style={s.tblHeader}>
                <Text style={[s.tblHCell, { width: 80 }]}>No. Bukti</Text>
                <Text style={[s.tblHCell, { flex: 1 }]}>Jenis Penerimaan</Text>
                <Text style={[s.tblHCell, { width: 45 }]}>Unit</Text>
                <Text style={[s.tblHCell, { width: 60 }]}>Metode</Text>
                <Text style={[s.tblHCell, { width: 80, textAlign: "right" }]}>Jumlah</Text>
                <Text style={[s.tblHCell, { width: 45, textAlign: "center" }]}>Status</Text>
              </View>
              {rows.map((r, i) => (
                <View key={r.nomor_bukti} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                  <Text style={[s.tblMuted, { width: 80, fontFamily: "Courier" }]}>{r.nomor_bukti}</Text>
                  <Text style={[s.tblCell, { flex: 1 }]}>{r.jenis?.nama ?? "—"}</Text>
                  <Text style={[s.tblMuted, { width: 45 }]}>{r.unit?.kode ?? "—"}</Text>
                  <Text style={[s.tblMuted, { width: 60 }]}>{r.metode?.nama ?? "—"}</Text>
                  <Text style={[s.tblCell, s.tblBold, { width: 80, textAlign: "right" }]}>{rupiah(r.jumlah)}</Text>
                  <Text style={[{ width: 45, fontSize: 7, textAlign: "center", color: statusColor(r.status) }]}>
                    {statusLabel(r.status)}
                  </Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>TOTAL PENERIMAAN</Text>
                <Text style={s.totalValue}>{rupiah(total)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>BLU UIN Palopo — Laporan Harian {tglFormatted}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
