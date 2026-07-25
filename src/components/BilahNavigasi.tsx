import { Navbar } from "./Navbar";
import { bacaSesi, inisial, LABEL_PERAN, namaRingkas } from "@/lib/sesi";

/**
 * Pembungkus server untuk bilah navigasi.
 *
 * Bilah navigasi adalah komponen klien karena membutuhkan `usePathname` untuk
 * menandai halaman aktif dan `useState` untuk tombol keluar. Keadaan sesi hanya
 * dapat dibaca di server, sebab cookie sesi ditandai httpOnly.
 *
 * Berkas ini menjembatani keduanya: membaca sesi di server, lalu meneruskan
 * hasilnya sebagai props. Dengan begitu bilah navigasi tidak perlu memanggil
 * Supabase dari peramban, dan tidak ada kedipan tampilan antara keadaan "belum
 * masuk" dan "sudah masuk" saat halaman dimuat.
 *
 * Dipakai oleh seluruh halaman, termasuk beranda, sehingga pengguna yang sudah
 * masuk tidak pernah lagi disuguhi tombol "Masuk".
 */
export async function BilahNavigasi() {
  const sesi = await bacaSesi();

  if (!sesi) return <Navbar />;

  return (
    <Navbar
      peran={sesi.peran}
      labelPeran={sesi.peran ? LABEL_PERAN[sesi.peran] : "Tanpa peran"}
      nama={namaRingkas(sesi.nama)}
      inisial={inisial(sesi.nama)}
    />
  );
}
