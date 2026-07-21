import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { BukuKasRow, BukuKasUmumResult } from "@/app/actions/laporan"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)

const tglFmt = (s: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(s + "T00:00:00"))

const tglPanjang = (s: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(s + "T00:00:00"))

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  brand:      "#1e3a5f",
  brandMid:   "#2563eb",
  surface:    "#f8fafc",
  border:     "#cbd5e1",
  borderLight:"#e2e8f0",
  text:       "#0f172a",
  textMuted:  "#64748b",
  white:      "#ffffff",
  rowAlt:     "#f1f5f9",
  green:      "#059669",
  red:        "#dc2626",
  purple:     "#7c3aed",
  yellow:     "#d97706",
  saldoAwalBg:"#eff6ff",
  totalBg:    "#1e3a5f",
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: "20mm 15mm 25mm 15mm",
    fontSize: 8,
    fontFamily: "Geist",
    color: C.text,
    backgroundColor: C.white,
  },

  // ── Header / Kop ──
  kopWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
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
  kopKemenag:  { fontSize: 9.5, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.3 },
  kopUniv:     { fontSize: 12.5, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.3 },
  kopKota:     { fontSize: 14, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.5 },
  kopAlamat:   { fontSize: 7, color: C.text, textAlign: "center", marginTop: 3 },
  kopKontak:   { fontSize: 6.5, color: C.text, textAlign: "center", marginTop: 1 },
  kopDivider1: { borderBottomWidth: 3, borderBottomColor: C.text, marginBottom: 1.5 },
  kopDivider2: { borderBottomWidth: 1, borderBottomColor: C.text, marginBottom: 8 },

  // ── Doc title ──
  headerWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  logoBox: {
    width: 36, height: 36, borderRadius: 5,
    backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center",
    marginRight: 10, marginTop: 2,
  },
  logoTxt: { color: C.white, fontSize: 10, fontFamily: "Geist", fontWeight: 700 },
  instName:  { fontSize: 13, fontFamily: "Geist", fontWeight: 700, color: C.brand },
  instSub:   { fontSize: 7.5, color: C.textMuted, marginTop: 1 },
  instAddr:  { fontSize: 6.5, color: C.textMuted, marginTop: 1 },
  docTitle:  {
    fontSize: 10, fontFamily: "Geist", fontWeight: 700,
    color: C.text, textAlign: "center", textTransform: "uppercase",
    letterSpacing: 0.8, marginTop: 2,
  },
  divider:    { borderBottomWidth: 2, borderBottomColor: C.brand, marginVertical: 8 },
  dividerThin:{ borderBottomWidth: 0.5, borderBottomColor: C.border, marginVertical: 6 },

  // ── Meta info (periode, rekening, dsb) ──
  metaGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  metaCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 4,
    padding: 7,
    backgroundColor: C.surface,
  },
  metaLabel:  { fontSize: 6, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  metaValue:  { fontSize: 8.5, fontFamily: "Geist", fontWeight: 700, color: C.brand },
  metaValueSm:{ fontSize: 7.5, fontFamily: "Geist", fontWeight: 600, color: C.text },

  // ── Summary row (4 kartu saldo) ──
  summaryRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  summaryCard: {
    flex: 1, borderWidth: 1, borderColor: C.borderLight,
    borderRadius: 4, padding: 7, backgroundColor: C.surface,
  },
  summaryLabel:  { fontSize: 6, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  summaryValue:  { fontSize: 9, fontFamily: "Geist", fontWeight: 700 },
  summaryGreen:  { color: C.green },
  summaryRed:    { color: C.red },
  summaryBlue:   { color: C.brandMid },
  summaryPurple: { color: C.purple },

  // ── Table ──
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.brand,
    paddingHorizontal: 5, paddingVertical: 5,
    borderRadius: 2,
    marginBottom: 1,
  },
  tblHCell: { color: C.white, fontSize: 7, fontFamily: "Geist", fontWeight: 700 },

  tblRow:     { flexDirection: "row", paddingHorizontal: 5, paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  tblRowAlt:  { backgroundColor: C.rowAlt },
  tblSaldoAwal: { backgroundColor: C.saldoAwalBg },
  tblCell:    { fontSize: 7, color: C.text },
  tblMuted:   { fontSize: 7, color: C.textMuted },
  tblRight:   { textAlign: "right" },
  tblCenter:  { textAlign: "center" },
  tblBold:    { fontFamily: "Geist", fontWeight: 700 },
  tblGreen:   { color: C.green, fontFamily: "Geist", fontWeight: 700 },
  tblRed:     { color: C.red,   fontFamily: "Geist", fontWeight: 700 },
  tblBlue:    { color: C.brandMid, fontFamily: "Geist", fontWeight: 700 },
  tblPurple:  { color: C.purple, fontFamily: "Geist", fontWeight: 700 },

  totalRow: {
    flexDirection: "row",
    backgroundColor: C.totalBg,
    paddingHorizontal: 5, paddingVertical: 5,
    marginTop: 1, borderRadius: 2,
  },
  totalLabel: { flex: 1, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.white },
  totalValue: { fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: C.white, textAlign: "right" },
  totalValueGreen:  { color: "#6ee7b7" },
  totalValueRed:    { color: "#fca5a5" },
  totalValuePurple: { color: "#c4b5fd" },

  // ── Tanda Tangan ──
  ttdSection: { marginTop: 20 },
  ttdRow:     { flexDirection: "row", justifyContent: "space-between" },
  ttdBox:     { width: "28%", alignItems: "center" },
  ttdLabel:   { fontSize: 7.5, color: C.textMuted, textAlign: "center" },
  ttdNama:    { fontSize: 8, fontFamily: "Geist", fontWeight: 700, color: C.text, marginTop: 2 },
  ttdNip:     { fontSize: 6.5, color: C.textMuted },
  ttdGaris:   { borderTopWidth: 1, borderTopColor: C.brand, width: "100%", marginTop: 30, marginBottom: 4 },

  // ── Footer ──
  footer: {
    position: "absolute", bottom: 14, left: "15mm", right: "15mm",
    flexDirection: "row", justifyContent: "space-between",
    color: C.textMuted, fontSize: 6.5,
    borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 4,
  },
})

