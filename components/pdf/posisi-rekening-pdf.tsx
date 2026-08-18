import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { PosisiRekeningRow } from "@/app/actions/laporan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const BULAN_NAMA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

const C = {
  brand:     "#1e3a5f",
  surface:   "#f8fafc",
  border:    "#e2e8f0",
  text:      "#0f172a",
  textMuted: "#64748b",
  white:     "#ffffff",
  rowAlt:    "#f1f5f9",
  green:     "#059669",
  red:       "#dc2626",
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

  sectionTitle: { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.brand, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },

  tblHeader:   { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 5 },
  tblHCell:    { color: C.white, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700 },
  tblRow:      { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tblRowAlt:   { backgroundColor: C.rowAlt },
  tblCell:     { fontSize: 8, color: C.text },
  tblMuted:    { fontSize: 8, color: C.textMuted },
  tblBold:     { fontFamily: "Geist", fontWeight: 700 },
  tblMono:     { fontFamily: "Courier", fontSize: 7.5 },
  tblGreen:    { color: C.green },
  tblRed:      { color: C.red },

  totalRow:    { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 6, marginTop: 1, borderRadius: 3 },
  totalLabel:  { flex: 1, fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white },
  totalValue:  { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.white, textAlign: "right" },

  footer:      { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: C.textMuted, fontSize: 7, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 3 },
})

export function PosisiRekeningPDF({
  rows,
  tahun,
  bulan,
}: {
  rows: PosisiRekeningRow[]
  tahun: number
  bulan: number | null
}) {
  const labelPeriode = bulan !== null
    ? `${BULAN_NAMA[bulan - 1]} ${tahun}`
    : `Tahun ${tahun}`

  const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })

  const totalSaldoAwal   = rows.reduce((s, r) => s + r.saldoAwal, 0)
  const totalPenerimaan  = rows.reduce((s, r) => s + r.totalPenerimaan, 0)
  const totalPengeluaran = rows.reduce((s, r) => s + r.totalPengeluaran, 0)
  const totalSaldoAkhir  = rows.reduce((s, r) => s + r.saldoAkhir, 0)

  const PageHeader = () => (
    <View>
      <Text style={s.orgName}>BLU UIN Palopo</Text>
      <Text style={s.orgSub}>Universitas Islam Negeri Palopo — Badan Layanan Umum</Text>
      <Text style={s.reportTitle}>LAPORAN POSISI REKENING</Text>
      <View style={s.periodRow}>
        <Text style={s.periodText}>Periode: {labelPeriode} · Saldo Awal mengacu 1 Januari {tahun}</Text>
        <Text style={s.periodText}>Digenerate: {generatedAt}</Text>
      </View>
      <View style={s.divider} />
    </View>
  )

  const PageFooter = () => (
    <View style={s.footer} fixed>
      <Text>BLU UIN Palopo — Posisi Rekening {labelPeriode}</Text>
      <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
    </View>
  )

  return (
    <Document
      title={`Posisi Rekening ${labelPeriode} — BLU UIN Palopo`}
      author="BLU UIN Palopo"
      subject="Laporan Posisi Rekening"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <PageHeader />

        {/* Kartu ringkasan */}
        <View style={s.cardsRow}>
          {[
            { label: "Jumlah Rekening",   value: String(rows.length),      sub: "rekening aktif" },
            { label: "Total Saldo Awal",  value: rupiah(totalSaldoAwal),   sub: `1 Jan ${tahun}` },
            { label: "Total Pemasukan",   value: rupiah(totalPenerimaan),  sub: "kredit periode ini" },
            { label: "Total Pengeluaran", value: rupiah(totalPengeluaran), sub: "debit periode ini" },
            { label: "Total Saldo Akhir", value: rupiah(totalSaldoAkhir),  sub: "posisi akhir" },
          ].map((c) => (
            <View key={c.label} style={s.card}>
              <Text style={s.cardLabel}>{c.label}</Text>
              <Text style={[s.cardValue, { fontSize: 9 }]}>{c.value}</Text>
              <Text style={s.cardSub}>{c.sub}</Text>
            </View>
          ))}
        </View>

        {/* Tabel */}
        <View>
          <Text style={s.sectionTitle}>Rincian Per Rekening Bank</Text>
          {rows.length === 0 ? (
            <Text style={s.tblMuted}>Tidak ada data rekening aktif untuk periode ini.</Text>
          ) : (
            <View>
              {/* Header */}
              <View style={s.tblHeader}>
                <Text style={[s.tblHCell, { width: 110 }]}>Nama Bank</Text>
                <Text style={[s.tblHCell, { width: 95 }]}>No. Rekening</Text>
                <Text style={[s.tblHCell, { flex: 1 }]}>Nama Rekening</Text>
                <Text style={[s.tblHCell, { width: 90, textAlign: "right" }]}>Saldo Awal</Text>
                <Text style={[s.tblHCell, { width: 100, textAlign: "right" }]}>Pemasukan (Kredit)</Text>
                <Text style={[s.tblHCell, { width: 100, textAlign: "right" }]}>Pengeluaran (Debit)</Text>
                <Text style={[s.tblHCell, { width: 95, textAlign: "right" }]}>Saldo Akhir</Text>
              </View>

              {/* Baris data */}
              {rows.map((r, i) => (
                <View key={r.rekeningId} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                  <Text style={[s.tblCell, s.tblBold, { width: 110 }]}>{r.namaBank}</Text>
                  <Text style={[s.tblMuted, s.tblMono, { width: 95 }]}>{r.nomorRekening}</Text>
                  <Text style={[s.tblCell, { flex: 1 }]}>{r.namaRekening}</Text>
                  <Text style={[s.tblCell, { width: 90, textAlign: "right" }]}>{rupiah(r.saldoAwal)}</Text>
                  <Text style={[s.tblCell, s.tblGreen, { width: 100, textAlign: "right" }]}>
                    {r.totalPenerimaan > 0 ? rupiah(r.totalPenerimaan) : "—"}
                  </Text>
                  <Text style={[s.tblCell, s.tblRed, { width: 100, textAlign: "right" }]}>
                    {r.totalPengeluaran > 0 ? rupiah(r.totalPengeluaran) : "—"}
                  </Text>
                  <Text style={[s.tblCell, s.tblBold, { width: 95, textAlign: "right" }]}>{rupiah(r.saldoAkhir)}</Text>
                </View>
              ))}

              {/* Baris total */}
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { width: 110 + 95 }]}>TOTAL</Text>
                <Text style={[s.totalLabel, { flex: 1 }]}> </Text>
                <Text style={[s.totalValue, { width: 90 }]}>{rupiah(totalSaldoAwal)}</Text>
                <Text style={[s.totalValue, { width: 100 }]}>{rupiah(totalPenerimaan)}</Text>
                <Text style={[s.totalValue, { width: 100 }]}>{rupiah(totalPengeluaran)}</Text>
                <Text style={[s.totalValue, { width: 95 }]}>{rupiah(totalSaldoAkhir)}</Text>
              </View>
            </View>
          )}
        </View>

        <PageFooter />
      </Page>
    </Document>
  )
}
