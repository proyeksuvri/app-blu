import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { PosisiKasBulananResult } from "@/app/actions/laporan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

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
  cardValue:   { fontSize: 10.5, fontFamily: "Geist", fontWeight: 700, color: C.brand },
  cardSub:     { fontSize: 6.5, color: C.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.brand, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },

  tblHeader:   { flexDirection: "row", backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 6 },
  tblHCell:    { color: C.white, fontSize: 8, fontFamily: "Geist", fontWeight: 700 },
  tblRow:      { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: C.border },
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

export function PosisiRekeningBulananPDF({
  data,
}: {
  data: PosisiKasBulananResult
}) {
  const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })

  const PageHeader = () => (
    <View>
      <Text style={s.orgName}>BLU UIN Palopo</Text>
      <Text style={s.orgSub}>Universitas Islam Negeri Palopo — Badan Layanan Umum</Text>
      <Text style={s.reportTitle}>LAPORAN POSISI KAS BULANAN</Text>
      <View style={s.periodRow}>
        <Text style={s.periodText}>Tahun: {data.tahun} · {data.namaBank} {data.nomorRekening !== "—" ? `(${data.nomorRekening})` : ""}</Text>
        <Text style={s.periodText}>Digenerate: {generatedAt}</Text>
      </View>
      <View style={s.divider} />
    </View>
  )

  const PageFooter = () => (
    <View style={s.footer} fixed>
      <Text>BLU UIN Palopo — Posisi Kas Bulanan {data.tahun} ({data.namaBank})</Text>
      <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
    </View>
  )

  return (
    <Document
      title={`Posisi Kas Bulanan ${data.tahun} — ${data.namaBank} — BLU UIN Palopo`}
      author="BLU UIN Palopo"
      subject="Laporan Posisi Kas Bulanan"
    >
      <Page size="A4" style={s.page}>
        <PageHeader />

        {/* Kartu Ringkasan */}
        <View style={s.cardsRow}>
          {[
            { label: "Saldo Awal",        value: rupiah(data.saldoAwalTahun),   sub: `1 Jan ${data.tahun}` },
            { label: "Total Pemasukan",   value: rupiah(data.totalPemasukan),   sub: "kredit setahun" },
            { label: "Total Pengeluaran", value: rupiah(data.totalPengeluaran), sub: "debit setahun" },
            { label: "Saldo Akhir",       value: rupiah(data.saldoAkhirTahun),  sub: `31 Des ${data.tahun}` },
          ].map((c) => (
            <View key={c.label} style={s.card}>
              <Text style={s.cardLabel}>{c.label}</Text>
              <Text style={s.cardValue}>{c.value}</Text>
              <Text style={s.cardSub}>{c.sub}</Text>
            </View>
          ))}
        </View>

        {/* Tabel 12 Bulan */}
        <View>
          <Text style={s.sectionTitle}>Mutasi Kas 12 Bulan (Januari — Desember {data.tahun})</Text>
          <View>
            {/* Header */}
            <View style={s.tblHeader}>
              <Text style={[s.tblHCell, { width: 110 }]}>Bulan</Text>
              <Text style={[s.tblHCell, { flex: 1, textAlign: "right" }]}>Saldo Awal</Text>
              <Text style={[s.tblHCell, { flex: 1, textAlign: "right" }]}>Pemasukan (Kredit)</Text>
              <Text style={[s.tblHCell, { flex: 1, textAlign: "right" }]}>Pengeluaran (Debit)</Text>
              <Text style={[s.tblHCell, { flex: 1, textAlign: "right" }]}>Saldo Akhir</Text>
            </View>

            {/* Rows */}
            {data.rows.map((r, i) => (
              <View key={r.bulan} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                <Text style={[s.tblCell, s.tblBold, { width: 110 }]}>{r.namaBulan}</Text>
                <Text style={[s.tblCell, { flex: 1, textAlign: "right" }]}>{rupiah(r.saldoAwal)}</Text>
                <Text style={[s.tblCell, s.tblGreen, { flex: 1, textAlign: "right" }]}>
                  {r.pemasukan > 0 ? rupiah(r.pemasukan) : "—"}
                </Text>
                <Text style={[s.tblCell, s.tblRed, { flex: 1, textAlign: "right" }]}>
                  {r.pengeluaran > 0 ? rupiah(r.pengeluaran) : "—"}
                </Text>
                <Text style={[s.tblCell, s.tblBold, { flex: 1, textAlign: "right" }]}>{rupiah(r.saldoAkhir)}</Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { width: 110 }]}>TOTAL</Text>
              <Text style={[s.totalValue, { flex: 1 }]}>{rupiah(data.saldoAwalTahun)}</Text>
              <Text style={[s.totalValue, { flex: 1 }]}>{rupiah(data.totalPemasukan)}</Text>
              <Text style={[s.totalValue, { flex: 1 }]}>{rupiah(data.totalPengeluaran)}</Text>
              <Text style={[s.totalValue, { flex: 1 }]}>{rupiah(data.saldoAkhirTahun)}</Text>
            </View>
          </View>
        </View>

        <PageFooter />
      </Page>
    </Document>
  )
}
