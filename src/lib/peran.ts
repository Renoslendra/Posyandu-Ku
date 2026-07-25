/**
 * Peran pengguna beserta pembantunya yang murni.
 *
 * Dipisahkan dari `sesi.ts` karena berkas itu menarik `next/headers` melalui
 * klien Supabase sisi server, dan berkas apa pun yang mengimpornya tidak dapat
 * dijalankan di luar konteks permintaan Next. Pemisahan ini membuat fungsi di
 * bawah dapat diuji langsung, dan dapat dipakai komponen klien tanpa membawa
 * kode server ke bundel peramban.
 */

export type Peran = "kader" | "bidan" | "orang_tua";

/** Label yang ditampilkan kepada pengguna untuk setiap peran. */
export const LABEL_PERAN: Record<Peran, string> = {
  kader: "Kader",
  bidan: "Bidan",
  orang_tua: "Orang tua",
};

/** Halaman utama masing-masing peran, dipakai saat mengalihkan. */
export const HALAMAN_PERAN: Record<Peran, string> = {
  kader: "/kader",
  bidan: "/bidan",
  orang_tua: "/orangtua",
};

/**
 * Halaman yang boleh dibuka setiap peran.
 *
 * Dipakai untuk menyaring tautan navigasi maupun memeriksa hak di server,
 * sehingga keduanya tidak dapat berbeda. Menampilkan tautan yang berujung pada
 * pengalihan membuat pengguna mengira dirinya salah menekan, padahal
 * aplikasinya yang menawarkan tautan yang salah.
 */
export const HALAMAN_DIIZINKAN: Record<Peran, string[]> = {
  kader: ["/", "/kader", "/anak"],
  bidan: ["/", "/bidan", "/anak"],
  orang_tua: ["/", "/orangtua", "/anak"],
};

/**
 * Gelar sapaan yang dilewati saat menyusun inisial.
 *
 * Inisial "BU" atau "IB" tidak membedakan siapa pun, sehingga sapaan dibuang
 * selama masih ada kata berarti sesudahnya.
 */
const SAPAAN = new Set(["bu", "ibu", "pak", "bapak", "mbak", "mas", "bidan"]);

/**
 * Menyusun inisial dari nama untuk penanda identitas.
 *
 * Memakai inisial, bukan gambar, dengan alasan yang sama seperti pada halaman
 * masuk: tidak dapat gagal dimuat dan tidak memerlukan foto siapa pun.
 *
 * Nama pada data demo memuat keterangan peran dalam tanda kurung, misalnya
 * "Bu Ani (Kader)". Bagian itu dibuang lebih dahulu agar inisialnya tidak
 * berubah menjadi huruf peran.
 */
export function inisial(nama: string | null | undefined): string {
  if (!nama) return "?";

  const bersih = nama.replace(/\([^)]*\)/g, "").trim();
  const kata = bersih.split(/\s+/).filter(Boolean);

  if (kata.length === 0) return "?";

  const berarti = kata.filter((k) => !SAPAAN.has(k.toLowerCase()));
  const dipakai = berarti.length > 0 ? berarti : kata;

  return dipakai
    .slice(0, 2)
    .map((k) => k[0].toUpperCase())
    .join("");
}

/** Nama tanpa keterangan peran di dalam tanda kurung, untuk ditampilkan. */
export function namaRingkas(nama: string | null | undefined): string {
  if (!nama) return "Pengguna";
  return nama.replace(/\([^)]*\)/g, "").trim() || "Pengguna";
}

/**
 * Memeriksa apakah suatu peran berhak membuka jalur tertentu.
 *
 * Beranda selalu boleh. Jalur lain dicocokkan lewat awalannya agar halaman
 * anak, yang beralamat `/anak/<id>`, tetap terjangkau ketiga peran.
 */
export function bolehBuka(peran: Peran, jalur: string): boolean {
  if (jalur === "/") return true;
  return HALAMAN_DIIZINKAN[peran].some(
    (h) => h !== "/" && jalur.startsWith(h),
  );
}