// ─── Kop Surat ───────────────────────────────────────────────────────────────

function KopSurat({ logoSrc }: { logoSrc: string }) {
  return (
    <View>
      <View style={s.kopWrapper}>
        {/* Logo */}
        <View style={s.kopLogo}>
          <Image
            src={logoSrc}
            style={{ width: 60, height: 60, objectFit: "contain" }}
          />
        </View>
        {/* Teks institusi */}
        <View style={s.kopText}>
          <Text style={s.kopKemenag}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</Text>
          <Text style={s.kopUniv}>UNIVERSITAS ISLAM NEGERI</Text>
          <Text style={s.kopKota}>PALOPO</Text>
          <Text style={s.kopAlamat}>
            Kampus 1 Jalan Agatis Kel. Balandai Kec. Bara Kota Palopo Sulawesi Selatan 91914
          </Text>
          <Text style={s.kopKontak}>
            email: kontak@iainpalopo.ac.id  website: https://iainpalopo.ac.id
          </Text>
        </View>
      </View>
      <View style={s.kopDivider1} />
      <View style={s.kopDivider2} />
    </View>
  )
}

// ─── Column widths ─────────────────────────────────────────────────────────────
// A4 landscape 297mm, margin kiri+kanan 30mm → usable ≈ 756 pt
// Fixed total: 20+52+70+88+70+75+75+78 = 528 pt → flex:1 (Uraian) ≈ 228 pt

