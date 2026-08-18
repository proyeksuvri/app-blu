import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import "@/components/pdf/register-fonts"
import type { BkuPenerimaanRow } from "@/app/actions/laporan"

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  brand:        "#1e3a5f",
  brandMid:     "#2563eb",
  surface:      "#f8fafc",
  border:       "#cbd5e1",
  borderLight:  "#e2e8f0",
  text:         "#0f172a",
  textMuted:    "#64748b",
  white:        "#ffffff",
  rowAlt:       "#f1f5f9",
  green:        "#059669",
  purple:       "#7c3aed",
  saldoAwalBg:  "#eff6ff",
  totalBg:      "#1e3a5f",
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: "15mm 15mm 24mm 15mm",
    fontSize: 8,
    fontFamily: "Geist",
    color: C.text,
    backgroundColor: C.white,
  },

  // ── Kop Surat ──
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
  kopKemenag:  { fontSize: 9, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.3 },
  kopUniv:     { fontSize: 12, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.3 },
  kopKota:     { fontSize: 14, fontFamily: "Geist", fontWeight: 700, color: C.text, textAlign: "center", letterSpacing: 0.5 },
  kopAlamat:   { fontSize: 7, color: C.text, textAlign: "center", marginTop: 3 },
  kopKontak:   { fontSize: 6.5, color: C.text, textAlign: "center", marginTop: 1 },
  kopDivider1: { borderBottomWidth: 3, borderBottomColor: C.text, marginBottom: 1.5 },
  kopDivider2: { borderBottomWidth: 1, borderBottomColor: C.text, marginBottom: 6 },

  // ── Judul Dokumen ──
  judulWrapper: {
    alignItems: "center",
    marginBottom: 2,
  },
  judulUtama: {
    fontSize: 11,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.text,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  judulSub: {
    fontSize: 8.5,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.text,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  judulDivider: {
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
    marginTop: 6,
    marginBottom: 8,
  },

  // ── Meta info ──
  metaSection: {
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  metaKey: {
    width: 120,
    fontSize: 7.5,
    color: C.textMuted,
  },
  metaColon: {
    width: 10,
    fontSize: 7.5,
    color: C.textMuted,
  },
  metaVal: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 600,
    color: C.text,
  },

  // ── Summary row ──
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 3,
    padding: 6,
    backgroundColor: C.surface,
  },
  summaryLabel:  { fontSize: 6, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  summaryValue:  { fontSize: 9, fontFamily: "Geist", fontWeight: 700 },
  summaryGreen:  { color: C.green },
  summaryBlue:   { color: C.brandMid },
  summaryPurple: { color: C.purple },

  // ── Tabel ──
  tableHeader: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: C.brand,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginBottom: 1,
  },
  tblHCell: {
    color: C.white,
    fontSize: 7,
    fontFamily: "Geist",
    fontWeight: 700,
  },

  tblRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
  },
  tblRowAlt:    { backgroundColor: C.rowAlt },
  tblSaldoAwal: { backgroundColor: C.saldoAwalBg },
  tblCell:      { fontSize: 7, color: C.text },
  tblMuted:     { fontSize: 7, color: C.textMuted },
  tblRight:     { textAlign: "right" },
  tblCenter:    { textAlign: "center" },
  tblBold:      { fontFamily: "Geist", fontWeight: 700 },
  tblGreen:     { color: C.green, fontFamily: "Geist", fontWeight: 700 },
  tblBlue:      { color: C.brandMid, fontFamily: "Geist", fontWeight: 700 },
  tblPurple:    { color: C.purple, fontFamily: "Geist", fontWeight: 700 },

  totalRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: C.totalBg,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginTop: 1,
  },
  totalLabel: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.white,
  },
  totalValue: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.white,
    textAlign: "right",
  },
  totalValueGreen:  { color: "#6ee7b7" },
  totalValuePurple: { color: "#c4b5fd" },

  // ── Tanda Tangan ──
  ttdSection: {
    marginTop: 18,
  },
  ttdKota: {
    fontSize: 7.5,
    color: C.textMuted,
    marginBottom: 10,
    textAlign: "right",
  },
  ttdRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  ttdBox: {
    width: "32%",
    alignItems: "center",
  },
  ttdLabel: {
    fontSize: 7.5,
    color: C.text,
    textAlign: "center",
  },
  ttdJabatan: {
    fontSize: 7.5,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.brand,
    textAlign: "center",
  },
  ttdGaris: {
    borderTopWidth: 1,
    borderTopColor: C.brand,
    width: "90%",
    marginTop: 36,
    marginBottom: 4,
  },
  ttdNama: {
    fontSize: 8,
    fontFamily: "Geist",
    fontWeight: 700,
    color: C.text,
    textAlign: "center",
  },
  ttdNip: {
    fontSize: 6.5,
    color: C.textMuted,
    textAlign: "center",
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 14,
    left: "15mm",
    right: "15mm",
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.textMuted,
    fontSize: 6.5,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 4,
  },
})

