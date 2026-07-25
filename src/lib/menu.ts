/**
 * Saran menu harian berbahan lokal (FR-03.3 sampai FR-03.6).
 *
 * Pembagian peran sama seperti fitur LLM lainnya: bahan, harga, dan total biaya
 * berasal dari daftar tetap di dalam kode, sedangkan LLM hanya menyusun cara
 * memasak dan kalimatnya.
 *
 * Alasan harga tidak diserahkan ke LLM: model akan mengarang angka rupiah yang
 * terdengar masuk akal namun tidak dapat dipertanggungjawabkan. Menu yang
 * biayanya salah akan membuat orang tua gagal berbelanja, dan itu kegagalan
 * yang lebih merugikan daripada tidak ada saran sama sekali.
 */

import { panggilTeks } from "./llm";
import type { StatusGizi } from "./gizi/zscore";

export interface Bahan {
  nama: string;
  /** Takaran untuk satu hari, satu anak. */
  takaran: string;
  /** Perkiraan harga pasar desa dalam rupiah. */
  hargaRp: number;
  /** Alasan bahan ini dipilih, ditampilkan ke orang tua. */
  manfaat: string;
}

/**
 * Daftar bahan pangan lokal beserta perkiraan harga.
 *
 * Dipilih dengan syarat: tersedia di warung atau pasar desa, murah, dan tidak
 * memerlukan pendingin untuk penyimpanan sehari.
 *
 * Harga bersifat perkiraan tahun 2026 dan ditandai demikian pada antarmuka.
 * Pada penerapan nyata, harga perlu disesuaikan per wilayah.
 */
const BAHAN: Record<string, Bahan> = {
  tempe: {
    nama: "Tempe",
    takaran: "1 potong sedang (50 g)",
    hargaRp: 2500,
    manfaat: "protein dan zat besi",
  },
  telur: {
    nama: "Telur ayam",
    takaran: "1 butir",
    hargaRp: 2800,
    manfaat: "protein lengkap dan lemak untuk pertumbuhan",
  },
  ikanTeri: {
    nama: "Ikan teri kering",
    takaran: "1 sendok makan (15 g)",
    hargaRp: 2000,
    manfaat: "kalsium untuk tulang",
  },
  hati: {
    nama: "Hati ayam",
    takaran: "1 potong kecil (30 g)",
    hargaRp: 3500,
    manfaat: "zat besi, mencegah anemia",
  },
  bayam: {
    nama: "Bayam",
    takaran: "1 ikat kecil",
    hargaRp: 2000,
    manfaat: "zat besi dan vitamin A",
  },
  kangkung: {
    nama: "Kangkung",
    takaran: "1 ikat kecil",
    hargaRp: 2000,
    manfaat: "vitamin dan serat",
  },
  wortel: {
    nama: "Wortel",
    takaran: "1 buah kecil",
    hargaRp: 1500,
    manfaat: "vitamin A untuk mata",
  },
  beras: {
    nama: "Beras",
    takaran: "1 gelas (untuk bubur atau nasi tim)",
    hargaRp: 3000,
    manfaat: "sumber tenaga",
  },
  pisang: {
    nama: "Pisang",
    takaran: "1 buah",
    hargaRp: 2000,
    manfaat: "tenaga dan kalium, mudah dicerna",
  },
  kelapa: {
    nama: "Santan kelapa",
    takaran: "2 sendok makan",
    hargaRp: 1500,
    manfaat: "lemak untuk menambah kalori",
  },
  kacangHijau: {
    nama: "Kacang hijau",
    takaran: "2 sendok makan",
    hargaRp: 2000,
    manfaat: "protein dan serat",
  },
};

export interface Menu {
  waktu: string;
  hidangan: string;
  bahan: Bahan[];
}

export interface SaranMenu {
  menu: Menu[];
  totalBiayaRp: number;
  catatanGizi: string[];
  /** true bila cara memasak disusun template, bukan LLM. */
  dariFallback: boolean;
  narasi?: string;
}

