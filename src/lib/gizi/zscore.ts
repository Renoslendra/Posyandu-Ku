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

import { AMBANG_Z, BATAS_USIA_PANJANG_BADAN_BULAN } from "./ambang";

/**
 * Indikator antropometri WHO.
 *
 * WHO memisahkan panjang badan (telentang) dari tinggi badan (berdiri) karena
 * hasil keduanya berbeda sekitar 0,7 cm pada anak yang sama. Karena itu
 * pb_u dan tb_u adalah dua tabel berbeda, demikian pula bb_pb dan bb_tb.
 */
export type Indikator = "bb_u" | "pb_u" | "tb_u" | "bb_pb" | "bb_tb";
export type JenisKelamin = "L" | "P";
export type StatusGizi = "normal" | "risiko" | "berat";

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
  if (nilai <= 0) {
    throw new Error("Nilai pengukuran harus lebih besar dari nol");
  }
  if (lms.m <= 0 || lms.s <= 0) {
    throw new Error("Parameter M dan S harus lebih besar dari nol");
  }

  const rasio = nilai / lms.m;

  if (lms.l === 0) {
    return Math.log(rasio) / lms.s;
  }
  return (Math.pow(rasio, lms.l) - 1) / (lms.l * lms.s);
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

/** Menghitung Z-score terhadap sebuah tabel referensi. */
export function hitungZ(
  tabel: TitikLMS[],
  x: number,
  nilai: number,
): number | null {
  const lms = ambilLMS(tabel, x);
  if (!lms) return null;
  return hitungZDariLMS(nilai, lms);
}

/**
 * Mengklasifikasikan Z-score menjadi status gizi.
 *
 * Ambang mengikuti WHO: -2 SD memisahkan normal dari risiko, -3 SD memisahkan
 * risiko dari kondisi berat.
 */
export function klasifikasi(z: number): StatusGizi {
  if (z < AMBANG_Z.risiko) return "berat";
  if (z < AMBANG_Z.normal) return "risiko";
  return "normal";
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
 * Sama seperti berat menurut panjang/tinggi, WHO memakai dua tabel: PB/U untuk
 * pengukuran telentang dan TB/U untuk pengukuran berdiri. Selisih keduanya
 * sekitar 0,7 cm pada usia yang sama, sehingga pemilihannya tidak boleh
 * disamakan.
 */
export function pilihIndikatorPanjangUsia(
  usiaBulan: number,
  diukurTelentang: boolean,
): "pb_u" | "tb_u" {
  if (diukurTelentang) return "pb_u";
  if (usiaBulan < BATAS_USIA_PANJANG_BADAN_BULAN) return "pb_u";
  return "tb_u";
}

/**
 * Menghitung usia dalam bulan penuh pada tanggal pengukuran.
 *
 * Memakai selisih kalender, bukan pembagian hari, agar sejalan dengan cara
 * usia dicatat di posyandu ("umur 13 bulan", bukan "13,4 bulan").
 */
export function usiaBulan(tanggalLahir: Date, tanggalUkur: Date): number {
  let bulan =
    (tanggalUkur.getFullYear() - tanggalLahir.getFullYear()) * 12 +
    (tanggalUkur.getMonth() - tanggalLahir.getMonth());

  // Bulan belum penuh bila tanggal ukur belum melewati tanggal lahir.
  if (tanggalUkur.getDate() < tanggalLahir.getDate()) {
    bulan -= 1;
  }
  return bulan;
}

/** Membulatkan Z-score ke 2 desimal untuk penyimpanan dan tampilan. */
export function bulatkanZ(z: number): number {
  return Math.round(z * 100) / 100;
}
