import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Polygon,
  Path,
  Rect,
  Line,
  G,
} from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import { LOGO_B64 } from "./logo-base64"
import type { BukuKasFormatBaruResult, BukuKasFormatBaruRow } from "@/app/actions/laporan-bku-format-baru"

// ─── Format Helpers ──────────────────────────────────────────────────────────

const numFmt = (n: number) => {
  if (!n || n === 0) return "-"
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

const numFmtSaldo = (n: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

const formatTglIndo = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00")
  const hariArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const bulanArr = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  const hari = hariArr[date.getDay()]
  const tgl = date.getDate()
  const bln = bulanArr[date.getMonth()]
  const thn = date.getFullYear()
  return { hari, tgl, bln, thn, full: `${hari}, tanggal ${tgl} ${bln} ${thn}` }
}

const formatTglSingkat = (dateStr: string) => {
  if (!dateStr) return "-"
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

// ─── Aggregation Helpers ─────────────────────────────────────────────────────

export function aggregateBkuKonsolidasi(
  rows: BukuKasFormatBaruRow[],
  saldoAwal: number
): BukuKasFormatBaruRow[] {
  type AggGroup = {
    tanggal: string
    kode_bank: string
    nomor_rekening: string
    map: string
    uraian: string
    tipe: "penerimaan" | "pengeluaran"
    penerimaan: number
    pengeluaran: number
    count: number
  }

  const groupMap = new Map<string, AggGroup>()

  for (const row of rows) {
    const key = `${row.tanggal}__${row.kode_bank}__${row.nomor_rekening}__${row.map}__${row.uraian}__${row.tipe}`
    const existing = groupMap.get(key)
    if (existing) {
      existing.penerimaan += row.penerimaan
      existing.pengeluaran += row.pengeluaran
      existing.count += 1
    } else {
      groupMap.set(key, {
        tanggal: row.tanggal,
        kode_bank: row.kode_bank,
        nomor_rekening: row.nomor_rekening,
        map: row.map,
        uraian: row.uraian,
        tipe: row.tipe,
        penerimaan: row.penerimaan,
        pengeluaran: row.pengeluaran,
        count: 1,
      })
    }
  }

  // Urutkan kronologis berdasarkan tanggal, kemudian tipe (penerimaan lebih dulu), lalu bank
  const sorted = Array.from(groupMap.values()).sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal)
    if (a.tipe !== b.tipe) return a.tipe === "penerimaan" ? -1 : 1
    return a.kode_bank.localeCompare(b.kode_bank)
  })

  let runningSaldo = saldoAwal
  return sorted.map((g, idx) => {
    runningSaldo += g.penerimaan - g.pengeluaran
    const uraianLabel =
      g.count > 1
        ? `${formatTglSingkat(g.tanggal)} - ${g.uraian} (${g.count} transaksi)`
        : `${formatTglSingkat(g.tanggal)} - ${g.uraian}`

    return {
      no: idx + 1,
      id: `agg-konsolidasi-${idx}`,
      tipe: g.tipe,
      tanggal: g.tanggal,
      nomor_bukti: g.count > 1 ? `Rekap (${g.count} trx)` : "-",
      kode_bank: g.kode_bank,
      nomor_rekening: g.nomor_rekening,
      uraian: uraianLabel,
      map: g.map,
      penerimaan: g.penerimaan,
      pengeluaran: g.pengeluaran,
      saldo: runningSaldo,
    }
  })
}

export function aggregateBkuPembantu(
  rows: BukuKasFormatBaruRow[],
  saldoAwalRek: number
): (BukuKasFormatBaruRow & { count: number })[] {
  type AggGroup = {
    tanggal: string
    nomor_bukti: string
    kode_bank: string
    nomor_rekening: string
    map: string
    uraian: string
    tipe: "penerimaan" | "pengeluaran"
    penerimaan: number
    pengeluaran: number
    count: number
  }

  const groupMap = new Map<string, AggGroup>()

  for (const row of rows) {
    const key = `${row.tanggal}__${row.map}__${row.uraian}__${row.tipe}`
    const existing = groupMap.get(key)
    if (existing) {
      existing.penerimaan += row.penerimaan
      existing.pengeluaran += row.pengeluaran
      existing.count += 1
    } else {
      groupMap.set(key, {
        tanggal: row.tanggal,
        nomor_bukti: row.nomor_bukti,
        kode_bank: row.kode_bank,
        nomor_rekening: row.nomor_rekening,
        map: row.map,
        uraian: row.uraian,
        tipe: row.tipe,
        penerimaan: row.penerimaan,
        pengeluaran: row.pengeluaran,
        count: 1,
      })
    }
  }

  const sorted = Array.from(groupMap.values()).sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal)
    if (a.tipe !== b.tipe) return a.tipe === "penerimaan" ? -1 : 1
    return a.uraian.localeCompare(b.uraian)
  })

  let runningSaldo = saldoAwalRek
  return sorted.map((g, idx) => {
    runningSaldo += g.penerimaan - g.pengeluaran
    return {
      no: idx + 1,
      id: `agg-pembantu-${idx}`,
      tipe: g.tipe,
      tanggal: g.tanggal,
      nomor_bukti: g.count > 1 ? `Rekap (${g.count} trx)` : g.nomor_bukti,
      kode_bank: g.kode_bank,
      nomor_rekening: g.nomor_rekening,
      uraian: g.count > 1 ? `${g.uraian} (${g.count} transaksi)` : g.uraian,
      map: g.map,
      penerimaan: g.penerimaan,
      pengeluaran: g.pengeluaran,
      saldo: runningSaldo,
      count: g.count,
    }
  })
}

// ─── Palette Colors ──────────────────────────────────────────────────────────

const C = {
  forestDark:   "#083d2e",
  forestMid:    "#0f5940",
  forestLight:  "#1b7a5a",
  forestBg:     "#f0fdf4",
  gold:         "#c49b38",
  goldLight:    "#fef3c7",
  navyDark:     "#0f2942",
  navyMid:      "#1e3a5f",
  slateText:    "#0f172a",
  slateMuted:   "#64748b",
  slateSubtle:  "#94a3b8",
  borderLight:  "#e2e8f0",
  borderMid:    "#cbd5e1",
  rowAlt:       "#f8fafc",
  white:        "#ffffff",
}