/**
 * Menyusun kerangka menu menurut status gizi dan usia.
 *
 * Anak berstatus berat mendapat menu berkalori dan berprotein lebih tinggi,
 * dengan penambahan santan sebagai cara termurah menaikkan kalori tanpa
 * menambah volume makanan, yang penting bagi anak yang sulit makan.
 *
 * Bayi di bawah 6 bulan tidak mendapat saran menu: pemberian makan pada usia
 * tersebut adalah wilayah air susu ibu, dan saran makanan justru berbahaya.
 */
export function kerangkaMenu(
  status: StatusGizi,
  usiaBulan: number,
): { menu: Menu[]; catatan: string[] } | null {
  if (usiaBulan < 6) return null;

  const b = BAHAN;
  const lunak = usiaBulan < 12;

  // Menu dasar untuk anak dengan status normal.
  if (status === "normal") {
    return {
      menu: [
        {
          waktu: "Pagi",
          hidangan: lunak ? "Bubur beras dengan telur" : "Nasi tim telur dan bayam",
          bahan: [b.beras, b.telur, b.bayam],
        },
        {
          waktu: "Selingan",
          hidangan: "Pisang dilumatkan",
          bahan: [b.pisang],
        },
        {
          waktu: "Siang",
          hidangan: lunak
            ? "Bubur tempe dan wortel"
            : "Nasi dengan tempe dan tumis wortel",
          bahan: [b.tempe, b.wortel],
        },
        {
          waktu: "Malam",
          hidangan: lunak ? "Bubur ikan teri" : "Nasi dengan ikan teri dan kangkung",
          bahan: [b.ikanTeri, b.kangkung],
        },
      ],
      catatan: [
        "Menu ini menjaga pertumbuhan yang sudah baik.",
        "Berikan makan 3 kali sehari ditambah 1 kali selingan.",
      ],
    };
  }

  // Status risiko: protein ditambah, hati ayam masuk untuk zat besi.
  if (status === "risiko") {
    return {
      menu: [
        {
          waktu: "Pagi",
          hidangan: lunak
            ? "Bubur beras dengan telur dan santan"
            : "Nasi tim telur, bayam, sedikit santan",
          bahan: [b.beras, b.telur, b.bayam, b.kelapa],
        },
        {
          waktu: "Selingan",
          hidangan: "Bubur kacang hijau",
          bahan: [b.kacangHijau],
        },
        {
          waktu: "Siang",
          hidangan: lunak ? "Bubur hati ayam dan wortel" : "Nasi, hati ayam, wortel",
          bahan: [b.hati, b.wortel],
        },
        {
          waktu: "Selingan",
          hidangan: "Pisang",
          bahan: [b.pisang],
        },
        {
          waktu: "Malam",
          hidangan: lunak
            ? "Bubur tempe dan ikan teri"
            : "Nasi, tempe, ikan teri, kangkung",
          bahan: [b.tempe, b.ikanTeri, b.kangkung],
        },
      ],
      catatan: [
        "Porsi protein ditambah karena berat badan perlu dinaikkan.",
        "Berikan makan 3 kali sehari ditambah 2 kali selingan.",
        "Santan menambah kalori tanpa menambah banyak volume makanan.",
      ],
    };
  }

  // Status berat: kalori dan protein paling tinggi, porsi kecil tapi sering.
  return {
    menu: [
      {
        waktu: "Pagi",
        hidangan: lunak
          ? "Bubur beras, telur, santan"
          : "Nasi tim telur dengan santan dan bayam",
        bahan: [b.beras, b.telur, b.kelapa, b.bayam],
      },
      {
        waktu: "Selingan 1",
        hidangan: "Bubur kacang hijau dengan santan",
        bahan: [b.kacangHijau, b.kelapa],
      },
      {
        waktu: "Siang",
        hidangan: lunak ? "Bubur hati ayam dan wortel" : "Nasi, hati ayam, wortel",
        bahan: [b.hati, b.wortel],
      },
      {
        waktu: "Selingan 2",
        hidangan: "Pisang dilumatkan",
        bahan: [b.pisang],
      },
      {
        waktu: "Malam",
        hidangan: lunak
          ? "Bubur tempe, telur, ikan teri"
          : "Nasi, tempe, telur, ikan teri",
        bahan: [b.tempe, b.telur, b.ikanTeri],
      },
    ],
    catatan: [
      "Berikan porsi kecil tetapi sering, 5 sampai 6 kali sehari.",
      "Anak dengan kondisi ini perlu diperiksa bidan atau puskesmas. Menu ini pelengkap, bukan pengganti pemeriksaan.",
      "Bila anak menolak makan atau tampak lemas, segera bawa ke puskesmas.",
    ],
  };
}

