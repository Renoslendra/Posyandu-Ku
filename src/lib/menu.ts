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
function catatanKeselamatan(lunak: boolean, adaHati = false): string[] {
  const catatan = [
    "Menu ini menyertai air susu ibu, bukan menggantikannya. Teruskan menyusui sampai anak berusia 2 tahun.",
    "Bila anak pernah bengkak, gatal, atau mencret setelah makan telur atau ikan, hentikan bahan itu dan tanyakan kepada bidan.",
  ];

  /*
   * Anjuran pengganti hari lain diletakkan di catatan, bukan di nama hidangan.
   *
   * Nama hidangan pernah memuat "hari lain ganti tempe", dan itu menembus
   * penyaringan alergi: penyaring bekerja pada daftar bahan, sehingga tempe
   * hilang dari daftar belanja sementara namanya tetap tertulis di hidangan yang
   * dibaca orang tua. Bahan yang dihindari tidak boleh disebut di mana pun.
   */
  if (adaHati) {
    catatan.push(
      "Hati ayam cukup 2 kali seminggu. Hati sangat kaya vitamin A, dan berlebihan setiap hari tidak baik bagi balita. Pada hari lainnya, ganti dengan lauk berprotein lain yang tersedia.",
    );
  }

  if (lunak) {
    catatan.push(
      "Rendam ikan teri dalam air hangat lalu buang airnya, agar garamnya berkurang. Jangan menambahkan garam pada makanan bayi di bawah 1 tahun.",
    );
  }

  return catatan;
}

/**
 * Menu untuk anak dengan berat berlebih.
 *
 * Prinsipnya bukan mengurangi makan, melainkan mengganti sumber kalori. Balita
 * masih tumbuh, sehingga membatasi asupannya berisiko menghambat pertumbuhan
 * tinggi badan sambil tidak menyelesaikan persoalan beratnya. Yang dikurangi
 * adalah kalori padat tanpa zat gizi, yaitu santan, sedangkan protein dan sayur
 * tetap penuh.
 *
 * Karena itu menu di sini tidak memuat santan sama sekali, dan kacang hijau
 * disajikan tanpa santan. Susunan waktu makannya sama dengan menu normal, sebab
 * yang perlu berubah adalah isinya, bukan frekuensinya.
 *
 * Batas kemampuan bagian ini dinyatakan pada catatannya: kelebihan berat pada
 * balita menuntut pemeriksaan, sebab penyebabnya dapat berada di luar jangkauan
 * pengaturan makan. Saran ini tidak menggantikan pemeriksaan itu.
 */
function kerangkaGiziLebih(
  status: "lebih" | "obesitas",
  lunak: boolean,
): { menu: Menu[]; catatan: string[] } {
  const b = BAHAN;

  const catatan = [
    "Jumlah makan tidak dikurangi. Anak masih tumbuh, dan mengurangi makan dapat menghambat pertumbuhan tingginya.",
    "Yang dikurangi adalah santan, gorengan, minuman manis, dan makanan ringan kemasan. Protein dan sayur tetap penuh.",
    "Berikan air putih sebagai minuman utama.",
    "Ajak anak bergerak aktif setiap hari, misalnya bermain di luar rumah.",
  ];

  if (status === "obesitas") {
    catatan.push(
      "Berat anak jauh di atas ukuran seusianya. Mohon periksakan ke bidan atau puskesmas, sebab penyebabnya perlu ditelusuri.",
    );
  } else {
    catatan.push(
      "Sampaikan kepada bidan pada penimbangan berikutnya, agar perkembangannya diikuti.",
    );
  }

  return {
    menu: [
      {
        waktu: "Pagi",
        hidangan: lunak
          ? "Bubur beras dengan telur dan bayam, tanpa santan"
          : "Nasi tim telur dan bayam, tanpa santan",
        bahan: [b.beras, b.telur, b.bayam],
      },
      {
        waktu: "Selingan",
        hidangan: "Pisang atau buah potong, tanpa gula",
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
        hidangan: lunak
          ? "Bubur ikan teri dan kangkung"
          : "Nasi dengan ikan teri dan kangkung",
        bahan: [b.ikanTeri, b.kangkung],
      },
    ],
    catatan: [...catatan, ...catatanKeselamatan(lunak)],
  };
}

