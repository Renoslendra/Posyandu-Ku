import { NextResponse } from "next/server";
import { BATAS, periksaBatas } from "@/lib/batas-laju";
import { llmTersedia, panggilVision, uraiJsonLLM } from "@/lib/llm";
import { hasilEkstraksiSchema, type BarisEkstraksi } from "@/lib/validasi";
import { klienServer } from "@/lib/supabase";
import { BATAS_WAJAR } from "@/lib/gizi/ambang";

/**
 * POST /api/import-foto — membaca satu halaman buku tulis posyandu.
 *
 * Ini satu-satunya jalan agar catatan bertahun-tahun yang sudah menumpuk masuk
 * ke sistem. Tanpanya, produk hanya mencatat data baru dan masalah utama pada
 * problem statement tetap tidak terjawab.
 *
 * Yang penting dari rancangan ini: endpoint TIDAK menyimpan apa pun. Hasilnya
 * dikembalikan sebagai usulan untuk dikoreksi kader, lalu disimpan lewat jalur
 * biasa. Data dari model tidak pernah masuk basis data tanpa persetujuan manusia.
 */

const PERINTAH = `Anda membaca satu halaman buku catatan posyandu di Indonesia yang ditulis tangan.

Tugas Anda HANYA membaca angka dan nama yang tertulis. Jangan menghitung, menyimpulkan, atau melengkapi data yang tidak terlihat.

Kembalikan JSON dengan bentuk berikut, tanpa penjelasan tambahan:
{"baris":[{"nama":"...","beratKg":0,"tinggiCm":0,"tanggal":"YYYY-MM-DD"}]}

Aturan:
- Bila sebuah nilai tidak terbaca atau tidak ada, tulis null. Jangan menebak.
- beratKg dan tinggiCm berupa angka desimal. Koma pada tulisan tangan berarti titik desimal.
- tanggal berformat YYYY-MM-DD. Bila hanya tertulis bulan dan tahun, gunakan tanggal 1.
- Sertakan hanya baris yang memuat nama anak.
- Maksimal 50 baris.`;

/**
 * Batas panjang teks data URL gambar, bukan ukuran berkas aslinya.
 *
 * Pengodean base64 menambah sekitar sepertiga, sehingga batas enam mebibita di
 * sini setara berkas gambar sekitar 4,5 megabita. Nilai itu sengaja dipertahankan
 * karena mendekati batas ukuran permintaan pada platform tempat aplikasi ini
 * dijalankan, sehingga penolakan terjadi dengan pesan yang dapat dibaca kader
 * alih-alih galat platform.
 */
const MAKS_PANJANG_DATA_URL = 6 * 1024 * 1024;

