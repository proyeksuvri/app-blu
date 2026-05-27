import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const s = StyleSheet.create({
  page:        { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header:      { marginBottom: 24 },
  org:         { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle:    { fontSize: 10, color: "#555" },
  period:      { fontSize: 10, color: "#555", marginTop: 2 },
  divider:     { borderBottomWidth: 1, borderBottomColor: "#e0e0e0", marginBottom: 16 },
  section:     { marginBottom: 12, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 4, overflow: "hidden" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f5f5f5", paddingHorizontal: 12, paddingVertical: 7 },
  sectionName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  sectionTotal:{ fontFamily: "Helvetica-Bold", fontSize: 10 },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  rowLabel:    { color: "#555", flex: 1 },
  rowAmount:   { color: "#333", textAlign: "right" },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1a1a1a", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 4, marginTop: 4 },
  totalLabel:  { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#fff" },
  totalAmount: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#fff", textAlign: "right" },
  footer:      { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: "#aaa", fontSize: 8 },
})

type JenisGroup = { kode: string; nama: string; total: number }
type KategoriGroup = { kodeKategori: string; namaKategori: string; total: number; jenis: Record<string, JenisGroup> }

export function LaporanBulananPDF({
  tahun, bulan, byKategori, total,
}: {
  tahun: number; bulan: number
  byKategori: KategoriGroup[]; total: number
}) {
  const bulanNama = BULAN[bulan - 1]
  const generatedAt = new Date().toLocaleString("id-ID")

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.org}>BLU UIN Palopo</Text>
          <Text style={s.subtitle}>Laporan Penerimaan Dana Bulanan</Text>
          <Text style={s.period}>Periode: {bulanNama} {tahun}</Text>
        </View>
        <View style={s.divider} />

        {/* Kategori groups */}
        {byKategori.map((kat) => (
          <View key={kat.kodeKategori} style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionName}>{kat.namaKategori}</Text>
              <Text style={s.sectionTotal}>{rupiah(kat.total)}</Text>
            </View>
            {Object.values(kat.jenis).map((j) => (
              <View key={j.kode} style={s.row}>
                <Text style={s.rowLabel}>{j.nama}</Text>
                <Text style={s.rowAmount}>{rupiah(j.total)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL BULAN INI</Text>
          <Text style={s.totalAmount}>{rupiah(total)}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>BLU UIN Palopo — Dokumen ini digenerate otomatis</Text>
          <Text>{generatedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