// Usable width A4 landscape: (297mm - 30mm margin) ≈ 757pt
// Konten efektif dengan paddingHorizontal:6 kiri+kanan = 757 - 12 = 745pt
// gap:4 antar 8 kolom = 7 gap × 4 = 28pt → total konten = 745 - 28 = 717pt
// Alokasi lebar per kolom:
const COL = {
  no:       26,   // "Nomor"              - angka urut
  tgl:      48,   // "Tanggal"            - dd/mm/yyyy
  bukti:    80,   // "No. Bukti"          - BPM/2026/03296
  akunJenis:76,   // "Akun Pendapatan"    - 424112 (6 digit)
  kategori: 158,  // "Kategori Pendapatan"- teks paling panjang
  jenis:    115,  // "Jenis Pendapatan"   - nama jenis
  terima:   92,   // "Penerimaan (Rp)"    - nominal kanan
  saldo:    78,   // "Saldo (Rp)"         - nominal kanan
  // total: 26+48+80+76+158+115+92+78 = 673pt + 28gap = 701pt ✓
}

// ─── Kop Surat ───────────────────────────────────────────────────────────────

function KopSurat({ logoSrc }: { logoSrc: string }) {
  return (
    <View>
      <View style={s.kopWrapper}>
        <View style={s.kopLogo}>
          <Image
            src={logoSrc}
            style={{ width: 58, height: 58, objectFit: "contain" }}
          />
        </View>
        <View style={s.kopText}>
          <Text style={s.kopKemenag}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</Text>
          <Text style={s.kopUniv}>UNIVERSITAS ISLAM NEGERI</Text>
          <Text style={s.kopKota}>PALOPO</Text>
          <Text style={s.kopAlamat}>
            Kampus 1 Jalan Agatis Kel. Balandai Kec. Bara Kota Palopo Sulawesi Selatan 91914
          </Text>
          <Text style={s.kopKontak}>
            Telepon: (0471) 22076  ·  Website: www.uinpalopo.ac.id  ·  Email: info@uinpalopo.ac.id
          </Text>
        </View>
      </View>
      <View style={s.kopDivider1} />
      <View style={s.kopDivider2} />
    </View>
  )
}

// ─── Table Header ─────────────────────────────────────────────────────────────

function TblHead() {
  return (
    <View style={s.tableHeader} fixed>
      <Text style={[s.tblHCell, { width: COL.no, textAlign: "center" }]}>Nomor</Text>
      <Text style={[s.tblHCell, { width: COL.tgl }]}>Tanggal</Text>
      <Text style={[s.tblHCell, { width: COL.bukti }]}>No. Bukti</Text>
      <Text style={[s.tblHCell, { width: COL.akunJenis, textAlign: "center" }]}>Akun Pendapatan</Text>
      <Text style={[s.tblHCell, { flex: 1 }]}>Kategori Pendapatan</Text>
      <Text style={[s.tblHCell, { width: COL.jenis }]}>Jenis Pendapatan</Text>
      <Text style={[s.tblHCell, { width: COL.terima, textAlign: "right" }]}>Penerimaan (Rp)</Text>
      <Text style={[s.tblHCell, { width: COL.saldo, textAlign: "right" }]}>Saldo (Rp)</Text>
    </View>
  )
}

