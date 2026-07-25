import { NextResponse } from "next/server";
import { anakBaruSchema, pesanGalatPertama } from "@/lib/validasi";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * /api/anak — mendaftarkan dan memperbarui data anak.
 *
 * POST  : kader mendaftarkan anak baru di posyandunya
 * PATCH : kader memperbaiki data yang salah catat
 *
 * posyandu_id tidak diambil dari badan permintaan melainkan dari profil kader
 * yang sedang masuk. Bila diambil dari klien, kader dapat mendaftarkan anak ke
 * posyandu lain meski RLS memblokir pembacaannya.
 */

export async function POST(permintaan: Request) {
  let muatan: unknown;
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  const terurai = anakBaruSchema.safeParse(muatan);
  if (!terurai.success) {
    return NextResponse.json(
      { galat: pesanGalatPertama(terurai.error) },
      { status: 400 },
    );
  }
  const data = terurai.data;

  /*
   * Konfigurasi diperiksa lebih dahulu supaya kegagalan menyebut penyebabnya.
   *
   * Pembangun klien melempar pengecualian bila kredensial basis data belum
   * terisi, dan pengecualian itu keluar sebagai galat server tanpa keterangan.
   * Halaman biasa sudah memeriksanya, sehingga bila satu variabel lingkungan
   * terlewat, tampilan terlihat sehat sementara setiap penyimpanan gagal diam
   * dengan pesan yang menyesatkan.
   */
  if (!supabaseTerkonfigurasi()) {
    return NextResponse.json(
      { galat: "Basis data belum terhubung." },
      { status: 503 },
    );
  }
  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("profil")
    .select("peran, posyandu_id")
    .eq("id", pengguna.user.id)
    .maybeSingle();

  if (profil?.peran !== "kader" || !profil.posyandu_id) {
    return NextResponse.json(
      { galat: "Hanya kader posyandu yang dapat mendaftarkan anak baru" },
      { status: 403 },
    );
  }

  // Memperingatkan bila ada nama yang sama di posyandu ini. Tidak menolak,
  // karena nama serupa memang mungkin terjadi di satu desa.
  const { data: serupa } = await supabase
    .from("anak")
    .select("id, nama, tanggal_lahir")
    .eq("posyandu_id", profil.posyandu_id)
    .ilike("nama", data.nama)
    .limit(1);

  const { data: tersimpan, error } = await supabase
    .from("anak")
    .insert({
      posyandu_id: profil.posyandu_id,
      nama: data.nama,
      tanggal_lahir: data.tanggalLahir,
      jenis_kelamin: data.jenisKelamin,
      nama_orang_tua: data.namaOrangTua,
      telepon: data.telepon || null,
      alamat: data.alamat || null,
    })
    .select("id, nama")
    .single();

  if (error) {
    /*
     * Pelanggaran batasan basis data dijawab 400 dengan pesan yang menyebut
     * penyebabnya. Yang paling mungkin terjadi adalah tanggal lahir, sebab
     * batasan itu dievaluasi pada zona waktu basis data sedangkan formulir
     * memakai jam perangkat kader. Melaporkannya sebagai galat server membuat
     * kader mencari kesalahan di tempat yang salah.
     */
    if (error.code === "23514") {
      return NextResponse.json(
        { galat: "Data tidak diterima. Mohon periksa tanggal lahirnya." },
        { status: 400 },
      );
    }
    return NextResponse.json({ galat: "Gagal menyimpan data anak" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: tersimpan.id,
    nama: tersimpan.nama,
    peringatanNamaSerupa: (serupa ?? []).length > 0 ? serupa![0].nama : null,
  });
}

export async function PATCH(permintaan: Request) {
  let muatan: unknown;
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  const isi = muatan as { id?: unknown };
  if (typeof isi.id !== "string" || isi.id.length < 10) {
    return NextResponse.json({ galat: "ID anak tidak valid" }, { status: 400 });
  }

  const terurai = anakBaruSchema.safeParse(muatan);
  if (!terurai.success) {
    return NextResponse.json(
      { galat: pesanGalatPertama(terurai.error) },
      { status: 400 },
    );
  }
  const data = terurai.data;

  /*
   * Konfigurasi diperiksa lebih dahulu supaya kegagalan menyebut penyebabnya.
   *
   * Pembangun klien melempar pengecualian bila kredensial basis data belum
   * terisi, dan pengecualian itu keluar sebagai galat server tanpa keterangan.
   * Halaman biasa sudah memeriksanya, sehingga bila satu variabel lingkungan
   * terlewat, tampilan terlihat sehat sementara setiap penyimpanan gagal diam
   * dengan pesan yang menyesatkan.
   */
  if (!supabaseTerkonfigurasi()) {
    return NextResponse.json(
      { galat: "Basis data belum terhubung." },
      { status: 503 },
    );
  }
  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  /*
   * Peran diperiksa lebih dahulu, sejalan dengan POST di berkas yang sama.
   *
   * Kebijakan `anak_ubah_kader` pada RLS sudah memastikan hanya kader di posyandu
   * yang sama dapat mengubah baris ini, sehingga tidak ada lubang wewenang.
   * Namun tanpa pemeriksaan ini, bidan yang mencoba menyunting menerima balasan
   * 404 "tidak ditemukan", padahal datanya ada dan yang kurang adalah haknya.
   * Pesan yang keliru menyesatkan pengguna sekaligus menyulitkan penelusuran.
   */
  const { data: profil } = await supabase
    .from("profil")
    .select("peran")
    .eq("id", pengguna.user.id)
    .maybeSingle();

  if (profil?.peran !== "kader") {
    return NextResponse.json(
      { galat: "Hanya kader posyandu yang dapat memperbaiki data anak" },
      { status: 403 },
    );
  }

  /*
   * `posyandu_id` sengaja tidak ikut diperbarui, sehingga baris tidak dapat
   * dipindahkan ke posyandu lain lewat permintaan ini.
   */
  const { data: diperbarui, error } = await supabase
    .from("anak")
    .update({
      nama: data.nama,
      tanggal_lahir: data.tanggalLahir,
      jenis_kelamin: data.jenisKelamin,
      nama_orang_tua: data.namaOrangTua,
      telepon: data.telepon || null,
      alamat: data.alamat || null,
    })
    .eq("id", isi.id)
    .select("id, nama")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ galat: "Gagal memperbarui data anak" }, { status: 500 });
  }
  if (!diperbarui) {
    return NextResponse.json(
      { galat: "Data anak tidak ditemukan atau di luar wewenang Anda" },
      { status: 404 },
    );
  }

  /*
   * Catatan penting: mengubah tanggal lahir membuat usia pada pengukuran lama
   * tidak lagi sesuai, sehingga Z-score yang tersimpan menjadi keliru.
   *
   * Perhitungan ulang seluruh riwayat berada di luar cakupan MVP. Yang
   * dilakukan sekarang adalah memberi tahu pemanggil agar antarmuka dapat
   * memperingatkan kader, alih-alih membiarkan data salah tanpa penjelasan.
   */
  return NextResponse.json({
    ok: true,
    id: diperbarui.id,
    nama: diperbarui.nama,
    catatan:
      "Bila tanggal lahir diubah, usia pada riwayat penimbangan lama tidak dihitung ulang. Mohon periksa kembali hasil penimbangan sebelumnya.",
  });
}
