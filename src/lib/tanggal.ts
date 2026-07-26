/**
 * Pembantu tanggal.
 *
 * Dipusatkan karena tiga formulir sebelumnya menyusun tanggal hari ini dengan
 * `new Date().toISOString().slice(0, 10)`, dan cara itu salah untuk Indonesia.
 *
 * `toISOString` selalu mengembalikan waktu UTC. Tengah malam UTC adalah pukul
 * tujuh pagi di Waktu Indonesia Barat, sehingga kader yang membuka formulir
 * sebelum jam tujuh mendapat tanggal **hari sebelumnya** terisi otomatis.
 * Penimbangan posyandu pagi bukan hal aneh, dan pada formulir pendaftaran anak
 * akibatnya lebih tegas lagi: batas `max` pada kolom tanggal lahir juga bergeser,
 * sehingga bayi yang lahir hari itu tidak dapat didaftarkan.
 *
 * Fungsi di sini memakai getter waktu lokal, sehingga tanggalnya sama dengan
 * yang tertera pada kalender di dinding posyandu.
 */

/**
 * Tanggal hari ini menurut waktu perangkat, dalam bentuk `YYYY-MM-DD`.
 *
 * Perlu dipanggil di dalam `useEffect`, bukan saat render, agar tidak ada
 * ketidaksesuaian antara HTML yang dibuat server dan render pertama di peramban.
 */
export function tanggalHariIni(): string {
  return keTanggalIso(new Date());
}

/** Mengubah objek Date menjadi `YYYY-MM-DD` memakai komponen waktu lokal. */
export function keTanggalIso(d: Date): string {
  const tahun = d.getFullYear();
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const hari = String(d.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

/**
 * Zona waktu yang dipakai untuk tanggal yang dibuat di peladen.
 *
 * Kedua fungsi di atas memakai waktu lokal, dan itu benar untuk kode yang
 * berjalan di peramban kader: waktu lokal peramban memang waktu kader. Namun di
 * peladen, waktu lokal adalah UTC, sehingga cara yang sama menghasilkan galat
 * yang sedang diperbaiki, hanya berpindah tempat.
 *
 * Keluaran yang dibuat peladen dan dibaca manusia karena itu perlu menyatakan
 * zona waktunya dengan tegas, tidak mewarisinya dari lingkungan tempat proses
 * berjalan.
 */
const ZONA_INDONESIA = "Asia/Jakarta";

/**
 * Mengubah objek Date menjadi `YYYY-MM-DD` menurut kalender Indonesia.
 *
 * Dipakai untuk keluaran yang disusun peladen, khususnya tanggal cetak dan nama
 * berkas laporan. Tanpa ini, laporan yang diunduh bidan pukul enam pagi
 * bertuliskan tanggal hari sebelumnya, dan laporan bertanggal mundur yang
 * berpindah tangan ke dinas kesehatan akan diragukan seluruh isinya.
 *
 * Waktu Indonesia Tengah dan Timur berselisih satu dan dua jam dari zona ini.
 * Selisih itu hanya berpengaruh pada unduhan yang dilakukan lewat tengah malam,
 * dan menyatakan satu zona secara tegas tetap lebih baik daripada mewarisi zona
 * peladen yang tidak berhubungan dengan siapa pun.
 */
export function keTanggalIsoIndonesia(d: Date): string {
  // Bentuk en-CA menghasilkan susunan tahun-bulan-hari yang dibutuhkan.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_INDONESIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Mengubah tanggal ISO menjadi bentuk singkat yang lazim dibaca, misalnya
 * "12 Mar 2025".
 *
 * Dipakai pada tabel riwayat, tempat lebar kolom terbatas dan bentuk ISO sukar
 * dibaca cepat. Orang tua yang membandingkan penimbangan bulan ini dengan bulan
 * lalu membaca nama bulan jauh lebih cepat daripada angka.
 *
 * Diurai sebagai bagian-bagian angka, bukan diserahkan ke `new Date()`. Alasannya
 * sama seperti di berkas ini pada umumnya: `new Date("2025-03-12")` diartikan
 * sebagai tengah malam UTC, yang di Indonesia sudah pukul tujuh pagi tanggal yang
 * sama, tetapi di zona waktu negatif menjadi tanggal sebelumnya. Menguraikannya
 * sendiri menghilangkan seluruh kemungkinan itu.
 *
 * Masukan yang tidak dikenali dikembalikan apa adanya. Mengembalikan "Invalid
 * Date" pada tabel riwayat lebih buruk daripada memperlihatkan nilai aslinya:
 * yang pertama menyembunyikan datanya, yang kedua masih dapat ditelusuri.
 */
const NAMA_BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export function tanggalIndonesiaSingkat(iso: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!cocok) return iso;

  const bulan = Number(cocok[2]);
  if (bulan < 1 || bulan > 12) return iso;

  return `${Number(cocok[3])} ${NAMA_BULAN_SINGKAT[bulan - 1]} ${cocok[1]}`;
}