const COL = {
  no:       20,   // nomor urut
  tgl:      52,   // tanggal dd/mm/yyyy
  bukti:    70,   // no. bukti (kode panjang)
  uraian:   0,    // flex: 1  — isi bervariasi
  rekening: 115,  // nama bank lengkap (Bank Negara Indonesia (BNI) = ~115pt)
  unit:     70,   // nama unit kerja lengkap
  pen:      75,   // nominal penerimaan
  kel:      75,   // nominal pengeluaran
  saldo:    78,   // saldo berjalan
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TblHead() {
  return (
    <View style={s.tableHeader} fixed>
      <Text style={[s.tblHCell, { width: COL.no, textAlign: "center" }]}>No</Text>
      <Text style={[s.tblHCell, { width: COL.tgl }]}>Tanggal</Text>
      <Text style={[s.tblHCell, { width: COL.bukti }]}>No. Bukti</Text>
      <Text style={[s.tblHCell, { flex: 1 }]}>Uraian</Text>
      <Text style={[s.tblHCell, { width: COL.rekening }]}>Rekening</Text>
      <Text style={[s.tblHCell, { width: COL.unit }]}>Unit</Text>
      <Text style={[s.tblHCell, { width: COL.pen, textAlign: "right" }]}>Penerimaan</Text>
      <Text style={[s.tblHCell, { width: COL.kel, textAlign: "right" }]}>Pengeluaran</Text>
      <Text style={[s.tblHCell, { width: COL.saldo, textAlign: "right" }]}>Saldo</Text>
    </View>
  )
}

function SaldoAwalRow({ saldo, tanggal }: { saldo: number; tanggal: string }) {
  return (
    <View style={[s.tblRow, s.tblSaldoAwal]}>
      <Text style={[s.tblMuted, { width: COL.no, textAlign: "center" }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.tgl }]}>{tglFmt(tanggal)}</Text>
      <Text style={[s.tblMuted, { width: COL.bukti }]}>—</Text>
      <Text style={[s.tblBlue, { flex: 1 }]}>Saldo Awal</Text>
      <Text style={[s.tblMuted, { width: COL.rekening }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.unit }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.pen, textAlign: "right" }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.kel, textAlign: "right" }]}>—</Text>
      <Text style={[s.tblBlue, s.tblBold, { width: COL.saldo, textAlign: "right" }]}>
        {rupiah(saldo)}
      </Text>
    </View>
  )
}

function DataRow({ row, index }: { row: BukuKasRow; index: number }) {
  const isAlt = index % 2 === 1
  const uraianText = row.jenis_nama ?? row.uraian ?? "—"
  return (
    <View style={[s.tblRow, isAlt ? s.tblRowAlt : {}]} wrap={false}>
      <Text style={[s.tblMuted, { width: COL.no, textAlign: "center" }]}>{row.no}</Text>
      <Text style={[s.tblMuted, { width: COL.tgl }]}>{tglFmt(row.tanggal)}</Text>
      <Text style={[s.tblMuted, { width: COL.bukti, fontFamily: "Courier", fontSize: 6.5 }]}>
        {row.nomor_bukti}
      </Text>
      <Text style={[s.tblCell, { flex: 1 }]}>
        {uraianText}
      </Text>
      <Text style={[s.tblMuted, { width: COL.rekening }]}>
        {row.rekening ? `${row.rekening.nama_bank}` : "—"}
      </Text>
      <Text style={[s.tblMuted, { width: COL.unit }]}>{row.unit?.nama ?? "—"}</Text>
      <Text style={[
        row.penerimaan > 0 ? s.tblGreen : s.tblMuted,
        { width: COL.pen, textAlign: "right" },
      ]}>
        {row.penerimaan > 0 ? rupiah(row.penerimaan) : "—"}
      </Text>
      <Text style={[
        row.pengeluaran > 0 ? s.tblRed : s.tblMuted,
        { width: COL.kel, textAlign: "right" },
      ]}>
        {row.pengeluaran > 0 ? rupiah(row.pengeluaran) : "—"}
      </Text>
      <Text style={[
        row.saldo >= 0 ? s.tblBold : s.tblRed,
        { width: COL.saldo, textAlign: "right" },
      ]}>
        {rupiah(row.saldo)}
      </Text>
    </View>
  )
}

// ─── Main PDF Component ───────────────────────────────────────────────────────

export type BukuKasUmumPDFProps = {
  data: BukuKasUmumResult & { allRows: BukuKasRow[] }
  filter: {
    tglAwal: string
    tglAkhir: string
    namaRekening?: string
    namaUnit?: string
  }
  logoSrc: string
  namaInstansi?: string
  alamatInstansi?: string
}