export async function POST(permintaan: Request) {
  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  if (!llmTersedia()) {
    return NextResponse.json(
      {
        galat:
          "Pembacaan foto sedang tidak tersedia. Data masih dapat dimasukkan secara manual.",
        manualSaja: true,
      },
      { status: 503 },
    );
  }

  // Panggilan vision paling mahal di antara ketiga endpoint LLM, sehingga
  // batasnya ditegakkan sebelum gambar diproses. Batasnya diberi ruang lebih
  // lapang karena kader memang memfoto beberapa halaman berurutan.
  const batas = await periksaBatas(supabase, BATAS.importFoto);
  if (batas.ditolak) {
    return NextResponse.json(
      { galat: batas.pesan, manualSaja: true },
      { status: 429 },
    );
  }

  /*
   * Ukuran diperiksa dari kepala permintaan, sebelum badannya dibaca.
   *
   * Sebelumnya pemeriksaan dilakukan setelah `permintaan.json()`, yang berarti
   * seluruh badan permintaan sudah dibaca ke memori dan diurai sebagai JSON lebih
   * dahulu. Foto lima puluh megabita menghabiskan memori dan waktu prosesor
   * sepenuhnya, baru kemudian ditolak. Beberapa permintaan semacam itu secara
   * bersamaan cukup untuk menghabiskan memori proses.
   *
   * Kepala permintaan dapat dipalsukan, sehingga pemeriksaan panjang teks di
   * bawah tetap dipertahankan sebagai penjaga sesungguhnya. Yang ini hanya
   * menolak lebih awal pada kasus yang jujur, dan itulah kasus yang sebenarnya
   * terjadi: kader dengan ponsel berkamera resolusi tinggi.
   */
  const panjangDinyatakan = Number(permintaan.headers.get("content-length") ?? "0");
  if (Number.isFinite(panjangDinyatakan) && panjangDinyatakan > MAKS_PANJANG_DATA_URL) {
    return NextResponse.json(
      { galat: "Ukuran foto terlalu besar. Mohon foto ulang dengan resolusi lebih kecil." },
      { status: 413 },
    );
  }

  let muatan: { gambar?: string };
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  const gambar = muatan.gambar;
  if (typeof gambar !== "string" || !gambar.startsWith("data:image/")) {
    return NextResponse.json(
      { galat: "Gambar tidak dikenali. Mohon unggah foto halaman buku." },
      { status: 400 },
    );
  }

  /*
   * Jenis gambar dibatasi pada format bitmap yang lazim dihasilkan kamera.
   *
   * Sebelumnya awalan `data:image/` apa pun diterima, termasuk `data:image/svg+xml`
   * yang isinya adalah dokumen berisi skrip. Berkas itu tidak pernah dirender di
   * aplikasi ini sehingga tidak berbahaya di sini, namun meneruskannya ke penyedia
   * model adalah hal yang tidak perlu dilakukan.
   */
  if (!/^data:image\/(jpeg|jpg|png|webp|heic|heif);base64,/i.test(gambar)) {
    return NextResponse.json(
      {
        galat:
          "Format foto tidak didukung. Mohon pakai foto dari kamera, bukan berkas gambar lain.",
      },
      { status: 400 },
    );
  }

  if (gambar.length > MAKS_PANJANG_DATA_URL) {
    return NextResponse.json(
      { galat: "Ukuran foto terlalu besar. Mohon foto ulang dengan resolusi lebih kecil." },
      { status: 413 },
    );
  }

  const hasil = await panggilVision(PERINTAH, gambar);

  if (!hasil.ok) {
    console.warn("Ekstraksi foto gagal:", hasil.alasan);
    return NextResponse.json(
      {
        galat:
          "Foto tidak dapat dibaca saat ini. Silakan coba lagi, atau masukkan data secara manual.",
        manualSaja: true,
      },
      { status: 502 },
    );
  }

  const mentah = uraiJsonLLM(hasil.teks);
  const terurai = hasilEkstraksiSchema.safeParse(mentah);

  if (!terurai.success) {
    console.warn("Balasan ekstraksi tidak sesuai bentuk yang diharapkan");
    return NextResponse.json(
      {
        galat:
          "Hasil pembacaan tidak dapat ditafsirkan. Silakan foto ulang dengan pencahayaan lebih baik.",
        manualSaja: true,
      },
      { status: 502 },
    );
  }

  /*
   * Penanda kewajaran dipasang sebelum hasil ditampilkan.
   *
   * Salah baca satu angka pada foto dapat memicu peringatan gizi buruk palsu.
   * Menandainya lebih dahulu membuat kader memusatkan perhatian pada baris yang
   * memang patut dicurigai, alih-alih memeriksa semuanya satu per satu.
   */
  const baris = terurai.data.baris.map((b: BarisEkstraksi) => {
    const catatan: string[] = [];

    if (b.beratKg === null) catatan.push("Berat tidak terbaca");
    else if (b.beratKg < BATAS_WAJAR.beratKgMin || b.beratKg > BATAS_WAJAR.beratKgMaks) {
      catatan.push("Berat di luar batas wajar balita");
    }

    if (b.tinggiCm === null) catatan.push("Tinggi tidak terbaca");
    else if (
      b.tinggiCm < BATAS_WAJAR.tinggiCmMin ||
      b.tinggiCm > BATAS_WAJAR.tinggiCmMaks
    ) {
      catatan.push("Tinggi di luar batas wajar balita");
    }

    if (b.tanggal === null) catatan.push("Tanggal tidak terbaca");

    return {
      ...b,
      catatan,
      /** Selalu false. Kader wajib memeriksa sebelum data dipakai (FR-10.5). */
      dikonfirmasi: false,
      sumber: "ocr_ai" as const,
    };
  });

  return NextResponse.json({
    ok: true,
    baris,
    // Ditegaskan pada balasan agar antarmuka tidak pernah menyimpan diam-diam.
    perluKonfirmasiKader: true,
    catatan:
      "Hasil pembacaan otomatis. Mohon periksa dan perbaiki sebelum disimpan.",
  });
}