export function kerangkaMenu(
  status: StatusGizi,
  usiaBulan: number,
  alergi: string[] = [],
): { menu: Menu[]; catatan: string[] } | null {
  const dasar = kerangkaDasar(status, usiaBulan);
  if (!dasar) return null;

  const { menu, diganti } = gantiBahanAlergi(dasar.menu, alergi);

  if (diganti.length === 0) return dasar;

  /*
   * Catatan yang menyebut bahan yang sudah dibuang ikut dibuang.
   *
   * Penyaringan yang hanya menyentuh daftar bahan meninggalkan kalimat seperti
   * "Santan menambah kalori tanpa menambah banyak volume makanan" pada menu yang
   * justru tidak lagi memakai santan. Orang tua yang membacanya wajar menyimpulkan
   * bahwa santan tetap dianjurkan, dan menambahkannya sendiri.
   *
   * Kalimat pertama, yaitu pemberitahuan penggantian, sengaja dikecualikan sebab
   * memang harus menyebut bahan yang dihindari.
   */
  const catatanBersih = dasar.catatan.filter(
    (baris) => !diganti.some((nama) => menyebutBahan(baris, nama)),
  );

  /*
   * Penggantian dinyatakan, tidak dilakukan diam-diam.
   *
   * Kader menyebut menu kepada orang tua, dan bila yang tercetak berbeda tanpa
   * penjelasan, orang tua akan menganggapnya keliru lalu kembali ke menu yang
   * disebut kader, yaitu menu yang justru memuat bahan berbahaya bagi anaknya.
   */
  return {
    menu,
    catatan: [
      `${diganti.join(" dan ")} tidak dipakai pada menu ini karena dicatat sebagai bahan yang perlu dihindari untuk anak ini.`,
      ...catatanBersih,
    ],
  };
}

/**
 * Memeriksa apakah satu kalimat menyebut bahan tertentu.
 *
 * Mencocokkan kata, bukan potongan huruf, dan memakai batas kata agar "hati"
 * tidak tercocok pada kata lain yang kebetulan memuat huruf itu. Nama bahan pada
 * daftar berupa dua kata, misalnya "Telur ayam", sementara kalimat catatan sering
 * hanya menyebut kata pertamanya, sehingga yang dicocokkan adalah kata pertama.
 */
