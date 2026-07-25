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
  setarakanPanjangTinggi,
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
  /**
   * Usia dalam bulan penuh, sebagaimana dicatat dan ditampilkan.
   *
   * Dipakai untuk memilih tabel yang berlaku dan memeriksa rentang layanan, dua
   * keputusan yang memang bekerja pada satuan bulan bulat.
   */
  usiaBulan: number;
  /**
   * Usia beserta pecahan bulan, untuk mencari titik referensi WHO.
   *
   * Bila tidak diberikan, `usiaBulan` yang dipakai. Perbedaannya besar pada bayi:
   * memakai bulan bulat berarti bayi berusia 27 hari dinilai terhadap referensi
   * usia nol bulan, dan pada bulan pertama selisih antar titik bulan mencapai
   * 2,5 SD. Biasnya searah, membuat anak tampak lebih baik daripada keadaannya,
   * sehingga kasus di ambang batas terlewat.
   */
  usiaBulanTepat?: number;
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

/**
 * Urutan keparahan untuk memilih status akhir di antara beberapa indikator.
 *
 * Kekurangan gizi ditempatkan di atas kelebihan pada tingkat yang setara.
 * Alasannya bukan bahwa kelebihan gizi tidak penting, melainkan bahwa keduanya
 * hampir tidak mungkin muncul bersamaan pada satu anak: berat menurut tinggi
 * tidak dapat sekaligus di bawah -2 dan di atas +2. Ketika perbandingan ini
 * terpakai, yang dibandingkan adalah indikator berbeda, dan pada keadaan itu
 * kekurangan gizi yang perlu tampil lebih dahulu karena dapat memburuk jauh
 * lebih cepat.
 */
const URUTAN_KEPARAHAN: Record<StatusGizi, number> = {
  normal: 0,
  lebih: 1,
  obesitas: 2,
  risiko: 3,
  berat: 4,
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

  /*
   * Pemilihan tabel memakai usia bulan penuh, pencarian titik memakai usia tepat.
   *
   * Pembedaan ini disengaja. Batas dua tahun antara tabel PB/U dan TB/U adalah
   * keputusan tentang cara ukur yang lazim, dan itu bekerja pada satuan bulan
   * bulat sebagaimana kader mencatatnya. Sedangkan pencarian titik referensi
   * adalah perhitungan, dan di situ pecahan bulan menentukan.
   */
  const usiaCari = masukan.usiaBulanTepat ?? usiaBulan;

  const indikatorBT = pilihIndikatorBeratTinggi(usiaBulan, diukurTelentang);
  const indikatorPU = pilihIndikatorPanjangUsia(usiaBulan);

  /*
   * Nilai disetarakan dengan tabel yang dipakai.
   *
   * Tabel panjang/tinggi menurut umur ditentukan usia, sehingga anak yang
   * diukur dengan cara tidak lazim bagi usianya perlu disesuaikan 0,7 cm
   * mengikuti ketentuan WHO. Tanpa itu, anak berusia dua tahun lebih yang
   * diukur telentang akan tampak lebih tinggi daripada kenyataannya, dan
   * stunting-nya terlewat.
   */
  const tinggiSetara = setarakanPanjangTinggi(tinggiCm, usiaBulan, diukurTelentang);

  const zBU = hitungZ(ambilTabel("bb_u", jenisKelamin), usiaCari, beratKg);
  const zTU = hitungZ(ambilTabel(indikatorPU, jenisKelamin), usiaCari, tinggiSetara);

  /*
   * Pada BB/PB dan BB/TB, pembandingnya panjang atau tinggi badan, bukan usia,
   * dan tabelnya dipilih menurut cara ukur. Karena kedua tabel WHO itu sendiri
   * sudah bergeser 0,7 cm satu terhadap lainnya, memakai tabel yang sesuai cara
   * ukur setara dengan menyetarakan nilai lalu memakai tabel yang lain.
   * Karena itu nilai asli yang dipakai di sini, bukan nilai setara.
   */
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
    const s = klasifikasi(z, indikator);

    /*
     * Z-score yang tidak dapat diklasifikasikan diperlakukan sebagai tidak
     * terhitung, bukan diabaikan. Keadaan ini seharusnya tidak terjadi karena
     * `hitungZ` sudah menolak nilai bukan angka, namun bila terjadi, hasilnya
     * harus muncul sebagai ketiadaan data dan bukan sebagai status normal.
     */
    if (s === null) {
      tidakTerhitung.push(indikator);
      continue;
    }

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
