/**
 * Perhitungan Z-score metode LMS (WHO Child Growth Standards, 0-5 tahun).
 *
 * Perhitungan sengaja dipisahkan dari data referensi:
 *   - modul ini berisi rumus dan interpolasi, dapat diuji sepenuhnya
 *   - modul `tabel.ts` berisi parameter L, M, S dari publikasi WHO
 *
 * LLM tidak pernah dilibatkan di sini. Seluruh angka dihitung deterministik
 * agar hasilnya dapat direproduksi dan diuji (lihat PRD, "Pembagian Peran
 * Kode dan LLM").
 */

import {
  AMBANG_Z,
  BATAS_USIA_PANJANG_BADAN_BULAN,
  INDIKATOR_GIZI_LEBIH,
} from "./ambang";

/**
 * Indikator antropometri WHO.
 *
 * WHO memisahkan panjang badan (telentang) dari tinggi badan (berdiri) karena
 * hasil keduanya berbeda sekitar 0,7 cm pada anak yang sama. Karena itu
 * pb_u dan tb_u adalah dua tabel berbeda, demikian pula bb_pb dan bb_tb.
 */
export type Indikator = "bb_u" | "pb_u" | "tb_u" | "bb_pb" | "bb_tb";
export type JenisKelamin = "L" | "P";
/**
 * Status gizi hasil penilaian.
 *
 * Kedua sisi distribusi diwakili. "risiko" dan "berat" menandai kekurangan,
 * "lebih" dan "obesitas" menandai kelebihan. Urutan penulisan di sini mengikuti
 * urutan dari kurang ke lebih, bukan urutan keparahan.
 */
export type StatusGizi = "berat" | "risiko" | "normal" | "lebih" | "obesitas";

/** Satu titik pada tabel referensi WHO. */
export interface TitikLMS {
  /** Nilai pembanding: usia dalam bulan, atau panjang/tinggi dalam cm. */
  x: number;
  /** Lambda — parameter kemiringan distribusi (Box-Cox power). */
  l: number;
  /** Mu — median populasi referensi. */
  m: number;
  /** Sigma — koefisien variasi. */
  s: number;
}

/**
 * Menghitung Z-score dari parameter LMS.
 *
 * Rumus WHO:
 *   L != 0 -> Z = ((nilai / M)^L - 1) / (L * S)
 *   L  = 0 -> Z = ln(nilai / M) / S
 *
 * Cabang L = 0 adalah bentuk limit dari rumus pertama, dipakai saat
 * distribusi tidak memerlukan transformasi Box-Cox.
 */
export function hitungZDariLMS(nilai: number, lms: Omit<TitikLMS, "x">): number {
  /*
   * Nilai bukan bilangan berhingga ditolak lebih dahulu, bukan dibiarkan
   * mengalir melalui perbandingan di bawahnya.
   *
   * Perbandingan `nilai <= 0` bernilai false untuk NaN, sehingga NaN pernah
   * lolos ke perhitungan dan menghasilkan Z-score NaN. Akibatnya berbahaya:
   * `klasifikasi(NaN)` mengembalikan "normal", sebab NaN juga tidak lebih kecil
   * daripada -2 maupun -3. Masukan yang tidak terbaca berubah menjadi kabar
   * baik yang keliru.
   */
  if (!Number.isFinite(nilai)) {
    throw new Error("Nilai pengukuran harus berupa angka");
  }
  if (nilai <= 0) {
    throw new Error("Nilai pengukuran harus lebih besar dari nol");
  }
  if (!Number.isFinite(lms.m) || !Number.isFinite(lms.s) || !Number.isFinite(lms.l)) {
    throw new Error("Parameter LMS harus berupa angka");
  }
  if (lms.m <= 0 || lms.s <= 0) {
    throw new Error("Parameter M dan S harus lebih besar dari nol");
  }

  const rasio = nilai / lms.m;

  /*
   * L dibandingkan terhadap ambang kecil, bukan terhadap nol persis.
   *
   * L pada tabel WHO berganti tanda di beberapa titik, dan karena parameter
   * diinterpolasi antar titik tabel, hasilnya dapat berupa bilangan sangat kecil
   * yang bukan nol. Membaginya menghasilkan angka yang tidak stabil, sedangkan
   * bentuk limit logaritmik justru tepat di daerah itu.
   */
  const z =
    Math.abs(lms.l) < 1e-7
      ? Math.log(rasio) / lms.s
      : (Math.pow(rasio, lms.l) - 1) / (lms.l * lms.s);

  return koreksiEkor(z, lms);
}

