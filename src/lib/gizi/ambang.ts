/**
 * Ambang batas dan batas kewajaran, terkumpul di satu tempat.
 *
 * Disatukan di sini agar tidak tersebar di dalam kode dan agar dapat diuji
 * sebagai satu sumber kebenaran.
 *
 * Ambang pola, yaitu berat tidak naik dan jeda menimbang, memang tercantum pada
 * PRD bagian "Ambang Batas Algoritma". Ambang Z-score di bawah tidak tercantum
 * di sana; rujukannya adalah WHO Child Growth Standards beserta pedoman
 * Kementerian Kesehatan secara langsung. Berkas ini sebelumnya menyatakan
 * seluruh nilainya dirujuk PRD, dan pernyataan itu tidak akurat.
 */

/**
 * Klasifikasi status gizi berdasarkan Z-score (standar WHO).
 *
 * Kedua sisi distribusi diklasifikasikan. Sisi bawah menandai kurang gizi,
 * pendek, dan kurus; sisi atas menandai gizi lebih dan obesitas.
 *
 * Sisi atas sebelumnya tidak ada sama sekali, sehingga anak dengan berat menurut
 * tinggi badan pada +4 SD dilaporkan sebagai normal. Itu kelalaian yang cukup
 * tampak: grafik pertumbuhan pada aplikasi ini sudah menggambar garis +2 SD,
 * sehingga bidan dapat melihat anak berada jauh di atasnya sementara status yang
 * tertulis di sebelahnya tetap normal.
 *
 * Ambang sisi atas hanya berlaku pada indikator berat menurut panjang atau
 * tinggi badan, dan pada indeks massa tubuh menurut umur bila kelak ditambahkan.
 * Berat menurut umur sengaja tidak dipakai untuk menilai gizi lebih, sebab anak
 * yang tinggi untuk usianya akan berat pula untuk usianya tanpa kelebihan lemak
 * apa pun. Panjang menurut umur juga tidak: anak yang tinggi bukan persoalan
 * gizi.
 */
export const AMBANG_Z = {
  /** Z >= -2 dan Z <= +2 dianggap normal. */
  normal: -2,
  /** -3 <= Z < -2 dianggap risiko/kurang. */
  risiko: -3,
  /** +2 < Z <= +3 dianggap gizi lebih. */
  lebih: 2,
  /** Z > +3 dianggap obesitas. */
  obesitas: 3,
} as const;

/**
 * Indikator yang dipakai menilai kelebihan gizi.
 *
 * Dibatasi pada berat menurut panjang dan berat menurut tinggi badan. Keduanya
 * membandingkan berat terhadap ukuran tubuh, sehingga kelebihannya memang
 * menunjukkan kelebihan lemak. Berat menurut umur tidak dapat membedakan anak
 * gemuk dari anak yang sekadar tinggi.
 */
export const INDIKATOR_GIZI_LEBIH = ["bb_pb", "bb_tb"] as const;

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
