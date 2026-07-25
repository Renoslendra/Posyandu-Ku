import { NextResponse } from "next/server";
import { susunRingkasan, type BarisAnak, type BarisPengukuran } from "@/lib/dashboard";
import { ringkasanTemplate, susunRingkasanNaratif } from "@/lib/ringkasan";
import { klienServer } from "@/lib/supabase";

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

/**
 * Pembatasan laju sederhana per pengguna.
 *
 * Disimpan di memori proses, sehingga tidak akurat pada lingkungan serverless
 * yang menjalankan beberapa instans. Cukup untuk mencegah penekanan tombol
 * berulang, yang merupakan pola penyalahgunaan paling mungkin di sini.
 */
const catatanPanggilan = new Map<string, number[]>();
const JENDELA_MS = 60_000;
const MAKS_PER_JENDELA = 5;

function melewatiBatas(idPengguna: string): boolean {
  const sekarang = Date.now();
  const sebelumnya = (catatanPanggilan.get(idPengguna) ?? []).filter(
    (t) => sekarang - t < JENDELA_MS,
  );

  if (sebelumnya.length >= MAKS_PER_JENDELA) {
    catatanPanggilan.set(idPengguna, sebelumnya);
    return true;
  }

  sebelumnya.push(sekarang);
  catatanPanggilan.set(idPengguna, sebelumnya);
  return false;
}

export async function POST() {
  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  if (melewatiBatas(pengguna.user.id)) {
    return NextResponse.json(
      { galat: "Terlalu banyak permintaan. Mohon tunggu sebentar." },
      { status: 429 },
    );
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
