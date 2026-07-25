/**
 * Pembatasan laju untuk endpoint yang memanggil penyedia model.
 *
 * Penghitungnya disimpan di basis data, bukan di memori proses. Alasannya:
 * pada lingkungan serverless setiap permintaan dapat dilayani proses berbeda,
 * sehingga penghitung dalam memori hilang dan batasnya tidak pernah tercapai.
 * Batas yang tidak berfungsi lebih buruk daripada tidak ada batas, karena
 * menciptakan keyakinan yang salah bahwa biaya API sudah terlindungi.
 *
 * Yang dilindungi adalah biaya panggilan ke penyedia model, bukan data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AturanBatas {
  /** Nama endpoint, dipakai sebagai kunci penghitung. */
  endpoint: string;
  /** Jumlah panggilan maksimal dalam satu jendela. */
  batas: number;
  /** Panjang jendela dalam detik. */
  jendelaDetik: number;
}

/**
 * Batas per endpoint.
 *
 * Ringkasan bulanan dibatasi lebih ketat karena promptnya paling besar dan
 * hasilnya jarang berubah dalam hitungan menit. Import foto diberi ruang lebih
 * lapang karena kader memang memfoto beberapa halaman berurutan.
 */
export const BATAS: Record<string, AturanBatas> = {
  ringkasan: { endpoint: "ringkasan", batas: 5, jendelaDetik: 60 },
  menu: { endpoint: "menu", batas: 8, jendelaDetik: 60 },
  importFoto: { endpoint: "import_foto", batas: 12, jendelaDetik: 60 },
};

export interface HasilBatas {
  ditolak: boolean;
  /** Pesan untuk pengguna bila ditolak. */
  pesan?: string;
}

/**
 * Mencatat satu panggilan dan memeriksa apakah batas terlampaui.
 *
 * Pemeriksaan dan penambahan terjadi di satu pernyataan SQL, sehingga dua
 * permintaan yang datang bersamaan tidak dapat sama-sama lolos.
 *
 * Bila fungsi basis datanya belum ada atau gagal dihubungi, permintaan
 * DIIZINKAN. Pilihan ini disengaja: kegagalan pembatasan laju tidak boleh
 * mematikan fitur yang sedang dipakai kader di lapangan. Risikonya terbatas
 * pada biaya API, sedangkan menolak permintaan akan menghentikan pekerjaan
 * yang sah.
 */
export async function periksaBatas(
  supabase: SupabaseClient,
  aturan: AturanBatas,
): Promise<HasilBatas> {
  const { data, error } = await supabase.rpc("catat_panggilan", {
    nama_endpoint: aturan.endpoint,
    batas: aturan.batas,
    jendela_detik: aturan.jendelaDetik,
  });

  if (error) {
    // Dicatat agar terlihat di log, namun tidak menghalangi permintaan.
    console.warn(`Pembatasan laju tidak dapat diperiksa: ${error.message}`);
    return { ditolak: false };
  }

  if (data === true) {
    return {
      ditolak: true,
      pesan: `Terlalu banyak permintaan. Mohon tunggu sekitar ${aturan.jendelaDetik} detik sebelum mencoba lagi.`,
    };
  }

  return { ditolak: false };
}
