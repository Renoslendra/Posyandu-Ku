import { NextResponse } from "next/server";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * Mengakhiri sesi pengguna.
 *
 * Dibuat sebagai Route Handler, bukan dikerjakan dari komponen klien, karena
 * cookie sesi ditandai httpOnly sehingga hanya dapat dihapus dari sisi server.
 * Memanggil `signOut()` di peramban akan membersihkan penyimpanan lokal tetapi
 * meninggalkan cookie, dan pengguna kembali masuk sendiri pada muat berikutnya.
 *
 * Hanya menerima POST. Permintaan GET sengaja tidak dilayani sebab tautan yang
 * dapat diambil peramban akan membuat pengguna keluar tanpa berbuat apa pun,
 * misalnya karena pemuatan awal (prefetch) atau pemindai tautan.
 */
export async function POST() {
  if (!supabaseTerkonfigurasi()) {
    return NextResponse.json(
      { galat: "Basis data belum terhubung." },
      { status: 503 },
    );
  }

  const supabase = await klienServer();

  /*
   * Galat dari signOut sengaja tidak diteruskan sebagai kegagalan.
   *
   * Bila token sudah kedaluwarsa atau sesinya sudah tidak sah, Supabase
   * mengembalikan galat, padahal hasil yang diinginkan pengguna, yaitu tidak
   * lagi masuk, justru sudah tercapai. Menampilkan pesan gagal pada keadaan itu
   * hanya membingungkan dan membuat pengguna mengira dirinya masih masuk.
   */
  await supabase.auth.signOut();

  return NextResponse.json({ berhasil: true });
}
