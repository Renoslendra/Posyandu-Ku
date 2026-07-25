import { redirect } from "next/navigation";
import { klienServer, supabaseTerkonfigurasi } from "./supabase";
import { HALAMAN_PERAN, type Peran } from "./peran";

/**
 * Pembacaan sesi di sisi server.
 *
 * Dipusatkan di satu berkas karena sebelumnya setiap halaman hanya memeriksa
 * apakah ada pengguna yang masuk, tanpa memeriksa perannya. Akibatnya orang tua
 * yang masuk dapat membuka halaman pemantauan bidan dan mendapat kerangka
 * halaman lengkap; isinya kosong karena RLS menyaring datanya, tetapi pengguna
 * tidak diberi tahu bahwa ia salah halaman.
 *
 * RLS tetap menjadi penjaga sesungguhnya. Pemeriksaan di sini adalah lapisan
 * kejelasan, bukan lapisan keamanan: tugasnya mengarahkan pengguna ke halaman
 * yang tepat, bukan menahan penyerang.
 *
 * Pembantu yang tidak membutuhkan permintaan, seperti penyusun inisial dan
 * pemetaan label, berada di `peran.ts` agar dapat diuji tanpa konteks Next.
 */

export type { Peran } from "./peran";
export {
  HALAMAN_PERAN,
  LABEL_PERAN,
  bolehBuka,
  inisial,
  namaRingkas,
} from "./peran";

export interface Sesi {
  id: string;
  peran: Peran | null;
  nama: string | null;
}

/**
 * Membaca sesi yang sedang berjalan beserta perannya.
 *
 * Mengembalikan `null` bila tidak ada yang masuk. Bila pengguna masuk tetapi
 * tidak memiliki baris `profil`, `peran` bernilai null. Keadaan itu nyata dan
 * perlu dibedakan: pengguna yang dibuat lewat dashboard Supabase memperoleh akun
 * tanpa profil, sebab belum ada trigger yang membuatnya.
 */
export async function bacaSesi(): Promise<Sesi | null> {
  if (!supabaseTerkonfigurasi()) return null;

  const supabase = await klienServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) return null;

  const { data: profil } = await supabase
    .from("profil")
    .select("peran, nama")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    peran: (profil?.peran as Peran) ?? null,
    nama: profil?.nama ?? null,
  };
}

/**
 * Memastikan pengguna yang masuk memiliki salah satu peran yang diizinkan.
 *
 * Bila perannya berbeda, ia dialihkan ke halaman miliknya sendiri alih-alih
 * ditolak dengan pesan galat. Pengguna yang menekan tautan yang bukan haknya
 * lebih tertolong bila diantar ke tempat yang benar.
 *
 * Mengembalikan `null` bila tidak ada sesi, agar halaman pemanggil dapat
 * menampilkan pagar "silakan masuk" beserta konteksnya sendiri.
 *
 * Pengguna yang memiliki sesi tetapi tidak memiliki peran juga dikembalikan
 * apa adanya, bukan dialihkan. Tidak ada halaman peran yang dapat menerimanya,
 * sehingga pengalihan hanya akan memantulkannya berulang kali.
 */
export async function wajibPeran(diizinkan: Peran[]): Promise<Sesi | null> {
  const sesi = await bacaSesi();

  if (!sesi) return null;

  if (sesi.peran && !diizinkan.includes(sesi.peran)) {
    redirect(HALAMAN_PERAN[sesi.peran]);
  }

  return sesi;
}