/**
 * Menerapkan koreksi WHO untuk Z-score di luar rentang tiga simpangan baku.
 *
 * Rumus LMS di atas mengandaikan distribusi yang tepat, dan andaian itu tidak
 * bertahan di ekor. Pada bagian terluar distribusi, rumus tersebut menghasilkan
 * angka yang meregang jauh melampaui keadaan sebenarnya, sehingga dua anak
 * dengan berat berbeda tipis dapat menerima Z-score yang berselisih besar.
 *
 * WHO karena itu mensyaratkan penggantian di luar tiga simpangan baku: jaraknya
 * diukur ulang memakai selisih antara dua titik acuan terluar, yaitu jarak
 * antara Z bernilai tiga dan Z bernilai dua pada sisi yang sama. Dengan begitu
 * ekornya dihitung dalam satuan yang nyata terlihat pada data, bukan dalam
 * satuan yang diandaikan rumus.
 *
 * Koreksi ini tidak menggeser satu pun ambang penapisan, sebab rumus koreksi dan
 * rumus dasar berpotongan tepat di Z bernilai tiga. Yang berubah adalah angka
 * yang dilaporkan bagi anak paling ekstrem, dan pada kasus terparah selisihnya
 * mencapai sekitar dua simpangan baku. Tanpa koreksi ini, angka yang ditampilkan
 * kepada bidan tidak sebanding dengan keluaran perangkat resmi WHO, dan
 * ketidaksebandingan itu akan terlihat justru pada anak yang paling perlu
 * dirujuk.
 *
 * Dijalankan di dalam `hitungZDariLMS`, bukan sebagai langkah terpisah yang
 * harus diingat pemanggil. Koreksi yang dapat terlupakan sama saja dengan
 * koreksi yang tidak ada.
 */
function koreksiEkor(z: number, lms: Omit<TitikLMS, "x">): number {
  if (!Number.isFinite(z)) return z;

  if (z > 3) {
    const sd3 = nilaiPadaZ(3, lms);
    const sd2 = nilaiPadaZ(2, lms);
    const jarak = sd3 - sd2;

    if (!(jarak > 0)) return z;
    return 3 + (nilaiPadaZ(z, lms) - sd3) / jarak;
  }

  if (z < -3) {
    const sd3 = nilaiPadaZ(-3, lms);
    const sd2 = nilaiPadaZ(-2, lms);
    const jarak = sd2 - sd3;

    if (!(jarak > 0)) return z;
    return -3 + (nilaiPadaZ(z, lms) - sd3) / jarak;
  }

  return z;
}

/**
 * Menghitung nilai ukur yang bersesuaian dengan satu Z-score tertentu.
 *
 * Kebalikan dari rumus LMS, dipakai koreksi ekor untuk menemukan dua titik acuan
 * terluarnya.
 */
function nilaiPadaZ(z: number, lms: Omit<TitikLMS, "x">): number {
  if (Math.abs(lms.l) < 1e-7) {
    return lms.m * Math.exp(lms.s * z);
  }
  return lms.m * Math.pow(1 + lms.l * lms.s * z, 1 / lms.l);
}

/**
 * Mengambil parameter LMS pada nilai x, dengan interpolasi linier bila x
 * berada di antara dua titik tabel.
 *
 * Tabel WHO tersedia per bulan penuh (usia) atau per 0,1 cm (panjang/tinggi),
 * sedangkan data lapangan sering berada di antaranya. Interpolasi linier
 * dipakai karena selisih antar titik tabel kecil sehingga galatnya dapat
 * diabaikan untuk keperluan penapisan.
 *
 * Nilai di luar rentang tabel tidak diekstrapolasi — mengembalikan null agar
 * pemanggil menanganinya secara eksplisit, bukan menghasilkan angka menyesatkan.
 */
