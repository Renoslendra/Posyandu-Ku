/**
 * Ambang batas dan batas kewajaran, terkumpul di satu tempat.
 *
 * Nilai-nilai ini dirujuk PRD bagian "Ambang Batas Algoritma". Disatukan di
 * sini agar tidak tersebar di dalam kode dan agar dapat diuji sebagai satu
 * sumber kebenaran.
 */

/** Klasifikasi status gizi berdasarkan Z-score (standar WHO). */
export const AMBANG_Z = {
  /** Z >= -2 dianggap normal. */
  normal: -2,
  /** -3 <= Z < -2 dianggap risiko/kurang. */
  risiko: -3,
} as const;

/** Batas kewajaran nilai pengukuran. Di luar rentang ini nilai ditolak. */
export const BATAS_WAJAR = {
  beratKgMin: 0.5,
  beratKgMaks: 30,
  tinggiCmMin: 30,
  tinggiCmMaks: 130,
  usiaBulanMin: 0,
  usiaBulanMaks: 60,
} as const;

/** Ambang deteksi pola pertumbuhan. */
export const AMBANG_POLA = {
  /** Kenaikan berat <= nilai ini dianggap tidak naik (kg). */
  beratTidakNaikKg: 0,
  /** Jumlah pengukuran berurutan tanpa kenaikan agar disebut stagnan. */
  stagnanBerturut: 2,
  /** Jumlah titik data minimum sebelum tren layak dianalisis. */
  minTitikTren: 3,
  /** Jeda kunjungan (hari) sebelum anak disebut hilang dari pemantauan. */
  hilangPemantauanHari: 90,
  /** Kenaikan berat dalam sebulan yang dianggap perlu diperiksa (kg). */
  lonjakanBeratKg: 2,
} as const;

/**
 * Batas usia pemakaian panjang badan (telentang) menurut WHO.
 * Di bawah 24 bulan memakai tabel BB/PB, 24 bulan ke atas memakai BB/TB.
 */
export const BATAS_USIA_PANJANG_BADAN_BULAN = 24;
