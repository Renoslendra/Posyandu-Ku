/**
 * Penyusun data dashboard bidan.
 *
 * Agregasi dilakukan di server, bukan di peramban, agar dashboard tetap ringan
 * pada koneksi lambat. Yang dikirim ke klien hanya angka ringkasan dan daftar
 * prioritas, bukan seluruh riwayat pengukuran.
 *
 * Seluruh perhitungan deterministik. LLM baru dipakai pada tahap penarasian.
 */

import { AMBANG_POLA } from "./gizi/ambang";
import { analisisPola, statusPemantauan } from "./gizi/pola";
import type { StatusGizi } from "./gizi/zscore";

export interface BarisPengukuran {
  anak_id: string;
  tanggal: string;
  berat_kg: number | string;
  status: StatusGizi | null;
  dikonfirmasi: boolean;
}

export interface BarisAnak {
  id: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: "L" | "P";
  /** Nomor telepon orang tua, bila kader mencatatnya. */
  telepon?: string | null;
}

export interface AnakPrioritas {
  id: string;
  nama: string;
  status: StatusGizi | null;
  alasan: string[];
  jedaHari: number;
  tanggalTerakhir: string | null;
  /**
   * Nomor telepon orang tua, bila ada.
   *
   * Disertakan agar daftar anak yang berhenti hadir dapat langsung
   * ditindaklanjuti. Tanpa nomor, daftar itu hanya dapat dilihat, tidak
   * dikerjakan.
   */
  telepon: string | null;
}

export interface RingkasanDashboard {
  totalAnak: number;
  /** Anak yang punya pengukuran terkonfirmasi. */
  sudahDiukur: number;
  distribusi: Record<StatusGizi, number>;
  belumDinilai: number;
  /** Anak dengan status berat, pola bermasalah, atau berhenti hadir. */
  prioritas: AnakPrioritas[];
  hilangDariPemantauan: AnakPrioritas[];
  /**
   * Seluruh anak, untuk penyaringan status dan pencarian nama (FR-02.4, FR-02.5).
   *
   * Dikirim utuh ke klien agar penyaringan berlangsung tanpa perjalanan ke
   * server. Pada volume satu posyandu jumlahnya ratusan baris, masih ringan.
   * Bila kelak mencakup ribuan anak, penyaringan perlu dipindah ke kueri.
   */
  semuaAnak: AnakPrioritas[];
}

/**
 * Menyusun ringkasan dari data mentah.
 *
 * Dipisahkan dari lapisan basis data agar dapat diuji tanpa koneksi Supabase.
 */
export function susunRingkasan(
  daftarAnak: BarisAnak[],
  pengukuran: BarisPengukuran[],
  sekarang: Date = new Date(),
): RingkasanDashboard {
  // Hanya nilai terkonfirmasi yang dihitung. Hasil ekstraksi AI yang belum
  // disetujui kader tidak boleh mempengaruhi statistik (FR-10.5).
  const terkonfirmasi = pengukuran.filter((p) => p.dikonfirmasi);

  const perAnak = new Map<string, BarisPengukuran[]>();
  for (const p of terkonfirmasi) {
    const daftar = perAnak.get(p.anak_id) ?? [];
    daftar.push(p);
    perAnak.set(p.anak_id, daftar);
  }
  for (const daftar of perAnak.values()) {
    daftar.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }

  const distribusi: Record<StatusGizi, number> = { normal: 0, risiko: 0, berat: 0 };
  let belumDinilai = 0;
  const prioritas: AnakPrioritas[] = [];
  const hilang: AnakPrioritas[] = [];
  const semua: AnakPrioritas[] = [];

  for (const anak of daftarAnak) {
    const riwayat = perAnak.get(anak.id) ?? [];
    const terakhir = riwayat.at(-1) ?? null;

    if (!terakhir || terakhir.status === null) {
      belumDinilai += 1;
    } else {
      distribusi[terakhir.status] += 1;
    }

    const pemantauan = statusPemantauan(
      terakhir ? new Date(`${terakhir.tanggal}T00:00:00Z`) : null,
      sekarang,
    );

    const pola = analisisPola(
      riwayat.map((p) => ({
        tanggal: new Date(`${p.tanggal}T00:00:00Z`),
        beratKg: Number(p.berat_kg),
      })),
    );

    const alasan: string[] = [];
    if (terakhir?.status === "berat") alasan.push("Status gizi perlu segera diperiksa");
    if (terakhir?.status === "risiko") alasan.push("Status gizi perlu perhatian");
    if (pola.perluPerhatian) alasan.push(pola.pesan);
    if (pemantauan.hilang) alasan.push(pemantauan.pesan);

    const entri: AnakPrioritas = {
      id: anak.id,
      nama: anak.nama,
      status: terakhir?.status ?? null,
      alasan,
      jedaHari: Number.isFinite(pemantauan.jedaHari) ? pemantauan.jedaHari : -1,
      tanggalTerakhir: terakhir?.tanggal ?? null,
      telepon: anak.telepon ?? null,
    };

    semua.push(entri);
    if (pemantauan.hilang) hilang.push(entri);
    if (alasan.length > 0) prioritas.push(entri);
  }

  // Urutan prioritas: status terburuk lebih dulu, lalu yang paling lama
  // tidak menimbang. Bidan membaca dari atas dan berhenti kapan pun.
  const bobot: Record<string, number> = { berat: 3, risiko: 2 };
  prioritas.sort((a, b) => {
    const selisih = (bobot[b.status ?? ""] ?? 1) - (bobot[a.status ?? ""] ?? 1);
    if (selisih !== 0) return selisih;
    return b.jedaHari - a.jedaHari;
  });

  hilang.sort((a, b) => b.jedaHari - a.jedaHari);

  // Daftar lengkap diurutkan menurut nama agar kader dan bidan dapat
  // menyusurinya seperti membaca buku absen posyandu.
  semua.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return {
    totalAnak: daftarAnak.length,
    sudahDiukur: perAnak.size,
    distribusi,
    belumDinilai,
    prioritas,
    hilangDariPemantauan: hilang,
    semuaAnak: semua,
  };
}

/** Pilihan penyaringan status pada dashboard. */
export type SaringStatus = "semua" | StatusGizi | "belum";

/**
 * Menyaring daftar anak menurut status gizi dan pencarian nama (FR-02.4, FR-02.5).
 *
 * Dipisahkan dari komponen antarmuka agar dapat diuji tanpa merender React.
 *
 * Pencarian mengabaikan besar kecil huruf dan spasi di ujung, karena kader
 * mengetik di ponsel dan papan tombol sering menambahkan spasi otomatis.
 */
export function saringAnak(
  daftar: AnakPrioritas[],
  saring: SaringStatus,
  cari: string,
): AnakPrioritas[] {
  const kata = cari.trim().toLowerCase();

  return daftar.filter((a) => {
    if (saring === "belum") {
      if (a.status !== null) return false;
    } else if (saring !== "semua") {
      if (a.status !== saring) return false;
    }

    if (kata.length > 0 && !a.nama.toLowerCase().includes(kata)) return false;
    return true;
  });
}

/** Ambang jeda kunjungan yang dipakai, untuk ditampilkan di antarmuka. */
export const AMBANG_HILANG_HARI = AMBANG_POLA.hilangPemantauanHari;
