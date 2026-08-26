import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { SheetRow } from "@/components/realisasi-table"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9%]/g, "")
}

function isNoHeader(h: string): boolean {
  const c = cleanKey(h)
  return ["no", "nomor", "num", "#", "kode"].includes(c)
}

function isUraianHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("uraian") || c.includes("nama") || c.includes("keterangan") || c.includes("deskripsi") || c.includes("akun")
}

function isPctHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("%") || c.includes("pct") || c.includes("persen") || c.includes("persentase")
}

function isDeviasiHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("deviasi") || c.includes("selisih") || c.includes("beda")
}

function isNumericHeader(h: string): boolean {
  const c = cleanKey(h)
  if (isNoHeader(h) || isUraianHeader(h)) return false
  return (
    c.includes("proyeksi") ||
    c.includes("realisasi") ||
    c.includes("deviasi") ||
    c.includes("jumlah") ||
    c.includes("nominal") ||
    c.includes("anggaran") ||
    c.includes("pagu") ||
    c.includes("target") ||
    c.includes("sisa") ||
    c.includes("saldo") ||
    c.includes("kredit") ||
    c.includes("debet") ||
    c.includes("nilai") ||
    c.includes("amount")
  )
}

function parseNumeric(val: unknown): { num: number; isDash: boolean } {
  if (val === null || val === undefined) return { num: 0, isDash: true }
  if (typeof val === "number") {
    if (isNaN(val) || val === 0) return { num: 0, isDash: true }
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
  return { num: isNaN(n) ? 0 : n, isDash: isNaN(n) || n === 0 }
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatPercentage(val: unknown): { text: string; num: number; isDash: boolean } {
  if (val === null || val === undefined) return { text: "-", num: 0, isDash: true }
  const s = String(val).trim()
  if (!s || s === "-" || s === "—" || s === "–" || s === "0" || s === "0%") return { text: "-", num: 0, isDash: true }

  if (typeof val === "string" && s.endsWith("%")) {
    const rawNum = parseNumeric(s.replace("%", "")).num
    return { text: s, num: rawNum, isDash: false }
  }

  const { num, isDash } = parseNumeric(val)
  if (isDash || num === 0) return { text: "-", num: 0, isDash: true }

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
  headerBg:   "#0b1e36", // Dark Navy
  headerText: "#ffffff",
  borderDark: "#1e3a5f",
  borderLight:"#e2e8f0",
  textDark:   "#0b1e36",
  textMuted:  "#475569",
  white:      "#ffffff",
  gold:       "#f59e0b",
  redText:    "#dc2626", // Red for negative deviasi
  redBright:  "#ff4d4f", // Bright red on dark total row
  greenText:  "#16a34a",

  // Category Badges
  cat1Badge:  "#163252",
  cat1Bg:     "#f4f8fb",

  cat2Badge:  "#e5a93c",
  cat2Bg:     "#fdfbf2",

  cat3Badge:  "#65a30d",
  cat3Bg:     "#f4f9ed",

  subBadge:   "#e8f1f8",
  subBg:      "#ffffff",

  totalBg:    "#0d2342",
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    fontSize: 7.5,
    fontFamily: "Geist",
    color: C.textDark,
    backgroundColor: C.white,
  },

  // Kop / Header
  kopContainer: {
    marginBottom: 6,
  },
  orgTitle: {
    fontSize: 12,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.headerBg,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  orgSub: {
    fontSize: 7,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.headerBg,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 6.5,
    color: C.textMuted,
  },
  divider: {
    borderBottomWidth: 1.2,
    borderBottomColor: C.headerBg,
    marginTop: 1,
    marginBottom: 6,
  },

  // Table Container
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.borderDark,
    borderRadius: 3,
    overflow: "hidden",
  },

  // Table Header Row
  tblHeader: {
    flexDirection: "row",
    backgroundColor: C.headerBg,
    minHeight: 22,
    alignItems: "center",
  },
  tblHCellNo: {
    color: C.headerText,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  tblHCellLeft: {
    color: C.headerText,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    paddingLeft: 6,
  },
  tblHCellRight: {
    color: C.headerText,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    paddingRight: 5,
  },

  // Base Row
  tblRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    minHeight: 18,
    alignItems: "stretch",
  },

  // NO Column
  noCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2.5,
  },

  // URAIAN Column
  uraianCellCat: {
    paddingLeft: 6,
    paddingRight: 3,
    paddingVertical: 3,
    borderLeftWidth: 2.5,
    borderLeftColor: C.gold,
    justifyContent: "center",
  },
  uraianCellSub: {
    paddingLeft: 10,
    paddingRight: 3,
    paddingVertical: 2.5,
    justifyContent: "center",
  },
  uraianCellTotal: {
    paddingLeft: 6,
    paddingRight: 3,
    paddingVertical: 3,
    borderLeftWidth: 2.5,
    borderLeftColor: C.gold,
    justifyContent: "center",
  },

  // Data Cells
  dataCell: {
    paddingRight: 5,
    paddingLeft: 2,
    paddingVertical: 2.5,
    justifyContent: "center",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 10,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.textMuted,
    fontSize: 6,
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    paddingTop: 3,
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
  const colMeta = headers.map((h) => {
    const isNo      = isNoHeader(h)
    const isUraian  = isUraianHeader(h)
    const isPct     = isPctHeader(h)
    const isDeviasi = isDeviasiHeader(h)
    const isNumeric = !isNo && !isUraian && (isNumericHeader(h) || !isPct)

    return {
      key: h,
      label: h,
      isNo,
      isUraian,
      isPct,
      isDeviasi,
      isNumeric,
      isRight: isPct || isNumeric,
    }
  })

  const noColKey = colMeta.find((c) => c.isNo)?.key
  const uraianColKey = colMeta.find((c) => c.isUraian)?.key

  // Helper width calculation for Portrait A4
  const getColWidth = (col: (typeof colMeta)[0]) => {
    if (col.isNo) return "6.5%"
    if (col.isUraian) return "35.5%"
    if (col.isPct) return "13%"
    return "15%"
  }

  return (
    <Document title={sheetTitle || title || "Realisasi Pengesahan"} author="BLU UIN Palopo">
      <Page size="A4" orientation="portrait" style={s.page}>
        {/* Kop / Header */}
        <View style={s.kopContainer}>
          <Text style={s.orgTitle}>BLU UIN PALOPO</Text>
          <Text style={s.orgSub}>Universitas Islam Negeri Palopo — Badan Layanan Umum</Text>
          <Text style={s.reportTitle}>{sheetTitle || title || "LAPORAN REALISASI PENGESAHAN"}</Text>

          <View style={s.metaRow}>
            <Text style={s.metaText}>Sumber: {title || "Google Drive / Excel"}</Text>
            <Text style={s.metaText}>Dicetak: {generatedAt}</Text>
          </View>
          <View style={s.divider} />
        </View>

        {/* Tabel */}
        <View style={s.table}>
          {/* Header Tabel */}
          <View style={s.tblHeader}>
            {colMeta.map((col) => (
              <View
                key={col.key}
                style={{ width: getColWidth(col) }}
              >
                <Text
                  style={
                    col.isNo
                      ? s.tblHCellNo
                      : col.isRight
                      ? s.tblHCellRight
                      : s.tblHCellLeft
                  }
                >
                  {col.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Baris Data */}
          {rows.map((row, ri) => {
            const noVal = String(row[noColKey ?? ""] ?? "").trim()
            const uraianVal = String(row[uraianColKey ?? ""] ?? "").trim()

            const isTotal =
              /^(I|II|III|IV|V|TOTAL|JUMLAH)$/i.test(noVal) ||
              uraianVal.toUpperCase().startsWith("TOTAL") ||
              uraianVal.toUpperCase().startsWith("JUMLAH")

            const isCat1 = !isTotal && noVal === "1"
            const isCat2 = !isTotal && noVal === "2"
            const isCat3 = !isTotal && noVal === "3"
            const isMainCategory = isCat1 || isCat2 || isCat3 || (!isTotal && /^\d+$/.test(noVal))
            const isSubItem = !isTotal && !isMainCategory

            // Row background
            const rowBg = isTotal
              ? C.totalBg
              : isCat1
              ? C.cat1Bg
              : isCat2
              ? C.cat2Bg
              : isCat3
              ? C.cat3Bg
              : isMainCategory
              ? C.cat1Bg
              : C.subBg

            // Badge styling
            const badgeBg = isTotal
              ? C.totalBg
              : isCat1
              ? C.cat1Badge
              : isCat2
              ? C.cat2Badge
              : isCat3
              ? C.cat3Badge
              : isMainCategory
              ? C.cat1Badge
              : C.subBadge

            const badgeColor = isCat2
              ? C.textDark
              : isSubItem
              ? C.textMuted
              : C.white

            return (
              <View key={ri} style={[s.tblRow, { backgroundColor: rowBg }]} wrap={false}>
                {colMeta.map((col) => {
                  const raw = row[col.key]

                  // Kolom NO
                  if (col.isNo) {
                    const noStr = String(raw ?? "").trim()
                    return (
                      <View key={col.key} style={[s.noCell, { width: getColWidth(col), backgroundColor: badgeBg }]}>
                        <Text
                          style={{
                            color: badgeColor,
                            fontFamily: "Geist",
                            fontWeight: isSubItem ? 400 : 700,
                            fontSize: 7,
                            textAlign: "center",
                          }}
                        >
                          {noStr && noStr !== "0" ? noStr : "-"}
                        </Text>
                      </View>
                    )
                  }

                  // Kolom URAIAN
                  if (col.isUraian) {
                    const uText = String(raw ?? "").trim()
                    const cellStyle = isTotal
                      ? s.uraianCellTotal
                      : isMainCategory
                      ? s.uraianCellCat
                      : s.uraianCellSub

                    const textColor = isTotal
                      ? C.white
                      : isMainCategory
                      ? C.textDark
                      : C.textMuted

                    return (
                      <View key={col.key} style={[cellStyle, { width: getColWidth(col) }]}>
                        <Text
                          style={{
                            color: textColor,
                            fontFamily: "Geist",
                            fontWeight: isSubItem ? 400 : 700,
                            fontSize: 7,
                            textTransform: "uppercase",
                          }}
                        >
                          {uText || "-"}
                        </Text>
                      </View>
                    )
                  }

                  // Kolom Persentase (% Deviasi)
                  if (col.isPct) {
                    const { text, num, isDash } = formatPercentage(raw)
                    let textColor = isTotal ? C.white : C.textMuted
                    let isBold = isTotal || isMainCategory

                    if (!isDash) {
                      if (num < 0) {
                        textColor = isTotal ? C.redBright : C.redText
                        isBold = true
                      } else if (num > 0) {
                        textColor = isTotal ? C.white : C.textDark
                        isBold = true
                      }
                    }

                    return (
                      <View key={col.key} style={[s.dataCell, { width: getColWidth(col) }]}>
                        <Text
                          style={{
                            color: textColor,
                            fontFamily: "Geist",
                            fontWeight: isBold ? 700 : 400,
                            fontSize: 7,
                            textAlign: "right",
                          }}
                        >
                          {text}
                        </Text>
                      </View>
                    )
                  }

                  // Kolom Angka (Proyeksi, Realisasi, Deviasi)
                  if (col.isNumeric) {
                    const { num, isDash } = parseNumeric(raw)
                    let textColor = isTotal ? C.white : C.textMuted
                    let isBold = isTotal || isMainCategory

                    if (!isDash && num !== 0) {
                      if (col.isDeviasi && num < 0) {
                        textColor = isTotal ? C.redBright : C.redText
                        isBold = true
                      } else if (col.isDeviasi && num > 0) {
                        textColor = isTotal ? C.white : C.greenText
                        isBold = true
                      } else if (isMainCategory || isTotal) {
                        textColor = isTotal ? C.white : C.textDark
                        isBold = true
                      } else {
                        textColor = C.textMuted
                        isBold = false
                      }
                    }

                    const display = isDash || num === 0 ? "-" : formatRupiah(num)

                    return (
                      <View key={col.key} style={[s.dataCell, { width: getColWidth(col) }]}>
                        <Text
                          style={{
                            color: textColor,
                            fontFamily: "Geist",
                            fontWeight: isBold ? 700 : 400,
                            fontSize: 7,
                            textAlign: "right",
                          }}
                        >
                          {display}
                        </Text>
                      </View>
                    )
                  }

                  // Kolom Teks Biasa
                  const sVal = String(raw ?? "").trim()
                  return (
                    <View key={col.key} style={[s.dataCell, { width: getColWidth(col) }]}>
                      <Text
                        style={{
                          color: isTotal ? C.white : C.textDark,
                          fontFamily: "Geist",
                          fontWeight: isTotal ? 700 : 400,
                          fontSize: 7,
                        }}
                      >
                        {sVal || "-"}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>BLU UIN Palopo — {sheetTitle || title || "Realisasi Pengesahan"}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
