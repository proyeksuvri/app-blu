import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { RealisasiPendapatanRingkasanResult } from "@/app/actions/laporan-ringkasan"
import { LOGO_B64 } from "./logo-base64"

const angka = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)

const BULAN_SINGKAT = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGU", "SEP", "OKT", "NOV", "DES",
]

const C = {
  text:      "#1e293b",
  textMuted: "#475569",
  white:     "#ffffff",
  border:    "#cbd5e1",
  brand:     "#1e293b",
  rowAlt:    "#f8fafc",
  totalBg:   "#e2e8f0",
  katBg:     "#1e293b",
}

interface Props {
  tahun: number
  data: RealisasiPendapatanRingkasanResult
  checkedBulan?: number[]
}

function getPrevTwColumns(checkedBulan?: number[]) {
  if (!checkedBulan || checkedBulan.length === 0) return []
  const sorted = [...checkedBulan].sort((a, b) => a - b)
  const minMonth = sorted[0]

  const cols: { label: string; indices: number[] }[] = []
  if (minMonth >= 4) cols.push({ label: "TOTAL TW I", indices: [0, 1, 2] })
  if (minMonth >= 7) cols.push({ label: "TOTAL TW II", indices: [3, 4, 5] })
  if (minMonth >= 10) cols.push({ label: "TOTAL TW III", indices: [6, 7, 8] })
  return cols
}

function getDisplayedTotal(
  perBulan: number[],
  prevCols: { label: string; indices: number[] }[],
  visibleIdx: number[]
): number {
  const sumPrev = prevCols.reduce(
    (sum, col) => sum + col.indices.reduce((s, bi) => s + (perBulan[bi] || 0), 0),
    0
  )
  const sumVisible = visibleIdx.reduce(
    (sum, bi) => sum + (perBulan[bi] || 0),
    0
  )
  return sumPrev + sumVisible
}

