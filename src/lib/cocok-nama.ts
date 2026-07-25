/**
 * Pencocokan nama hasil pembacaan foto ke anak yang sudah terdaftar.
 *
 * Nama pada buku tulis ditulis tangan, sehingga hasil pembacaannya sering
 * berbeda tipis dari nama di basis data: huruf besar kecil tidak konsisten,
 * spasi ganda, atau sebutan seperti "An." dan "Ananda" di depan nama.
 *
 * Pendekatan yang dipakai sengaja konservatif. Kecocokan hanya diterima bila
 * nama benar-benar sama setelah dinormalkan, atau bila ada tepat satu calon
 * yang mengandung nama tersebut. Bila ada dua calon atau lebih, sistem menolak
 * memilih dan menyerahkannya kepada kader.
 *
 * Alasan kekonservatifan itu: mencocokkan ke anak yang salah berarti menuliskan
 * berat badan seorang anak ke rekam anak lain. Kesalahan itu tidak terlihat
 * setelah tersimpan, dan dapat memicu peringatan gizi buruk palsu sekaligus
 * menyembunyikan yang sungguhan. Meminta kader memilih jauh lebih murah
 * daripada memperbaiki data yang tertukar.
 */

export interface CalonAnak {
  id: string;
  nama: string;
}

export type JenisKecocokan =
  /** Nama sama setelah dinormalkan. */
  | "persis"
  /** Tepat satu calon mengandung nama yang dibaca, atau sebaliknya. */
  | "sebagian"
  /** Tidak ada calon yang menyerupai. */
  | "tidak_ada"
  /** Lebih dari satu calon menyerupai; kader harus memilih. */
  | "ganda";

export interface HasilCocok {
  jenis: JenisKecocokan;
  /** Terisi hanya pada 'persis' dan 'sebagian'. */
  anakId: string | null;
  /** Calon yang menyerupai, untuk ditampilkan saat jenisnya 'ganda'. */
  kandidat: CalonAnak[];
}

/**
 * Menormalkan nama untuk pembandingan.
 *
 * Yang dibuang: perbedaan huruf besar kecil, spasi berlebih, tanda baca, dan
 * sebutan yang biasa ditulis kader di depan nama anak.
 *
 * Gelar tidak dibuang karena anak balita tidak bergelar; yang muncul di buku
 * posyandu adalah sebutan, bukan gelar.
 */
export function normalkanNama(nama: string): string {
  return nama
    .toLowerCase()
    // Sebutan yang lazim ditulis di depan nama anak pada buku posyandu.
    .replace(/^(an|ananda|adik|adk|by|baby|anak)\.?\s+/u, "")
    // Tanda baca menjadi spasi, bukan dihapus, agar "sri-wahyuni" tetap
    // terbaca sebagai dua kata alih-alih menyatu.
    .replace(/[.,'"`\-_/\\()]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Mencocokkan satu nama hasil pembacaan ke daftar anak terdaftar.
 *
 * Urutan pemeriksaan: kecocokan persis lebih dulu, baru kecocokan sebagian.
 * Dengan begitu nama "Siti" tetap tercocok ke anak bernama "Siti" meski ada
 * juga "Siti Aminah" di daftar yang sama.
 */
export function cocokkanNama(nama: string, calon: CalonAnak[]): HasilCocok {
  const dicari = normalkanNama(nama);

  if (dicari.length === 0) {
    return { jenis: "tidak_ada", anakId: null, kandidat: [] };
  }

  const persis = calon.filter((c) => normalkanNama(c.nama) === dicari);
  if (persis.length === 1) {
    return { jenis: "persis", anakId: persis[0].id, kandidat: persis };
  }
  // Dua anak dengan nama identik memang mungkin terjadi di satu desa. Sistem
  // tidak boleh menebak yang mana.
  if (persis.length > 1) {
    return { jenis: "ganda", anakId: null, kandidat: persis };
  }

  const sebagian = calon.filter((c) => {
    const kandidat = normalkanNama(c.nama);
    return kandidat.includes(dicari) || dicari.includes(kandidat);
  });

  if (sebagian.length === 1) {
    return { jenis: "sebagian", anakId: sebagian[0].id, kandidat: sebagian };
  }
  if (sebagian.length > 1) {
    return { jenis: "ganda", anakId: null, kandidat: sebagian };
  }

  return { jenis: "tidak_ada", anakId: null, kandidat: [] };
}

/** Penjelasan singkat untuk ditampilkan kepada kader. */
export const PESAN_KECOCOKAN: Record<JenisKecocokan, string> = {
  persis: "Nama cocok dengan data anak terdaftar",
  sebagian: "Nama mirip dengan satu anak terdaftar. Mohon pastikan benar",
  tidak_ada: "Nama tidak ditemukan. Pilih anak, atau daftarkan lebih dahulu",
  ganda: "Ada beberapa anak dengan nama serupa. Mohon pilih yang benar",
};
