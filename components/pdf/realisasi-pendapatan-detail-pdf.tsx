import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { RealisasiKategoriGroup } from "@/app/actions/laporan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)

const tglFmt = (s: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(s + "T00:00:00"))

const tglPanjang = (s: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(s + "T00:00:00"))

const C = {
  text: "#1e293b",
  textMuted: "#475569",
  white: "#ffffff",
  border: "#cbd5e1",
  brand: "#1e293b",
  rowAlt: "#f8fafc",
  totalBg: "#f1f5f9",
}

const s = StyleSheet.create({
  page: { padding: "15mm 15mm 24mm 15mm", fontSize: 9, fontFamily: "Geist", color: C.text, backgroundColor: C.white },
  kopWrapper: { flexDirection: "row", alignItems: "center", paddingBottom: 8, marginBottom: 2 },
  kopLogo: { marginRight: 12, flexShrink: 0 },
  kopText: { flex: 1, alignItems: "center" },
  kopKemenag:  { fontSize: 10, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.3 },
  kopUniv:     { fontSize: 13, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.3 },
  kopAlamat:   { fontSize: 8, color: C.text, textAlign: "center", marginTop: 3 },
  kopKontak:   { fontSize: 7.5, color: C.text, textAlign: "center", marginTop: 1 },
  kopDivider1: { borderBottomWidth: 3, borderBottomColor: C.text, marginBottom: 1.5 },
  kopDivider2: { borderBottomWidth: 1, borderBottomColor: C.text, marginBottom: 12 },
  judulWrapper: { alignItems: "center", marginBottom: 16 },
  judulUtama: { fontSize: 12, fontFamily: "Geist", fontWeight: 700, color: C.brand, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 },
  judulSub: { fontSize: 9, color: C.textMuted, textAlign: "center", marginTop: 2 },
  judulPeriode: { fontSize: 9, color: C.textMuted, textAlign: "center", marginTop: 4 },
  table: { width: "100%", flexDirection: "column", borderTopWidth: 1, borderLeftWidth: 1, borderColor: C.border },
  trHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.brand },
  trKat: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#475569", alignItems: "stretch", backgroundColor: "#334155" },
  trJenis: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: "#f1f5f9" },
  trJenisAlt: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.rowAlt },
  trSub: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.white },
  trSubtotal: { flexDirection: "row", borderBottomWidth: 1.5, borderColor: "#94a3b8", alignItems: "stretch", backgroundColor: "#e2e8f0" },
  trTotal: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.totalBg },
  tdHeader: { paddingVertical: 7, paddingHorizontal: 8, fontFamily: "Geist", fontWeight: 700, fontSize: 8.5, borderRightWidth: 1, borderColor: C.border, textAlign: "center", color: C.white, textTransform: "uppercase" },
  tdKat: { paddingVertical: 6, paddingHorizontal: 8, fontFamily: "Geist", fontWeight: 700, fontSize: 9, borderRightWidth: 1, borderColor: "#475569", color: C.white, justifyContent: "center" },
  tdJenis: { paddingVertical: 5, paddingHorizontal: 8, fontSize: 8.5, borderRightWidth: 1, borderColor: C.border, justifyContent: "center" },
  tdSub: { paddingVertical: 4, paddingHorizontal: 8, fontSize: 8, borderRightWidth: 1, borderColor: C.border, justifyContent: "center", color: C.textMuted },
  tdSubtotal: { paddingVertical: 5, paddingHorizontal: 8, fontFamily: "Geist", fontWeight: 700, fontSize: 8.5, borderRightWidth: 1, borderColor: C.border, justifyContent: "center", color: "#1e3a5f" },
  tdTotal: { paddingVertical: 7, paddingHorizontal: 8, fontFamily: "Geist", fontWeight: 700, fontSize: 9, borderRightWidth: 1, borderColor: C.border, justifyContent: "center", color: C.brand },
  colNo: { width: "6%" },
  colAkun: { width: "18%" },
  colUraian: { width: "52%" },
  colJumlah: { width: "24%", textAlign: "right" },
  ttdWrapper: { marginTop: 30, flexDirection: "row", justifyContent: "flex-end", paddingRight: 20 },
  ttdBox: { width: 220, alignItems: "center" },
  ttdDate: { fontSize: 9, marginBottom: 4 },
  ttdRole: { fontSize: 9, fontFamily: "Geist", fontWeight: 700, marginBottom: 60 },
  ttdName: { fontSize: 9, fontFamily: "Geist", fontWeight: 700 },
  pageNumber: { position: "absolute", bottom: 12, right: 15, fontSize: 8, color: "#666" },
})

const LOGO_BASE64 = "data:image/png;base64,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"

interface Props {
  tglAwal: string
  tglAkhir: string
  groups: RealisasiKategoriGroup[]
}

