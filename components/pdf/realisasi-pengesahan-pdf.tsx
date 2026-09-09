import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { SheetRow } from "@/components/realisasi-table"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9%]/g, "")
}

function isNoHeader(h: string): boolean {
  const c = cleanKey(h)
  return ["no", "nomor", "num", "#", "kode", "akun"].includes(c)
}

function isUraianHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("uraian") || c.includes("nama") || c.includes("keterangan") || c.includes("deskripsi")
}

function isPctHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("%") || c.includes("pct") || c.includes("persen") || c.includes("persentase")
}

function parseNumeric(val: unknown): { num: number; isDash: boolean } {
  if (val === null || val === undefined) return { num: 0, isDash: true }
  if (typeof val === "number") {
    if (isNaN(val)) return { num: 0, isDash: true }
    return { num: val, isDash: false }
  }

  const s = String(val).trim()
  if (!s || s === "-" || s === "—" || s === "–" || s === "0" || s === "0.00") {
    return { num: 0, isDash: true }
  }

  let cleaned = s.replace(/[^\d.,-]/g, "")
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "")
  }

  const n = parseFloat(cleaned)
  return { num: isNaN(n) ? 0 : n, isDash: isNaN(n) }
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatPercentage(val: unknown): { text: string; num: number; isDash: boolean } {
  if (val === null || val === undefined) return { text: "", num: 0, isDash: true }
  const s = String(val).trim()
  if (!s || s === "-" || s === "—" || s === "–" || s === "0" || s === "0%") return { text: "", num: 0, isDash: true }

  if (typeof val === "string" && s.endsWith("%")) {
    const rawNum = parseNumeric(s.replace("%", "")).num
    return { text: s, num: rawNum, isDash: false }
  }

  const { num, isDash } = parseNumeric(val)
  if (isDash || num === 0) return { text: "", num: 0, isDash: true }

  let pctVal = num
  if (Math.abs(num) <= 1.0 && num !== 0) {
    pctVal = num * 100
  }

  const formatted = `${pctVal.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`

  return { text: formatted, num: pctVal, isDash: false }
}

// ─── Theme Colors ─────────────────────────────────────────────────────────────

const C = {
  navyHeader:     "#10355c", // Dark Navy Header matching reference
  navyText:       "#ffffff",
  textDark:       "#0f172a",
  textMuted:      "#475569",
  white:          "#ffffff",
  borderDark:     "#0f2942",
  borderLight:    "#cbd5e1",
  borderSubtle:   "#e2e8f0",
  
  // Shading colors from reference
  summaryLabelBg: "#e8f1f8", // Ice Blue for summary labels
  groupRowBg:     "#f1f5f9", // Soft gray for RM+BOPTN & BLU group totals
  totalRowBg:     "#dbeafe", // Soft light blue for Grand Total
  deviasiColBg:   "#e8f5e9", // Soft pastel green for Deviasi & % Deviasi cells
  
  redText:        "#dc2626",
  greenText:      "#15803d",
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
    fontSize: 8,
    fontFamily: "Geist",
    color: C.textDark,
    backgroundColor: C.white,
  },

  // Title Block
  titleBlock: {
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 13,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.textDark,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  periodTitle: {
    fontSize: 11,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.textDark,
    marginTop: 2,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sourceNote: {
    fontSize: 7.5,
    fontFamily: "Geist",
    color: C.textMuted,
    marginTop: 3,
  },

  // RINGKASAN Box
  ringkasanContainer: {
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginBottom: 14,
    overflow: "hidden",
  },
  ringkasanHeader: {
    backgroundColor: C.navyHeader,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  ringkasanHeaderText: {
    color: C.navyText,
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 0.4,
  },
  ringkasanRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    minHeight: 16,
    alignItems: "stretch",
  },
  ringkasanLabelCell: {
    width: "30%",
    backgroundColor: C.summaryLabelBg,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: C.borderLight,
  },
  ringkasanLabelText: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 500,
    color: C.textDark,
  },
  ringkasanValueCell: {
    width: "70%",
    backgroundColor: C.white,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    justifyContent: "center",
  },
  ringkasanValueText: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 500,
    color: C.textDark,
    textAlign: "right",
  },
  ringkasanStatusText: {
    fontSize: 7.5,
    fontFamily: "Geist",
    color: C.textMuted,
    textAlign: "left",
  },

  // Main Table
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.navyHeader,
    overflow: "hidden",
  },
  tblHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.navyHeader,
    minHeight: 22,
    alignItems: "center",
  },
  tblHCell: {
    color: C.navyText,
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  tblRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    minHeight: 16,
    alignItems: "stretch",
  },
  tblCell: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: C.borderSubtle,
  },
  tblCellText: {
    fontSize: 7,
    fontFamily: "Geist",
    color: C.textDark,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.textMuted,
    fontSize: 6.5,
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    paddingTop: 4,
  },
})