// ─── Saldo Awal Row ───────────────────────────────────────────────────────────

function SaldoAwalRow({ saldo, tanggal }: { saldo: number; tanggal: string }) {
  return (
    <View style={[s.tblRow, s.tblSaldoAwal]}>
      <Text style={[s.tblMuted, { width: COL.no, textAlign: "center" }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.tgl }]}>{tglFmt(tanggal)}</Text>
      <Text style={[s.tblMuted, { width: COL.bukti }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.akunJenis, textAlign: "center" }]}>—</Text>
      <Text style={[s.tblBlue, { flex: 1 }]}>SALDO AWAL</Text>
      <Text style={[s.tblMuted, { width: COL.jenis }]}>—</Text>
      <Text style={[s.tblMuted, { width: COL.terima, textAlign: "right" }]}>—</Text>
      <Text style={[s.tblBlue, s.tblBold, { width: COL.saldo, textAlign: "right" }]}>
        {rupiah(saldo)}
      </Text>
    </View>
  )
}

// ─── Data Row ─────────────────────────────────────────────────────────────────

function DataRow({ row, index }: { row: BkuPenerimaanRow; index: number }) {
  const isAlt = index % 2 === 1
  return (
    <View style={[s.tblRow, isAlt ? s.tblRowAlt : {}]} wrap={false}>
      <Text style={[s.tblMuted, { width: COL.no, textAlign: "center" }]}>{row.no}</Text>
      <Text style={[s.tblMuted, { width: COL.tgl }]}>{tglFmt(row.tanggal)}</Text>
      <Text style={[s.tblMuted, { width: COL.bukti, fontFamily: "Courier", fontSize: 6.5 }]}>
        {row.nomor_bukti}
      </Text>
      {/* Akun Pendapatan (akun_pendapatan dari jenis_pendapatan, misal 424112) */}
      <Text style={[s.tblCell, { width: COL.akunJenis, textAlign: "center", fontFamily: "Courier", fontSize: 7 }]}>
        {row.jenis_akun ?? "—"}
      </Text>
      {/* Kategori Pendapatan (kategori_nama) */}
      <Text style={[s.tblCell, { flex: 1, fontSize: 6.5 }]}>
        {row.kategori_nama ?? "—"}
      </Text>
      {/* Jenis Pendapatan (jenis_nama) */}
      <Text style={[s.tblCell, { width: COL.jenis, fontSize: 6.5 }]}>
        {row.jenis_nama ?? "—"}
      </Text>
      <Text style={[s.tblGreen, { width: COL.terima, textAlign: "right" }]}>
        {rupiah(row.penerimaan)}
      </Text>
      <Text style={[s.tblBold, { width: COL.saldo, textAlign: "right", color: C.text }]}>
        {rupiah(row.saldo)}
      </Text>
    </View>
  )
}

// ─── Main PDF Component ───────────────────────────────────────────────────────

export type BkuPenerimaanPDFProps = {
  rows: BkuPenerimaanRow[]
  saldoAwal: number
  saldoAkhir: number
  totalPenerimaan: number
  filter: {
    tglAwal: string
    tglAkhir: string
    namaRekening?: string
    namaUnit?: string
  }
  logoSrc: string
  namaInstansi?: string
}

