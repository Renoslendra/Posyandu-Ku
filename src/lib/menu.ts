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
  /** Takaran untuk satu kali hidang, satu anak. */
  takaran: string;
  /** Perkiraan harga pasar desa dalam rupiah, untuk satu takaran di atas. */
  hargaRp: number;
  /** Alasan bahan ini dipilih, ditampilkan ke orang tua. */
  manfaat: string;
  /**
   * Apakah harga bahan ini dijumlahkan setiap kali muncul di menu.
   *
   * Ada dua macam bahan, dan membedakannya menentukan benar tidaknya total
   * biaya. Beras dan sayur dibeli dalam satuan yang cukup untuk beberapa kali
   * makan, sehingga satu takaran melayani seluruh hari. Telur dan santan
   * berbeda: satu butir telur pada menu pagi dan satu butir lagi pada menu
   * malam berarti dua butir yang harus dibeli.
   *
   * Sebelumnya seluruh bahan diperlakukan sebagai jenis pertama, sehingga total
   * biaya lebih rendah daripada belanja sebenarnya. Total yang salah membuat
   * orang tua datang ke pasar dengan uang yang tidak cukup, dan itu justru
   * kegagalan yang paling merugikan dari fitur ini.
   */
  perHidangan?: boolean;
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
    takaran: "1 butir setiap kali hidang",
    hargaRp: 2800,
    manfaat: "protein lengkap dan lemak untuk pertumbuhan",
    perHidangan: true,
  },
  ikanTeri: {
    nama: "Ikan teri kering",
    takaran: "1 sendok makan (15 g)",
    hargaRp: 2000,
    manfaat: "kalsium untuk tulang",
  },
  hati: {
    nama: "Hati ayam",
    takaran: "1 potong kecil (30 g), 2 kali seminggu",
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
    takaran: "2 sendok makan setiap kali hidang",
    hargaRp: 1500,
    manfaat: "lemak untuk menambah kalori",
    perHidangan: true,
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
/**
 * Catatan keselamatan yang menyertai setiap saran menu.
 *
 * Ketiga hal di bawah sebelumnya tidak dinyatakan sama sekali, padahal masing
 * masing dapat merugikan anak.
 *
 * Pertama, seluruh menu memuat telur dan ikan, dua bahan yang paling sering
 * menimbulkan reaksi alergi pada anak. Aplikasi ini tidak menyimpan riwayat
 * alergi, sehingga tidak mungkin menyaringnya. Yang dapat dilakukan adalah
 * menyatakannya, agar orang tua yang sudah pernah melihat reaksi tidak
 * menganggap saran ini menggugurkan pengalamannya sendiri.
 *
 * Kedua, saran ini menyertai air susu ibu, bukan menggantikannya. Menu empat
 * sampai lima kali makan sehari tanpa satu pun penyebutan air susu ibu dapat
 * dibaca sebagai pengganti, dan itu kekeliruan yang merugikan pada usia di
 * bawah dua tahun.
 *
 * Ketiga, ikan teri kering diawetkan dengan garam. Anjuran umum adalah tidak
 * menambahkan garam pada makanan bayi di bawah satu tahun, sehingga untuk
 * kelompok itu teri perlu direndam lebih dahulu.
 */
function catatanKeselamatan(lunak: boolean): string[] {
  const catatan = [
    "Menu ini menyertai air susu ibu, bukan menggantikannya. Teruskan menyusui sampai anak berusia 2 tahun.",
    "Bila anak pernah bengkak, gatal, atau mencret setelah makan telur atau ikan, hentikan bahan itu dan tanyakan kepada bidan.",
  ];

  if (lunak) {
    catatan.push(
      "Rendam ikan teri dalam air hangat lalu buang airnya, agar garamnya berkurang. Jangan menambahkan garam pada makanan bayi di bawah 1 tahun.",
    );
  }

  return catatan;
}

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
        ...catatanKeselamatan(lunak),
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
          hidangan: lunak
            ? "Bubur hati ayam dan wortel (2 kali seminggu), hari lain ganti tempe"
            : "Nasi, hati ayam, wortel (2 kali seminggu), hari lain ganti tempe",
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
        ...catatanKeselamatan(lunak),
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
        hidangan: lunak
          ? "Bubur hati ayam dan wortel (2 kali seminggu), hari lain ganti tempe"
          : "Nasi, hati ayam, wortel (2 kali seminggu), hari lain ganti tempe",
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
      ...catatanKeselamatan(lunak),
    ],
  };
}

/** Menjumlahkan biaya seluruh bahan, tanpa menghitung bahan yang sama dua kali. */
export function hitungBiaya(menu: Menu[]): number {
  let jumlah = 0;

  for (const [, b] of hitungKemunculan(menu)) {
    /*
     * Bahan yang dibeli dalam satuan besar dihitung sekali, sedangkan bahan yang
     * dikonsumsi per hidangan dikalikan jumlah kemunculannya. Satu takaran beras
     * melayani beberapa kali makan; satu butir telur tidak.
     */
    jumlah += b.bahan.perHidangan ? b.bahan.hargaRp * b.jumlah : b.bahan.hargaRp;
  }

  return jumlah;
}

/**
 * Mengumpulkan daftar bahan belanja beserta harganya.
 *
 * Bahan yang dikonsumsi per hidangan disertai banyaknya, agar takaran yang
 * tertulis di daftar belanja sesuai dengan total biaya yang ditampilkan.
 */
export function daftarBelanja(menu: Menu[]): Bahan[] {
  const hasil: Bahan[] = [];

  for (const [, b] of hitungKemunculan(menu)) {
    if (b.bahan.perHidangan && b.jumlah > 1) {
      hasil.push({
        ...b.bahan,
        takaran: `${b.bahan.takaran}, untuk ${b.jumlah} kali hidang`,
        hargaRp: b.bahan.hargaRp * b.jumlah,
      });
    } else {
      hasil.push(b.bahan);
    }
  }

  return hasil;
}

/** Menghitung berapa kali setiap bahan muncul di seluruh menu sehari. */
function hitungKemunculan(menu: Menu[]) {
  const peta = new Map<string, { bahan: Bahan; jumlah: number }>();

  for (const m of menu) {
    for (const b of m.bahan) {
      const ada = peta.get(b.nama);
      if (ada) ada.jumlah += 1;
      else peta.set(b.nama, { bahan: b, jumlah: 1 });
    }
  }

  return peta;
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