export function ambilLMS(tabel: TitikLMS[], x: number): Omit<TitikLMS, "x"> | null {
  if (tabel.length === 0) return null;

  const pertama = tabel[0];
  const terakhir = tabel[tabel.length - 1];
  if (x < pertama.x || x > terakhir.x) return null;

  // Pencarian biner: tabel diasumsikan terurut naik menurut x.
  let bawah = 0;
  let atas = tabel.length - 1;

  while (atas - bawah > 1) {
    const tengah = Math.floor((bawah + atas) / 2);
    if (tabel[tengah].x === x) {
      const { l, m, s } = tabel[tengah];
      return { l, m, s };
    }
    if (tabel[tengah].x < x) {
      bawah = tengah;
    } else {
      atas = tengah;
    }
  }

  const kiri = tabel[bawah];
  const kanan = tabel[atas];

  if (kiri.x === x) return { l: kiri.l, m: kiri.m, s: kiri.s };
  if (kanan.x === x) return { l: kanan.l, m: kanan.m, s: kanan.s };

  const proporsi = (x - kiri.x) / (kanan.x - kiri.x);
  return {
    l: kiri.l + (kanan.l - kiri.l) * proporsi,
    m: kiri.m + (kanan.m - kiri.m) * proporsi,
    s: kiri.s + (kanan.s - kiri.s) * proporsi,
  };
}

/**
 * Menghitung Z-score terhadap sebuah tabel referensi.
 *
 * Mengembalikan null bila nilai berada di luar rentang tabel, dan juga bila
 * nilainya sendiri tidak dapat dihitung.
 *
 * Pilihan mengembalikan null alih-alih melempar dibuat karena fungsi ini
 * dipanggil dari peramban pada jalur tanpa sinyal, di tempat yang tidak
 * menangkap pengecualian. Pengecualian di sana akan menghentikan render dan
 * menghapus formulir yang sedang diisi kader, sedangkan null diteruskan sebagai
 * "tidak terhitung" yang memang sudah ditangani pemanggilnya.
 *
 * Yang penting adalah tidak pernah mengembalikan angka yang salah. Ketiadaan
 * hasil ditampilkan sebagai ketiadaan hasil, bukan sebagai status normal.
 */
export function hitungZ(
  tabel: TitikLMS[],
  x: number,
  nilai: number,
): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(nilai)) return null;

  const lms = ambilLMS(tabel, x);
  if (!lms) return null;

  try {
    const z = hitungZDariLMS(nilai, lms);
    return Number.isFinite(z) ? z : null;
  } catch {
    return null;
  }
}

/**
 * Mengklasifikasikan Z-score menjadi status gizi.
 *
 * Ambang mengikuti WHO. Sisi bawah: -2 SD memisahkan normal dari risiko, -3 SD
 * memisahkan risiko dari kondisi berat. Sisi atas: +2 SD memisahkan normal dari
 * gizi lebih, +3 SD memisahkan gizi lebih dari obesitas.
 *
 * Sisi atas hanya dinilai bila indikatornya membandingkan berat terhadap ukuran
 * tubuh, yaitu BB/PB dan BB/TB. Tanpa pembatasan itu, anak yang tinggi untuk
 * usianya akan ditandai gizi lebih pada BB/U tanpa kelebihan lemak apa pun, dan
 * anak yang tinggi akan ditandai bermasalah pada PB/U padahal tinggi bukan
 * persoalan gizi.
 *
 * Indikator sengaja dijadikan parameter wajib. Bila diberi nilai bawaan,
 * pemanggil yang lupa menyertakannya akan memperoleh penilaian yang tampak benar
 * namun tidak lengkap, dan itu jenis kekeliruan yang tidak menyatakan dirinya.
 */
