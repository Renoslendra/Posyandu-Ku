import { NextResponse } from "next/server";
import { z } from "zod";
import { bacaSesi } from "@/lib/sesi";
import { klienAdmin, klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * POST /api/akun-orangtua — membuat akun orang tua dan menautkannya ke anak.
 *
 * Sebelumnya, orang tua hanya memperoleh akun bila pengelola menjalankan skrip
 * terminal. Akibatnya kolom `anak.orang_tua_id` beserta seluruh kebijakan RLS
 * yang bersandar padanya tidak pernah dapat dipakai di lapangan: kader dapat
 * mendaftarkan anak, tetapi keluarganya tidak punya jalan masuk untuk melihatnya.
 *
 * Yang perlu dinyatakan terus terang mengenai rancangan ini.
 *
 * Sandi awal dibangkitkan sistem dan ditampilkan satu kali kepada kader, yang
 * kemudian menyampaikannya kepada keluarga. Cara ini bukan yang terbaik. Sandi
 * yang berpindah lewat lisan atau catatan kertas dapat terbaca orang lain, dan
 * kader menjadi pihak ketiga yang mengetahui sandi akun keluarga.
 *
 * Cara yang benar adalah penautan lewat nomor telepon dengan verifikasi sekali
 * pakai, sehingga keluarga menetapkan sandinya sendiri dan tidak ada pihak lain
 * yang pernah mengetahuinya. Itu memerlukan gerbang SMS, dan gerbang SMS berada
 * di luar cakupan yang dapat dipertanggungjawabkan sekarang.
 *
 * Yang dikerjakan di sini adalah jalan tengah yang batasnya dinyatakan, bukan
 * disembunyikan: sandi ditampilkan sekali, dengan permintaan agar keluarga
 * segera menggantinya.
 *
 * Hanya kader yang dapat memakainya, dan hanya untuk anak di posyandunya
 * sendiri.
 */

const Muatan = z.object({
  anakId: z.string().uuid("ID anak tidak valid"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Alamat surel tidak dikenali")
    .max(200, "Alamat surel terlalu panjang"),
  nama: z
    .string()
    .trim()
    .min(2, "Nama orang tua terlalu pendek")
    .max(100, "Nama orang tua terlalu panjang"),
});

/**
 * Membangkitkan sandi awal yang dapat dibacakan.
 *
 * Menghindari huruf dan angka yang mudah tertukar saat dibacakan atau ditulis
 * ulang: nol dengan huruf O, satu dengan huruf l dan I. Kader menyampaikan sandi
 * ini secara lisan, sehingga kekeliruan satu huruf berarti keluarga tidak dapat
 * masuk dan tidak tahu sebabnya.
 *
 * Panjangnya dua belas karakter dari 46 kemungkinan per posisi. Itu memadai
 * untuk sandi sementara yang diminta segera diganti, dan tetap dapat dibacakan
 * lewat telepon.
 */
function sandiAwal(): string {
  const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const acak = new Uint32Array(12);
  crypto.getRandomValues(acak);
  return Array.from(acak, (n) => abjad[n % abjad.length]).join("");
}

export async function POST(permintaan: Request) {
  if (!supabaseTerkonfigurasi()) {
    return NextResponse.json({ galat: "Basis data belum terhubung." }, { status: 503 });
  }

  const sesi = await bacaSesi();

  if (!sesi) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  /*
   * Pembatasan peran diperiksa di sini, tidak diserahkan ke RLS.
   *
   * Endpoint ini bekerja dengan service role agar dapat membuat pengguna di
   * Supabase Auth, dan service role melewati seluruh kebijakan RLS. Karena itu
   * pemeriksaan wewenang di lapisan ini bukan pertahanan berlapis melainkan
   * satu-satunya pertahanan yang ada, dan setiap syaratnya harus tertulis tegas.
   */
  if (sesi.peran !== "kader") {
    return NextResponse.json(
      { galat: "Hanya kader yang dapat membuat akun orang tua." },
      { status: 403 },
    );
  }

  let mentah: unknown;
  try {
    mentah = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  const hasil = Muatan.safeParse(mentah);
  if (!hasil.success) {
    return NextResponse.json(
      { galat: hasil.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const { anakId, email, nama } = hasil.data;

  /*
   * Anak dibaca memakai klien bersesi, bukan service role.
   *
   * Kuerinya tunduk pada RLS, sehingga anak di luar posyandu kader ini tidak akan
   * ditemukan. Inilah yang menegakkan batas wewenang atas anaknya, dan itu
   * sebabnya pembacaan tidak dilakukan dengan klien layanan meskipun sisa
   * pekerjaan di bawah memerlukannya.
   */
  const supabase = await klienServer();
  const { data: anak } = await supabase
    .from("anak")
    .select("id, nama, orang_tua_id")
    .eq("id", anakId)
    .maybeSingle();

  if (!anak) {
    return NextResponse.json(
      { galat: "Data anak tidak ditemukan atau di luar wewenang Anda" },
      { status: 404 },
    );
  }

  if (anak.orang_tua_id) {
    return NextResponse.json(
      {
        galat: `${anak.nama} sudah tertaut ke akun orang tua. Satu anak hanya dapat tertaut ke satu akun.`,
      },
      { status: 409 },
    );
  }

  const layanan = klienAdmin();
  const sandi = sandiAwal();

  const { data: dibuat, error: galatAuth } = await layanan.auth.admin.createUser({
    email,
    password: sandi,
    // Dianggap terverifikasi karena kader yang mendaftarkannya secara langsung.
    // Tanpa ini, keluarga harus membuka tautan konfirmasi di surel yang mungkin
    // tidak pernah ia akses.
    email_confirm: true,
  });

  if (galatAuth || !dibuat.user) {
    /*
     * Surel yang sudah terpakai dibedakan dari kegagalan lain. Keadaan ini lazim
     * terjadi pada keluarga dengan lebih dari satu anak, dan pesannya perlu
     * mengarahkan kader ke tindakan yang benar alih-alih menyatakan galat.
     */
    const pesan = galatAuth?.message ?? "";
    if (/already|terdaftar|exists/i.test(pesan)) {
      return NextResponse.json(
        {
          galat:
            "Surel ini sudah dipakai akun lain. Bila keluarga sudah punya akun, hubungi pengelola untuk menautkan anak ini ke akun tersebut.",
        },
        { status: 409 },
      );
    }

    console.error("Gagal membuat pengguna orang tua:", pesan);
    return NextResponse.json(
      { galat: "Gagal membuat akun. Coba lagi beberapa saat." },
      { status: 500 },
    );
  }

  /*
   * Baris profil wajib menyusul pembuatan pengguna.
   *
   * Belum ada trigger `handle_new_user` pada basis data ini, sehingga pengguna
   * tanpa baris profil dapat masuk tetapi ditolak setiap kebijakan RLS, dan
   * halamannya tampak kosong tanpa penjelasan apa pun. Kegagalan pada langkah ini
   * karena itu tidak boleh dibiarkan: penggunanya dibatalkan agar tidak
   * tertinggal sebagai akun yang tidak dapat dipakai.
   */
  const { error: galatProfil } = await layanan.from("profil").insert({
    id: dibuat.user.id,
    peran: "orang_tua",
    nama,
  });

  if (galatProfil) {
    await layanan.auth.admin.deleteUser(dibuat.user.id);
    console.error("Gagal membuat profil orang tua:", galatProfil.message);
    return NextResponse.json(
      { galat: "Gagal menyiapkan akun. Tidak ada perubahan yang tersimpan." },
      { status: 500 },
    );
  }

  /*
   * Penautan dilakukan terakhir, dan syarat `orang_tua_id is null` diulang pada
   * kuerinya.
   *
   * Pemeriksaan di atas dapat terlewati bila dua permintaan datang hampir
   * bersamaan, misalnya karena kader menekan tombolnya dua kali. Mengulang syarat
   * itu di dalam kueri pembaruan membuat basis data yang memutuskan, bukan
   * urutan kedatangan permintaan.
   */
  const { data: tertaut, error: galatTaut } = await layanan
    .from("anak")
    .update({ orang_tua_id: dibuat.user.id })
    .eq("id", anakId)
    .is("orang_tua_id", null)
    .select("id")
    .maybeSingle();

  if (galatTaut || !tertaut) {
    await layanan.from("profil").delete().eq("id", dibuat.user.id);
    await layanan.auth.admin.deleteUser(dibuat.user.id);
    console.error("Gagal menautkan orang tua:", galatTaut?.message ?? "sudah tertaut");
    return NextResponse.json(
      { galat: "Gagal menautkan akun ke anak. Tidak ada perubahan yang tersimpan." },
      { status: 409 },
    );
  }

  /*
   * Sandi dikembalikan satu kali dan tidak disimpan di mana pun.
   *
   * Kader wajib menyampaikannya sekarang; tidak ada cara membacanya kembali.
   * Menyimpannya agar dapat dilihat lagi berarti menyimpan sandi dalam bentuk
   * yang dapat dibaca, dan itu tidak dapat dibenarkan untuk kemudahan yang
   * diperolehnya.
   */
  return NextResponse.json({
    ok: true,
    email,
    sandiAwal: sandi,
    namaAnak: anak.nama,
  });
}
