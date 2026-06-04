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
  tblCell:     { fontSize: 8, color: C.text },
  tblMuted:    { fontSize: 8, color: C.textMuted },
  tblBold:     { fontFamily: "Geist", fontWeight: 700 },

  totalRow:    { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 6, marginTop: 1, borderRadius: 3 },
  totalLabel:  { flex: 1, fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white },
  totalValue:  { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white, textAlign: "right" },

  footer:      { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: C.textMuted, fontSize: 7, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 3 },
})

export type RekeningRow = {
  kode: string; nama_bank: string; nama_rekening: string; nomor_rekening: string; total: number
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

function RekeningBarChart({ data, total }: { data: Array<RekeningRow & { pct: number }>; total: number }) {
  if (!data.length) return null
  const W = 515, BAR_H = 13, GAP = 7
  const LABEL_W = 155, VALUE_W = 75
  const BAR_AREA = W - LABEL_W - VALUE_W - 6
  const H = data.length * (BAR_H + GAP) + 4

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {data.map((r, i) => {
        const y = i * (BAR_H + GAP)
        const barW = Math.max(2, (r.total / total) * BAR_AREA)
        const color = C.chart[i % C.chart.length]
        return (
          <G key={r.kode}>
            <SvgText x={0} y={y + BAR_H - 3} fontSize={7} fill={C.text} fontFamily="Geist">{r.nama_bank}</SvgText>
            <Rect x={LABEL_W} y={y} width={BAR_AREA} height={BAR_H} rx={3} fill={C.border} />
            <Rect x={LABEL_W} y={y} width={barW} height={BAR_H} rx={3} fill={color} />
            {barW > 32 && (
              <SvgText x={LABEL_W + barW - 4} y={y + BAR_H - 3} fontSize={6} fill={C.white} textAnchor="end">{r.pct}%</SvgText>
            )}
            <SvgText x={W} y={y + BAR_H - 3} fontSize={7} fill={C.textMuted} textAnchor="end">{rupiah(r.total)}</SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

export function LaporanRekeningPDF({
  tglAwal, tglAkhir, byRekening, total,
}: {
  tglAwal: string; tglAkhir: string; byRekening: RekeningRow[]; total: number
}) {
  const fmt = (tgl: string) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" })
      .format(new Date(tgl + "T00:00:00"))

  const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })

  const dataWithPct = byRekening
    .map((r) => ({ ...r, pct: total > 0 ? Math.round((r.total / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.total - a.total)

  const topBank = dataWithPct[0]?.nama_bank ?? "—"
  const topPct  = dataWithPct[0]?.pct ?? 0

  return (
    <Document
      title={`Rekap Rekening ${tglAwal} sd ${tglAkhir} — BLU UIN Palopo`}
      author="BLU UIN Palopo"
      subject="Laporan Penerimaan Dana per Rekening"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View>
          <Text style={s.orgName}>BLU UIN Palopo</Text>
          <Text style={s.orgSub}>Universitas Islam Negeri Palopo — Badan Layanan Umum</Text>
          <Text style={s.reportTitle}>LAPORAN PENERIMAAN DANA PER REKENING</Text>
          <View style={s.periodRow}>
            <Text style={s.periodText}>Periode: {fmt(tglAwal)} — {fmt(tglAkhir)}</Text>
            <Text style={s.periodText}>Digenerate: {generatedAt}</Text>
          </View>
          <View style={s.divider} />
        </View>

        {/* Stat cards */}
        <View style={s.cardsRow}>
          {[
            { label: "Total Penerimaan",  value: rupiah(total),                sub: "semua rekening" },
            { label: "Jumlah Rekening",   value: String(dataWithPct.length),   sub: "rekening aktif" },
            { label: "Bank Terbesar",     value: topBank,                      sub: `kontribusi ${topPct}%` },
            { label: "Rata-rata/Rekening",value: rupiah(dataWithPct.length > 0 ? Math.round(total / dataWithPct.length) : 0), sub: "per rekening" },
          ].map((c) => (
            <View key={c.label} style={s.card}>
              <Text style={s.cardLabel}>{c.label}</Text>
              <Text style={[s.cardValue, { fontSize: c.label === "Bank Terbesar" ? 9 : 11 }]}>{c.value}</Text>
              <Text style={s.cardSub}>{c.sub}</Text>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        {dataWithPct.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Distribusi Penerimaan per Rekening</Text>
            <RekeningBarChart data={dataWithPct} total={total} />
          </View>
        )}

        {/* Table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rincian per Rekening Bank</Text>
          {dataWithPct.length === 0 ? (
            <Text style={s.tblMuted}>Tidak ada data untuk periode ini.</Text>
          ) : (
            <View>
              <View style={s.tblHeader}>
                <Text style={[s.tblHCell, { width: 95 }]}>Bank</Text>
                <Text style={[s.tblHCell, { flex: 1 }]}>Nama Rekening</Text>
                <Text style={[s.tblHCell, { width: 90 }]}>No. Rekening</Text>
                <Text style={[s.tblHCell, { width: 36, textAlign: "right" }]}>%</Text>
                <Text style={[s.tblHCell, { width: 52 }]}>{" "}</Text>
                <Text style={[s.tblHCell, { width: 80, textAlign: "right" }]}>Jumlah</Text>
              </View>
              {dataWithPct.map((r, i) => (
                <View key={r.kode} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                  <Text style={[s.tblCell, s.tblBold, { width: 95 }]}>{r.nama_bank}</Text>
                  <Text style={[s.tblCell, { flex: 1 }]}>{r.nama_rekening}</Text>
                  <Text style={[s.tblMuted, { width: 90, fontFamily: "Courier", fontSize: 7.5 }]}>{r.nomor_rekening}</Text>
                  <Text style={[s.tblMuted, { width: 36, textAlign: "right" }]}>{r.pct}%</Text>
                  <View style={{ width: 52, paddingTop: 2 }}>
                    <PctBar pct={r.pct} color={C.chart[i % C.chart.length]} />
                  </View>
                  <Text style={[s.tblCell, s.tblBold, { width: 80, textAlign: "right" }]}>{rupiah(r.total)}</Text>
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
          <Text>BLU UIN Palopo — Rekap Rekening {fmt(tglAwal)} s.d. {fmt(tglAkhir)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