export function RealisasiPendapatanDetailPDF({ tglAwal, tglAkhir, groups }: Props) {
  const periode =
    tglAwal === tglAkhir
      ? tglPanjang(tglAwal)
      : `${tglFmt(tglAwal)} s/d ${tglFmt(tglAkhir)}`

  const grandTotal = groups.reduce((acc, g) => acc + g.jumlah, 0)

  return (
    <Document author="BLU UIN Palopo" title={`Realisasi Pendapatan BLU - Rincian Lengkap ${periode}`}>
      <Page size="A4" orientation="portrait" style={s.page}>
        <View style={s.kopWrapper} fixed>
          <Image style={[s.kopLogo, { width: 52, height: 62 }]} src={LOGO_BASE64} />
          <View style={s.kopText}>
            <Text style={s.kopKemenag}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</Text>
            <Text style={s.kopUniv}>UNIVERSITAS ISLAM NEGERI PALOPO</Text>
            <Text style={s.kopAlamat}>Jl. Agatis, Balandai, Kec. Bara, Kota Palopo, Sulawesi Selatan 91914</Text>
            <Text style={s.kopKontak}>Telepon: (0471) 22076 | Email: humas@iainpalopo.ac.id</Text>
          </View>
        </View>
        <View style={s.kopDivider1} fixed />
        <View style={s.kopDivider2} fixed />

        <View style={s.judulWrapper} fixed>
          <Text style={s.judulUtama}>Realisasi Pendapatan BLU</Text>
          <Text style={s.judulSub}>Rincian Lengkap (Kategori - Jenis - Sub Pendapatan)</Text>
          <Text style={s.judulPeriode}>Periode: {periode}</Text>
        </View>

        <View style={s.table}>
          <View style={s.trHeader} fixed>
            <Text style={[s.tdHeader, s.colNo]}>No</Text>
            <Text style={[s.tdHeader, s.colAkun]}>Akun</Text>
            <Text style={[s.tdHeader, s.colUraian]}>Uraian Pendapatan</Text>
            <Text style={[s.tdHeader, s.colJumlah]}>Jumlah (Rp)</Text>
          </View>

          {groups.map((kat, ki) => (
            <View key={`kat-${ki}`}>
              <View style={s.trKat} wrap={false}>
                <Text style={[s.tdKat, s.colNo, { textAlign: "center" }]}>{ki + 1}</Text>
                <Text style={[s.tdKat, s.colAkun, { textAlign: "center" }]}>{kat.kode_kategori === "__tanpa_kategori__" ? "-" : kat.kode_kategori}</Text>
                <Text style={[s.tdKat, s.colUraian]}>{kat.nama_kategori}</Text>
                <Text style={[s.tdKat, s.colJumlah]}>{rupiah(kat.jumlah)}</Text>
              </View>

              {kat.jenis.map((jen, ji) => (
                <View key={`jen-${ki}-${ji}`}>
                  <View style={ji % 2 !== 0 ? s.trJenisAlt : s.trJenis} wrap={false}>
                    <Text style={[s.tdJenis, s.colNo, { textAlign: "center", color: C.textMuted }]}>{ji + 1}</Text>
                    <Text style={[s.tdJenis, s.colAkun, { textAlign: "center", fontFamily: "Geist", fontWeight: 700 }]}>{jen.akun_pendapatan}</Text>
                    <Text style={[s.tdJenis, s.colUraian, { paddingLeft: 14 }]}>{jen.nama_jenis}</Text>
                    <Text style={[s.tdJenis, s.colJumlah]}>{jen.sub.length > 0 ? "" : rupiah(jen.jumlah)}</Text>
                  </View>

                  {jen.sub.map((sub, si) => (
                    <View key={`sub-${ki}-${ji}-${si}`} style={s.trSub} wrap={false}>
                      <Text style={[s.tdSub, s.colNo]}></Text>
                      <Text style={[s.tdSub, s.colAkun, { textAlign: "center" }]}>{sub.kode_sub ?? "-"}</Text>
                      <Text style={[s.tdSub, s.colUraian, { paddingLeft: 24 }]}>{">"} {sub.nama_sub ?? "-"}</Text>
                      <Text style={[s.tdSub, s.colJumlah]}>{rupiah(sub.jumlah)}</Text>
                    </View>
                  ))}

                  {jen.sub.length > 0 && (
                    <View style={s.trSubtotal} wrap={false}>
                      <Text style={[s.tdSubtotal, { width: "76%", textAlign: "right", paddingRight: 12 }]}>Subtotal {jen.nama_jenis}</Text>
                      <Text style={[s.tdSubtotal, s.colJumlah]}>{rupiah(jen.jumlah)}</Text>
                    </View>
                  )}
                </View>
              ))}

              <View style={s.trSubtotal} wrap={false}>
                <Text style={[s.tdSubtotal, { width: "76%", textAlign: "right", paddingRight: 12 }]}>Subtotal {kat.nama_kategori}</Text>
                <Text style={[s.tdSubtotal, s.colJumlah]}>{rupiah(kat.jumlah)}</Text>
              </View>
            </View>
          ))}

          <View style={s.trTotal} wrap={false}>
            <Text style={[s.tdTotal, { width: "76%", textAlign: "right", paddingRight: 12 }]}>TOTAL PENDAPATAN</Text>
            <Text style={[s.tdTotal, s.colJumlah]}>{rupiah(grandTotal)}</Text>
          </View>
        </View>

        <View style={s.ttdWrapper} wrap={false}>
          <View style={s.ttdBox}>
            <Text style={s.ttdDate}>Palopo, {tglPanjang(new Date().toISOString().split("T")[0])}</Text>
            <Text style={s.ttdRole}>Bendahara Penerimaan</Text>
            <Text style={s.ttdName}>Suvri Abdillah, S. Sos</Text>
          </View>
        </View>

        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}