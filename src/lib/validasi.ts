/**
 * Skema validasi yang dipakai bersama klien dan server.
 *
 * Satu definisi dipakai di kedua sisi agar aturan tidak terduplikasi dan tidak
 * bisa berbeda diam-diam. Validasi di server tetap wajib: validasi klien hanya
 * demi kenyamanan, bukan pengamanan (NFR-03.4).
 */

import { z } from "zod";
import { BATAS_WAJAR } from "./gizi/ambang";

export const jenisKelaminSchema = z.enum(["L", "P"]);

/**
 * Memastikan tanggal benar-benar ada di kalender.
 *
 * `Date.parse` menerima tanggal yang tidak ada dan menggulirkannya, misalnya
 * "2024-02-31" menjadi 2 Maret. Pemeriksaan ini membandingkan hasil parse
 * dengan angka aslinya agar penggulingan tersebut tertolak.
 */
function tanggalAdaDiKalender(v: string): boolean {
  const [tahun, bulan, hari] = v.split("-").map(Number);
  const d = new Date(Date.UTC(tahun, bulan - 1, hari));
  return (
    d.getUTCFullYear() === tahun &&
    d.getUTCMonth() === bulan - 1 &&
    d.getUTCDate() === hari
  );
}

/** Tanggal dalam format ISO (YYYY-MM-DD), tidak boleh melewati hari ini. */
const tanggalTidakDiMasaDepan = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus berformat YYYY-MM-DD")
  .refine(tanggalAdaDiKalender, "Tanggal tidak ada di kalender")
  .refine((v) => {
    // Toleransi satu hari agar perbedaan zona waktu antara perangkat kader
    // dan server tidak menolak pengukuran yang dicatat hari ini.
    const t = new Date(`${v}T23:59:59Z`);
    return t.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
  }, "Tanggal tidak boleh melewati hari ini");

export const anakBaruSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama anak minimal 2 huruf")
    .max(100, "Nama anak terlalu panjang"),
  tanggalLahir: tanggalTidakDiMasaDepan,
  jenisKelamin: jenisKelaminSchema,
  namaOrangTua: z
    .string()
    .trim()
    .min(2, "Nama orang tua minimal 2 huruf")
    .max(100, "Nama orang tua terlalu panjang"),
  // Nomor telepon Indonesia, menerima format 08xx maupun +628xx.
  telepon: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor telepon tidak dikenali")
    .optional()
    .or(z.literal("")),
  alamat: z.string().trim().max(200).optional().or(z.literal("")),
});

export type AnakBaru = z.infer<typeof anakBaruSchema>;

export const pengukuranBaruSchema = z.object({
  anakId: z.string().uuid("ID anak tidak valid"),
  tanggal: tanggalTidakDiMasaDepan,
  beratKg: z
    .number({ invalid_type_error: "Berat badan harus berupa angka" })
    .min(BATAS_WAJAR.beratKgMin, `Berat minimal ${BATAS_WAJAR.beratKgMin} kg`)
    .max(BATAS_WAJAR.beratKgMaks, `Berat maksimal ${BATAS_WAJAR.beratKgMaks} kg`),
  tinggiCm: z
    .number({ invalid_type_error: "Tinggi badan harus berupa angka" })
    .min(BATAS_WAJAR.tinggiCmMin, `Tinggi minimal ${BATAS_WAJAR.tinggiCmMin} cm`)
    .max(BATAS_WAJAR.tinggiCmMaks, `Tinggi maksimal ${BATAS_WAJAR.tinggiCmMaks} cm`),
  diukurTelentang: z.boolean().default(false),
  /**
   * Penanda dari klien untuk sinkronisasi offline. Dipakai sebagai kunci
   * idempoten agar pengiriman ulang antrean tidak menghasilkan data ganda.
   */
  klienRef: z.string().trim().max(80).optional(),
  /** Kader menyetujui nilai yang sudah ditandai penjaga kualitas data. */
  abaikanPenanda: z.boolean().default(false),
});

export type PengukuranBaru = z.infer<typeof pengukuranBaruSchema>;

/** Satu baris hasil ekstraksi foto buku tulis, sebelum dikonfirmasi kader. */
export const barisEkstraksiSchema = z.object({
  nama: z.string().trim().min(1).max(100),
  beratKg: z.number().nullable(),
  tinggiCm: z.number().nullable(),
  tanggal: z.string().nullable(),
});

export const hasilEkstraksiSchema = z.object({
  baris: z.array(barisEkstraksiSchema).max(50),
});

export type BarisEkstraksi = z.infer<typeof barisEkstraksiSchema>;

/**
 * Skema baris hasil pembacaan foto yang sudah diperiksa kader dan siap disimpan.
 *
 * Berbeda dari `barisEkstraksiSchema` yang mengizinkan nilai kosong: pada tahap
 * penyimpanan, berat, tinggi, dan tanggal wajib terisi. Baris yang angkanya
 * tidak terbaca tidak boleh ikut disimpan sebagai nilai kosong, karena nilai
 * kosong pada rekam pertumbuhan tidak dapat dibedakan dari anak yang memang
 * tidak ditimbang.
 *
 * Batas kewajaran nilainya tidak ditegakkan di sini melainkan oleh penjaga
 * kualitas data, agar aturannya hanya ada di satu tempat.
 */
export const barisImportSiapSchema = z.object({
  nama: z.string().trim().min(1, "Nama anak wajib terisi").max(100),
  beratKg: z.number({ invalid_type_error: "Berat wajib berupa angka" }).positive(),
  tinggiCm: z.number({ invalid_type_error: "Tinggi wajib berupa angka" }).positive(),
  tanggal: tanggalTidakDiMasaDepan,
  diukurTelentang: z.boolean().optional(),
  /**
   * Pilihan anak dari kader, dipakai ketika pencocokan nama tidak menghasilkan
   * satu jawaban. Bila terisi, pilihan kader selalu diutamakan.
   */
  anakId: z.string().uuid().optional(),
});

export const barisImportSchema = z.object({
  baris: z
    .array(barisImportSiapSchema)
    .min(1, "Tidak ada baris yang siap disimpan")
    .max(50, "Maksimal 50 baris sekali simpan"),
});

export type BarisImportSiap = z.infer<typeof barisImportSiapSchema>;

/** Menyusun pesan galat pertama menjadi teks yang dapat ditampilkan. */
export function pesanGalatPertama(galat: z.ZodError): string {
  return galat.errors[0]?.message ?? "Data yang dikirim tidak valid";
}