export function klasifikasi(z: number, indikator: Indikator): StatusGizi | null {
  /*
   * Nilai bukan angka mengembalikan null, bukan "normal".
   *
   * Seluruh perbandingan di bawah bernilai false untuk NaN, sehingga fungsi ini
   * pernah menjatuhkan NaN ke cabang terakhir dan melaporkannya sebagai normal.
   * Ketiadaan hasil bukan pertanda baik, dan mengembalikan null memaksa
   * pemanggil menanganinya secara sadar.
   */
  if (!Number.isFinite(z)) return null;

  if (z < AMBANG_Z.risiko) return "berat";
  if (z < AMBANG_Z.normal) return "risiko";

  if (menilaiGiziLebih(indikator)) {
    if (z > AMBANG_Z.obesitas) return "obesitas";
    if (z > AMBANG_Z.lebih) return "lebih";
  }

  return "normal";
}

/** Apakah indikator ini dipakai menilai kelebihan gizi. */
export function menilaiGiziLebih(indikator: Indikator): boolean {
  return (INDIKATOR_GIZI_LEBIH as readonly string[]).includes(indikator);
}

/**
 * Menentukan indikator berat menurut panjang/tinggi badan yang berlaku.
 *
 * WHO memakai dua tabel berbeda: BB/PB untuk pengukuran telentang (umumnya
 * usia di bawah 24 bulan) dan BB/TB untuk pengukuran berdiri. Keduanya bukan
 * satu indikator, sehingga pemilihannya harus eksplisit.
 */
export function pilihIndikatorBeratTinggi(
  usiaBulan: number,
  diukurTelentang: boolean,
): "bb_pb" | "bb_tb" {
  if (diukurTelentang) return "bb_pb";
  if (usiaBulan < BATAS_USIA_PANJANG_BADAN_BULAN) return "bb_pb";
  return "bb_tb";
}

/**
 * Menentukan tabel panjang/tinggi menurut umur yang berlaku.
 *
 * WHO memakai dua tabel: PB/U untuk panjang badan telentang, dan TB/U untuk
 * tinggi badan berdiri. Selisih keduanya sekitar 0,7 cm pada usia yang sama,
 * sehingga pemilihannya tidak boleh disamakan.
 *
 * Tabel yang berlaku ditentukan **usia**, bukan cara ukur. Alasannya teknis dan
 * penting: tabel PB/U hanya mencakup 0 sampai 24 bulan, sedangkan TB/U mencakup
 * 24 sampai 60 bulan. Bila cara ukur yang menentukan, anak berusia 30 bulan yang
 * diukur telentang akan dinilai dengan tabel PB/U yang tidak memuat usianya,
 * sehingga Z-score panjang badannya tidak terhitung sama sekali.
 *
 * Kesalahan itu pernah ada di sini, dan akibatnya paling buruk pada kasus yang
 * justru ingin ditemukan: anak berusia di atas dua tahun yang pendek namun
 * beratnya proporsional akan keluar sebagai normal, karena satu-satunya
 * indikator yang dapat melihat stunting-nya tidak dihitung. Balita yang belum
 * mau berdiri tegak rutin diukur telentang di posyandu, dan formulir memang
 * menyediakan pilihannya.
 *
 * Ketidaksesuaian cara ukur ditangani dengan penyetaraan nilai pada
 * `setarakanPanjangTinggi`, bukan dengan berpindah tabel.
 */
export function pilihIndikatorPanjangUsia(
  usiaBulan: number,
): "pb_u" | "tb_u" {
  if (usiaBulan < BATAS_USIA_PANJANG_BADAN_BULAN) return "pb_u";
  return "tb_u";
}

/**
 * Selisih baku antara panjang badan telentang dan tinggi badan berdiri.
 *
 * WHO menetapkan 0,7 cm. Pengukuran telentang selalu menghasilkan angka lebih
 * besar karena tulang belakang tidak tertekan bobot tubuh.
 */
export const SELISIH_TELENTANG_BERDIRI_CM = 0.7;

/**
 * Menyetarakan nilai ukur dengan tabel yang akan dipakai.
 *
 * WHO mensyaratkan penyesuaian bila cara ukur tidak sesuai usia anak:
 * kurangi 0,7 cm bila anak berusia dua tahun atau lebih namun diukur telentang,
 * dan tambahkan 0,7 cm bila anak di bawah dua tahun namun diukur berdiri.
 *
 * Tanpa penyesuaian ini, anak yang diukur dengan cara yang tidak lazim bagi
 * usianya akan dinilai terhadap referensi yang salah. Arah galatnya tidak
 * simetris: anak besar yang diukur telentang tampak lebih tinggi daripada
 * kenyataannya, sehingga stunting terlewat. Itu kesalahan yang berbahaya.
 *
 * Mengembalikan nilai apa adanya bila cara ukurnya sudah sesuai usia.
 */
