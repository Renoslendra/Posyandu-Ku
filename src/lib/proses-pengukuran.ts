/**
 * Pemroses pengukuran: dari data mentah kader menjadi baris siap simpan.
 *
 * Urutan langkahnya disengaja:
 *   1. penjaga kualitas data — menangkap salah catat lebih dulu
 *   2. hitung Z-score       — hanya untuk nilai yang lolos
 *   3. klasifikasi status   — dari indikator terburuk
 *
 * Perhitungan tidak boleh berjalan pada nilai yang mustahil, karena hasilnya
 * akan tampak meyakinkan padahal salah.
 */

import { kodePenanda, periksaPengukuran, type Temuan } from "./gizi/penjaga-data";
import { nilaiPengukuran, type HasilPenilaian } from "./gizi/tabel";
import { usiaBulan, type JenisKelamin } from "./gizi/zscore";

export interface MasukanProses {
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  tanggal: string;
  beratKg: number;
  tinggiCm: number;
  diukurTelentang: boolean;
}

export interface PengukuranSebelumnyaProses {
  beratKg: number;
  tinggiCm: number;
  tanggal: string;
}

export type HasilProses =
  | { ok: false; temuan: Temuan[]; usiaBulan: number | null }
  | {
      ok: true;
      usiaBulan: number;
      penilaian: HasilPenilaian;
      penanda: string[];
      temuan: Temuan[];
    };

/**
 * Memproses satu pengukuran.
 *
 * Mengembalikan `ok: false` bila ada temuan yang menolak. Temuan bertingkat
 * "tandai" tidak menghalangi penyimpanan, tetapi ikut dikembalikan agar
 * antarmuka dapat meminta konfirmasi kader.
 */
export function prosesPengukuran(
  masukan: MasukanProses,
  sebelumnya?: PengukuranSebelumnyaProses,
): HasilProses {
  const tglLahir = new Date(`${masukan.tanggalLahir}T00:00:00Z`);
  const tglUkur = new Date(`${masukan.tanggal}T00:00:00Z`);

  if (Number.isNaN(tglLahir.getTime()) || Number.isNaN(tglUkur.getTime())) {
    return {
      ok: false,
      usiaBulan: null,
      temuan: [
        {
          kode: "tanggal_tidak_valid",
          tingkat: "tolak",
          pesan: "Tanggal lahir atau tanggal pengukuran tidak valid.",
        },
      ],
    };
  }

  const usia = usiaBulan(tglLahir, tglUkur);

  const pemeriksaan = periksaPengukuran(
    {
      beratKg: masukan.beratKg,
      tinggiCm: masukan.tinggiCm,
      usiaBulan: usia,
      tanggal: tglUkur,
    },
    sebelumnya
      ? {
          beratKg: sebelumnya.beratKg,
          tinggiCm: sebelumnya.tinggiCm,
          tanggal: new Date(`${sebelumnya.tanggal}T00:00:00Z`),
        }
      : undefined,
  );

  if (!pemeriksaan.bolehDisimpan) {
    return { ok: false, temuan: pemeriksaan.temuan, usiaBulan: usia };
  }

  const penilaian = nilaiPengukuran({
    jenisKelamin: masukan.jenisKelamin,
    usiaBulan: usia,
    beratKg: masukan.beratKg,
    tinggiCm: masukan.tinggiCm,
    diukurTelentang: masukan.diukurTelentang,
  });

  return {
    ok: true,
    usiaBulan: usia,
    penilaian,
    penanda: kodePenanda(pemeriksaan),
    temuan: pemeriksaan.temuan,
  };
}

/** Label status untuk ditampilkan kepada pengguna. */
export const LABEL_STATUS = {
  normal: "Normal",
  risiko: "Perlu perhatian",
  berat: "Perlu segera diperiksa",
} as const;

/** Kelas warna latar untuk tiap status. Kontras tinggi (NFR-02.4). */
export const KELAS_STATUS = {
  normal: "bg-status-normal text-white",
  risiko: "bg-status-risiko text-white",
  berat: "bg-status-berat text-white",
} as const;
