import { NextResponse } from "next/server";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * POST /api/tindak-lanjut — mencatat satu tindakan atas seorang anak.
 *
 * Sebelumnya, tombol telepon pada daftar anak yang berhenti menimbang tidak
 * meninggalkan jejak apa pun. Anak yang kemarin sudah dihubungi muncul hari ini
 * dengan tampilan sama persis dengan anak yang belum disentuh, sehingga daftarnya
 * tidak dapat dipakai mengelola pekerjaan.
 *
 * Wewenangnya diserahkan sepenuhnya kepada RLS, bukan diperiksa di sini juga.
 * Kebijakan `tindak_lanjut_tulis` mewajibkan peran kader atau bidan, mewajibkan
 * `dicatat_oleh` sama dengan pengguna yang sedang masuk, dan mewajibkan anaknya
 * berada di posyandu yang terjangkau. Menuliskan ulang ketiga syarat itu di
 * lapisan ini akan menghasilkan dua tempat yang harus disepakati setiap kali
 * aturannya berubah.
 */

const JENIS_SAH = ["ditelepon", "dikunjungi", "hadir", "tidak_terjangkau"] as const;

type Jenis = (typeof JENIS_SAH)[number];

export async function POST(permintaan: Request) {
  if (!supabaseTerkonfigurasi()) {
    return NextResponse.json({ galat: "Basis data belum terhubung." }, { status: 503 });
  }

  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  let muatan: { anakId?: unknown; jenis?: unknown; catatan?: unknown };
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  if (typeof muatan.anakId !== "string" || muatan.anakId.length < 10) {
    return NextResponse.json({ galat: "ID anak tidak valid" }, { status: 400 });
  }

  if (
    typeof muatan.jenis !== "string" ||
    !JENIS_SAH.includes(muatan.jenis as Jenis)
  ) {
    return NextResponse.json(
      { galat: "Jenis tindak lanjut tidak dikenali" },
      { status: 400 },
    );
  }

  /*
   * Catatan kosong disimpan sebagai null, bukan sebagai teks kosong.
   *
   * Basis data menolak teks yang hanya berisi spasi lewat check constraint
   * `catatan_tidak_kosong`, dan penolakan itu akan muncul sebagai galat 500 yang
   * membingungkan untuk masukan yang sebenarnya wajar: petugas yang hanya ingin
   * menandai bahwa ia sudah menelepon, tanpa menuliskan apa pun.
   */
  let catatan: string | null = null;
  if (typeof muatan.catatan === "string") {
    const dirapikan = muatan.catatan.trim();
    if (dirapikan.length > 0) {
      // Dipotong, bukan ditolak. Kehilangan kalimat terakhir pada catatan yang
      // sangat panjang lebih ringan akibatnya daripada kehilangan seluruh
      // catatan beserta penandanya.
      catatan = dirapikan.slice(0, 500);
    }
  }

  const { error } = await supabase.from("tindak_lanjut").insert({
    anak_id: muatan.anakId,
    jenis: muatan.jenis,
    catatan,
    dicatat_oleh: pengguna.user.id,
  });

  if (error) {
    /*
     * Pelanggaran kebijakan RLS dikembalikan sebagai 403, bukan 500. Keadaan ini
     * bukan kerusakan peladen: ia terjadi bila peran tidak berhak mencatat atau
     * anaknya berada di luar wilayahnya, dan keduanya perlu dibedakan dari galat
     * sesungguhnya saat memeriksa log.
     */
    if (error.code === "42501") {
      return NextResponse.json(
        { galat: "Anda tidak berwenang mencatat tindak lanjut untuk anak ini." },
        { status: 403 },
      );
    }

    // Tabel belum ada: migrasi 0012 belum dijalankan.
    if (error.code === "42P01") {
      return NextResponse.json(
        {
          galat:
            "Tabel tindak lanjut belum tersedia. Jalankan migrasi 0012_tindak_lanjut.sql.",
        },
        { status: 503 },
      );
    }

    console.error("Gagal mencatat tindak lanjut:", error.message);
    return NextResponse.json(
      { galat: "Gagal menyimpan catatan tindak lanjut." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