export function setarakanPanjangTinggi(
  nilaiCm: number,
  usiaBulan: number,
  diukurTelentang: boolean,
): number {
  const seharusnyaTelentang = usiaBulan < BATAS_USIA_PANJANG_BADAN_BULAN;

  if (diukurTelentang === seharusnyaTelentang) return nilaiCm;

  return diukurTelentang
    ? nilaiCm - SELISIH_TELENTANG_BERDIRI_CM
    : nilaiCm + SELISIH_TELENTANG_BERDIRI_CM;
}

/**
 * Menghitung usia dalam bulan penuh pada tanggal pengukuran.
 *
 * Memakai selisih kalender, bukan pembagian hari, agar sejalan dengan cara
 * usia dicatat di posyandu ("umur 13 bulan", bukan "13,4 bulan").
 *
 * Komponen tanggal dibaca dengan getter UTC, bukan getter waktu lokal.
 *
 * Ini bukan pilihan gaya. Sepanjang aplikasi, tanggal dibentuk dari teks
 * `YYYY-MM-DD` dengan menambahkan penanda UTC, misalnya `2025-03-01T00:00:00Z`.
 * Bila komponennya kemudian dibaca dengan getter waktu lokal, hasilnya bergantung
 * pada zona waktu proses yang menjalankannya: pada zona waktu di sebelah barat
 * Greenwich, tanggal bergeser ke hari sebelumnya dan usia yang dihitung berbeda
 * satu bulan. Perbedaan satu bulan menggeser titik referensi WHO, dan pada bayi
 * pergeseran itu cukup untuk mengubah status gizinya.
 *
 * Sebelumnya kebenaran fungsi ini bergantung pada kebetulan bahwa server berjalan
 * di UTC dan penggunanya berada di zona waktu positif. Dengan getter UTC,
 * hasilnya sama di mana pun kode ini dijalankan.
 */
export function usiaBulan(tanggalLahir: Date, tanggalUkur: Date): number {
  let bulan =
    (tanggalUkur.getUTCFullYear() - tanggalLahir.getUTCFullYear()) * 12 +
    (tanggalUkur.getUTCMonth() - tanggalLahir.getUTCMonth());

  /*
   * Kepenuhan bulan diperiksa terhadap hari ulang bulan, bukan terhadap angka
   * tanggalnya.
   *
   * Sebelumnya perbandingannya `tanggalUkur.getUTCDate() < tanggalLahir.getUTCDate()`,
   * dan itu keliru bagi anak yang lahir pada tanggal 29, 30, atau 31. Anak yang
   * lahir 31 Januari dan diukur 28 Februari dihitung berusia nol bulan, sebab 28
   * lebih kecil daripada 31, padahal Februari tidak memiliki tanggal 31 sehingga
   * hari ulang bulannya memang 28 Februari. Anak yang lahir 31 Maret dan diukur
   * 30 April mengalami hal yang sama.
   *
   * Akibatnya bukan sekadar selisih sehari pada tampilan. Usia yang kurang satu
   * bulan menggeser titik referensi WHO, dan pada bayi pergeseran itu cukup
   * untuk mengubah status gizinya.
   */
  if (tanggalUkur.getTime() < tambahBulan(tanggalLahir, bulan).getTime()) {
    bulan -= 1;
  }
  return bulan;
}

