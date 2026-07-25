import { redirect } from "next/navigation";
import { FormMasuk } from "./FormMasuk";
import { bacaSesi, HALAMAN_PERAN } from "@/lib/sesi";

/**
 * Halaman masuk.
 *
 * Dijadikan komponen server yang hanya memeriksa sesi, sedangkan formulirnya
 * berada di `FormMasuk` sebagai komponen klien. Pemisahan ini diperlukan karena
 * keadaan sesi hanya dapat dibaca di server, sementara formulirnya membutuhkan
 * keadaan lokal untuk kolom masukan dan pesan galat.
 */
export default async function HalamanMasuk() {
  const sesi = await bacaSesi();

  /*
   * Pengguna yang sudah masuk tidak perlu melihat formulir masuk lagi.
   *
   * Sebelumnya halaman ini menyajikan formulir kosong kepada siapa saja,
   * termasuk pengguna yang sudah memiliki sesi. Bersama tombol "Masuk" yang
   * selalu tampil pada bilah navigasi, keadaan itu membuat aplikasi seolah
   * melupakan siapa yang sedang memakainya.
   *
   * Pengguna tanpa baris `profil` sengaja tidak dialihkan. Ia memang memiliki
   * sesi, tetapi tidak ada halaman peran yang dapat menerimanya, sehingga
   * mengalihkannya hanya akan memantulkannya kembali ke sini.
   */
  if (sesi?.peran) {
    redirect(HALAMAN_PERAN[sesi.peran]);
  }

  return <FormMasuk />;
}