function menyebutBahan(kalimat: string, namaBahan: string): boolean {
  const kata = namaBahan.toLowerCase().split(/\s+/u)[0];
  if (!kata) return false;

  const pola = new RegExp(`\\b${kata.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu");
  return pola.test(kalimat);
}

function kerangkaDasar(
  status: StatusGizi,
  usiaBulan: number,
): { menu: Menu[]; catatan: string[] } | null {
  if (usiaBulan < 6) return null;

  const b = BAHAN;
  const lunak = usiaBulan < 12;

  /*
   * Kelebihan gizi ditangani lebih dahulu, sebelum cabang mana pun.
   *
   * Penempatan ini bukan soal kerapian. Cabang terakhir pada fungsi ini adalah
   * menu berkalori tertinggi, yaitu menu untuk anak kekurangan gizi berat. Bila
   * status kelebihan gizi tidak ditangkap di sini, ia akan jatuh ke cabang itu,
   * dan aplikasi akan menganjurkan porsi kecil tetapi sering lima sampai enam
   * kali sehari dengan santan tambahan kepada anak yang justru kelebihan berat.
   *
   * Itu anjuran yang merugikan, bukan sekadar anjuran yang tidak berguna, dan
   * sebelumnya inilah yang akan terjadi karena status kelebihan gizi belum ada.
   */
  if (status === "lebih" || status === "obesitas") {
    return kerangkaGiziLebih(status, lunak);
  }

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
            ? "Bubur hati ayam dan wortel, 2 kali seminggu"
            : "Nasi, hati ayam, wortel, 2 kali seminggu",
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
        ...catatanKeselamatan(lunak, true),
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
          ? "Bubur hati ayam dan wortel, 2 kali seminggu"
          : "Nasi, hati ayam, wortel, 2 kali seminggu",
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
      ...catatanKeselamatan(lunak, true),
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

/**
 * Bahan pengganti bagi tiap bahan yang mungkin dihindari.
 *
 * Menghapus bahan yang menimbulkan alergi tanpa menggantinya akan merugikan.
 * Telur dan ikan teri adalah sumber protein utama pada menu ini, dan menu
 * penambah berat yang kehilangan sumber proteinnya tidak lagi menjalankan
 * tugasnya, meski tampak aman.
 *
 * Penggantinya dipilih dari bahan yang sudah ada di daftar, agar biaya tetap
 * dapat dihitung dan agar tidak ada bahan baru yang belum diperiksa
 * ketersediaannya di warung desa.
 */
const PENGGANTI: Record<string, string> = {
  telur: "tempe",
  ikanTeri: "tempe",
  tempe: "kacangHijau",
  hati: "tempe",
  kacangHijau: "tempe",
  bayam: "kangkung",
  kangkung: "bayam",
  wortel: "kangkung",
  pisang: "wortel",
  kelapa: "",
};

/** Mencari kunci bahan dari namanya. */
function kunciBahan(nama: string): string | undefined {
  return Object.keys(BAHAN).find((k) => BAHAN[k].nama === nama);
}

/**
 * Sebutan tiap bahan sebagaimana tertulis pada nama hidangan.
 *
 * Nama hidangan adalah teks tetap, misalnya "Bubur beras dengan telur", dan
 * teks itu wajib ikut berubah ketika bahannya diganti. Tanpa ini, orang tua
 * membaca hidangan yang menyebut telur sementara daftar belanjanya tidak lagi
 * memuat telur, lalu memasak sesuai nama hidangannya, yakni tepat bahan yang
 * seharusnya dihindari anaknya. Penyaringan yang tidak sampai ke teks yang
 * dibaca orang tua sama saja dengan tidak ada.
 */
const SEBUTAN: Record<string, string> = {
  telur: "telur",
  ikanTeri: "ikan teri",
  tempe: "tempe",
  hati: "hati ayam",
  bayam: "bayam",
  kangkung: "kangkung",
  wortel: "wortel",
  beras: "beras",
  pisang: "pisang",
  kelapa: "santan",
  kacangHijau: "kacang hijau",
};

/**
 * Menuliskan ulang nama hidangan setelah satu bahan diganti.
 *
 * Bila ada penggantinya, sebutannya ditukar. Bila tidak, sebutan bahan itu
 * beserta kata penghubung di depannya dibuang.
 */
function tulisUlangHidangan(
  hidangan: string,
  kunciLama: string,
  kunciBaru: string | undefined,
): string {
  const lama = SEBUTAN[kunciLama];
  if (!lama) return hidangan;

  const baru = kunciBaru ? SEBUTAN[kunciBaru] : undefined;
  const polaLama = lama.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

  if (baru) {
    return hidangan.replace(new RegExp(polaLama, "giu"), baru);
  }

  /*
   * Tanpa pengganti, sebutan dibuang bersama kata yang menerangkannya, kata
   * penghubung, dan pemisah yang mengapitnya.
   *
   * Kata penerang perlu ikut dibuang. Pada "Nasi tim telur, bayam, sedikit
   * santan", membuang "santan" saja meninggalkan "sedikit" menggantung di ujung
   * kalimat, dan hasil seperti itu membuat orang tua menebak apa yang hilang.
   */
  return hidangan
    .replace(
      new RegExp(
        `(?:,\\s*)?(?:dan\\s+|dengan\\s+)?(?:sedikit\\s+|tambahan\\s+)?${polaLama}`,
        "giu",
      ),
      "",
    )
    .replace(/\s{2,}/gu, " ")
    .replace(/,\s*,/gu, ",")
    .replace(/[,\s]+$/u, "")
    .trim();
}

/**
 * Memeriksa apakah satu bahan termasuk yang perlu dihindari.
 *
 * Pencocokan memakai kata, bukan potongan huruf. Catatan kader berupa teks bebas,
 * sehingga "telur" harus cocok dengan bahan "Telur ayam", sementara "teri" tidak
 * boleh membuang bahan lain yang kebetulan memuat potongan huruf itu.
 */
function perluDihindari(bahan: Bahan, alergi: string[]): boolean {
  const kataBahan = bahan.nama.toLowerCase().split(/\s+/u);

  return alergi.some((a) => {
    const kataAlergi = a.toLowerCase().trim().split(/\s+/u).filter(Boolean);
    if (kataAlergi.length === 0) return false;
    return kataAlergi.every((k) => kataBahan.includes(k));
  });
}

/**
 * Mengganti bahan yang perlu dihindari pada seluruh menu.
 *
 * Bahan tanpa pengganti, yaitu santan, dibuang saja: ia hanya penambah kalori
 * dan hidangannya tetap utuh tanpanya.
 *
 * Hidangan yang bahannya berubah diberi keterangan singkat, sebab orang tua perlu
 * tahu mengapa menu yang diterimanya berbeda dari yang disebut kader.
 */
function gantiBahanAlergi(
  menu: Menu[],
  alergi: string[],
): { menu: Menu[]; diganti: string[] } {
  if (alergi.length === 0) return { menu, diganti: [] };

  const diganti = new Set<string>();

  const hasil = menu.map((m) => {
    const bahanBaru: Bahan[] = [];
    let hidangan = m.hidangan;

    for (const b of m.bahan) {
      if (!perluDihindari(b, alergi)) {
        bahanBaru.push(b);
        continue;
      }

      diganti.add(b.nama);

      const kunci = kunciBahan(b.nama);
      const kunciPengganti = kunci ? PENGGANTI[kunci] : undefined;
      const pengganti = kunciPengganti ? BAHAN[kunciPengganti] : undefined;

      /*
       * Pengganti hanya dipakai bila belum ada di hidangan yang sama dan tidak
       * termasuk yang perlu dihindari pula. Tanpa pemeriksaan itu, satu hidangan
       * dapat memuat tempe dua kali, atau memuat bahan yang justru dihindari.
       */
      const dapatDipakai =
        pengganti !== undefined &&
        !perluDihindari(pengganti, alergi) &&
        !bahanBaru.some((x) => x.nama === pengganti.nama) &&
        !m.bahan.some((x) => x.nama === pengganti.nama);

      if (dapatDipakai && pengganti) bahanBaru.push(pengganti);

      if (kunci) {
        hidangan = tulisUlangHidangan(
          hidangan,
          kunci,
          dapatDipakai ? kunciPengganti : undefined,
        );
      }
    }

    return { ...m, bahan: bahanBaru, hidangan };
  });

  return { menu: hasil, diganti: [...diganti] };
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
  alergi: string[] = [],
): Promise<SaranMenu | null> {
  const kerangka = kerangkaMenu(status, usiaBulan, alergi);
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
