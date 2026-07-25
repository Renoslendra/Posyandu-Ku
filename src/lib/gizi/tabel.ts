/**
 * Tabel referensi WHO Child Growth Standards (0-5 tahun) dan penilaian gizi
 * satu pengukuran.
 *
 * Data LMS berasal dari paket R resmi WHO
 * (github.com/WorldHealthOrganization/anthro, data-raw/growthstandards),
 * diunduh dan dipadatkan oleh `scripts/unduh-tabel-who.mjs`.
 *
 * Data di-commit ke repositori, bukan diunduh saat build, agar nilai yang
 * dipakai dapat ditinjau lewat riwayat perubahan dan agar proses build tidak
 * bergantung pada jaringan.
 */

import tabelMentah from "./tabel-who.json";
import {
  bulatkanZ,
  hitungZ,
  klasifikasi,
  pilihIndikatorBeratTinggi,
  pilihIndikatorPanjangUsia,
  type Indikator,
  type JenisKelamin,
  type StatusGizi,
  type TitikLMS,
} from "./zscore";

type TabelWHO = Record<Indikator, Record<JenisKelamin, TitikLMS[]>>;

const TABEL = tabelMentah as unknown as TabelWHO;

export function ambilTabel(
  indikator: Indikator,
  jenisKelamin: JenisKelamin,
): TitikLMS[] {
  return TABEL[indikator][jenisKelamin];
}

export interface MasukanPenilaian {
  jenisKelamin: JenisKelamin;
  usiaBulan: number;
  beratKg: number;
  tinggiCm: number;
  /** true bila diukur telentang (panjang badan). Menentukan tabel BB/PB. */
  diukurTelentang: boolean;
}

export interface HasilPenilaian {
  zBeratUsia: number | null;
  zTinggiUsia: number | null;
  zBeratTinggi: number | null;
  /** Indikator berat/tinggi yang dipakai: bb_pb atau bb_tb. */
  indikatorBeratTinggi: "bb_pb" | "bb_tb";
  /** Indikator panjang/tinggi menurut usia yang dipakai: pb_u atau tb_u. */
  indikatorPanjangUsia: "pb_u" | "tb_u";
  /** Status terburuk di antara indikator yang berhasil dihitung. */
  status: StatusGizi | null;
  /** Indikator yang menghasilkan status terburuk. */
  penentuStatus: Indikator | null;
  /** Indikator yang tidak dapat dihitung karena nilai di luar rentang tabel. */
  tidakTerhitung: Indikator[];
}

const URUTAN_KEPARAHAN: Record<StatusGizi, number> = {
  normal: 0,
  risiko: 1,
  berat: 2,
};

/**
 * Menilai satu pengukuran terhadap tiga indikator WHO sekaligus.
 *
 * Status akhir mengambil kondisi terburuk di antara indikator yang berhasil
 * dihitung. Alasannya: seorang anak dapat berstatus normal pada BB/U namun
 * berat pada TB/U, dan yang perlu ditindaklanjuti adalah temuan terburuknya.
 *
 * Indikator di luar rentang tabel dilaporkan pada `tidakTerhitung`, bukan
 * diperlakukan sebagai normal. Ketiadaan data bukan pertanda baik.
 */
export function nilaiPengukuran(masukan: MasukanPenilaian): HasilPenilaian {
  const { jenisKelamin, usiaBulan, beratKg, tinggiCm, diukurTelentang } = masukan;

  const indikatorBT = pilihIndikatorBeratTinggi(usiaBulan, diukurTelentang);
  const indikatorPU = pilihIndikatorPanjangUsia(usiaBulan, diukurTelentang);

  const zBU = hitungZ(ambilTabel("bb_u", jenisKelamin), usiaBulan, beratKg);
  const zTU = hitungZ(ambilTabel(indikatorPU, jenisKelamin), usiaBulan, tinggiCm);
  // Pada BB/PB dan BB/TB, pembandingnya panjang/tinggi badan, bukan usia.
  const zBT = hitungZ(ambilTabel(indikatorBT, jenisKelamin), tinggiCm, beratKg);

  const terhitung: Array<{ indikator: Indikator; z: number }> = [];
  const tidakTerhitung: Indikator[] = [];

  if (zBU !== null) terhitung.push({ indikator: "bb_u", z: zBU });
  else tidakTerhitung.push("bb_u");

  if (zTU !== null) terhitung.push({ indikator: indikatorPU, z: zTU });
  else tidakTerhitung.push(indikatorPU);

  if (zBT !== null) terhitung.push({ indikator: indikatorBT, z: zBT });
  else tidakTerhitung.push(indikatorBT);

  let status: StatusGizi | null = null;
  let penentuStatus: Indikator | null = null;

  for (const { indikator, z } of terhitung) {
    const s = klasifikasi(z);
    if (status === null || URUTAN_KEPARAHAN[s] > URUTAN_KEPARAHAN[status]) {
      status = s;
      penentuStatus = indikator;
    }
  }

  return {
    zBeratUsia: zBU === null ? null : bulatkanZ(zBU),
    zTinggiUsia: zTU === null ? null : bulatkanZ(zTU),
    zBeratTinggi: zBT === null ? null : bulatkanZ(zBT),
    indikatorBeratTinggi: indikatorBT,
    indikatorPanjangUsia: indikatorPU,
    status,
    penentuStatus,
    tidakTerhitung,
  };
}

/** Label indikator untuk ditampilkan ke pengguna. */
export const LABEL_INDIKATOR: Record<Indikator, string> = {
  bb_u: "Berat badan menurut umur",
  pb_u: "Panjang badan menurut umur",
  tb_u: "Tinggi badan menurut umur",
  bb_pb: "Berat badan menurut panjang badan",
  bb_tb: "Berat badan menurut tinggi badan",
};

/** Istilah klinis yang tepat untuk temuan pada tiap indikator. */
export const ISTILAH_TEMUAN: Record<Indikator, string> = {
  bb_u: "berat badan kurang (underweight)",
  pb_u: "pendek (stunting)",
  tb_u: "pendek (stunting)",
  bb_pb: "gizi kurang (wasting)",
  bb_tb: "gizi kurang (wasting)",
};
