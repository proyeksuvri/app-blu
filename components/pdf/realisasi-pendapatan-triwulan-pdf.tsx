import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { RealisasiPendapatanBulananResult } from "@/app/actions/laporan"
import { LOGO_B64 } from "./logo-base64"

const angka = (n: number) => new Intl.NumberFormat("id-ID").format(n)

const C = {
  text:      "#1e293b",
  textMuted: "#475569",
  white:     "#ffffff",
  border:    "#cbd5e1",
  brand:     "#1e293b",
  rowAlt:    "#f8fafc",
  totalBg:   "#e2e8f0",
  katBg:     "#1e293b",
  subBg:     "#f8fafc",
}

interface Props {
  tahun: number
  data: RealisasiPendapatanBulananResult
  showSub?: boolean
}

export function RealisasiPendapatanTriwulanPDF({ tahun, data, showSub = false }: Props) {
  const colNoWidth = 20
  const colKodeWidth = 45
  const colNamaWidth = 195
  const colTwWidth = 72
  const colTotalWidth = 80
  const colTargetWidth = 75
  const colPctWidth = 35

  const fontSizeNum = 7
  const fontSizeText = 7.5
  const fontSizeH = 7.5

  const s = StyleSheet.create({
    page: {
      padding: "10mm 10mm 18mm 10mm",
      fontSize: fontSizeText,
      fontFamily: "Geist",
      color: C.text,
      backgroundColor: C.white,
    },

    kopWrapper:   { flexDirection: "row", alignItems: "center", paddingBottom: 6, marginBottom: 0 },
    kopLogo:      { marginRight: 12, flexShrink: 0 },
    kopText:      { flex: 1, alignItems: "center" },
    kopKemenag:   { fontSize: 8.5, fontFamily: "Geist", color: C.text, textAlign: "center", letterSpacing: 0.3 },
    kopUniv:      { fontSize: 13, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.5 },
    kopAlamat:    { fontSize: 6.5, color: C.textMuted, textAlign: "center", marginTop: 2.5 },
    kopDividerBlock: { marginBottom: 10 },
    kopDivider1:  { borderBottomWidth: 3, borderBottomColor: C.text, marginBottom: 1.5 },
    kopDivider2:  { borderBottomWidth: 0.8, borderBottomColor: C.text },

    judulWrapper: { alignItems: "center", marginBottom: 8 },
    judulUtama:   { fontSize: 11, fontFamily: "Geist", fontWeight: 700, color: C.brand, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
    judulPeriode: { fontSize: 7.5, color: C.textMuted, textAlign: "center", marginTop: 3 },

    table:    { width: "100%", flexDirection: "column", borderTopWidth: 1, borderLeftWidth: 1, borderColor: C.border },
    tr:       { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch" },
    trSub:    { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: "#f8fafc" },
    trKat:    { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.katBg },
    trHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.brand },
    trTotal:  { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch", backgroundColor: C.totalBg },
    trAlt:    { backgroundColor: "#f8fafc" },

    tdH: {
      paddingVertical: 4, paddingHorizontal: 2,
      fontFamily: "Geist", fontWeight: 700, fontSize: fontSizeH,
      borderRightWidth: 1, borderColor: C.border,
      textAlign: "center", color: C.white, textTransform: "uppercase",
      justifyContent: "center",
    },
    td: {
      paddingVertical: 3, paddingHorizontal: 2,
      fontSize: fontSizeText,
      borderRightWidth: 1, borderColor: C.border,
      justifyContent: "center",
    },
    tdNum: {
      paddingVertical: 3, paddingHorizontal: 2,
      fontSize: fontSizeNum,
      borderRightWidth: 1, borderColor: C.border,
      textAlign: "right", justifyContent: "center",
    },
    tdKat: {
      paddingVertical: 4, paddingHorizontal: 2,
      fontFamily: "Geist", fontWeight: 700, fontSize: fontSizeText,
      borderRightWidth: 1, borderColor: C.border,
      color: C.white, justifyContent: "center",
    },
    tdKatNum: {
      paddingVertical: 4, paddingHorizontal: 2,
      fontFamily: "Geist", fontWeight: 700, fontSize: fontSizeNum,
      borderRightWidth: 1, borderColor: C.border,
      textAlign: "right", color: C.white, justifyContent: "center",
    },
    tdTotal: {
      paddingVertical: 4, paddingHorizontal: 2,
      fontFamily: "Geist", fontWeight: 700, fontSize: fontSizeText,
      borderRightWidth: 1, borderColor: C.border, justifyContent: "center",
    },
    tdTotalNum: {
      paddingVertical: 4, paddingHorizontal: 2,
      fontFamily: "Geist", fontWeight: 700, fontSize: fontSizeNum,
      borderRightWidth: 1, borderColor: C.border,
      textAlign: "right", justifyContent: "center",
    },

    colNo:     { width: colNoWidth, flexShrink: 0, textAlign: "center" },
    colKode:   { width: colKodeWidth, flexShrink: 0, textAlign: "center" },
    colNama:   { width: colNamaWidth, flexShrink: 0 },
    colTw:     { width: colTwWidth, flexShrink: 0 },
    colTotal:  { width: colTotalWidth, flexShrink: 0 },
    colTarget: { width: colTargetWidth, flexShrink: 0 },
    colPct:    { flex: 1, minWidth: colPctWidth, flexShrink: 0, borderRightWidth: 0, textAlign: "right" },

    pageNumber: { position: "absolute", bottom: 8, right: 10, fontSize: 6.5, color: "#666" },
  })

  // Helper untuk hitung total per triwulan
  const getTwValues = (perBulan: number[]) => {
    const tw1 = (perBulan[0] || 0) + (perBulan[1] || 0) + (perBulan[2] || 0)
    const tw2 = (perBulan[3] || 0) + (perBulan[4] || 0) + (perBulan[5] || 0)
    const tw3 = (perBulan[6] || 0) + (perBulan[7] || 0) + (perBulan[8] || 0)
    const tw4 = (perBulan[9] || 0) + (perBulan[10] || 0) + (perBulan[11] || 0)
    const total = tw1 + tw2 + tw3 + tw4
    return { tw1, tw2, tw3, tw4, total }
  }

  return (
    <Document author="BLU UIN Palopo" title={`Laporan Realisasi Pendapatan Triwulan BLU ${tahun}`}>
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* Kop Surat */}
        <View style={s.kopWrapper} fixed>
          <Image style={[s.kopLogo, { width: 44, height: 52 }]} src={LOGO_B64} />
          <View style={s.kopText}>
            <Text style={s.kopKemenag}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</Text>
            <Text style={s.kopUniv}>UNIVERSITAS ISLAM NEGERI PALOPO</Text>
            <Text style={s.kopAlamat}>Jl. Agatis No. 1 Telp 0471-22076 Fax 0471-325195 Kota Palopo</Text>
          </View>
        </View>

        {/* Garis Pembatas Kop */}
        <View style={s.kopDividerBlock} fixed>
          <View style={s.kopDivider1} />
          <View style={s.kopDivider2} />
        </View>

        {/* Judul Laporan */}
        <View style={s.judulWrapper} fixed>
          <Text style={s.judulUtama}>LAPORAN REALISASI PENDAPATAN BLU PER TRIWULAN</Text>
          <Text style={s.judulPeriode}>TAHUN ANGGARAN {tahun}</Text>
        </View>

        {/* Tabel */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.trHeader} fixed>
            <Text style={[s.tdH, s.colNo, { textAlign: "center" }]}>NO</Text>
            <Text style={[s.tdH, s.colKode, { textAlign: "center" }]}>KODE</Text>
            <Text style={[s.tdH, s.colNama, { textAlign: "center" }]}>JENIS PENDAPATAN</Text>
            <Text style={[s.tdH, s.colTw, { textAlign: "center" }]}>TRIWULAN I</Text>
            <Text style={[s.tdH, s.colTw, { textAlign: "center" }]}>TRIWULAN II</Text>
            <Text style={[s.tdH, s.colTw, { textAlign: "center" }]}>TRIWULAN III</Text>
            <Text style={[s.tdH, s.colTw, { textAlign: "center" }]}>TRIWULAN IV</Text>
            <Text style={[s.tdH, s.colTotal, { textAlign: "center" }]}>TOTAL</Text>
            <Text style={[s.tdH, s.colTarget, { textAlign: "center" }]}>TARGET</Text>
            <Text style={[s.tdH, s.colPct, { textAlign: "center" }]}>%</Text>
          </View>

          {data.kategori.map((kat, ki) => {
            const katTw = getTwValues(kat.perBulan)

            return (
              <View key={`kat-${ki}`}>
                {/* Baris Kategori */}
                <View style={s.trKat} wrap={false}>
                  <Text style={[s.tdKat, s.colNo, { textAlign: "center" }]}>{kat.nomorRomawi}</Text>
                  <Text style={[s.tdKat, s.colKode]}></Text>
                  <Text style={[s.tdKat, s.colNama, { paddingLeft: 4 }]}>{kat.nama_kategori}</Text>
                  <Text style={[s.tdKatNum, s.colTw]}>{katTw.tw1 > 0 ? angka(katTw.tw1) : "-"}</Text>
                  <Text style={[s.tdKatNum, s.colTw]}>{katTw.tw2 > 0 ? angka(katTw.tw2) : "-"}</Text>
                  <Text style={[s.tdKatNum, s.colTw]}>{katTw.tw3 > 0 ? angka(katTw.tw3) : "-"}</Text>
                  <Text style={[s.tdKatNum, s.colTw]}>{katTw.tw4 > 0 ? angka(katTw.tw4) : "-"}</Text>
                  <Text style={[s.tdKatNum, s.colTotal]}>{angka(katTw.total)}</Text>
                  <Text style={[s.tdKat, s.colTarget, { textAlign: "center" }]}>-</Text>
                  <Text style={[s.tdKat, s.colPct, { textAlign: "center" }]}>-</Text>
                </View>

                {/* Baris Jenis */}
                {kat.jenis.map((jen, ji) => {
                  const jenTw = getTwValues(jen.perBulan)
                  const jenPct = jen.target > 0 ? Math.round((jenTw.total / jen.target) * 10000) / 100 : 0

                  return (
                    <View key={`jen-${ki}-${ji}`}>
                      <View style={[s.tr, ji % 2 !== 0 ? s.trAlt : {}]} wrap={false}>
                        <Text style={[s.td, s.colNo, { textAlign: "center", color: C.textMuted }]}>{ji + 1}</Text>
                        <Text style={[s.td, s.colKode, { textAlign: "center", fontFamily: "Geist", fontWeight: 700 }]}>
                          {jen.akun_pendapatan}
                        </Text>
                        <Text style={[s.td, s.colNama, { paddingLeft: 6 }]}>{jen.nama_jenis}</Text>
                        <Text style={[s.tdNum, s.colTw]}>{jenTw.tw1 > 0 ? angka(jenTw.tw1) : "-"}</Text>
                        <Text style={[s.tdNum, s.colTw]}>{jenTw.tw2 > 0 ? angka(jenTw.tw2) : "-"}</Text>
                        <Text style={[s.tdNum, s.colTw]}>{jenTw.tw3 > 0 ? angka(jenTw.tw3) : "-"}</Text>
                        <Text style={[s.tdNum, s.colTw]}>{jenTw.tw4 > 0 ? angka(jenTw.tw4) : "-"}</Text>
                        <Text style={[s.tdNum, s.colTotal, { fontFamily: "Geist", fontWeight: 700 }]}>
                          {jenTw.total > 0 ? angka(jenTw.total) : "-"}
                        </Text>
                        <Text style={[s.tdNum, s.colTarget, { color: C.textMuted }]}>
                          {jen.target > 0 ? angka(jen.target) : "-"}
                        </Text>
                        <Text style={[s.tdNum, s.colPct]}>
                          {jen.target > 0 ? `${jenPct.toFixed(2)}%` : "-"}
                        </Text>
                      </View>

                      {/* Sub baris (hanya jika showSub bernilai true) */}
                      {showSub && jen.sub.map((sub, si) => {
                        const subTw = getTwValues(sub.perBulan)

                        return (
                          <View key={`sub-${ki}-${ji}-${si}`} style={s.trSub} wrap={false}>
                            <Text style={[s.td, s.colNo]}></Text>
                            <Text style={[s.td, s.colKode, { textAlign: "center", color: C.textMuted }]}>
                              {sub.kode_sub ?? "-"}
                            </Text>
                            <Text style={[s.td, s.colNama, { paddingLeft: 12, color: C.textMuted }]}>
                              ↳ {sub.nama_sub ?? "-"}
                            </Text>
                            <Text style={[s.tdNum, s.colTw, { color: C.textMuted }]}>{subTw.tw1 > 0 ? angka(subTw.tw1) : "-"}</Text>
                            <Text style={[s.tdNum, s.colTw, { color: C.textMuted }]}>{subTw.tw2 > 0 ? angka(subTw.tw2) : "-"}</Text>
                            <Text style={[s.tdNum, s.colTw, { color: C.textMuted }]}>{subTw.tw3 > 0 ? angka(subTw.tw3) : "-"}</Text>
                            <Text style={[s.tdNum, s.colTw, { color: C.textMuted }]}>{subTw.tw4 > 0 ? angka(subTw.tw4) : "-"}</Text>
                            <Text style={[s.tdNum, s.colTotal, { color: C.textMuted }]}>
                              {subTw.total > 0 ? angka(subTw.total) : "-"}
                            </Text>
                            <Text style={[s.td, s.colTarget]}></Text>
                            <Text style={[s.td, s.colPct]}></Text>
                          </View>
                        )
                      })}
                    </View>
                  )
                })}
              </View>
            )
          })}

          {/* Grand Total */}
          {(() => {
            const grandTw = getTwValues(data.grandPerBulan)
            const grandPct = data.grandTarget > 0 ? Math.round((grandTw.total / data.grandTarget) * 10000) / 100 : 0

            return (
              <View style={s.trTotal} wrap={false}>
                <Text style={[s.tdTotal, s.colNo, { textAlign: "center" }]}></Text>
                <Text style={[s.tdTotal, s.colKode]}></Text>
                <Text style={[s.tdTotal, s.colNama, { textAlign: "right", paddingRight: 6 }]}>TOTAL</Text>
                <Text style={[s.tdTotalNum, s.colTw, { color: C.brand }]}>{grandTw.tw1 > 0 ? angka(grandTw.tw1) : "-"}</Text>
                <Text style={[s.tdTotalNum, s.colTw, { color: C.brand }]}>{grandTw.tw2 > 0 ? angka(grandTw.tw2) : "-"}</Text>
                <Text style={[s.tdTotalNum, s.colTw, { color: C.brand }]}>{grandTw.tw3 > 0 ? angka(grandTw.tw3) : "-"}</Text>
                <Text style={[s.tdTotalNum, s.colTw, { color: C.brand }]}>{grandTw.tw4 > 0 ? angka(grandTw.tw4) : "-"}</Text>
                <Text style={[s.tdTotalNum, s.colTotal, { color: C.brand }]}>{angka(grandTw.total)}</Text>
                <Text style={[s.tdTotalNum, s.colTarget, { color: C.textMuted }]}>
                  {data.grandTarget > 0 ? angka(data.grandTarget) : "-"}
                </Text>
                <Text style={[s.tdTotalNum, s.colPct]}>
                  {data.grandTarget > 0 ? `${grandPct.toFixed(2)}%` : "-"}
                </Text>
              </View>
            )
          })()}
        </View>

        {/* Page number */}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
