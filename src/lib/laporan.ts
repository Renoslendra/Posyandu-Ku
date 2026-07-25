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
import { keTanggalIsoIndonesia } from "./tanggal";
import type { AnakPrioritas, RingkasanDashboard } from "./dashboard";

/**
 * Karakter yang membuat Excel dan LibreOffice memperlakukan bidang sebagai
 * rumus, bukan sebagai teks.
 */
const AWALAN_RUMUS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Membungkus satu nilai agar aman sebagai bidang CSV.
 *
 * Dua hal ditangani sekaligus.
 *
 * Pertama, pemisah bidang. Nama anak di Indonesia dapat memuat koma pada gelar
 * atau sebutan, dan tanpa pengutipan bidangnya akan bergeser sehingga seluruh
 * baris salah terbaca.
 *
 * Kedua, penyisipan rumus. Bidang yang dimulai dengan tanda sama dengan, tambah,
 * kurang, atau at akan dievaluasi Excel sebagai rumus saat berkas dibuka.
 * Pengutipan dengan tanda petik tidak menolongnya; Excel tetap mengevaluasi isi
 * bidang berkutip.
 *
 * Jalur seranganya melewati batas kepercayaan, dan itu sebabnya ini penting:
 * kader di satu posyandu mendaftarkan anak dengan nama yang memuat rumus,
 * kemudian bidan di wilayah yang sama mengunduh laporan dan membukanya di Excel.
 * Berkas itu lalu berpindah tangan ke staf dinas kesehatan. Nama anak diterima
 * apa adanya sepanjang panjangnya wajar, sebab menolak karakter tertentu akan
 * menghalangi pencatatan nama yang sah.
 *
 * Nilai berbahaya diawali kutip tunggal, cara baku yang dikenali Excel sebagai
 * penanda "perlakukan sebagai teks". Nilainya tetap terbaca utuh oleh manusia.
 */
export function bidangCsv(nilai: string | number | null): string {
  if (nilai === null || nilai === undefined) return "";

  let teks = String(nilai);

  /*
   * Bilangan dilewati tanpa penetralan.
   *
   * Z-score bernilai negatif adalah angka yang sah dan justru inti laporan ini,
   * misalnya -2,5. Menetralkannya akan mengubahnya menjadi teks di Excel,
   * sehingga kolomnya tidak dapat diurutkan maupun dijumlahkan, dan laporan
   * kehilangan gunanya. Bilangan tidak dapat memuat rumus, sehingga tidak ada
   * yang perlu dinetralkan.
   */
  const perluDinetralkan =
    typeof nilai === "string" && AWALAN_RUMUS.some((a) => teks.startsWith(a));

  if (perluDinetralkan) {
    teks = `'${teks}`;
  }

  if (/[",\r\n]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

function baris(kolom: (string | number | null)[]): string {
  return kolom.map(bidangCsv).join(",");
}

/**
 * Menerjemahkan status ke label yang dipahami pembaca laporan.
 *
 * Tanggal penimbangan terakhir menentukan label mana yang dipakai ketika status
 * kosong. Sebelumnya kosong selalu berarti "Belum ditimbang", sehingga label itu
 * muncul berdampingan dengan tanggal penimbangan yang nyata pada baris yang sama.
 * Status kosong pada anak yang sudah ditimbang berarti nilainya di luar rentang
 * tabel rujukan, dan itu perlu diperiksa, bukan diabaikan sebagai data kosong.
 */
function labelStatus(
  status: AnakPrioritas["status"],
  tanggalTerakhir: string | null,
): string {
  if (status) return LABEL_STATUS[status];
  return tanggalTerakhir ? "Tidak dapat dinilai" : "Belum ditimbang";
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
      keTanggalIsoIndonesia(konteks.tanggalCetak),
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
  /*
   * Baris ini dipisahkan dari "belum pernah ditimbang" supaya rekapitulasi dapat
   * dijumlahkan. Sebelumnya keduanya digabung, sehingga jumlah "sudah ditimbang"
   * dan "belum pernah ditimbang" tidak sama dengan total anak terdaftar, dan
   * staf dinas kesehatan yang memeriksanya akan meragukan seluruh laporan.
   */
  larik.push(baris(["Sudah ditimbang, status tidak dapat dinilai", ringkasan.tidakDapatDinilai]));
  larik.push(baris(["Status normal", ringkasan.distribusi.normal]));
  larik.push(baris(["Status perlu perhatian", ringkasan.distribusi.risiko]));
  larik.push(baris(["Status perlu segera diperiksa", ringkasan.distribusi.berat]));
  larik.push(baris(["Berat badan berlebih", ringkasan.distribusi.lebih]));
  larik.push(baris(["Berat badan sangat berlebih", ringkasan.distribusi.obesitas]));
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
        labelStatus(a.status, a.tanggalTerakhir),
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
  return `laporan-gizi-${wilayah || "posyandu"}-${keTanggalIsoIndonesia(tanggal)}.csv`;
}
