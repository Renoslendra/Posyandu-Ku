/**
 * Deteksi pola pertumbuhan (FR-08) dan anak hilang dari pemantauan (FR-11).
 *
 * Seluruh perhitungan di sini deterministik. LLM tidak dilibatkan: ini
 * perbandingan numerik dan tanggal, bukan tugas bahasa. LLM hanya dipakai
 * untuk menarasikan hasil yang sudah dihitung modul ini.
 *
 * Versi 2.0 PRD menugaskan analisis pola kepada LLM. Penugasan itu dibalik
 * agar hasilnya dapat diuji dan direproduksi.
 */

import { AMBANG_POLA } from "./ambang";

export interface TitikPertumbuhan {
  tanggal: Date;
  beratKg: number;
  /** Nilai hasil ekstraksi AI yang belum dikonfirmasi tidak ikut dihitung. */
  dikonfirmasi?: boolean;
}

export type JenisPola =
  | "data_kurang"
  | "stagnan"
  | "menurun"
  | "naik"
  | "berfluktuasi";

export interface HasilPola {
  jenis: JenisPola;
  /** Jumlah kunjungan berurutan terakhir tanpa kenaikan berat. */
  beruntunTidakNaik: number;
  /** true bila memenuhi ambang stagnan dan perlu perhatian bidan. */
  perluPerhatian: boolean;
  pesan: string;
}

/**
 * Menganalisis pola berat badan dari riwayat pengukuran.
 *
 * Hanya nilai terkonfirmasi yang dihitung (FR-10.5), agar satu angka salah
 * baca dari foto tidak memicu peringatan palsu.
 */
export function analisisPola(riwayat: TitikPertumbuhan[]): HasilPola {
  const terpakai = riwayat
    .filter((t) => t.dikonfirmasi !== false)
    .slice()
    .sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());

  if (terpakai.length < AMBANG_POLA.minTitikTren) {
    return {
      jenis: "data_kurang",
      beruntunTidakNaik: 0,
      perluPerhatian: false,
      pesan: `Belum cukup data untuk menilai tren. Diperlukan minimal ${AMBANG_POLA.minTitikTren} kali pengukuran.`,
    };
  }

  const selisih: number[] = [];
  for (let i = 1; i < terpakai.length; i += 1) {
    selisih.push(terpakai[i].beratKg - terpakai[i - 1].beratKg);
  }

  // Menghitung dari kunjungan terbaru ke belakang: yang relevan adalah
  // kondisi saat ini, bukan pernah stagnan di masa lalu.
  let beruntun = 0;
  for (let i = selisih.length - 1; i >= 0; i -= 1) {
    if (selisih[i] <= AMBANG_POLA.beratTidakNaikKg) {
      beruntun += 1;
    } else {
      break;
    }
  }

  const stagnan = beruntun >= AMBANG_POLA.stagnanBerturut;
  const semuaNaik = selisih.every((d) => d > AMBANG_POLA.beratTidakNaikKg);
  const totalPerubahan = terpakai[terpakai.length - 1].beratKg - terpakai[0].beratKg;

  if (stagnan) {
    const menurun = selisih.slice(-beruntun).every((d) => d < 0);
    return {
      jenis: menurun ? "menurun" : "stagnan",
      beruntunTidakNaik: beruntun,
      perluPerhatian: true,
      pesan: menurun
        ? `Berat badan menurun pada ${beruntun} kali pengukuran terakhir. Perlu diperiksa bidan.`
        : `Berat badan tidak naik pada ${beruntun} kali pengukuran terakhir. Perlu diperiksa bidan.`,
    };
  }

  if (semuaNaik) {
    return {
      jenis: "naik",
      beruntunTidakNaik: 0,
      perluPerhatian: false,
      pesan: "Berat badan naik konsisten pada setiap pengukuran.",
    };
  }

  return {
    jenis: "berfluktuasi",
    beruntunTidakNaik: beruntun,
    perluPerhatian: false,
    pesan:
      totalPerubahan > 0
        ? "Berat badan naik secara keseluruhan meskipun tidak selalu naik setiap bulan."
        : "Berat badan naik-turun tanpa kenaikan bersih. Pantau pada kunjungan berikutnya.",
  };
}

export interface StatusPemantauan {
  hilang: boolean;
  jedaHari: number;
  pesan: string;
}

/**
 * Menentukan apakah anak hilang dari pemantauan (FR-11).
 *
 * Anak yang berhenti hadir tidak pernah terlihat pada pencatatan buku tulis,
 * karena yang tidak datang tidak ditulis. Sinyal ini hanya muncul setelah
 * data didigitalkan, dan justru sering menandai keluarga paling berisiko.
 */
export function statusPemantauan(
  kunjunganTerakhir: Date | null,
  sekarang: Date = new Date(),
): StatusPemantauan {
  if (!kunjunganTerakhir) {
    return {
      hilang: true,
      jedaHari: Infinity,
      pesan: "Belum pernah tercatat menimbang.",
    };
  }

  const jedaHari = Math.floor(
    (sekarang.getTime() - kunjunganTerakhir.getTime()) / (24 * 60 * 60 * 1000),
  );
  const hilang = jedaHari > AMBANG_POLA.hilangPemantauanHari;

  return {
    hilang,
    jedaHari,
    pesan: hilang
      ? `Tidak menimbang selama ${jedaHari} hari. Perlu dikunjungi kader.`
      : `Terakhir menimbang ${jedaHari} hari lalu.`,
  };
}
