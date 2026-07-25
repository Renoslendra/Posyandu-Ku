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
  return (
    nama
      .toLowerCase()
      /*
       * Aksara beraksen disetarakan dengan bentuk dasarnya, dan spasi tak-putus
       * dari hasil salin-tempel diperlakukan sebagai spasi biasa. Tanpa ini, nama
       * yang tampak serupa di layar tidak akan pernah cocok.
       */
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/\u00a0/gu, " ")
      /*
       * Tanda baca diubah menjadi spasi lebih dahulu, baru sebutan dibuang.
       *
       * Urutan ini penting. Pada urutan sebaliknya, tulisan rapat seperti
       * "An.Aisyah" tidak tersentuh pembuang sebutan karena tidak ada spasi
       * sesudahnya, sehingga hasilnya "an aisyah" dan tidak pernah cocok persis
       * dengan "aisyah".
       */
      .replace(/[.,'"`\-_/\\()]+/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      /*
       * Sebutan yang lazim ditulis kader di depan nama anak.
       *
       * "anak" sengaja tidak termasuk. Pada nama Bali, "Anak Agung" adalah gelar
       * kehormatan yang merupakan bagian sah dari nama, dan membuangnya mengubah
       * identitas orangnya. Kerugian membiarkan "Anak" pada satu dua catatan
       * jauh lebih kecil daripada memotong nama yang benar.
       */
      .replace(/^(an|ananda|adik|adk|by|baby)\s+/u, "")
      .trim()
  );
}

/** Memecah nama yang sudah dinormalkan menjadi kata-katanya. */
function kata(namaNormal: string): string[] {
  return namaNormal.split(" ").filter((k) => k.length > 0);
}

/**
 * Memeriksa apakah dua nama cukup menyerupai untuk dianggap orang yang sama.
 *
 * Membandingkan kata, bukan potongan huruf. Diterima bila seluruh kata pada
 * salah satu nama muncul juga pada nama yang lain, misalnya "Aisyah" terhadap
 * "Aisyah Putri".
 *
 * Sebelumnya pembandingan memakai `String.includes`, dan itu berbahaya karena
 * tidak mengenal batas kata. Anak terdaftar bernama "Ani" akan tercocok dengan
 * bacaan "Handayani", sebab potongan hurufnya kebetulan bersarang. Bila hanya
 * satu anak yang bersarang seperti itu, sistem memilihnya tanpa bertanya, dan
 * berat badan seorang anak tertulis ke rekam anak lain tanpa ada yang tahu.
 *
 * Kata sangat pendek tidak cukup menjadi dasar pencocokan. Satu kata dua huruf
 * yang sama dapat muncul pada nama yang tidak berkaitan, sehingga nama sekata
 * diwajibkan memiliki panjang memadai.
 */
function menyerupai(a: string, b: string): boolean {
  const kataA = kata(a);
  const kataB = kata(b);

  if (kataA.length === 0 || kataB.length === 0) return false;

  const pendek = kataA.length <= kataB.length ? kataA : kataB;
  const panjang = pendek === kataA ? kataB : kataA;

  /*
   * Nama sekata perlu setidaknya empat huruf. Nama Indonesia yang lebih pendek
   * dari itu terlalu umum untuk membedakan seorang anak dari yang lain.
   */
  if (pendek.length === 1 && pendek[0].length < 4) return false;

  const himpunan = new Set(panjang);
  return pendek.every((k) => himpunan.has(k));
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

  /*
   * Calon yang namanya menormalkan menjadi kosong dibuang lebih dahulu.
   *
   * Nama yang seluruhnya tanda baca, misalnya ".." atau "--", lolos validasi
   * pendaftaran karena panjangnya memadai, namun menormalkan menjadi string
   * kosong. Pada pembandingan lama, calon semacam itu menjadi pencocok segala:
   * setiap nama "mengandung" string kosong, sehingga satu anak dengan nama
   * seperti itu di satu posyandu akan menyerap seluruh baris yang tidak cocok
   * persis, tanpa satu pun peringatan.
   */
  const calonSah = calon
    .map((c) => ({ calon: c, normal: normalkanNama(c.nama) }))
    .filter((c) => c.normal.length > 0);

  const persis = calonSah.filter((c) => c.normal === dicari);
  if (persis.length === 1) {
    return { jenis: "persis", anakId: persis[0].calon.id, kandidat: [persis[0].calon] };
  }
  // Dua anak dengan nama identik memang mungkin terjadi di satu desa. Sistem
  // tidak boleh menebak yang mana.
  if (persis.length > 1) {
    return { jenis: "ganda", anakId: null, kandidat: persis.map((c) => c.calon) };
  }

  const sebagian = calonSah.filter((c) => menyerupai(c.normal, dicari));

  if (sebagian.length === 1) {
    return {
      jenis: "sebagian",
      anakId: sebagian[0].calon.id,
      kandidat: [sebagian[0].calon],
    };
  }
  if (sebagian.length > 1) {
    return { jenis: "ganda", anakId: null, kandidat: sebagian.map((c) => c.calon) };
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