export function BkuPenerimaanPDF({
  rows,
  saldoAwal,
  saldoAkhir,
  totalPenerimaan,
  filter,
  logoSrc,
  namaInstansi = "UIN Palopo",
}: BkuPenerimaanPDFProps) {
  const generatedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  })
  const periodeLabel = `${tglPanjang(filter.tglAwal)} s.d. ${tglPanjang(filter.tglAkhir)}`
  const tahunLabel = filter.tglAwal.substring(0, 4)
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <Document
      title={`BKU Penerimaan ${filter.tglAwal} s.d. ${filter.tglAkhir}`}
      author={namaInstansi}
      subject="Buku Kas Umum Penerimaan"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── Kop Surat ── */}
        <KopSurat logoSrc={logoSrc} />

        {/* ── Judul Dokumen ── */}
        <View style={s.judulWrapper}>
          <Text style={s.judulUtama}>BUKU KAS UMUM</Text>
          <Text style={s.judulSub}>
            {filter.namaRekening === "Konsolidasi Seluruh Rekening"
              ? "KONSOLIDASI SELURUH REKENING"
              : "KHUSUS PENERIMAAN"}
          </Text>
          <View style={s.judulDivider} />
        </View>

        {/* ── Meta Info ── */}
        <View style={s.metaSection}>
          <View style={s.metaRow}>
            <Text style={s.metaKey}>Periode</Text>
            <Text style={s.metaColon}>:</Text>
            <Text style={s.metaVal}>{periodeLabel}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaKey}>Tahun Anggaran</Text>
            <Text style={s.metaColon}>:</Text>
            <Text style={s.metaVal}>{tahunLabel}</Text>
          </View>
          {filter.namaRekening && (
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Rekening Bank</Text>
              <Text style={s.metaColon}>:</Text>
              <Text style={s.metaVal}>{filter.namaRekening}</Text>
            </View>
          )}
          {filter.namaUnit && (
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Unit Kerja</Text>
              <Text style={s.metaColon}>:</Text>
              <Text style={s.metaVal}>{filter.namaUnit}</Text>
            </View>
          )}
          <View style={s.metaRow}>
            <Text style={s.metaKey}>Dicetak pada</Text>
            <Text style={s.metaColon}>:</Text>
            <Text style={s.metaVal}>{generatedAt}</Text>
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={s.summaryRow}>
          {[
            { label: "Saldo Awal",       value: saldoAwal,         style: s.summaryBlue },
            { label: "Total Penerimaan", value: totalPenerimaan,   style: s.summaryGreen },
            { label: "Saldo Akhir",      value: saldoAkhir,        style: s.summaryPurple },
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
        <SaldoAwalRow saldo={saldoAwal} tanggal={filter.tglAwal} />

        {rows.length === 0 && (
          <View style={[s.tblRow, { justifyContent: "center", paddingVertical: 12 }]}>
            <Text style={s.tblMuted}>Tidak ada transaksi penerimaan pada periode yang dipilih.</Text>
          </View>
        )}

        {rows.map((row, i) => (
          <DataRow key={row.id} row={row} index={i} />
        ))}

        {/* Baris Total */}
        {rows.length > 0 && (
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { width: COL.no + COL.tgl + COL.bukti + COL.akunJenis }]}>
              {" "}
            </Text>
            <Text style={[s.totalLabel, { flex: 1 }]}>JUMLAH</Text>
            <Text style={[s.totalLabel, { width: COL.jenis }]}>{" "}</Text>
            <Text style={[s.totalValue, s.totalValueGreen, { width: COL.terima }]}>
              {rupiah(totalPenerimaan)}
            </Text>
            <Text style={[s.totalValue, s.totalValuePurple, { width: COL.saldo }]}>
              {rupiah(saldoAkhir)}
            </Text>
          </View>
        )}

        {/* ── Tanda Tangan Bendahara Penerimaan ── */}
        <View style={s.ttdSection}>
          <Text style={s.ttdKota}>Palopo, {today}</Text>
          <View style={s.ttdRow}>
            <View style={s.ttdBox}>
              <Text style={s.ttdLabel}>Dibuat oleh,</Text>
              <Text style={s.ttdJabatan}>Bendahara Penerimaan</Text>
              <Text style={s.ttdJabatan}>BLU UIN Palopo</Text>
              <View style={s.ttdGaris} />
              <Text style={s.ttdNama}>__________________________</Text>
              <Text style={s.ttdNip}>NIP. ____________________</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text>{namaInstansi} — Buku Kas Umum Penerimaan · {periodeLabel}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} dari ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