/** Menjumlahkan biaya seluruh bahan, tanpa menghitung bahan yang sama dua kali. */
export function hitungBiaya(menu: Menu[]): number {
  const dipakai = new Map<string, number>();
  for (const m of menu) {
    for (const b of m.bahan) {
      // Bahan yang muncul di beberapa waktu makan tetap dibeli sekali,
      // sehingga harganya tidak dijumlahkan berulang.
      dipakai.set(b.nama, b.hargaRp);
    }
  }
  return [...dipakai.values()].reduce((jumlah, harga) => jumlah + harga, 0);
}

/** Mengumpulkan daftar bahan belanja beserta harganya. */
export function daftarBelanja(menu: Menu[]): Bahan[] {
  const peta = new Map<string, Bahan>();
  for (const m of menu) {
    for (const b of m.bahan) peta.set(b.nama, b);
  }
  return [...peta.values()];
}

const PERINTAH_SISTEM = `Anda membantu orang tua di desa di Indonesia memasak makanan bergizi untuk anaknya.

Aturan yang wajib dipatuhi:
1. Gunakan HANYA bahan yang disebutkan. Jangan menambah bahan lain.
2. Jangan menyebut harga atau angka biaya. Biaya sudah dihitung sistem.
3. Jangan memberi nasihat medis atau dosis obat.
4. Tulis cara memasak yang sangat sederhana, alat masak terbatas.
5. Bahasa Indonesia sederhana, kalimat pendek, tanpa istilah gizi yang rumit.
6. Maksimal 4 paragraf pendek.

Tulis dengan nada hangat namun tidak berlebihan.`;

/**
 * Menyusun narasi cara memasak dengan LLM.
 *
 * Menu, bahan, dan biaya sudah ditentukan sebelum fungsi ini dipanggil, jadi
 * kegagalan LLM hanya menghilangkan narasinya, bukan sarannya.
 */
export async function susunSaranMenu(
  status: StatusGizi,
  usiaBulan: number,
): Promise<SaranMenu | null> {
  const kerangka = kerangkaMenu(status, usiaBulan);
  if (!kerangka) return null;

  const totalBiayaRp = hitungBiaya(kerangka.menu);

  const daftarBahan = daftarBelanja(kerangka.menu)
    .map((b) => `${b.nama} (${b.takaran})`)
    .join(", ");

  const ringkasMenu = kerangka.menu
    .map((m) => `${m.waktu}: ${m.hidangan}`)
    .join("\n");

  const hasil = await panggilTeks(
    [
      { role: "system", content: PERINTAH_SISTEM },
      {
        role: "user",
        content: `Anak berusia ${usiaBulan} bulan.

Menu yang sudah ditentukan:
${ringkasMenu}

Bahan yang tersedia: ${daftarBahan}

Tuliskan cara memasak menu di atas dengan langkah sederhana.`,
      },
    ],
    { maksToken: 600 },
  );

  return {
    menu: kerangka.menu,
    totalBiayaRp,
    catatanGizi: kerangka.catatan,
    dariFallback: !hasil.ok,
    narasi: hasil.ok ? hasil.teks : undefined,
  };
}