export function BukuKasUmumPDF({
  data,
  filter,
  logoSrc,
  namaInstansi = "BLU UIN Palopo",
  alamatInstansi = "Universitas Islam Negeri Palopo — Badan Layanan Umum",
}: BukuKasUmumPDFProps) {
  const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
  const periodeLabel = `${tglPanjang(filter.tglAwal)} s.d. ${tglPanjang(filter.tglAkhir)}`

  return (
    <Document
      title={`Buku Kas Umum ${filter.tglAwal} s.d. ${filter.tglAkhir}`}
      author={namaInstansi}
      subject="Buku Kas Umum"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── Kop Surat ── */}
        <KopSurat logoSrc={logoSrc} />

        <Text style={s.docTitle}>BUKU KAS UMUM</Text>

        {/* ── Meta info ── */}
        <View style={[s.metaGrid, { marginTop: 10 }]}>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Periode</Text>
            <Text style={s.metaValueSm}>{periodeLabel}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Rekening</Text>
            <Text style={s.metaValueSm}>{filter.namaRekening ?? "Semua Rekening"}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Unit Kerja</Text>
            <Text style={s.metaValueSm}>{filter.namaUnit ?? "Semua Unit"}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Digenerate</Text>
            <Text style={s.metaValueSm}>{generatedAt}</Text>
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={s.summaryRow}>
          {[
            { label: "Saldo Awal",        value: data.saldoAwal,         style: s.summaryBlue },
            { label: "Total Penerimaan",   value: data.totalPenerimaan,   style: s.summaryGreen },
            { label: "Total Pengeluaran",  value: data.totalPengeluaran,  style: s.summaryRed },
            { label: "Saldo Akhir",        value: data.saldoAkhir,        style: data.saldoAkhir >= 0 ? s.summaryPurple : s.summaryRed },
          ].map((c) => (
            <View key={c.label} style={s.summaryCard}>
              <Text style={s.summaryLabel}>{c.label}</Text>
              <Text style={[s.summaryValue, c.style]}>{rupiah(c.value)}</Text>
            </View>
          ))}
        </View>

        {/* ── Tabel ── */}
        <TblHead />

        {/* Baris saldo awal */}
        <SaldoAwalRow saldo={data.saldoAwal} tanggal={filter.tglAwal} />

        {data.allRows.length === 0 && (
          <View style={[s.tblRow, { justifyContent: "center", paddingVertical: 12 }]}>
            <Text style={s.tblMuted}>Tidak ada transaksi pada periode yang dipilih.</Text>
          </View>
        )}

        {data.allRows.map((row, i) => (
          <DataRow key={`${row.tipe}-${row.id}`} row={row} index={i} />
        ))}

        {/* Baris Total */}
        {data.allRows.length > 0 && (
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { width: COL.no + COL.tgl + COL.bukti }]}> </Text>
            <Text style={[s.totalLabel, { flex: 1 }]}>TOTAL PERIODE</Text>
            <Text style={[s.totalLabel, { width: COL.rekening }]}> </Text>
            <Text style={[s.totalLabel, { width: COL.unit }]}> </Text>
            <Text style={[s.totalValue, s.totalValueGreen, { width: COL.pen }]}>
              {rupiah(data.totalPenerimaan)}
            </Text>
            <Text style={[s.totalValue, s.totalValueRed, { width: COL.kel }]}>
              {rupiah(data.totalPengeluaran)}
            </Text>
            <Text style={[s.totalValue, s.totalValuePurple, { width: COL.saldo }]}>
              {rupiah(data.saldoAkhir)}
            </Text>
          </View>
        )}

        {/* ── Tanda Tangan ── */}
        <View style={s.ttdSection}>
          <Text style={{ fontSize: 7.5, color: C.textMuted, marginBottom: 4 }}>
            Palopo, {generatedAt}
          </Text>
          <View style={s.ttdRow}>
            <View style={s.ttdBox}>
              <Text style={s.ttdLabel}>Mengetahui,</Text>
              <Text style={s.ttdLabel}>Pimpinan BLU UIN Palopo</Text>
              <View style={s.ttdGaris} />
              <Text style={s.ttdNama}>__________________________</Text>
              <Text style={s.ttdNip}>NIP. ___________________</Text>
            </View>
            <View style={s.ttdBox}>
              <Text style={s.ttdLabel}>Dibuat oleh,</Text>
              <Text style={s.ttdLabel}>Bendahara Penerimaan</Text>
              <View style={s.ttdGaris} />
              <Text style={s.ttdNama}>__________________________</Text>
              <Text style={s.ttdNip}>NIP. ___________________</Text>
            </View>
            <View style={s.ttdBox}>
              <Text style={s.ttdLabel}>Diperiksa oleh,</Text>
              <Text style={s.ttdLabel}>Bendahara Pengeluaran</Text>
              <View style={s.ttdGaris} />
              <Text style={s.ttdNama}>__________________________</Text>
              <Text style={s.ttdNip}>NIP. ___________________</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text>{namaInstansi} — Buku Kas Umum {periodeLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