// ─── Stylesheet ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Page standard
  pageCover: {
    padding: 0,
    fontFamily: "Geist",
    backgroundColor: C.white,
    position: "relative",
  },
  pageDoc: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontFamily: "Geist",
    fontSize: 7.5,
    color: C.slateText,
    backgroundColor: C.white,
    position: "relative",
  },
  pageTable: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily: "Geist",
    fontSize: 7,
    color: C.slateText,
    backgroundColor: C.white,
    position: "relative",
  },

  // ── Cover Elements ──
  coverSloganBox: {
    position: "absolute",
    top: 36,
    right: 36,
    alignItems: "flex-end",
  },
  coverSloganText: {
    fontSize: 8,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 2,
    color: "#64748b",
    marginBottom: 2,
  },
  coverGoldBar: {
    width: 38,
    height: 2.5,
    backgroundColor: C.gold,
    marginTop: 3,
  },
  coverMainContent: {
    marginTop: 70,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  coverKemenagLogo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  coverKemenagText1: {
    fontSize: 9.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 0.8,
    color: C.forestDark,
    textAlign: "center",
    marginTop: 6,
  },
  coverKemenagText2: {
    fontSize: 9.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 0.8,
    color: C.forestDark,
    textAlign: "center",
  },
  coverUinLogo: {
    width: 72,
    height: 72,
    objectFit: "contain",
    marginTop: 22,
  },
  coverUinTitle: {
    fontSize: 14,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1.5,
    color: C.forestDark,
    textAlign: "center",
    marginTop: 6,
  },
  coverUinSub1: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 0.8,
    color: C.forestDark,
    textAlign: "center",
    marginTop: 2,
  },
  coverUinSub2: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1.2,
    color: C.forestDark,
    textAlign: "center",
  },
  coverDocTitle: {
    fontSize: 32,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1.5,
    color: C.forestDark,
    textAlign: "center",
    marginTop: 32,
  },
  coverDocSubtitle: {
    fontSize: 15,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1.8,
    color: C.forestMid,
    textAlign: "center",
    marginTop: 5,
  },
  coverPeriodeText: {
    fontSize: 9.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1.5,
    color: C.forestMid,
    textAlign: "center",
    marginTop: 7,
  },
  coverTitleDivider: {
    width: 65,
    height: 2.5,
    backgroundColor: C.gold,
    marginTop: 12,
    marginBottom: 12,
  },
  coverTahunLabel: {
    fontSize: 9.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1.8,
    color: C.forestMid,
    textAlign: "center",
  },
  coverTahunNum: {
    fontSize: 46,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.forestDark,
    textAlign: "center",
    marginTop: 2,
  },
  coverMottoBox: {
    position: "absolute",
    bottom: 46,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  coverMottoBar: {
    width: 38,
    height: 2,
    backgroundColor: C.gold,
    marginBottom: 6,
  },
  coverMottoText: {
    fontSize: 8.5,
    fontFamily: "Geist",
    color: C.forestMid,
  },
  coverWebLink: {
    position: "absolute",
    bottom: 24,
    left: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  coverWebText: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 600,
    color: C.forestDark,
  },

  // ── Kop Surat (Page 2 & 3) ──
  kopWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    marginBottom: 2,
  },
  kopLogo: {
    marginRight: 12,
    flexShrink: 0,
  },
  kopText: {
    flex: 1,
    alignItems: "center",
  },
  kopKemenag: {
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.slateText,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  kopUniv: {
    fontSize: 13,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.slateText,
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  kopAlamat: {
    fontSize: 7.5,
    color: C.slateMuted,
    textAlign: "center",
    marginTop: 3,
  },
  kopDividerDoubleTop: {
    borderBottomWidth: 2.2,
    borderBottomColor: C.slateText,
    marginTop: 6,
  },
  kopDividerDoubleBottom: {
    borderBottomWidth: 0.8,
    borderBottomColor: C.slateText,
    marginTop: 1.5,
    marginBottom: 16,
  },
  kopDividerSingle: {
    borderBottomWidth: 2.2,
    borderBottomColor: C.slateText,
    marginTop: 6,
    marginBottom: 14,
  },

  // ── Headers & Titles ──
  docTitleMain: {
    fontSize: 13,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 1,
    color: C.slateText,
    textAlign: "center",
  },
  docTitleSub: {
    fontSize: 8.5,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "#334155",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },

  // ── Section Indicators ──
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionPill: {
    width: 3.5,
    height: 11,
    backgroundColor: C.navyMid,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Geist",
    fontWeight: 700,
    letterSpacing: 0.5,
    color: C.slateText,
  },

  // ── Table Identitas Dokumen ──
  idTblHeader: {
    flexDirection: "row",
    backgroundColor: C.navyDark,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  idTblHCell: {
    color: C.white,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
  },
  idTblRow: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderMid,
    borderLeftWidth: 0.5,
    borderLeftColor: C.borderMid,
    borderRightWidth: 0.5,
    borderRightColor: C.borderMid,
  },
  idTblCell: {
    fontSize: 7,
    color: C.slateText,
  },
  idTblCellBold: {
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.slateText,
  },

  // ── Callout Box ──
  calloutBox: {
    backgroundColor: "#f1f5f9",
    borderWidth: 0.5,
    borderColor: C.borderMid,
    borderRadius: 2,
    padding: 7,
    marginTop: 12,
    marginBottom: 18,
  },
  calloutTitle: {
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    color: "#334155",
  },
  calloutDesc: {
    fontSize: 6.5,
    fontFamily: "Geist",
    color: C.slateMuted,
    marginTop: 2,
  },

  // ── Tanda Tangan 2 Kolom ──
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  sigCol: {
    width: "45%",
    alignItems: "center",
  },
  sigRole: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.slateText,
    textAlign: "center",
  },
  sigSpace: {
    height: 48,
  },
  sigFieldRow: {
    width: "100%",
    flexDirection: "row",
    marginTop: 2,
  },
  sigFieldLabel: {
    width: 42,
    fontSize: 7,
    color: C.slateText,
  },
  sigFieldValue: {
    flex: 1,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.slateText,
  },

  // ── Berita Acara Elements ──
  baIntro: {
    fontSize: 7.5,
    color: C.slateText,
    marginBottom: 8,
  },
  baGridBox: {
    borderWidth: 0.5,
    borderColor: C.borderMid,
    marginBottom: 8,
  },
  baGridRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderMid,
  },
  baGridLabel: {
    width: 105,
    padding: 4,
    backgroundColor: C.rowAlt,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.slateText,
    borderRightWidth: 0.5,
    borderRightColor: C.borderMid,
  },
  baGridVal: {
    flex: 1,
    padding: 4,
    fontSize: 7,
    color: C.slateText,
  },
  baBanner: {
    backgroundColor: C.navyDark,
    padding: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  baBannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  baBannerText: {
    flex: 1,
    color: C.white,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 600,
  },
  baBannerVal: {
    color: C.white,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "right",
  },

  // ── Tabel Transaksi Kas (Halaman 4+) ──
  runningHeader: {
    position: "absolute",
    top: 14,
    left: 28,
    right: 28,
    fontSize: 6.5,
    fontFamily: "Geist",
    fontWeight: 600,
    color: C.slateSubtle,
    textAlign: "center",
  },
  runningFooter: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    fontSize: 6.5,
    fontFamily: "Geist",
    fontWeight: 600,
    color: C.slateSubtle,
    textAlign: "center",
  },
  bkuTitleMain: {
    fontSize: 13,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "center",
    color: C.slateText,
  },
  bkuTitleSub: {
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "center",
    color: C.slateText,
    marginTop: 2,
  },
  bkuTitlePeriode: {
    fontSize: 8.5,
    fontFamily: "Geist",
    fontWeight: 600,
    textAlign: "center",
    color: "#334155",
    marginTop: 2,
    marginBottom: 10,
  },
  tblHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.navyDark,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tblHCell: {
    color: C.white,
    fontSize: 6.5,
    fontFamily: "Geist",
    fontWeight: 700,
  },
  tblDataRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
  },
  tblCell: {
    fontSize: 6.5,
    color: C.slateText,
  },
  tblSaldoAwalRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderMid,
  },
  tblTotalRow: {
    flexDirection: "row",
    backgroundColor: C.navyDark,
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    marginTop: 1,
  },
  tblTotalLabel: {
    color: C.white,
    fontSize: 6.5,
    fontFamily: "Geist",
    fontWeight: 700,
  },
  tblTotalVal: {
    color: C.white,
    fontSize: 6.5,
    fontFamily: "Geist",
    fontWeight: 700,
    textAlign: "right",
  },
})

