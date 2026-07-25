import { NextResponse } from "next/server";
import { BATAS, periksaBatas } from "@/lib/batas-laju";
import { susunRingkasan, type BarisAnak, type BarisPengukuran } from "@/lib/dashboard";
import { ringkasanTemplate, susunRingkasanNaratif } from "@/lib/ringkasan";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/*
 * Batas durasi fungsi dinyatakan tegas, tidak dibiarkan memakai nilai bawaan.
 *
 * Rute ini menjalankan dua kueri tabel sebelum memanggil model, sehingga batas
 * bawaan sepuluh detik dapat terlampaui pada permintaan pertama setelah fungsi
 * dingin.
 *
 * Nilai ini harus selalu lebih besar daripada batas waktu di dalam llm.ts,
 * supaya jalur cadangan aplikasi yang menghasilkan keluaran berguna selalu
 * mendahului pemutusan oleh platform yang hanya menghasilkan galat gerbang.
 */
export const maxDuration = 60;

/**
 * POST /api/ringkasan — menyusun ringkasan bulanan untuk bidan.
 *
 * Angka dihitung modul dashboard secara deterministik, lalu LLM menyusun
 * kalimatnya. Bila LLM gagal, ringkasan tetap tersusun dari template dengan
 * angka yang sama, dan balasan menyatakan hal itu secara terbuka.
 *
 * Dibuat sebagai POST meskipun tidak mengubah keadaan, karena pemanggilannya
 * menimbulkan biaya API dan tidak boleh dipicu oleh prefetch peramban.
 */

export async function POST() {
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

  // Penghitungnya ada di basis data, sehingga batas tetap berlaku meski
  // permintaan dilayani proses serverless yang berbeda.
  const batas = await periksaBatas(supabase, BATAS.ringkasan);
  if (batas.ditolak) {
    return NextResponse.json({ galat: batas.pesan }, { status: 429 });
  }

  // RLS membatasi kedua kueri pada wilayah pengguna yang sedang masuk.
  const [{ data: anak }, { data: pengukuran }] = await Promise.all([
    supabase.from("anak").select("id, nama, tanggal_lahir, jenis_kelamin").order("nama"),
    supabase
      .from("pengukuran")
      .select("anak_id, tanggal, berat_kg, status, dikonfirmasi")
      .order("tanggal"),
  ]);

  const data = susunRingkasan(
    (anak ?? []) as BarisAnak[],
    (pengukuran ?? []) as BarisPengukuran[],
  );

  if (data.totalAnak === 0) {
    return NextResponse.json({
      ok: true,
      teks: "Belum ada data anak yang dapat diringkas.",
      dariFallback: true,
    });
  }

  try {
    const hasil = await susunRingkasanNaratif(data);
    return NextResponse.json({
      ok: true,
      teks: hasil.teks,
      dariFallback: hasil.dariFallback,
    });
  } catch (galat) {
    // Kegagalan tak terduga tetap tidak boleh menghasilkan halaman kosong.
    console.error("Ringkasan gagal total:", galat);
    return NextResponse.json({
      ok: true,
      teks: ringkasanTemplate(data),
      dariFallback: true,
    });
  }
}
