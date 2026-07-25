/**
 * Penyusun laporan bulanan yang dapat diunduh (FR-02.8).
 *
 * Formatnya CSV, bukan PDF. Alasannya: laporan ini berakhir di tangan staf
 * dinas kesehatan yang perlu menyalin angkanya ke rekapitulasi mereka sendiri.
 * PDF terlihat lebih resmi namun angkanya harus diketik ulang, sedangkan CSV
 * langsung terbuka di Excel dan dapat diolah.
 *
 * Menambahkan pustaka pembuat PDF juga berarti menambah beban bundel untuk
 * keluaran yang lebih sulit dipakai. Keputusan ini dicatat di DECISIONS.md.
 *
 * Seluruh angka pada laporan berasal dari perhitungan deterministik yang sama
 * dengan dashboard. Tidak ada bagian laporan yang disusun LLM.
 */

import { LABEL_STATUS } from "./proses-pengukuran";
import type { AnakPrioritas, RingkasanDashboard } from "./dashboard";

/**
 * Membungkus satu nilai agar aman sebagai bidang CSV.
 *
 * Nama anak di Indonesia dapat memuat koma pada gelar atau sebutan, dan tanpa
 * pengutipan bidangnya akan bergeser sehingga seluruh baris salah terbaca.
 */
export function bidangCsv(nilai: string | number | null): string {
  if (nilai === null || nilai === undefined) return "";
  const teks = String(nilai);
  if (/[",\r\n]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

function baris(kolom: (string | number | null)[]): string {
  return kolom.map(bidangCsv).join(",");
}

/** Menerjemahkan status ke label yang dipahami pembaca laporan. */
function labelStatus(status: AnakPrioritas["status"]): string {
  return status ? LABEL_STATUS[status] : "Belum ditimbang";
}

export interface KonteksLaporan {
  namaWilayah: string;
  tanggalCetak: Date;
}

/**
 * Menyusun laporan bulanan dalam bentuk CSV.
 *
 * Susunannya tiga bagian: keterangan laporan, rekapitulasi angka, lalu rincian
 * per anak. Bagian rekapitulasi diletakkan sebelum rincian karena itu yang
 * dibutuhkan untuk pelaporan ke atas, sedangkan rincian dipakai saat menindak
 * lanjuti anak tertentu.
 */
export function susunLaporanCsv(
  ringkasan: RingkasanDashboard,
  konteks: KonteksLaporan,
): string {
  const larik: string[] = [];

  larik.push(baris(["Laporan Pemantauan Gizi Balita"]));
  larik.push(baris(["Wilayah", konteks.namaWilayah]));
  larik.push(
    baris([
      "Tanggal cetak",
      konteks.tanggalCetak.toISOString().slice(0, 10),
    ]),
  );
  // Dinyatakan di dalam berkasnya sendiri, karena berkas akan berpindah tangan
  // terlepas dari antarmuka tempat ia diunduh.
  larik.push(
    baris([
      "Catatan",
      "Alat bantu pemantauan, bukan alat diagnosis. Keputusan rujukan berada pada tenaga kesehatan.",
    ]),
  );
  larik.push("");

  larik.push(baris(["REKAPITULASI"]));
  larik.push(baris(["Keterangan", "Jumlah"]));
  larik.push(baris(["Total anak terdaftar", ringkasan.totalAnak]));
  larik.push(baris(["Sudah ditimbang", ringkasan.sudahDiukur]));
  larik.push(baris(["Belum pernah ditimbang", ringkasan.belumDinilai]));
  larik.push(baris(["Status normal", ringkasan.distribusi.normal]));
  larik.push(baris(["Status perlu perhatian", ringkasan.distribusi.risiko]));
  larik.push(baris(["Status perlu segera diperiksa", ringkasan.distribusi.berat]));
  larik.push(baris(["Perlu ditindaklanjuti", ringkasan.prioritas.length]));
  larik.push(
    baris(["Berhenti datang menimbang", ringkasan.hilangDariPemantauan.length]),
  );
  larik.push("");

  larik.push(baris(["RINCIAN PER ANAK"]));
  larik.push(
    baris([
      "Nama",
      "Status gizi",
      "Tanggal terakhir ditimbang",
      "Jeda hari",
      "Nomor telepon",
      "Alasan tindak lanjut",
    ]),
  );

  for (const a of ringkasan.semuaAnak) {
    larik.push(
      baris([
        a.nama,
        labelStatus(a.status),
        a.tanggalTerakhir ?? "Belum pernah",
        // Jeda -1 menandakan anak belum pernah ditimbang, sehingga jedanya
        // tidak bermakna dan dikosongkan alih-alih ditampilkan sebagai angka.
        a.jedaHari >= 0 ? a.jedaHari : "",
        a.telepon ?? "",
        a.alasan.join("; "),
      ]),
    );
  }

  // Diakhiri baris baru agar berkas tidak terpotong pada sebagian pengolah.
  return `${larik.join("\r\n")}\r\n`;
}

/**
 * Menyusun nama berkas yang menyertakan wilayah dan tanggal.
 *
 * Bidan mengunduh laporan ini setiap bulan, sehingga nama berkas yang sama akan
 * saling menimpa di folder unduhan.
 */
export function namaBerkasLaporan(namaWilayah: string, tanggal: Date): string {
  const wilayah = namaWilayah
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `laporan-gizi-${wilayah || "posyandu"}-${tanggal.toISOString().slice(0, 10)}.csv`;
}
