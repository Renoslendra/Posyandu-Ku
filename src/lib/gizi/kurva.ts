/**
 * Kurva referensi WHO untuk grafik pertumbuhan.
 *
 * Grafik pertumbuhan tanpa garis referensi tidak dapat dibaca: angka 9 kg
 * bermakna berbeda pada usia 12 bulan dan 36 bulan. Garis -3, -2, 0, dan +2 SD
 * memberi konteks yang membuat posisi anak terlihat langsung.
 *
 * Nilai dihitung dari tabel LMS yang sama dengan mesin Z-score, sehingga garis
 * pada grafik tidak mungkin berbeda dari klasifikasi status.
 */

import { ambilTabel } from "./tabel";
import type { Indikator, JenisKelamin } from "./zscore";

/** Garis SD yang ditampilkan. Dipilih seperlunya agar grafik tetap terbaca. */
export const GARIS_SD = [-3, -2, 0, 2] as const;

export type TitikKurva = {
  x: number;
} & Record<string, number>;

/** Mengubah Z-score menjadi nilai pengukuran, kebalikan rumus LMS. */
function nilaiPadaZ(lms: { l: number; m: number; s: number }, z: number): number {
  if (lms.l === 0) return lms.m * Math.exp(lms.s * z);
  return lms.m * Math.pow(1 + lms.l * lms.s * z, 1 / lms.l);
}

/**
 * Menyusun titik kurva referensi untuk satu indikator.
 *
 * Keluarannya berbentuk satu senarai objek agar dapat langsung dipakai Recharts
 * sebagai sumber beberapa garis sekaligus.
 */
export function kurvaReferensi(
  indikator: Indikator,
  jenisKelamin: JenisKelamin,
  batas?: { min: number; maks: number },
): TitikKurva[] {
  const tabel = ambilTabel(indikator, jenisKelamin);

  return tabel
    .filter((p) => !batas || (p.x >= batas.min && p.x <= batas.maks))
    .map((p) => {
      const titik: TitikKurva = { x: p.x };
      for (const sd of GARIS_SD) {
        // Kunci "sd_3n" untuk -3 SD, "sd_0" untuk median, "sd_2p" untuk +2 SD.
        const kunci = sd === 0 ? "sd_0" : `sd_${Math.abs(sd)}${sd < 0 ? "n" : "p"}`;
        titik[kunci] = Math.round(nilaiPadaZ(p, sd) * 10) / 10;
      }
      return titik;
    });
}

/** Label garis untuk keterangan grafik. */
export const LABEL_GARIS: Record<string, string> = {
  sd_3n: "-3 SD",
  sd_2n: "-2 SD",
  sd_0: "Median",
  sd_2p: "+2 SD",
};

/**
 * Warna garis referensi.
 *
 * Garis -2 dan -3 SD memakai warna status agar sejalan dengan lencana pada
 * antarmuka lain: pembaca tidak perlu mempelajari dua sistem warna.
 */
export const WARNA_GARIS: Record<string, string> = {
  sd_3n: "#b91c1c",
  sd_2n: "#b45309",
  sd_0: "#94a3b8",
  sd_2p: "#94a3b8",
};

export interface TitikAnak {
  x: number;
  nilai: number;
}

/**
 * Menggabungkan kurva referensi dengan titik pengukuran anak.
 *
 * Titik anak disisipkan ke baris x yang sesuai bila ada, atau ditambahkan
 * sebagai baris baru bila usianya berada di antara titik tabel. Hasilnya
 * diurutkan agar garis tergambar berurutan.
 */
export function gabungkanDenganDataAnak(
  kurva: TitikKurva[],
  titikAnak: TitikAnak[],
): Array<TitikKurva & { anak?: number }> {
  const peta = new Map<number, TitikKurva & { anak?: number }>();

  for (const titik of kurva) peta.set(titik.x, { ...titik });

  for (const t of titikAnak) {
    const adaId = peta.get(t.x);
    if (adaId) {
      adaId.anak = t.nilai;
    } else {
      peta.set(t.x, { x: t.x, anak: t.nilai } as TitikKurva & { anak?: number });
    }
  }

  return [...peta.values()].sort((a, b) => a.x - b.x);
}