// ─── Table Column Widths (A4 Portrait = 595 pt, paddingHorizontal 28*2 = 56 pt -> usable ~539 pt) ───
const COL = {
  no:       18,
  bank:     52,
  rek:      92,
  uraian:   0,  // flex: 1 (~135 pt)
  map:      46,
  pen:      70,
  kel:      70,
  saldo:    70,
}

// ─── Component Props ─────────────────────────────────────────────────────────

export type IdentitasItem = {
  no: string
  komp: string
  ket: string
}

export type CustomMetadata = {
  namaKpa?: string
  nipKpa?: string
  jabatanKpa?: string
  namaBendahara?: string
  nipBendahara?: string
  jabatanBendahara?: string
  nomorSpDipa?: string
  tglPemeriksaan?: string
  hariPemeriksaan?: string
  uangKertas?: string
  spmu?: string
  saldoBankKas?: string
  suratBerharga?: string
  /** Baris identitas dokumen dinamis (bisa ditambah/diedit/dihapus dari modal) */
  identitasItems?: IdentitasItem[]
  modeBkuKonsolidasi?: "ringkasan" | "detail"
  modeBkuPembantu?: "detail" | "ringkasan"
}

export type BukuKasUmumFormatBaruPDFProps = {
  data: BukuKasFormatBaruResult
  logoSrc: string
  metadata?: CustomMetadata
  modeBkuKonsolidasi?: "ringkasan" | "detail"
  modeBkuPembantu?: "detail" | "ringkasan"
}

// ─── Main Document ───────────────────────────────────────────────────────────

