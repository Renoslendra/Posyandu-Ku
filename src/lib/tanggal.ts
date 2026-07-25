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
