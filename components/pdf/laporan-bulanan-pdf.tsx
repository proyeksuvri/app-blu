import { Document, Page, Text, View, StyleSheet, Svg, Rect, G, Line } from "@react-pdf/renderer"
import type { FC, ReactNode } from "react"
import type { RekapBulananFullResult, KategoriGroup, RekeningBreakdown, UnitKerjaBreakdown, MetodeBreakdown, DailyPoint, SubGroup } from "@/app/actions/laporan"
import "@/components/pdf/register-fonts"

type SvgTxtProps = { x?: number | string; y?: number | string; fill?: string; fontSize?: number; fontFamily?: string; textAnchor?: "start" | "middle" | "end"; children?: ReactNode }
const SvgText = Text as unknown as FC<SvgTxtProps>

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const C = {
  brand:      "#1e3a5f",
  brandLight: "#2563eb",
  surface:    "#f8fafc",
  border:     "#e2e8f0",
  text:       "#0f172a",
  textMuted:  "#64748b",
  white:      "#ffffff",
  rowAlt:     "#f1f5f9",
  chart:      ["#2563eb", "#0ea5e9", "#7c3aed", "#059669", "#d97706"] as string[],
}

const s = StyleSheet.create({
  page:          { padding: 40, fontSize: 9, fontFamily: "Geist", color: C.text, backgroundColor: C.white },

  // Header
  orgName:       { fontSize: 16, fontFamily: "Geist", fontWeight: 700, color: C.brand, marginBottom: 2 },
  orgSub:        { fontSize: 8, color: C.textMuted },
  reportTitle:   { fontSize: 11, fontFamily: "Geist", fontWeight: 700, color: C.text, marginTop: 8 },
  periodRow:     { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  periodText:    { fontSize: 8, color: C.textMuted },
  divider:       { borderBottomWidth: 1.5, borderBottomColor: C.brand, marginTop: 12, marginBottom: 16 },

  // Stat cards
  cardsRow:      { flexDirection: "row", gap: 8, marginBottom: 16 },
  card:          { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 9, backgroundColor: C.surface },
  cardLabel:     { fontSize: 6.5, color: C.textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 },
  cardValue:     { fontSize: 11, fontFamily: "Geist", fontWeight: 700, color: C.brand },
  cardSub:       { fontSize: 6.5, color: C.textMuted, marginTop: 2 },

  // Section
  section:       { marginBottom: 14 },
  sectionTitle:  { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.brand, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },

  // Table
  tblHeader:     { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 5 },
  tblHCell:      { color: C.white, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700 },
  tblRow:        { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tblRowAlt:     { backgroundColor: C.rowAlt },
  tblCatRow:     { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#dbeafe" },
  tblCell:       { fontSize: 8, color: C.text },
  tblCellMuted:  { fontSize: 8, color: C.textMuted },
  tblCellIndent: { fontSize: 8, color: C.text, paddingLeft: 10 },
  tblCellIndent2:{ fontSize: 7.5, color: C.textMuted, paddingLeft: 22 },
  tblSubRow:     { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: "#fafafa" },
  tblRight:      { textAlign: "right" },
  tblBold:       { fontFamily: "Geist", fontWeight: 700 },

  // Total row
  totalRow:      { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 6, marginTop: 1, borderRadius: 3 },
  totalLabel:    { flex: 1, fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white },
  totalValue:    { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white, textAlign: "right" },

  // Signature
  sigBlock:      { marginTop: 20, flexDirection: "row", justifyContent: "flex-end" },
  sigBox:        { width: 190, alignItems: "center" },
  sigText:       { fontSize: 8, color: C.textMuted, textAlign: "center" },
  sigSpace:      { height: 36 },
  sigLine:       { borderBottomWidth: 1, borderBottomColor: C.text, width: 150, marginBottom: 4 },
  sigName:       { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center" },
  sigNip:        { fontSize: 7.5, color: C.textMuted, textAlign: "center", marginTop: 1 },

  // Footer
  footer:        { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: C.textMuted, fontSize: 7, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 3 },
})

// ── SVG helpers ──────────────────────────────────────────────────────────────

function PctBar({ pct, color }: { pct: number; color: string }) {
  const W = 48, H = 5
  const filled = Math.max(1, (pct / 100) * W)
  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} rx={2} fill={C.border} />
      <Rect x={0} y={0} width={filled} height={H} rx={2} fill={color} />
    </Svg>
  )
}

function KategoriBarChart({ data, total }: { data: KategoriGroup[]; total: number }) {
  const W = 515, BAR_H = 13, GAP = 7
  const LABEL_W = 175, VALUE_W = 75
  const BAR_AREA = W - LABEL_W - VALUE_W - 6
  const H = data.length * (BAR_H + GAP) + 4
  if (!data.length) return null

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {data.map((kat, i) => {
        const y = i * (BAR_H + GAP)
        const barW = total > 0 ? Math.max(2, (kat.total / total) * BAR_AREA) : 2
        const color = C.chart[i % C.chart.length]
        return (
          <G key={kat.kodeKategori}>
            <SvgText x={0} y={y + BAR_H - 3} fontSize={7} fill={C.text} fontFamily="Geist">{kat.namaKategori}</SvgText>
            <Rect x={LABEL_W} y={y} width={BAR_AREA} height={BAR_H} rx={3} fill={C.border} />
            <Rect x={LABEL_W} y={y} width={barW} height={BAR_H} rx={3} fill={color} />
            {barW > 32 && (
              <SvgText x={LABEL_W + barW - 4} y={y + BAR_H - 3} fontSize={6} fill={C.white} textAnchor="end">{kat.pct}%</SvgText>
            )}
            <SvgText x={W} y={y + BAR_H - 3} fontSize={7} fill={C.textMuted} textAnchor="end">{rupiah(kat.total)}</SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

function DailyTrendChart({ data, daysInMonth }: { data: DailyPoint[]; daysInMonth: number }) {
  const W = 515, H = 72, AXIS_H = 11
  const CHART_H = H - AXIS_H
  const maxVal = Math.max(...data.map((d) => d.total), 1)
  const barW = Math.floor((W - 4) / daysInMonth)
  const gap = 1

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke={C.border} strokeWidth={0.5} />
      {data.map((d, i) => {
        const bH = Math.max(1, (d.total / maxVal) * (CHART_H - 4))
        const x = i * (barW + gap) + 2
        const y = CHART_H - bH
        const showLabel = d.hari === 1 || d.hari % 5 === 0 || d.hari === daysInMonth
        return (
          <G key={d.tanggal}>
            <Rect x={x} y={y} width={Math.max(1, barW - gap)} height={bH} rx={1} fill={d.total > 0 ? C.brandLight : C.border} />
            {showLabel && (
              <SvgText x={x + (barW - gap) / 2} y={H - 1} fontSize={5} fill={C.textMuted} textAnchor="middle">{d.hari}</SvgText>
            )}
          </G>
        )
      })}
    </Svg>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeaderSection({ tahun, bulan }: { tahun: number; bulan: number }) {
  const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
  return (
    <View>
      <Text style={s.orgName}>BLU UIN Palopo</Text>
      <Text style={s.orgSub}>Universitas Islam Negeri Palopo — Badan Layanan Umum</Text>
      <Text style={s.reportTitle}>LAPORAN PENERIMAAN DANA BULANAN</Text>
      <View style={s.periodRow}>
        <Text style={s.periodText}>Periode: {BULAN[bulan - 1]} {tahun}</Text>
        <Text style={s.periodText}>Digenerate: {generatedAt}</Text>
      </View>
      <View style={s.divider} />
    </View>
  )
}

function StatCards({ total, count, activeRekeningCount, dailyAverage, daysInMonth }: {
  total: number; count: number; activeRekeningCount: number; dailyAverage: number; daysInMonth: number
}) {
  const cards = [
    { label: "Total Penerimaan",  value: rupiah(total),               sub: "periode ini (terverifikasi)" },
    { label: "Jumlah Transaksi",  value: count.toLocaleString("id-ID"), sub: "transaksi terverifikasi" },
    { label: "Rekening Aktif",    value: String(activeRekeningCount), sub: "rekening penerima dana" },
    { label: "Rata-rata Harian",  value: rupiah(dailyAverage),        sub: `per hari (${daysInMonth} hari)` },
  ]
  return (
    <View style={s.cardsRow}>
      {cards.map((c) => (
        <View key={c.label} style={s.card}>
          <Text style={s.cardLabel}>{c.label}</Text>
          <Text style={s.cardValue}>{c.value}</Text>
          <Text style={s.cardSub}>{c.sub}</Text>
        </View>
      ))}
    </View>
  )
}

function DetailBreakdownTable({ byKategori, total }: { byKategori: KategoriGroup[]; total: number }) {
  return (
    <View>
      {/* Header */}
      <View style={s.tblHeader}>
        <Text style={[s.tblHCell, { flex: 1 }]}>Kategori / Jenis Penerimaan</Text>
        <Text style={[s.tblHCell, { width: 36, textAlign: "right" }]}>%</Text>
        <Text style={[s.tblHCell, { width: 52 }]}>{" "}</Text>
        <Text style={[s.tblHCell, { width: 80, textAlign: "right" }]}>Jumlah</Text>
      </View>

      {byKategori.map((kat, ki) => (
        <View key={kat.kodeKategori}>
          {/* Kategori header row */}
          <View style={s.tblCatRow}>
            <Text style={[s.tblCell, s.tblBold, { flex: 1 }]}>{kat.namaKategori}</Text>
            <Text style={[s.tblCell, s.tblBold, { width: 36, textAlign: "right" }]}>{kat.pct}%</Text>
            <View style={{ width: 52, paddingTop: 1.5 }}>
              <PctBar pct={kat.pct} color={C.chart[ki % C.chart.length]} />
            </View>
            <Text style={[s.tblCell, s.tblBold, { width: 80, textAlign: "right" }]}>{rupiah(kat.total)}</Text>
          </View>

          {/* Jenis rows */}
          {kat.jenis.map((j, ji) => (
            <View key={j.kode}>
              <View style={[s.tblRow, ji % 2 === 1 ? s.tblRowAlt : {}]}>
                <Text style={[s.tblCellIndent, { flex: 1 }]}>{j.nama}</Text>
                <Text style={[s.tblCellMuted, { width: 36, textAlign: "right" }]}>{j.pct}%</Text>
                <View style={{ width: 52, paddingTop: 2 }}>
                  <PctBar pct={j.pct} color={C.chart[ki % C.chart.length]} />
                </View>
                <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>{rupiah(j.total)}</Text>
              </View>
              {j.sub.map((sub: SubGroup) => (
                <View key={sub.kode} style={s.tblSubRow}>
                  <Text style={[s.tblCellIndent2, { flex: 1 }]}>↳ {sub.nama}</Text>
                  <Text style={[s.tblCellMuted, { width: 36, fontSize: 7.5, textAlign: "right" }]}>{sub.pct}%</Text>
                  <View style={{ width: 52, paddingTop: 2 }}>
                    <PctBar pct={sub.pct} color={C.chart[ki % C.chart.length]} />
                  </View>
                  <Text style={[{ width: 80, fontSize: 7.5, color: C.textMuted, textAlign: "right" }]}>{rupiah(sub.total)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}

      {/* Grand total */}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>GRAND TOTAL</Text>
        <Text style={s.totalValue}>{rupiah(total)}</Text>
      </View>
    </View>
  )
}

function RekeningTable({ data, total }: { data: RekeningBreakdown[]; total: number }) {
  if (!data.length) return <Text style={s.tblCellMuted}>Tidak ada data rekening.</Text>
  return (
    <View>
      <View style={s.tblHeader}>
        <Text style={[s.tblHCell, { width: 90 }]}>Bank</Text>
        <Text style={[s.tblHCell, { flex: 1 }]}>Nama Rekening</Text>
        <Text style={[s.tblHCell, { width: 90 }]}>No. Rekening</Text>
        <Text style={[s.tblHCell, { width: 36, textAlign: "right" }]}>%</Text>
        <Text style={[s.tblHCell, { width: 80, textAlign: "right" }]}>Jumlah</Text>
      </View>
      {data.map((r, i) => (
        <View key={r.kode} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
          <Text style={[s.tblCell, s.tblBold, { width: 90 }]}>{r.namaBank}</Text>
          <Text style={[s.tblCell, { flex: 1 }]}>{r.namaRekening}</Text>
          <Text style={[s.tblCellMuted, { width: 90 }]}>{r.nomorRekening}</Text>
          <Text style={[s.tblCellMuted, { width: 36, textAlign: "right" }]}>{r.pct}%</Text>
          <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>{rupiah(r.total)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>TOTAL</Text>
        <Text style={s.totalValue}>{rupiah(total)}</Text>
      </View>
    </View>
  )
}

function UnitTable({ data, total }: { data: UnitKerjaBreakdown[]; total: number }) {
  if (!data.length) return <Text style={s.tblCellMuted}>Tidak ada data unit kerja.</Text>
  return (
    <View>
      <View style={s.tblHeader}>
        <Text style={[s.tblHCell, { flex: 1 }]}>Unit Kerja</Text>
        <Text style={[s.tblHCell, { width: 36, textAlign: "right" }]}>%</Text>
        <Text style={[s.tblHCell, { width: 52 }]}>{" "}</Text>
        <Text style={[s.tblHCell, { width: 80, textAlign: "right" }]}>Jumlah</Text>
      </View>
      {data.map((u, i) => (
        <View key={u.kode} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
          <Text style={[s.tblCell, { flex: 1 }]}>{u.nama}</Text>
          <Text style={[s.tblCellMuted, { width: 36, textAlign: "right" }]}>{u.pct}%</Text>
          <View style={{ width: 52, paddingTop: 2 }}>
            <PctBar pct={u.pct} color={C.chart[i % C.chart.length]} />
          </View>
          <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>{rupiah(u.total)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>TOTAL</Text>
        <Text style={s.totalValue}>{rupiah(total)}</Text>
      </View>
    </View>
  )
}

function MetodeTable({ data, total }: { data: MetodeBreakdown[]; total: number }) {
  if (!data.length) return <Text style={s.tblCellMuted}>Tidak ada data metode pembayaran.</Text>
  return (
    <View>
      <View style={s.tblHeader}>
        <Text style={[s.tblHCell, { flex: 1 }]}>Metode Pembayaran</Text>
        <Text style={[s.tblHCell, { width: 36, textAlign: "right" }]}>%</Text>
        <Text style={[s.tblHCell, { width: 52 }]}>{" "}</Text>
        <Text style={[s.tblHCell, { width: 80, textAlign: "right" }]}>Jumlah</Text>
      </View>
      {data.map((m, i) => (
        <View key={m.kode} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
          <Text style={[s.tblCell, { flex: 1 }]}>{m.nama}</Text>
          <Text style={[s.tblCellMuted, { width: 36, textAlign: "right" }]}>{m.pct}%</Text>
          <View style={{ width: 52, paddingTop: 2 }}>
            <PctBar pct={m.pct} color={C.chart[i % C.chart.length]} />
          </View>
          <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>{rupiah(m.total)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>TOTAL</Text>
        <Text style={s.totalValue}>{rupiah(total)}</Text>
      </View>
    </View>
  )
}

function SignatureBlock({ tahun, bulan }: { tahun: number; bulan: number }) {
  return (
    <View style={s.sigBlock}>
      <View style={s.sigBox}>
        <Text style={s.sigText}>Palopo, {BULAN[bulan - 1]} {tahun}</Text>
        <Text style={[s.sigText, { marginTop: 2 }]}>Pimpinan BLU UIN Palopo,</Text>
        <View style={s.sigSpace} />
        <View style={s.sigLine} />
        <Text style={s.sigName}>( ________________________________ )</Text>
        <Text style={s.sigNip}>NIP. ___________________________</Text>
      </View>
    </View>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LaporanBulananPDF({ data }: { data: RekapBulananFullResult }) {
  const { tahun, bulan, total, count, activeRekeningCount, dailyAverage, daysInMonth,
          byKategori, byRekening, byUnit, byMetode, dailyTrend } = data

  return (
    <Document
      title={`Laporan Penerimaan ${BULAN[bulan - 1]} ${tahun} — BLU UIN Palopo`}
      author="BLU UIN Palopo"
      subject="Laporan Penerimaan Dana Bulanan"
    >
      <Page size="A4" style={s.page}>
        {/* 1. Header */}
        <HeaderSection tahun={tahun} bulan={bulan} />

        {/* 2. Stat cards */}
        <StatCards
          total={total} count={count}
          activeRekeningCount={activeRekeningCount}
          dailyAverage={dailyAverage} daysInMonth={daysInMonth}
        />

        {/* 3. Kategori bar chart */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Penerimaan per Kategori</Text>
          <KategoriBarChart data={byKategori} total={total} />
        </View>

        {/* 4. Detailed breakdown table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rincian per Jenis Penerimaan</Text>
          <DetailBreakdownTable byKategori={byKategori} total={total} />
        </View>

        {/* 5. Rekening bank */}
        <View style={s.section} break>
          <Text style={s.sectionTitle}>Rekap per Rekening Bank</Text>
          <RekeningTable data={byRekening} total={total} />
        </View>

        {/* 6. Unit kerja */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rekap per Unit Kerja</Text>
          <UnitTable data={byUnit} total={total} />
        </View>

        {/* 7. Metode pembayaran */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rekap per Metode Pembayaran</Text>
          <MetodeTable data={byMetode} total={total} />
        </View>

        {/* 8. Daily trend */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tren Harian — {BULAN[bulan - 1]} {tahun}</Text>
          <DailyTrendChart data={dailyTrend} daysInMonth={daysInMonth} />
        </View>

        {/* 9. Signature */}
        <SignatureBlock tahun={tahun} bulan={bulan} />

        {/* 10. Fixed footer */}
        <View style={s.footer} fixed>
          <Text>BLU UIN Palopo — Laporan Penerimaan Dana {BULAN[bulan - 1]} {tahun}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