/**
 * Menambahkan sejumlah bulan ke satu tanggal, dengan tanggal akhir bulan dijaga.
 *
 * `Date.UTC` meluapkan tanggal yang tidak ada: 31 Februari menjadi 3 Maret.
 * Luapan itu merusak perhitungan usia, sebab hari ulang bulan bagi anak yang
 * lahir tanggal 31 akan melewati tanggal pengukuran, dan pecahan bulannya
 * menjadi negatif. Anak yang lahir 31 Januari dan diukur 1 Maret pernah
 * menghasilkan usia satu bulan penuh berdampingan dengan pecahan 0,93.
 *
 * Bila tanggal asal tidak ada pada bulan tujuan, dipakai hari terakhir bulan itu.
 * Jadi anak yang lahir 31 Januari berulang bulan pada 28 atau 29 Februari,
 * sebagaimana lazim dipahami.
 */
function tambahBulan(tanggal: Date, bulan: number): Date {
  const tahunTujuan = tanggal.getUTCFullYear();
  const bulanTujuan = tanggal.getUTCMonth() + bulan;
  const hariAsal = tanggal.getUTCDate();

  // Tanggal nol pada bulan berikutnya adalah hari terakhir bulan tujuan.
  const hariTerakhir = new Date(Date.UTC(tahunTujuan, bulanTujuan + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(tahunTujuan, bulanTujuan, Math.min(hariAsal, hariTerakhir)),
  );
}

/**
 * Menghitung usia dalam bulan beserta pecahannya, untuk keperluan perhitungan.
 *
 * Fungsi di atas membulatkan ke bawah ke bulan penuh, dan itu benar untuk
 * dicatat serta ditampilkan: kader dan orang tua berbicara dalam "umur 13
 * bulan", bukan "13,4 bulan". Namun memakai angka bulat itu untuk mencari titik
 * referensi WHO menimbulkan galat yang jauh lebih besar daripada yang diduga.
 *
 * Bayi berusia 27 hari dinilai terhadap referensi usia nol bulan. Pada bulan
 * pertama, selisih Z-score antara dua titik bulan berdekatan mencapai 2,1 SD
 * pada berat menurut umur dan 2,5 SD pada panjang menurut umur, sebab
 * pertumbuhan paling cepat justru di awal kehidupan. Biasnya selalu searah:
 * anak yang diukur menjelang akhir bulan usianya dinilai terhadap referensi
 * anak yang lebih muda, sehingga tampak lebih baik daripada keadaan sebenarnya.
 * Untuk alat penapisan, arah itu yang paling merugikan, sebab kasus di ambang
 * batas terlewat. Pengaruhnya menyusut di bawah 0,25 SD setelah usia dua tahun.
 *
 * Pecahannya dihitung dari sisa hari dibagi panjang bulan yang sedang dijalani,
 * bukan dari pembagian dengan panjang bulan rata-rata. Cara itu menjaga agar
 * nilainya tepat bilangan bulat pada hari ulang bulan, sehingga sejalan dengan
 * usia yang dicatat dan ditampilkan.
 *
 * Tabel tidak perlu diganti: interpolasi pada `hitungZ` sudah mendukung nilai
 * antar titik, dan itu memang alasan interpolasi itu ada.
 */
export function usiaBulanTepat(tanggalLahir: Date, tanggalUkur: Date): number {
  const bulanPenuh = usiaBulan(tanggalLahir, tanggalUkur);

  if (!Number.isFinite(bulanPenuh)) return bulanPenuh;

  /*
   * Tanggal saat anak tepat berusia `bulanPenuh` bulan, yaitu hari ulang bulan
   * terakhir yang sudah terlewati, dan hari ulang bulan berikutnya.
   */
  const ulangBulan = tambahBulan(tanggalLahir, bulanPenuh);
  const ulangBulanBerikut = tambahBulan(tanggalLahir, bulanPenuh + 1);

  const HARI_MS = 24 * 60 * 60 * 1000;
  const lewat = (tanggalUkur.getTime() - ulangBulan.getTime()) / HARI_MS;
  const panjangBulan =
    (ulangBulanBerikut.getTime() - ulangBulan.getTime()) / HARI_MS;

  if (!(panjangBulan > 0) || !Number.isFinite(lewat)) return bulanPenuh;

  return bulanPenuh + lewat / panjangBulan;
}

/** Membulatkan Z-score ke 2 desimal untuk penyimpanan dan tampilan. */
export function bulatkanZ(z: number): number {
  return Math.round(z * 100) / 100;
}