export function BukuKasUmumFormatBaruPDF({
  data,
  logoSrc,
  metadata = {},
  modeBkuKonsolidasi,
  modeBkuPembantu,
}: BukuKasUmumFormatBaruPDFProps) {
  const tahun = data.tahun || new Date().getFullYear()

  // Mode tampilan: Konsolidasi default ringkasan, Pembantu default detail
  const modeKonsolidasi = modeBkuKonsolidasi || metadata.modeBkuKonsolidasi || "ringkasan"
  const modePembantu = modeBkuPembantu || metadata.modeBkuPembantu || "detail"

  const konsolidasiRows =
    modeKonsolidasi === "ringkasan"
      ? aggregateBkuKonsolidasi(data.rows, data.saldoAwal)
      : data.rows

  const pembantuGroups = Array.from(
    data.rows.reduce((groups, row) => {
      const key = `${row.kode_bank}__${row.nomor_rekening}`
      const existing = groups.get(key)
      if (existing) existing.rows.push(row)
      else groups.set(key, { bank: row.kode_bank, rekening: row.nomor_rekening, rows: [row] })
      return groups
    }, new Map<string, { bank: string; rekening: string; rows: BukuKasFormatBaruRow[] }>()).values()
  )

  // Default values
  const namaKpa = metadata.namaKpa || "[NAMA KUASA PENGGUNA ANGGARAN]"
  const nipKpa = metadata.nipKpa || "____________________________"
  const jabatanKpa =
    metadata.jabatanKpa ||
    "Rektor / Kuasa Pengguna Anggaran UIN Palopo / Atasan Langsung Bendahara Penerimaan UIN Palopo"

  const namaBendahara = metadata.namaBendahara || "SUVRI ABDILLAH, S.SOS"
  const nipBendahara = metadata.nipBendahara || "____________________________"
  const jabatanBendahara = metadata.jabatanBendahara || "Bendahara Penerimaan UIN Palopo"

  const spDipa = metadata.nomorSpDipa || `[DIISI SESUAI DIPA UIN PALOPO TAHUN ${tahun}]`

  const dateInfo = metadata.tglPemeriksaan
    ? formatTglIndo(metadata.tglPemeriksaan)
    : {
        hari: metadata.hariPemeriksaan || "[HARI]",
        tgl: "[TANGGAL]",
        bln: "[BULAN]",
        thn: tahun,
        full: `[HARI], tanggal [TANGGAL] [BULAN] ${tahun}`,
      }

  return (
    <Document
      title={`Buku Kas Umum - ${data.periodeLabel}`}
      author="UIN Palopo"
      subject="Buku Kas Umum Bendahara Penerimaan"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HALAMAN 1: COVER / SAMPUL DEPAN (PORTRAIT)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="portrait" style={s.pageCover}>
        {/* Hiasan geometris sudut kiri-atas */}
        <Svg
          style={{ position: "absolute", top: 0, left: 0 }}
          width={240}
          height={220}
          viewBox="0 0 240 220"
        >
          {/* Segitiga hijau botol tua utama */}
          <Polygon points="0,0 210,0 0,180" fill={C.forestDark} />
          {/* Segitiga aksen hijau sedang */}
          <Polygon points="0,0 120,0 0,220" fill={C.forestMid} />
          {/* Garis aksen emas */}
          <Line x1={0} y1={218} x2={160} y2={0} stroke={C.gold} strokeWidth={2} />
          {/* Garis pemisah tipis abu-abu di sisi kiri */}
          <Line x1={18} y1={0} x2={18} y2={842} stroke="#cbd5e1" strokeWidth={0.6} />
        </Svg>

        {/* Hiasan geometris sudut kanan-bawah */}
        <Svg
          style={{ position: "absolute", bottom: 0, right: 0 }}
          width={220}
          height={200}
          viewBox="0 0 220 200"
        >
          {/* Segitiga aksen hijau botol sudut kanan bawah */}
          <Polygon points="220,0 220,200 0,200" fill={C.forestDark} />
          <Polygon points="220,80 220,200 70,200" fill={C.forestMid} />
          <Polygon points="220,130 220,200 130,200" fill={C.forestLight} />
          <Line x1={0} y1={200} x2={220} y2={0} stroke={C.gold} strokeWidth={1.5} />
        </Svg>

        {/* Slogan kanan atas */}
        <View style={s.coverSloganBox}>
          <Text style={s.coverSloganText}>SMART &amp; GREEN CAMPUS</Text>
          <View style={s.coverGoldBar} />
        </View>

        {/* Konten tengah cover */}
        <View style={s.coverMainContent}>
          {/* Logo Kemenag RI */}
          <Image src={LOGO_B64} style={s.coverKemenagLogo} />
          <Text style={s.coverKemenagText1}>KEMENTERIAN AGAMA</Text>
          <Text style={s.coverKemenagText2}>REPUBLIK INDONESIA</Text>

          {/* Logo UIN Palopo */}
          <Image src={logoSrc} style={s.coverUinLogo} />
          <Text style={s.coverUinTitle}>UIN PALOPO</Text>
          <Text style={s.coverUinSub1}>UNIVERSITAS ISLAM NEGERI</Text>
          <Text style={s.coverUinSub2}>PALOPO</Text>

          {/* Judul Dokumen */}
          <Text style={s.coverDocTitle}>BUKU KAS UMUM</Text>
          <Text style={s.coverDocSubtitle}>BENDAHARA PENERIMAAN</Text>
          <Text style={s.coverPeriodeText}>PERIODE {data.periodeLabel.toUpperCase()}</Text>

          <View style={s.coverTitleDivider} />

          {/* Tahun Anggaran */}
          <Text style={s.coverTahunLabel}>TAHUN ANGGARAN</Text>
          <Text style={s.coverTahunNum}>{tahun}</Text>

          {/* Watermark Lengkungan UIN Palopo siluet lembut */}
          <Svg width={140} height={90} viewBox="0 0 140 90" style={{ marginTop: 12, opacity: 0.18 }}>
            <Polygon points="70,5 125,40 125,85 15,85 15,40" fill={C.forestDark} />
            <Polygon points="70,18 110,46 110,85 30,85 30,46" fill={C.white} />
            <Polygon points="70,30 96,52 96,85 44,85 44,52" fill={C.forestMid} />
            <Polygon points="70,42 82,58 82,85 58,85 58,58" fill={C.white} />
          </Svg>
        </View>

        {/* Motto bawah */}
        <View style={s.coverMottoBox}>
          <View style={s.coverMottoBar} />
          <Text style={s.coverMottoText}>Bersama untuk UIN Palopo yang Lebih Baik</Text>
        </View>

        {/* Website UIN Palopo sudut kiri bawah */}
        <View style={s.coverWebLink}>
          <Svg width={11} height={11} viewBox="0 0 24 24">
            <Path
              d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.7 0 3.2.7 4.3 1.8-.7.4-1.7.9-2.9 1.4-1.2-1.8-2.6-3.2-1.4-3.2zm-2.8 1c.5 1.1 1.2 2.3 2 3.5-1.5.7-3.1 1.2-4.6 1.5.6-2.2 1.4-3.9 2.6-5zm-5 6.9c1.6-.3 3.3-.8 4.9-1.5-.2 1.2-.3 2.5-.3 3.6 0 1.2.1 2.3.3 3.5-1.6-.7-3.3-1.2-4.9-1.5-.1-.7-.2-1.3-.2-2s.1-1.4.2-2.1zm2.3 6.9c-.8-1-1.4-2.4-1.9-4 1.5-.3 3.1-.7 4.6-1.5-.8 1.3-1.5 2.5-2 3.6-.3.6-.5 1.2-.7 1.9zm5.5 2.2c-.8 0-1.7-.5-2.5-1.6.7-.6 1.5-1.3 2.1-2.1.8.8 1.7 1.4 2.6 1.9-1 .8-1.5 1.8-2.2 1.8zm3.2-3.1c-.8-.5-1.6-1.1-2.3-1.8.2-1.2.3-2.5.3-3.7 0-1.2-.1-2.4-.3-3.6.7-.7 1.5-1.3 2.3-1.8.4 1.7.6 3.6.6 5.4 0 1.9-.2 3.8-.6 5.5z"
              fill={C.forestDark}
            />
          </Svg>
          <Text style={s.coverWebText}>www.uinpalopo.ac.id</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          HALAMAN 2: IDENTITAS DOKUMEN & PENGESAHAN (PORTRAIT)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="portrait" style={s.pageDoc}>
        {/* Kop Resmi UIN Palopo */}
        <View style={s.kopWrapper}>
          <View style={s.kopLogo}>
            <Image src={logoSrc} style={{ width: 56, height: 56, objectFit: "contain" }} />
          </View>
          <View style={s.kopText}>
            <Text style={s.kopKemenag}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</Text>
            <Text style={s.kopUniv}>UNIVERSITAS ISLAM NEGERI PALOPO</Text>
            <Text style={s.kopAlamat}>Jalan Agatis, Balandai, Kota Palopo, Sulawesi Selatan</Text>
          </View>
        </View>
        <View style={s.kopDividerDoubleTop} />
        <View style={s.kopDividerDoubleBottom} />

        {/* Judul Dokumen */}
        <Text style={s.docTitleMain}>BUKU KAS UMUM</Text>
        <Text style={s.docTitleSub}>PERIODE {data.periodeLabel.toUpperCase()}</Text>

        {/* Bagian Identitas Dokumen */}
        <View style={s.sectionHeading}>
          <View style={s.sectionPill} />
          <Text style={s.sectionTitle}>IDENTITAS DOKUMEN</Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          {/* Header Tabel Identitas */}
          <View style={s.idTblHeader}>
            <Text style={[s.idTblHCell, { width: 28, textAlign: "center" }]}>NO.</Text>
            <Text style={[s.idTblHCell, { width: 175 }]}>KOMPONEN IDENTITAS</Text>
            <Text style={[s.idTblHCell, { flex: 1 }]}>KETERANGAN</Text>
          </View>

          {/* Baris-baris Identitas — dinamis dari metadata.identitasItems atau default + Periode */}
          {(() => {
            const baseItems = metadata.identitasItems ?? [
              { no: "01", komp: "Kementerian / Lembaga", ket: "(025) AGAMA RI" },
              { no: "02", komp: "Unit Organisasi", ket: "DIREKTORAT JENDERAL PENDIDIKAN ISLAM" },
              { no: "03", komp: "Provinsi / Kab. / Kota", ket: "SULAWESI SELATAN / KOTA PALOPO" },
              { no: "04", komp: "Satuan Kerja", ket: "UNIVERSITAS ISLAM NEGERI PALOPO" },
              { no: "05", komp: "Tanggal / Nomor SP DIPA", ket: spDipa },
              { no: "06", komp: "KPPN", ket: "KPPN PALOPO" },
              { no: "07", komp: "Tahun Anggaran", ket: String(tahun) },
            ]
            const hasPeriode = baseItems.some((item) =>
              item.komp.toLowerCase().includes("periode")
            )
            const itemsToRender = hasPeriode
              ? baseItems
              : [
                  ...baseItems,
                  {
                    no: String(baseItems.length + 1).padStart(2, "0"),
                    komp: "Periode Pembukuan",
                    ket: data.periodeLabel,
                  },
                ]

            return itemsToRender.map((item, idx) => (
              <View
                key={`id-${idx}`}
                style={[
                  s.idTblRow,
                  { backgroundColor: idx % 2 === 1 ? C.rowAlt : C.white },
                ]}
              >
                <Text style={[s.idTblCell, { width: 28, textAlign: "center" }]}>{item.no}</Text>
                <Text style={[s.idTblCellBold, { width: 175 }]}>{item.komp}</Text>
                <Text style={[s.idTblCell, { flex: 1 }]}>{item.ket}</Text>
              </View>
            ))
          })()}
        </View>

        {/* Bagian Pengesahan */}
        <View style={s.sectionHeading}>
          <View style={s.sectionPill} />
          <Text style={s.sectionTitle}>PENGESAHAN</Text>
        </View>
        <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.borderMid, marginBottom: 14 }} />

        <View style={s.sigRow}>
          {/* Kuasa Pengguna Anggaran */}
          <View style={s.sigCol}>
            <Text style={s.sigRole}>Mengetahui,</Text>
            <Text style={s.sigRole}>Kuasa Pengguna Anggaran</Text>
            <View style={s.sigSpace} />
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>Nama :</Text>
              <Text style={s.sigFieldValue}>{namaKpa}</Text>
            </View>
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>NIP :</Text>
              <Text style={s.sigFieldValue}>{nipKpa}</Text>
            </View>
          </View>

          {/* Bendahara Penerimaan */}
          <View style={s.sigCol}>
            <Text style={[s.sigRole, { fontWeight: 400, marginBottom: 3 }]}>Palopo, {dateInfo.tgl} {dateInfo.bln} {dateInfo.thn}</Text>
            <Text style={s.sigRole}>Bendahara Penerimaan</Text>
            <View style={[s.sigSpace, { height: 58 }]} />
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>Nama :</Text>
              <Text style={s.sigFieldValue}>{namaBendahara}</Text>
            </View>
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>NIP :</Text>
              <Text style={s.sigFieldValue}>{nipBendahara}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          HALAMAN 3: BERITA ACARA PEMERIKSAAN KAS (PORTRAIT)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="portrait" style={s.pageDoc}>
        {/* Kop Surat */}
        <View style={s.kopWrapper}>
          <View style={s.kopLogo}>
            <Image src={logoSrc} style={{ width: 56, height: 56, objectFit: "contain" }} />
          </View>
          <View style={s.kopText}>
            <Text style={s.kopKemenag}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</Text>
            <Text style={s.kopUniv}>UNIVERSITAS ISLAM NEGERI PALOPO</Text>
            <Text style={s.kopAlamat}>Jalan Agatis, Balandai, Kota Palopo, Sulawesi Selatan</Text>
          </View>
        </View>
        <View style={s.kopDividerSingle} />

        {/* Judul Berita Acara */}
        <Text style={[s.docTitleMain, { fontSize: 12, marginBottom: 12 }]}>
          BERITA ACARA PEMERIKSAAN KAS
        </Text>

        {/* Teks Pembuka */}
        <Text style={s.baIntro}>
          Pada hari ini, {dateInfo.full} yang bertanda tangan di bawah ini :
        </Text>

        {/* Grid Atasan Langsung / KPA */}
        <View style={s.baGridBox}>
          <View style={s.baGridRow}>
            <Text style={s.baGridLabel}>NAMA LENGKAP</Text>
            <Text style={[s.baGridVal, { fontFamily: "Geist", fontWeight: 700 }]}>{namaKpa}</Text>
          </View>
          <View style={[s.baGridRow, { borderBottomWidth: 0 }]}>
            <Text style={s.baGridLabel}>JABATAN</Text>
            <Text style={s.baGridVal}>{jabatanKpa}</Text>
          </View>
        </View>

        <Text style={[s.baIntro, { marginTop: 4, marginBottom: 6 }]}>
          sebagai atasan langsung Bendahara Penerimaan UIN Palopo telah melakukan pemeriksaan setempat pada :
        </Text>

        {/* Grid Bendahara Penerimaan */}
        <View style={s.baGridBox}>
          <View style={s.baGridRow}>
            <Text style={s.baGridLabel}>NAMA LENGKAP</Text>
            <Text style={[s.baGridVal, { fontFamily: "Geist", fontWeight: 700 }]}>{namaBendahara}</Text>
          </View>
          <View style={[s.baGridRow, { borderBottomWidth: 0 }]}>
            <Text style={s.baGridLabel}>JABATAN</Text>
            <Text style={s.baGridVal}>{jabatanBendahara}</Text>
          </View>
        </View>

        <Text style={[s.baIntro, { marginTop: 4, marginBottom: 3 }]}>
          yang ditugaskan mengurus penerimaan di Universitas Islam Negeri Palopo Tahun {tahun}
        </Text>
        <Text style={[s.baIntro, { marginBottom: 6 }]}>
          Berdasarkan hasil pemeriksaan kas, serta bukti-bukti yang berada dalam pengurusan itu, kami menemui kenyataan sebagai berikut :
        </Text>

        {/* Tabel Kas Fisik */}
        <View style={s.baGridBox}>
          {[
            { kode: "a.", label: "Uang kertas bank, uang recehan", val: "0" },
            { kode: "b.", label: "SPMU (SPU) dan alat pembayaran", val: "0" },
            { kode: "c.", label: "Saldo Bank", val: numFmtSaldo(data.saldoAkhir) },
            { kode: "d.", label: "Surat/Barang berharga yang diizinkan", val: "0" },
          ].map((item, idx, arr) => (
            <View
              key={item.kode}
              style={[
                s.baGridRow,
                idx === arr.length - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={{ width: 18, padding: 3.5, fontSize: 7, color: C.slateText }}>{item.kode}</Text>
              <Text style={{ flex: 1, padding: 3.5, fontSize: 7, color: C.slateText }}>{item.label}</Text>
              <Text style={{ width: 24, padding: 3.5, fontSize: 7, color: C.slateText }}>Rp.</Text>
              <Text style={{ width: 140, padding: 3.5, fontSize: 7, color: C.slateText }}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Banner Biru Navy Saldo Buku Kas Umum */}
        <View style={s.baBanner}>
          <View style={s.baBannerRow}>
            <Text style={s.baBannerText}>
              Saldo uang menurut Buku Kas Umum, Register dan lain sebagainya berjumlah
            </Text>
            <Text style={{ color: C.white, fontSize: 7, width: 24 }}>Rp.</Text>
            <Text style={[s.baBannerVal, { width: 140 }]}>
              {numFmtSaldo(data.saldoAkhir)}
            </Text>
          </View>
          <View style={s.baBannerRow}>
            <Text style={s.baBannerText}>
              Selisih lebih antara saldo kas dan saldo buku
            </Text>
            <Text style={{ color: C.white, fontSize: 7, width: 24 }}>Rp.</Text>
            <Text style={[s.baBannerVal, { width: 140 }]}> 
              0
            </Text>
          </View>
        </View>

        <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.borderMid, marginBottom: 12 }} />

        {/* Tanda Tangan Pemegang Kas & Pemeriksa */}
        <View style={s.sigRow}>
          <View style={s.sigCol}>
            <Text style={s.sigRole}>Mengetahui,</Text>
            <Text style={s.sigRole}>Pemegang Kas</Text>
            <View style={s.sigSpace} />
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>Nama :</Text>
              <Text style={s.sigFieldValue}>{namaBendahara}</Text>
            </View>
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>NIP :</Text>
              <Text style={s.sigFieldValue}>{nipBendahara}</Text>
            </View>
          </View>

          <View style={s.sigCol}>
            <Text style={s.sigRole}>Pemeriksa</Text>
            <View style={[s.sigSpace, { height: 58 }]} />
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>Nama :</Text>
              <Text style={s.sigFieldValue}>{namaKpa}</Text>
            </View>
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>NIP :</Text>
              <Text style={s.sigFieldValue}>{nipKpa}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          HALAMAN 4+: BUKU KAS UMUM (TABEL TRANSAKSI KAS KONSOLIDASI) (PORTRAIT)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="portrait" style={s.pageTable}>
        {/* Judul Buku Kas Umum */}
        <Text style={s.bkuTitleMain}>BUKU KAS UMUM</Text>
        <Text style={s.bkuTitleSub}>BENDAHARA PENERIMAAN UIN PALOPO</Text>
        <Text style={s.bkuTitlePeriode}>{data.periodeLabel}</Text>
        <Text style={{ fontSize: 6.5, fontFamily: "Geist", color: C.slateMuted, textAlign: "center", marginTop: -7, marginBottom: 9 }}>
          {modeKonsolidasi === "ringkasan"
            ? "Format: Ringkasan Harian per Mata Anggaran (MAP) & Bank"
            : "Format: Detail Seluruh Transaksi"}
        </Text>

        {/* Header Tabel Transaksi */}
        <View style={s.tblHeaderRow}>
          <Text style={[s.tblHCell, { width: COL.no, textAlign: "center" }]}>No</Text>
          <Text style={[s.tblHCell, { width: COL.bank, textAlign: "center" }]}>Bank</Text>
          <Text style={[s.tblHCell, { width: COL.rek, textAlign: "center" }]}>Nomor Rekening</Text>
          <Text style={[s.tblHCell, { flex: 1, textAlign: "center" }]}>Uraian</Text>
          <Text style={[s.tblHCell, { width: COL.map, textAlign: "center" }]}>Mata Anggaran (MAP)</Text>
          <Text style={[s.tblHCell, { width: COL.pen, textAlign: "center" }]}>Penerimaan</Text>
          <Text style={[s.tblHCell, { width: COL.kel, textAlign: "center" }]}>Pengeluaran</Text>
          <Text style={[s.tblHCell, { width: COL.saldo, textAlign: "center" }]}>Saldo</Text>
        </View>

        {/* Baris Saldo Awal Bulan Sebelumnya */}
        <View style={s.tblSaldoAwalRow}>
          <Text style={[s.tblCell, { width: COL.no + COL.bank + COL.rek, textAlign: "center" }]}> </Text>
          <Text style={[s.tblCell, { flex: 1, fontFamily: "Geist", fontWeight: 700 }]}>
            {data.saldoAwalLabel}
          </Text>
          <Text style={[s.tblCell, { width: COL.map, textAlign: "center" }]}> </Text>
          <Text style={[s.tblCell, { width: COL.pen, textAlign: "right" }]}> </Text>
          <Text style={[s.tblCell, { width: COL.kel, textAlign: "right" }]}> </Text>
          <Text style={[s.tblCell, { width: COL.saldo, textAlign: "right", fontFamily: "Geist", fontWeight: 700 }]}>
            {numFmtSaldo(data.saldoAwal)}
          </Text>
        </View>

        {/* Data Baris Transaksi (Ringkasan atau Detail sesuai mode) */}
        {konsolidasiRows.map((row, idx) => {
          const isAlt = idx % 2 === 1
          return (
            <View
              key={`${row.tipe}-${row.id}-${idx}`}
              style={[s.tblDataRow, isAlt ? { backgroundColor: C.rowAlt } : {}]}
              wrap={false}
            >
              <Text style={[s.tblCell, { width: COL.no, textAlign: "center" }]}>{row.no}</Text>
              <Text style={[s.tblCell, { width: COL.bank, textAlign: "left", paddingLeft: 4 }]}>{row.kode_bank}</Text>
              <Text style={[s.tblCell, { width: COL.rek, textAlign: "left", fontSize: 6 }]}>
                {row.nomor_rekening}
              </Text>
              <Text style={[s.tblCell, { flex: 1 }]}>{row.uraian}</Text>
              <Text style={[s.tblCell, { width: COL.map, textAlign: "center" }]}>{row.map}</Text>
              <Text style={[s.tblCell, { width: COL.pen, textAlign: "right" }]}>
                {numFmt(row.penerimaan)}
              </Text>
              <Text style={[s.tblCell, { width: COL.kel, textAlign: "right" }]}>
                {numFmt(row.pengeluaran)}
              </Text>
              <Text style={[s.tblCell, { width: COL.saldo, textAlign: "right" }]}>
                {numFmtSaldo(row.saldo)}
              </Text>
            </View>
          )
        })}

        {/* Total Keseluruhan Periode */}
        <View style={s.tblTotalRow} wrap={false}>
          <Text style={[s.tblTotalLabel, { width: COL.no + COL.bank + COL.rek }]}> </Text>
          <Text style={[s.tblTotalLabel, { flex: 1 }]}>TOTAL PERIODE</Text>
          <Text style={[s.tblTotalLabel, { width: COL.map }]}> </Text>
          <Text style={[s.tblTotalVal, { width: COL.pen }]}>
            {numFmtSaldo(data.totalPenerimaan)}
          </Text>
          <Text style={[s.tblTotalVal, { width: COL.kel }]}>
            {numFmtSaldo(data.totalPengeluaran)}
          </Text>
          <Text style={[s.tblTotalVal, { width: COL.saldo }]}>
            {numFmtSaldo(data.saldoAkhir)}
          </Text>
        </View>

        {/* Penutupan Buku Kas Umum */}
        <View wrap={false} style={{ marginTop: 10, paddingHorizontal: 6 }}>
          <View style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText, lineHeight: 1.35 }}>
              Pada hari ini {dateInfo.hari}, tanggal {dateInfo.tgl} {dateInfo.bln} {dateInfo.thn} buku kas umum ditutup dengan keadaan sebagai berikut:
            </Text>
          </View>
          <View style={{ width: "100%", maxWidth: 360, marginBottom: 8 }}>
            {[
              { label: "Saldo Bulan lalu", val: numFmtSaldo(data.saldoAwal), isSub: false, isHeader: false },
              { label: "Jumlah penerimaan", val: numFmtSaldo(data.totalPenerimaan), isSub: false, isHeader: false },
              { label: "Jumlah pengeluaran", val: numFmtSaldo(data.totalPengeluaran), isSub: false, isHeader: false },
              { label: "Saldo buku", val: numFmtSaldo(data.saldoAkhir), isSub: false, isHeader: false },
              { label: "Saldo Kas terdiri dari :", val: "", isSub: false, isHeader: true },
              { label: "Uang tunai", val: "Nihil", isSub: true, isHeader: false },
              { label: "Bank/Giro", val: numFmtSaldo(data.saldoAkhir), isSub: true, isHeader: false },
              { label: "Jumlah", val: numFmtSaldo(data.saldoAkhir), isSub: true, isHeader: false },
              { label: "Selisih antara buku dan kas", val: "Nihil", isSub: false, isHeader: false },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 11.5,
                  paddingLeft: item.isSub ? 14 : 0,
                  marginBottom: item.isHeader ? 2 : 1,
                  marginTop: item.isHeader ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    width: item.isSub ? 166 : 180,
                    fontSize: 7.5,
                    fontFamily: "Geist",
                    fontWeight: item.isHeader ? 700 : 400,
                    color: C.slateText,
                  }}
                >
                  {item.isHeader ? item.label : `- ${item.label}`}
                </Text>
                <Text style={{ width: 22, fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>
                  {item.val ? "Rp" : ""}
                </Text>
                <Text
                  style={{
                    width: 110,
                    fontSize: 7.5,
                    fontFamily: "Geist",
                    fontWeight: 600,
                    color: C.slateText,
                    textAlign: "right",
                  }}
                >
                  {item.val}
                </Text>
              </View>
            ))}
          </View>
          <View wrap={false} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <View style={{ width: "42%", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>Mengetahui,</Text>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText }}>Kuasa Pengguna Anggaran,</Text>
              <Text style={{ marginTop: 34, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText, textAlign: "center" }}>
                {namaKpa}
              </Text>
              <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.slateText, width: "85%", marginTop: 2, marginBottom: 2 }} />
              <Text style={{ fontSize: 7, fontFamily: "Geist", color: C.slateText, textAlign: "center" }}>NIP. {nipKpa || "—"}</Text>
            </View>
            <View style={{ width: "42%", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>Palopo, {dateInfo.tgl} {dateInfo.bln} {dateInfo.thn}</Text>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText }}>Bendahara Penerimaan,</Text>
              <Text style={{ marginTop: 34, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText, textAlign: "center" }}>
                {namaBendahara}
              </Text>
              <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.slateText, width: "85%", marginTop: 2, marginBottom: 2 }} />
              <Text style={{ fontSize: 7, fontFamily: "Geist", color: C.slateText, textAlign: "center" }}>NIP. {nipBendahara || "—"}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          HALAMAN REKAPITULASI BUKU PEMBANTU BANK (RINGKASAN EKSEKUTIF PER BANK)
          ═══════════════════════════════════════════════════════════════════════ */}
      {pembantuGroups.length > 0 && (
        <Page size="A4" orientation="portrait" style={s.pageTable}>
          <Text style={s.bkuTitleMain}>REKAPITULASI BUKU PEMBANTU BANK</Text>
          <Text style={s.bkuTitleSub}>BENDAHARA PENERIMAAN UIN PALOPO</Text>
          <Text style={s.bkuTitlePeriode}>{data.periodeLabel}</Text>
          <Text style={{ fontSize: 6.5, fontFamily: "Geist", color: C.slateMuted, textAlign: "center", marginTop: -7, marginBottom: 12 }}>
            Ringkasan Posisi Saldo Awal, Mutasi Kas, dan Saldo Akhir Seluruh Rekening Bank
          </Text>

          {/* Header Tabel Rekapitulasi */}
          <View style={s.tblHeaderRow}>
            <Text style={[s.tblHCell, { width: 24, textAlign: "center" }]}>No</Text>
            <Text style={[s.tblHCell, { width: 75, textAlign: "center" }]}>Bank</Text>
            <Text style={[s.tblHCell, { width: 110, textAlign: "center" }]}>Nomor Rekening</Text>
            <Text style={[s.tblHCell, { width: 80, textAlign: "center" }]}>Saldo Awal</Text>
            <Text style={[s.tblHCell, { width: 80, textAlign: "center" }]}>Penerimaan</Text>
            <Text style={[s.tblHCell, { width: 80, textAlign: "center" }]}>Pengeluaran</Text>
            <Text style={[s.tblHCell, { flex: 1, textAlign: "center" }]}>Saldo Akhir</Text>
          </View>

          {/* Data Baris Rekap per Bank */}
          {pembantuGroups.map((group, idx) => {
            const groupKey = `${group.bank}__${group.rekening}`
            const saldoAwalRek = data.saldoAwalPerRekening?.[groupKey] ?? 0
            const totalPen = group.rows.reduce((sum, row) => sum + row.penerimaan, 0)
            const totalKel = group.rows.reduce((sum, row) => sum + row.pengeluaran, 0)
            const saldoAkhirRek = saldoAwalRek + totalPen - totalKel
            const isAlt = idx % 2 === 1

            return (
              <View
                key={`rekap-${groupKey}`}
                style={[s.tblDataRow, isAlt ? { backgroundColor: C.rowAlt } : {}]}
                wrap={false}
              >
                <Text style={[s.tblCell, { width: 24, textAlign: "center" }]}>{idx + 1}</Text>
                <Text style={[s.tblCell, { width: 75, textAlign: "left", paddingLeft: 4, fontFamily: "Geist", fontWeight: 700 }]}>
                  {group.bank}
                </Text>
                <Text style={[s.tblCell, { width: 110, textAlign: "left", fontSize: 6.5 }]}>
                  {group.rekening}
                </Text>
                <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>
                  {numFmtSaldo(saldoAwalRek)}
                </Text>
                <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>
                  {numFmt(totalPen)}
                </Text>
                <Text style={[s.tblCell, { width: 80, textAlign: "right" }]}>
                  {numFmt(totalKel)}
                </Text>
                <Text style={[s.tblCell, { flex: 1, textAlign: "right", fontFamily: "Geist", fontWeight: 700 }]}>
                  {numFmtSaldo(saldoAkhirRek)}
                </Text>
              </View>
            )
          })}

          {/* Total Rekapitulasi */}
          <View style={s.tblTotalRow} wrap={false}>
            <Text style={[s.tblTotalLabel, { width: 24 + 75 + 110, textAlign: "center" }]}>
              TOTAL KESELURUHAN
            </Text>
            <Text style={[s.tblTotalVal, { width: 80 }]}>
              {numFmtSaldo(data.saldoAwal)}
            </Text>
            <Text style={[s.tblTotalVal, { width: 80 }]}>
              {numFmtSaldo(data.totalPenerimaan)}
            </Text>
            <Text style={[s.tblTotalVal, { width: 80 }]}>
              {numFmtSaldo(data.totalPengeluaran)}
            </Text>
            <Text style={[s.tblTotalVal, { flex: 1 }]}>
              {numFmtSaldo(data.saldoAkhir)}
            </Text>
          </View>

          {/* Tanda Tangan Pengesahan Rekapitulasi */}
          <View wrap={false} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 28, paddingHorizontal: 12 }}>
            <View style={{ width: "42%", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>Mengetahui,</Text>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText }}>Kuasa Pengguna Anggaran,</Text>
              <Text style={{ marginTop: 42, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText, textAlign: "center" }}>
                {namaKpa}
              </Text>
              <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.slateText, width: "85%", marginTop: 2, marginBottom: 2 }} />
              <Text style={{ fontSize: 7, fontFamily: "Geist", color: C.slateText, textAlign: "center" }}>NIP. {nipKpa || "—"}</Text>
            </View>
            <View style={{ width: "42%", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>Palopo, {dateInfo.tgl} {dateInfo.bln} {dateInfo.thn}</Text>
              <Text style={{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText }}>Bendahara Penerimaan,</Text>
              <Text style={{ marginTop: 42, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText, textAlign: "center" }}>
                {namaBendahara}
              </Text>
              <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.slateText, width: "85%", marginTop: 2, marginBottom: 2 }} />
              <Text style={{ fontSize: 7, fontFamily: "Geist", color: C.slateText, textAlign: "center" }}>NIP. {nipBendahara || "—"}</Text>
            </View>
          </View>
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          HALAMAN BUKU PEMBANTU BANK PER REKENING (MASING-MASING HALAMAN SENDIRI)
          ═══════════════════════════════════════════════════════════════════════ */}
      {pembantuGroups.map((group) => {
        const groupKey = `${group.bank}__${group.rekening}`
        const saldoAwalRek = data.saldoAwalPerRekening?.[groupKey] ?? 0
        const totalPen = group.rows.reduce((sum, row) => sum + row.penerimaan, 0)
        const totalKel = group.rows.reduce((sum, row) => sum + row.pengeluaran, 0)
        const saldoPeriode = saldoAwalRek + totalPen - totalKel

        const isPembantuRingkasan = modePembantu === "ringkasan"
        const rowsToRender = isPembantuRingkasan
          ? aggregateBkuPembantu(group.rows, saldoAwalRek)
          : group.rows

        return (
          <Page
            key={`${group.bank}-${group.rekening}`}
            size="A4"
            orientation="portrait"
            style={s.pageTable}
          >
            <Text style={s.bkuTitleMain}>BUKU PEMBANTU BANK</Text>
            <Text style={s.bkuTitleSub}>REKENING {group.bank} {group.rekening}</Text>
            <Text style={s.bkuTitleSub}>BENDAHARA PENERIMAAN UIN PALOPO</Text>
            <Text style={s.bkuTitlePeriode}>{data.periodeLabel}</Text>
            <Text style={{ fontSize: 6.5, fontFamily: "Geist", color: C.slateMuted, textAlign: "center", marginTop: -7, marginBottom: 9 }}>
              {isPembantuRingkasan
                ? "Format: Ringkasan Harian per Mata Anggaran"
                : "Format: Detail Seluruh Transaksi"}
            </Text>

            <View style={s.tblHeaderRow}>
              <Text style={[s.tblHCell, { width: COL.no, textAlign: "center" }]}>No</Text>
              <Text style={[s.tblHCell, { width: 64, textAlign: "center" }]}>Tanggal</Text>
              <Text style={[s.tblHCell, { width: 82, textAlign: "center" }]}>Nomor Bukti</Text>
              <Text style={[s.tblHCell, { flex: 1, textAlign: "center" }]}>Uraian</Text>
              <Text style={[s.tblHCell, { width: COL.pen, textAlign: "center" }]}>Penerimaan</Text>
              <Text style={[s.tblHCell, { width: COL.kel, textAlign: "center" }]}>Pengeluaran</Text>
              <Text style={[s.tblHCell, { width: COL.saldo, textAlign: "center" }]}>Saldo</Text>
            </View>

            {/* Baris saldo awal rekening */}
            <View style={s.tblSaldoAwalRow}>
              <Text style={[s.tblCell, { width: COL.no + 64 + 82, textAlign: "center" }]}> </Text>
              <Text style={[s.tblCell, { flex: 1, fontFamily: "Geist", fontWeight: 700 }]}>
                {data.saldoAwalLabel}
              </Text>
              <Text style={[s.tblCell, { width: COL.pen, textAlign: "right" }]}> </Text>
              <Text style={[s.tblCell, { width: COL.kel, textAlign: "right" }]}> </Text>
              <Text style={[s.tblCell, { width: COL.saldo, textAlign: "right", fontFamily: "Geist", fontWeight: 700 }]}>
                {numFmtSaldo(saldoAwalRek)}
              </Text>
            </View>

            {(() => {
              let saldoGroup = saldoAwalRek
              return rowsToRender.map((row, index) => {
                if (!isPembantuRingkasan) {
                  saldoGroup += row.penerimaan - row.pengeluaran
                } else {
                  saldoGroup = row.saldo
                }

                return (
                  <View
                    key={`${row.id}-${index}`}
                    style={[s.tblDataRow, index % 2 === 1 ? { backgroundColor: C.rowAlt } : {}]}
                    wrap={false}
                  >
                    <Text style={[s.tblCell, { width: COL.no, textAlign: "center" }]}>{index + 1}</Text>
                    <Text style={[s.tblCell, { width: 64, textAlign: "center", fontSize: 6 }]}>{row.tanggal}</Text>
                    <Text style={[s.tblCell, { width: 82, textAlign: "left", paddingLeft: 4, fontSize: 6 }]}>{row.nomor_bukti}</Text>
                    <Text style={[s.tblCell, { flex: 1 }]}>{row.uraian}</Text>
                    <Text style={[s.tblCell, { width: COL.pen, textAlign: "right" }]}>{numFmt(row.penerimaan)}</Text>
                    <Text style={[s.tblCell, { width: COL.kel, textAlign: "right" }]}>{numFmt(row.pengeluaran)}</Text>
                    <Text style={[s.tblCell, { width: COL.saldo, textAlign: "right" }]}>{numFmtSaldo(saldoGroup)}</Text>
                  </View>
                )
              })
            })()}

            <View style={s.tblTotalRow} wrap={false}>
              <Text style={[s.tblTotalLabel, { flex: 1 }]}>TOTAL {group.bank}</Text>
              <Text style={[s.tblTotalVal, { width: COL.pen }]}>{numFmtSaldo(totalPen)}</Text>
              <Text style={[s.tblTotalVal, { width: COL.kel }]}>{numFmtSaldo(totalKel)}</Text>
              <Text style={[s.tblTotalVal, { width: COL.saldo }]}>{numFmtSaldo(saldoPeriode)}</Text>
            </View>

            <View wrap={false} style={{ marginTop: 10, paddingHorizontal: 6 }}>
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText, lineHeight: 1.35 }}>
                  Pada hari ini {dateInfo.hari}, tanggal {dateInfo.tgl} {dateInfo.bln} {dateInfo.thn} buku kas pembantu bank ditutup dengan keadaan sebagai berikut:
                </Text>
              </View>

              <View style={{ width: "100%", maxWidth: 360, marginBottom: 8 }}>
                {[
                  { label: "Saldo Bulan lalu", val: numFmtSaldo(saldoAwalRek), isSub: false, isHeader: false },
                  { label: "Jumlah penerimaan", val: numFmtSaldo(totalPen), isSub: false, isHeader: false },
                  { label: "Jumlah pengeluaran", val: numFmtSaldo(totalKel), isSub: false, isHeader: false },
                  { label: "Saldo buku", val: numFmtSaldo(saldoPeriode), isSub: false, isHeader: false },
                  { label: "Saldo Kas terdiri dari :", val: "", isSub: false, isHeader: true },
                  { label: "Uang tunai", val: "Nihil", isSub: true, isHeader: false },
                  { label: "Bank/Giro", val: numFmtSaldo(saldoPeriode), isSub: true, isHeader: false },
                  { label: "Jumlah", val: numFmtSaldo(saldoPeriode), isSub: true, isHeader: false },
                  { label: "Selisih antara buku dan kas", val: "Nihil", isSub: false, isHeader: false },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: 11.5,
                      paddingLeft: item.isSub ? 14 : 0,
                      marginBottom: item.isHeader ? 2 : 1,
                      marginTop: item.isHeader ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        width: item.isSub ? 166 : 180,
                        fontSize: 7.5,
                        fontFamily: "Geist",
                        fontWeight: item.isHeader ? 700 : 400,
                        color: C.slateText,
                      }}
                    >
                      {item.isHeader ? item.label : `- ${item.label}`}
                    </Text>
                    <Text style={{ width: 22, fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>
                      {item.val ? "Rp" : ""}
                    </Text>
                    <Text
                      style={{
                        width: 110,
                        fontSize: 7.5,
                        fontFamily: "Geist",
                        fontWeight: 600,
                        color: C.slateText,
                        textAlign: "right",
                      }}
                    >
                      {item.val}
                    </Text>
                  </View>
                ))}
              </View>

              <View wrap={false} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <View style={{ width: "42%", alignItems: "center" }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>Mengetahui,</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText }}>Kuasa Pengguna Anggaran,</Text>
                  <Text style={{ marginTop: 34, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText, textAlign: "center" }}>
                    {namaKpa}
                  </Text>
                  <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.slateText, width: "85%", marginTop: 2, marginBottom: 2 }} />
                  <Text style={{ fontSize: 7, fontFamily: "Geist", color: C.slateText, textAlign: "center" }}>NIP. {nipKpa || "—"}</Text>
                </View>
                <View style={{ width: "42%", alignItems: "center" }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Geist", color: C.slateText }}>Palopo, {dateInfo.tgl} {dateInfo.bln} {dateInfo.thn}</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText }}>Bendahara Penerimaan,</Text>
                  <Text style={{ marginTop: 34, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.slateText, textAlign: "center" }}>
                    {namaBendahara}
                  </Text>
                  <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.slateText, width: "85%", marginTop: 2, marginBottom: 2 }} />
                  <Text style={{ fontSize: 7, fontFamily: "Geist", color: C.slateText, textAlign: "center" }}>NIP. {nipBendahara || "—"}</Text>
                </View>
              </View>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