export function RealisasiPendapatanRingkasanPDF({ tahun, data, checkedBulan }: Props) {
  const visibleIdx: number[] =
    !checkedBulan || checkedBulan.length === 0
      ? Array.from({ length: 12 }, (_, i) => i)
      : checkedBulan.map((b) => b - 1).sort((a, b) => a - b)

  const prevCols = getPrevTwColumns(checkedBulan)
  const numBln = visibleIdx.length

  const colNoWidth     = 18
  const colKodeWidth   = 42

  let colNamaWidth  = 160
  let colBlnWidth   = 46
  let colTotalWidth = 60
  let colTargetWidth= 60
  let colPctWidth   = 32
  let fontSizeNum   = 6
  let fontSizeText  = 7
  let fontSizeH     = 7

  if (numBln <= 2) {
    colTotalWidth = 85; colTargetWidth = 85; colPctWidth = 45
    colNamaWidth = 220 - (prevCols.length * 35)
    const colPrevWidth = colTotalWidth
    const totalPrevWidth = prevCols.length * colPrevWidth
    const sisa = 780 - (colNoWidth + colKodeWidth + colNamaWidth + totalPrevWidth + colTotalWidth + colTargetWidth + colPctWidth)
    colBlnWidth = Math.floor(sisa / numBln)
    fontSizeNum = 9; fontSizeText = 9; fontSizeH = 9
  } else if (numBln <= 4) {
    colTotalWidth = 72; colTargetWidth = 72; colPctWidth = 40
    colNamaWidth = 200 - (prevCols.length * 20)
    const colPrevWidth = colTotalWidth
    const totalPrevWidth = prevCols.length * colPrevWidth
    const sisa = 780 - (colNoWidth + colKodeWidth + colNamaWidth + totalPrevWidth + colTotalWidth + colTargetWidth + colPctWidth)
    colBlnWidth = Math.floor(sisa / numBln)
    fontSizeNum = 8; fontSizeText = 8.5; fontSizeH = 8.5
  } else if (numBln <= 6) {
    colTotalWidth = 64; colTargetWidth = 66; colPctWidth = 38
    colNamaWidth = 180 - (prevCols.length * 15)
    const colPrevWidth = colTotalWidth
    const totalPrevWidth = prevCols.length * colPrevWidth
    const sisa = 780 - (colNoWidth + colKodeWidth + colNamaWidth + totalPrevWidth + colTotalWidth + colTargetWidth + colPctWidth)
    colBlnWidth = Math.floor(sisa / numBln)
    fontSizeNum = 7; fontSizeText = 8; fontSizeH = 8
  } else if (numBln <= 9) {
    colTotalWidth = 58; colTargetWidth = 58; colPctWidth = 34
    colNamaWidth = 155 - (prevCols.length * 10)
    const colPrevWidth = colTotalWidth
    const totalPrevWidth = prevCols.length * colPrevWidth
    const sisa = 780 - (colNoWidth + colKodeWidth + colNamaWidth + totalPrevWidth + colTotalWidth + colTargetWidth + colPctWidth)
    colBlnWidth = Math.floor(sisa / numBln)
    fontSizeNum = 6.5; fontSizeText = 7.5; fontSizeH = 7.5
  } else {
    colTotalWidth = 55; colTargetWidth = 55; colPctWidth = 30
    colNamaWidth = 145
    const colPrevWidth = colTotalWidth
    const totalPrevWidth = prevCols.length * colPrevWidth
    const sisa = 780 - (colNoWidth + colKodeWidth + colNamaWidth + totalPrevWidth + colTotalWidth + colTargetWidth + colPctWidth)
    colBlnWidth = Math.floor(sisa / numBln)
    fontSizeNum = 5.5; fontSizeText = 6.5; fontSizeH = 6.5
  }

  const colPrevWidth = colTotalWidth

  let periodeText = `TAHUN ${tahun}`
  if (checkedBulan && checkedBulan.length > 0) {
    const listNama = visibleIdx.map((i) => BULAN_SINGKAT[i]).join(", ")
    periodeText = `BULAN (${listNama}) ${tahun}`
  }

  const grandPerBulanVisible = visibleIdx.reduce((s, bi) => s + (data.grandPerBulan[bi] || 0), 0)

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
    judulSub:     { fontSize: 8.5, fontFamily: "Geist", fontWeight: 700, color: C.brand, textAlign: "center", textTransform: "uppercase", marginTop: 1 },
    judulPeriode: { fontSize: 7.5, color: C.textMuted, textAlign: "center", marginTop: 3 },

    table:    { width: "100%", flexDirection: "column", borderTopWidth: 1, borderLeftWidth: 1, borderColor: C.border },
    tr:       { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, alignItems: "stretch" },
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
    colPrev:   { width: colPrevWidth, flexShrink: 0 },
    colBln:    { width: colBlnWidth, flexShrink: 0 },
    colTotal:  { width: colTotalWidth, flexShrink: 0 },
    colTarget: { width: colTargetWidth, flexShrink: 0 },
    colPct:    { flex: 1, minWidth: colPctWidth, flexShrink: 0, borderRightWidth: 0, textAlign: "right" },

    pageNumber: { position: "absolute", bottom: 8, right: 10, fontSize: 6.5, color: "#666" },
  })

  let noJenis = 0

  return (
    <Document author="BLU UIN Palopo" title={`Laporan Ringkasan Penerimaan BLU ${tahun}`}>
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

        {/* Garis kop premium */}
        <View style={s.kopDividerBlock} fixed>
          <View style={s.kopDivider1} />
          <View style={s.kopDivider2} />
        </View>

        {/* Judul */}
        <View style={s.judulWrapper} fixed>
          <Text style={s.judulUtama}>LAPORAN PENERIMAAN BLU UIN PALOPO</Text>
          <Text style={s.judulSub}>(RINGKASAN PER JENIS PENDAPATAN)</Text>
          <Text style={s.judulPeriode}>PERIODE {periodeText}</Text>
        </View>

        {/* Tabel */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.trHeader} fixed>
            <Text style={[s.tdH, s.colNo, { textAlign: "center" }]}>NO</Text>
            <Text style={[s.tdH, s.colKode, { textAlign: "center" }]}>KODE MAP</Text>
            <Text style={[s.tdH, s.colNama, { textAlign: "center" }]}>JENIS PENDAPATAN</Text>
            {prevCols.map((col, cIdx) => (
              <Text key={`r-prev-h-${cIdx}`} style={[s.tdH, s.colPrev, { textAlign: "center" }]}>{col.label}</Text>
            ))}
            {visibleIdx.map((bi) => (
              <Text key={bi} style={[s.tdH, s.colBln, { textAlign: "center" }]}>{BULAN_SINGKAT[bi]}</Text>
            ))}
            <Text style={[s.tdH, s.colTotal, { textAlign: "center" }]}>TOTAL</Text>
            <Text style={[s.tdH, s.colTarget, { textAlign: "center" }]}>TARGET</Text>
            <Text style={[s.tdH, s.colPct, { textAlign: "center" }]}>%</Text>
          </View>

          {data.kategori.map((kat, ki) => {
            const katTotalDisplay = getDisplayedTotal(kat.perBulan, prevCols, visibleIdx)

            return (
              <View key={`kat-${ki}`}>
                {/* Baris Kategori */}
                <View style={s.trKat} wrap={false}>
                  <Text style={[s.tdKat, s.colNo, { textAlign: "center" }]}>{kat.nomorRomawi}</Text>
                  <Text style={[s.tdKat, s.colKode]} />
                  <Text style={[s.tdKat, s.colNama, { paddingLeft: 4 }]}>{kat.nama_kategori}</Text>
                  {prevCols.map((col, cIdx) => {
                    const katPrevTotal = col.indices.reduce((sum: number, bi: number) => sum + (kat.perBulan[bi] || 0), 0)
                    return (
                      <Text key={`r-kat-prev-${cIdx}`} style={[s.tdKatNum, s.colPrev]}>
                        {katPrevTotal > 0 ? angka(katPrevTotal) : "-"}
                      </Text>
                    )
                  })}
                  {visibleIdx.map((bi) => {
                    const val = kat.perBulan[bi] || 0
                    return (
                      <Text key={bi} style={[s.tdKatNum, s.colBln]}>
                        {val > 0 ? angka(val) : "-"}
                      </Text>
                    )
                  })}
                  <Text style={[s.tdKatNum, s.colTotal]}>{angka(katTotalDisplay)}</Text>
                  <Text style={[s.tdKatNum, s.colTarget]} />
                  <Text style={[s.tdKatNum, s.colPct]} />
                </View>

                {/* Baris per Jenis (tanpa sub) */}
                {kat.jenis.map((j, ji) => {
                  noJenis++
                  const jenisTotalDisplay = getDisplayedTotal(j.perBulan, prevCols, visibleIdx)
                  const jenisPct = j.target > 0 ? (jenisTotalDisplay / j.target) * 100 : 0
                  const isAlt = ji % 2 === 1

                  return (
                    <View key={`jenis-${ki}-${ji}`} style={[s.tr, isAlt ? s.trAlt : {}]} wrap={false}>
                      <Text style={[s.td, s.colNo, { textAlign: "center" }]}>{noJenis}</Text>
                      <Text style={[s.td, s.colKode, { textAlign: "center", fontFamily: "Geist", fontWeight: 700 }]}>
                        {j.akun_pendapatan}
                      </Text>
                      <Text style={[s.td, s.colNama, { paddingLeft: 8 }]}>{j.nama_jenis}</Text>
                      {prevCols.map((col, cIdx) => {
                        const jenPrevTotal = col.indices.reduce((sum: number, bi: number) => sum + (j.perBulan[bi] || 0), 0)
                        return (
                          <Text key={`r-jen-prev-${cIdx}`} style={[s.tdNum, s.colPrev, { fontFamily: "Geist", fontWeight: 700 }]}>
                            {jenPrevTotal > 0 ? angka(jenPrevTotal) : "-"}
                          </Text>
                        )
                      })}
                      {visibleIdx.map((bi) => {
                        const val = j.perBulan[bi] || 0
                        return (
                          <Text key={bi} style={[s.tdNum, s.colBln]}>
                            {val > 0 ? angka(val) : "-"}
                          </Text>
                        )
                      })}
                      <Text style={[s.tdNum, s.colTotal, { fontFamily: "Geist", fontWeight: 700 }]}>
                        {jenisTotalDisplay > 0 ? angka(jenisTotalDisplay) : "-"}
                      </Text>
                      <Text style={[s.tdNum, s.colTarget]}>
                        {j.target > 0 ? angka(j.target) : "-"}
                      </Text>
                      <Text style={[s.tdNum, s.colPct]}>
                        {j.target > 0 ? `${jenisPct.toFixed(1)}%` : "-"}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )
          })}

          {/* Grand Total */}
          {(() => {
            const grandTotalDisplay = getDisplayedTotal(data.grandPerBulan, prevCols, visibleIdx)
            const grandPct = data.grandTarget > 0 ? (grandTotalDisplay / data.grandTarget) * 100 : 0

            return (
              <View style={s.trTotal} wrap={false}>
                <Text style={[s.tdTotal, s.colNo, { textAlign: "center" }]} />
                <Text style={[s.tdTotal, s.colKode]} />
                <Text style={[s.tdTotal, s.colNama, { paddingLeft: 4 }]}>GRAND TOTAL</Text>
                {prevCols.map((col, cIdx) => {
                  const grandPrevTotal = col.indices.reduce((sum, bi) => sum + (data.grandPerBulan[bi] || 0), 0)
                  return (
                    <Text key={`r-gt-prev-${cIdx}`} style={[s.tdTotalNum, s.colPrev, { color: C.brand }]}>
                      {grandPrevTotal > 0 ? angka(grandPrevTotal) : "-"}
                    </Text>
                  )
                })}
                {visibleIdx.map((bi) => (
                  <Text key={bi} style={[s.tdTotalNum, s.colBln]}>
                    {data.grandPerBulan[bi] > 0 ? angka(data.grandPerBulan[bi]) : "-"}
                  </Text>
                ))}
                <Text style={[s.tdTotalNum, s.colTotal]}>{angka(grandTotalDisplay)}</Text>
                <Text style={[s.tdTotalNum, s.colTarget]}>
                  {data.grandTarget > 0 ? angka(data.grandTarget) : "-"}
                </Text>
                <Text style={[s.tdTotalNum, s.colPct]}>
                  {data.grandTarget > 0 ? `${grandPct.toFixed(1)}%` : "-"}
                </Text>
              </View>
            )
          })()}
        </View>

        {/* Nomor halaman */}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
