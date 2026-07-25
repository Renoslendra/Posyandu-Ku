import { susunRingkasan, type BarisAnak, type BarisPengukuran } from "@/lib/dashboard";
import { namaBerkasLaporan, susunLaporanCsv } from "@/lib/laporan";
import { ambilSemua } from "@/lib/ambil-semua";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * GET /api/laporan — mengunduh laporan bulanan sebagai CSV (FR-02.8).
 *
 * Dibuat sebagai GET, berbeda dari endpoint LLM yang memakai POST, karena
 * permintaan ini tidak menimbulkan biaya API dan tidak mengubah keadaan.
 * Dengan begitu tautan unduh dapat dibuka langsung oleh peramban.
 *
 * Seluruh angka dihitung modul dashboard secara deterministik. Tidak ada
 * bagian laporan yang disusun LLM, sehingga hasilnya dapat dipertanggungkan
 * jawabkan ketika dilaporkan ke dinas kesehatan.
 */
export async function GET() {
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
    return new Response("Basis data belum terhubung.", { status: 503 });
  }

  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return new Response("Silakan masuk terlebih dahulu", { status: 401 });
  }

  // Hanya bidan yang membutuhkan laporan untuk pelaporan ke dinas kesehatan.
  // Kader bekerja pada tingkat anak, bukan rekapitulasi wilayah.
  const { data: profil } = await supabase
    .from("profil")
    .select("peran, wilayah_id")
    .eq("id", pengguna.user.id)
    .maybeSingle();

  if (profil?.peran !== "bidan") {
    return new Response("Laporan hanya tersedia untuk bidan", { status: 403 });
  }

  const { data: wilayah } = await supabase
    .from("wilayah")
    .select("nama")
    .eq("id", profil.wilayah_id)
    .maybeSingle();

  /*
   * RLS membatasi kedua kueri pada wilayah bidan yang sedang masuk.
   *
   * Diambil bertahap agar tidak terpotong batas baris PostgREST. Laporan ini
   * berpindah tangan ke dinas kesehatan, sehingga angka yang tidak lengkap lebih
   * merugikan di sini daripada di tempat lain mana pun pada aplikasi ini.
   */
  const [anak, pengukuran] = await Promise.all([
    ambilSemua<BarisAnak>((dari, sampai) =>
      supabase
        .from("anak")
        .select("id, nama, tanggal_lahir, jenis_kelamin, telepon")
        .order("nama")
        .range(dari, sampai),
    ),
    ambilSemua<BarisPengukuran>((dari, sampai) =>
      supabase
        .from("pengukuran")
        .select("anak_id, tanggal, berat_kg, status, dikonfirmasi")
        .order("tanggal")
        .range(dari, sampai),
    ),
  ]);

  /*
   * Laporan tidak diterbitkan bila datanya tidak lengkap.
   *
   * Berkas yang terunduh tampak sah dan akan disalin ke rekapitulasi dinas
   * kesehatan, sehingga menerbitkannya separuh lebih buruk daripada menolak.
   */
  if (anak.terpotong || pengukuran.terpotong) {
    return new Response(
      "Data terlalu banyak untuk dilaporkan sekaligus. Mohon hubungi pengelola sistem.",
      { status: 503 },
    );
  }

  const ringkasan = susunRingkasan(anak.baris, pengukuran.baris);

  const sekarang = new Date();
  const namaWilayah = wilayah?.nama ?? "Posyandu";
  const csv = susunLaporanCsv(ringkasan, {
    namaWilayah,
    tanggalCetak: sekarang,
  });

  /*
   * Tanda urutan byte diperlukan agar Excel di Windows membaca berkas ini
   * sebagai UTF-8. Tanpanya, huruf beraksen pada nama anak tampil rusak, dan
   * laporan yang tampak rusak akan diragukan isinya.
   */
  const isi = `\uFEFF${csv}`;

  return new Response(isi, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkasLaporan(namaWilayah, sekarang)}"`,
      // Laporan mencerminkan keadaan saat diunduh, sehingga tidak boleh
      // disimpan di tembolok peramban maupun perantara.
      "Cache-Control": "no-store",
    },
  });
}
