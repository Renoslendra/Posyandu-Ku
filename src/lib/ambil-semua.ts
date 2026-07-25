/**
 * Pengambilan seluruh baris secara bertahap.
 *
 * PostgREST menerapkan batas jumlah baris pada setiap permintaan, umumnya seribu.
 * Ketika batas itu terlampaui, tidak ada galat: klien hanya menerima lebih
 * sedikit baris daripada yang ada. Kegagalan yang tidak bersuara itu justru yang
 * paling berbahaya bagi aplikasi ini, sebab yang terpotong bukan tampilan,
 * melainkan angka.
 *
 * Akibatnya nyata pada rekapitulasi bidan. Ringkasan dihitung dari senarai yang
 * diterima, sehingga bila riwayat penimbangan terpotong: anak yang sudah
 * ditimbang tampak belum dinilai, anak yang aktif tampak berhenti menimbang, dan
 * laporan yang berpindah tangan ke dinas kesehatan memuat angka yang salah tanpa
 * satu pun tanda bahwa ada yang hilang.
 *
 * Arah pemotongannya pun paling merugikan. Riwayat diurutkan menaik menurut
 * tanggal, sehingga yang terbuang adalah pengukuran paling baru, yakni justru
 * yang menentukan status terkini setiap anak.
 *
 * Satu posyandu dengan dua ratus anak yang ditimbang setiap bulan melewati seribu
 * baris dalam waktu kurang dari setahun. Jadi ini bukan persoalan yang menunggu
 * skala besar; ia menunggu waktu berjalan.
 */

/** Banyaknya baris per permintaan. Di bawah batas bawaan PostgREST. */
const UKURAN_HALAMAN = 1000;

/**
 * Batas jumlah halaman sebagai pengaman.
 *
 * Tanpa batas ini, kekeliruan pada kueri dapat membuat penjalanan berputar tanpa
 * henti dan menghabiskan waktu fungsi. Seratus halaman setara seratus ribu baris,
 * jauh di atas kebutuhan satu wilayah, sehingga batas ini tidak akan tercapai
 * pada pemakaian yang wajar.
 */
const MAKS_HALAMAN = 100;

export interface HasilAmbilSemua<T> {
  baris: T[];
  /**
   * Apakah pengambilan berhenti karena mencapai batas pengaman.
   *
   * Bila benar, angka yang dihitung dari senarai ini tidak lengkap. Pemanggil
   * wajib menyatakannya kepada pengguna alih-alih menampilkan hasil yang tampak
   * meyakinkan.
   */
  terpotong: boolean;
}

/**
 * Mengambil seluruh baris dari satu kueri, halaman demi halaman.
 *
 * Penerima parameter berupa fungsi pembentuk kueri, bukan kueri yang sudah
 * jadi, sebab setiap halaman memerlukan jangkauan baris yang berbeda dan objek
 * kueri Supabase tidak dapat dipakai ulang.
 *
 * Contoh:
 *
 *     const { baris } = await ambilSemua((dari, sampai) =>
 *       supabase.from("pengukuran").select("anak_id, tanggal").range(dari, sampai),
 *     );
 */
export async function ambilSemua<T>(
  kueri: (
    dari: number,
    sampai: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<HasilAmbilSemua<T>> {
  const baris: T[] = [];

  for (let halaman = 0; halaman < MAKS_HALAMAN; halaman += 1) {
    const dari = halaman * UKURAN_HALAMAN;
    const { data, error } = await kueri(dari, dari + UKURAN_HALAMAN - 1);

    /*
     * Kegagalan di tengah penjalanan tidak boleh menghasilkan senarai separuh
     * yang tampak lengkap. Lebih baik mengembalikan penanda terpotong, agar
     * pemanggil dapat menyatakannya, daripada menyajikan angka yang salah.
     */
    if (error) return { baris, terpotong: true };

    const diterima = data ?? [];
    baris.push(...diterima);

    // Halaman yang tidak penuh menandakan tidak ada lagi baris sesudahnya.
    if (diterima.length < UKURAN_HALAMAN) {
      return { baris, terpotong: false };
    }
  }

  return { baris, terpotong: true };
}