// ─── PDF Component ────────────────────────────────────────────────────────────

export interface RealisasiPengesahanPDFProps {
  rows: SheetRow[]
  headers: string[]
  sheetTitle?: string
  title?: string
  generatedAt?: string
}

export function RealisasiPengesahanPDF({
  rows,
  headers,
  sheetTitle,
  title,
  generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }),
}: RealisasiPengesahanPDFProps) {
  // 1. Column resolution
  const findKey = (keywords: string[]) => {
    return headers.find((h) => {
      const c = cleanKey(h)
      return keywords.some((kw) => c.includes(kw))
    })
  }

  const sumberDanaKey = findKey(["sumberdana", "sumber", "dana"]) ?? headers[0]
  const akunKey       = findKey(["akun", "kode", "kd"]) ?? headers[1]
  const uraianKey     = findKey(["uraian", "nama", "keterangan", "deskripsi", "item"]) ?? headers[2]
  const rpdKey        = findKey(["rpd", "proyeksi", "anggaran", "pagu", "target"]) ?? headers[3]
  const realisasiKey  = findKey(["realisasi", "capaian", "terserap"]) ?? headers[4]
  const deviasiKey    = headers.find((h) => cleanKey(h).includes("deviasi") && !cleanKey(h).includes("%")) ?? headers[5]
  const pctDeviasiKey = headers.find((h) => isPctHeader(h)) ?? headers[6]

  // 2. Summary Extraction (RM+BOPTN, BLU, TOTAL, Status)
  let rmBoptnTotal = 0
  let bluTotal = 0
  let grandTotalRpd = 0
  let grandTotalRealisasi = 0

  for (const r of rows) {
    const sDana = String(r[sumberDanaKey] ?? "").toUpperCase().trim()
    const akun  = String(r[akunKey] ?? "").trim()
    const uraian = String(r[uraianKey] ?? "").toUpperCase().trim()
    const rpdVal = parseNumeric(r[rpdKey]).num
    const realVal = parseNumeric(r[realisasiKey]).num

    const isGroupHeader = uraian.includes("TOTAL") || !akun

    if (isGroupHeader) {
      if ((sDana.includes("RM") || sDana.includes("BOPTN")) && !sDana.includes("TOTAL")) {
        rmBoptnTotal = rpdVal
      } else if (sDana.includes("BLU") && !sDana.includes("TOTAL") && !sDana.includes("RM")) {
        bluTotal = rpdVal
      } else if (sDana.includes("TOTAL") || uraian.includes("RM + BOPTN + BLU")) {
        grandTotalRpd = rpdVal
        grandTotalRealisasi = realVal
      }
    }
  }

  // Fallback if grandTotalRpd wasn't in a total row
  if (grandTotalRpd === 0 && (rmBoptnTotal > 0 || bluTotal > 0)) {
    grandTotalRpd = rmBoptnTotal + bluTotal
  }

  // 3. Status text computation
  const statusText =
    grandTotalRealisasi > 0
      ? `Realisasi: Rp ${formatRupiah(grandTotalRealisasi)} (${((grandTotalRealisasi / (grandTotalRpd || 1)) * 100).toFixed(2)}%)`
      : "Realisasi belum tersedia"

  // 4. Period title detection
  const combinedTitle = `${sheetTitle || ""} ${title || ""}`.trim()
  let detectedPeriod = ""
  const monthMatch = combinedTitle.match(
    /(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|\b20\d\d\b)/gi
  )
  if (monthMatch && monthMatch.length > 0) {
    detectedPeriod = monthMatch.join(" ").toUpperCase()
  }
  if (!detectedPeriod) {
    detectedPeriod = (sheetTitle || title || "SEPTEMBER 2026").toUpperCase()
  }

  // Column widths matching reference
  const colWidths = {
    sumberDana: "16%",
    akun:       "8%",
    uraian:     "30%",
    rpd:        "18%",
    realisasi:  "10%",
    deviasi:    "9%",
    pctDeviasi: "9%",
  }

  return (
    <Document title={sheetTitle || title || "Rekapitulasi RPD dan Realisasi Belanja"} author="BLU UIN Palopo">
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── Title Block ── */}
        <View style={s.titleBlock}>
          <Text style={s.mainTitle}>REKAPITULASI RPD DAN REALISASI BELANJA</Text>
          <Text style={s.periodTitle}>{detectedPeriod}</Text>
          <Text style={s.sourceNote}>
            Sumber: {title ? `${title}` : `RPD ${detectedPeriod}`} | {statusText}
          </Text>
        </View>

        {/* ── RINGKASAN Box ── */}
        <View style={s.ringkasanContainer}>
          <View style={s.ringkasanHeader}>
            <Text style={s.ringkasanHeaderText}>RINGKASAN</Text>
          </View>

          <View style={s.ringkasanRow}>
            <View style={s.ringkasanLabelCell}>
              <Text style={s.ringkasanLabelText}>RM + BOPTN</Text>
            </View>
            <View style={s.ringkasanValueCell}>
              <Text style={s.ringkasanValueText}>
                {rmBoptnTotal > 0 ? `Rp ${formatRupiah(rmBoptnTotal)}` : "Rp 0"}
              </Text>
            </View>
          </View>

          <View style={s.ringkasanRow}>
            <View style={s.ringkasanLabelCell}>
              <Text style={s.ringkasanLabelText}>BLU</Text>
            </View>
            <View style={s.ringkasanValueCell}>
              <Text style={s.ringkasanValueText}>
                {bluTotal > 0 ? `Rp ${formatRupiah(bluTotal)}` : "Rp 0"}
              </Text>
            </View>
          </View>

          <View style={s.ringkasanRow}>
            <View style={s.ringkasanLabelCell}>
              <Text style={[s.ringkasanLabelText, { fontWeight: 700 }]}>TOTAL RPD</Text>
            </View>
            <View style={s.ringkasanValueCell}>
              <Text style={[s.ringkasanValueText, { fontWeight: 700 }]}>
                {grandTotalRpd > 0 ? `Rp ${formatRupiah(grandTotalRpd)}` : "Rp 0"}
              </Text>
            </View>
          </View>

          <View style={[s.ringkasanRow, { borderBottomWidth: 0 }]}>
            <View style={s.ringkasanLabelCell}>
              <Text style={s.ringkasanLabelText}>STATUS</Text>
            </View>
            <View style={s.ringkasanValueCell}>
              <Text style={s.ringkasanStatusText}>{statusText}</Text>
            </View>
          </View>
        </View>

        {/* ── Main Data Table ── */}
        <View style={s.table}>
          {/* Table Header */}
          <View style={s.tblHeaderRow}>
            <View style={[s.tblCell, { width: colWidths.sumberDana, borderRightColor: C.borderDark }]}>
              <Text style={[s.tblHCell, { textAlign: "left" }]}>Sumber Dana</Text>
            </View>
            <View style={[s.tblCell, { width: colWidths.akun, borderRightColor: C.borderDark }]}>
              <Text style={[s.tblHCell, { textAlign: "center" }]}>Akun</Text>
            </View>
            <View style={[s.tblCell, { width: colWidths.uraian, borderRightColor: C.borderDark }]}>
              <Text style={[s.tblHCell, { textAlign: "left" }]}>Uraian</Text>
            </View>
            <View style={[s.tblCell, { width: colWidths.rpd, borderRightColor: C.borderDark }]}>
              <Text style={[s.tblHCell, { textAlign: "right" }]}>RPD / Proyeksi</Text>
            </View>
            <View style={[s.tblCell, { width: colWidths.realisasi, borderRightColor: C.borderDark }]}>
              <Text style={[s.tblHCell, { textAlign: "right" }]}>Realisasi</Text>
            </View>
            <View style={[s.tblCell, { width: colWidths.deviasi, borderRightColor: C.borderDark }]}>
              <Text style={[s.tblHCell, { textAlign: "right" }]}>Deviasi</Text>
            </View>
            <View style={[s.tblCell, { width: colWidths.pctDeviasi, borderRightWidth: 0 }]}>
              <Text style={[s.tblHCell, { textAlign: "right" }]}>% Deviasi</Text>
            </View>
          </View>

          {/* Data Rows */}
          {rows.map((row, ri) => {
            const sDanaVal  = String(row[sumberDanaKey] ?? "").trim()
            const akunVal   = String(row[akunKey] ?? "").trim()
            const uraianVal = String(row[uraianKey] ?? "").trim()

            const rpdParsed       = parseNumeric(row[rpdKey])
            const realisasiParsed = parseNumeric(row[realisasiKey])
            const deviasiParsed   = parseNumeric(row[deviasiKey])
            const pctParsed       = formatPercentage(row[pctDeviasiKey])

            const isGrandTotal =
              sDanaVal.toUpperCase().includes("TOTAL") ||
              uraianVal.toUpperCase().includes("RM + BOPTN + BLU")

            const isGroupTotal =
              !isGrandTotal &&
              (uraianVal.toUpperCase().includes("TOTAL") || (sDanaVal !== "" && !akunVal))

            const isBold = isGrandTotal || isGroupTotal

            // Row background color
            let rowBg = C.white
            if (isGrandTotal) rowBg = C.totalRowBg
            else if (isGroupTotal) rowBg = C.groupRowBg

            return (
              <View key={ri} style={[s.tblRow, { backgroundColor: rowBg }]} wrap={false}>
                {/* 1. Sumber Dana */}
                <View style={[s.tblCell, { width: colWidths.sumberDana }]}>
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        fontWeight: isBold ? 700 : 400,
                        textAlign: "left",
                      },
                    ]}
                  >
                    {sDanaVal}
                  </Text>
                </View>

                {/* 2. Akun */}
                <View style={[s.tblCell, { width: colWidths.akun }]}>
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        textAlign: "center",
                        fontWeight: isBold ? 700 : 400,
                      },
                    ]}
                  >
                    {akunVal}
                  </Text>
                </View>

                {/* 3. Uraian */}
                <View style={[s.tblCell, { width: colWidths.uraian }]}>
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        fontWeight: isBold ? 700 : 400,
                        textAlign: "left",
                      },
                    ]}
                  >
                    {uraianVal}
                  </Text>
                </View>

                {/* 4. RPD / Proyeksi */}
                <View style={[s.tblCell, { width: colWidths.rpd }]}>
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        textAlign: "right",
                        fontWeight: isBold ? 700 : 400,
                      },
                    ]}
                  >
                    {rpdParsed.isDash && rpdParsed.num === 0
                      ? "Rp 0"
                      : `Rp ${formatRupiah(rpdParsed.num)}`}
                  </Text>
                </View>

                {/* 5. Realisasi */}
                <View style={[s.tblCell, { width: colWidths.realisasi }]}>
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        textAlign: "right",
                        fontWeight: isBold ? 700 : 400,
                      },
                    ]}
                  >
                    {realisasiParsed.isDash ? "" : `Rp ${formatRupiah(realisasiParsed.num)}`}
                  </Text>
                </View>

                {/* 6. Deviasi (Soft green tinted background for data cells) */}
                <View
                  style={[
                    s.tblCell,
                    {
                      width: colWidths.deviasi,
                      backgroundColor: isBold ? rowBg : C.deviasiColBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        textAlign: "right",
                        fontWeight: isBold ? 700 : 400,
                        color:
                          !deviasiParsed.isDash && deviasiParsed.num < 0
                            ? C.redText
                            : C.textDark,
                      },
                    ]}
                  >
                    {deviasiParsed.isDash ? "" : `Rp ${formatRupiah(deviasiParsed.num)}`}
                  </Text>
                </View>

                {/* 7. % Deviasi (Soft green tinted background for data cells) */}
                <View
                  style={[
                    s.tblCell,
                    {
                      width: colWidths.pctDeviasi,
                      borderRightWidth: 0,
                      backgroundColor: isBold ? rowBg : C.deviasiColBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.tblCellText,
                      {
                        textAlign: "right",
                        fontWeight: isBold ? 700 : 400,
                        color:
                          !pctParsed.isDash && pctParsed.num < 0
                            ? C.redText
                            : C.textDark,
                      },
                    ]}
                  >
                    {pctParsed.text}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Catatan di bawah tabel ── */}
        <Text style={{ fontSize: 6.8, fontFamily: "Geist", color: C.textMuted, marginTop: 8 }}>
          Catatan: Tanda '—' menunjukkan data realisasi belum tersedia. Deviasi dan % deviasi akan otomatis terhitung setelah kolom Realisasi diisi.
        </Text>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text>
            BLU UIN PALOPO — {sheetTitle || title || "Rekapitulasi RPD dan Realisasi Belanja"}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
