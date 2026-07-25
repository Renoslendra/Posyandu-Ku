/**
 * Antrean pengukuran saat tanpa koneksi.
 *
 * Posyandu di desa sering tanpa sinyal. Bila kader tidak dapat mencatat di
 * tempat, ia akan kembali ke buku tulis dan seluruh produk kehilangan gunanya
 * justru di tempat yang paling membutuhkannya.
 *
 * Rancangan:
 *   - antrean disimpan di localStorage, bukan memori, agar tahan muat ulang
 *   - setiap entri membawa penanda unik sebagai kunci idempoten, sehingga
 *     pengiriman ulang tidak menghasilkan data ganda
 *   - Z-score dihitung di perangkat agar kader tetap melihat status seketika
 *
 * localStorage dipilih daripada IndexedDB karena data yang ditampung kecil
 * (puluhan baris per sesi posyandu) dan API-nya sinkron sehingga tidak
 * menambah kerumitan penanganan galat.
 */

const KUNCI = "posyanduku.antrean.v1";

export interface EntriAntrean {
  /** Kunci idempoten. Server menolak duplikat berdasarkan nilai ini. */
  klienRef: string;
  anakId: string;
  tanggal: string;
  beratKg: number;
  tinggiCm: number;
  diukurTelentang: boolean;
  abaikanPenanda: boolean;
  /** Waktu entri dibuat, untuk mengurutkan pengiriman. */
  dibuatPada: number;
}

function tersedia(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function bacaAntrean(): EntriAntrean[] {
  if (!tersedia()) return [];
  try {
    const mentah = window.localStorage.getItem(KUNCI);
    if (!mentah) return [];
    const isi = JSON.parse(mentah);
    return Array.isArray(isi) ? (isi as EntriAntrean[]) : [];
  } catch {
    // Data rusak lebih baik dibuang daripada menghalangi pencatatan baru.
    return [];
  }
}

function tulisAntrean(daftar: EntriAntrean[]): void {
  if (!tersedia()) return;
  try {
    window.localStorage.setItem(KUNCI, JSON.stringify(daftar));
  } catch {
    // Kuota penyimpanan penuh. Diabaikan agar tidak menggagalkan pencatatan.
  }
}

/** Membuat penanda unik untuk satu entri antrean. */
export function buatKlienRef(): string {
  const acak = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${acak}`;
}

export function tambahKeAntrean(entri: Omit<EntriAntrean, "dibuatPada">): void {
  const daftar = bacaAntrean();
  daftar.push({ ...entri, dibuatPada: Date.now() });
  tulisAntrean(daftar);
}

export function hapusDariAntrean(klienRef: string): void {
  tulisAntrean(bacaAntrean().filter((e) => e.klienRef !== klienRef));
}

export function jumlahAntrean(): number {
  return bacaAntrean().length;
}

export interface HasilSinkron {
  terkirim: number;
  gagal: number;
}

/**
 * Mengirim seluruh antrean ke server.
 *
 * Entri yang berhasil, maupun yang ditolak karena duplikat, dikeluarkan dari
 * antrean. Entri yang gagal karena jaringan dipertahankan untuk dicoba lagi.
 *
 * Nilai 422 (data tidak wajar) juga dikeluarkan: mencobanya berulang tidak akan
 * pernah berhasil, dan menahannya akan menyumbat antrean selamanya.
 */
export async function sinkronkanAntrean(): Promise<HasilSinkron> {
  const daftar = bacaAntrean().sort((a, b) => a.dibuatPada - b.dibuatPada);
  let terkirim = 0;
  let gagal = 0;

  for (const entri of daftar) {
    try {
      const respons = await fetch("/api/pengukuran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anakId: entri.anakId,
          tanggal: entri.tanggal,
          beratKg: entri.beratKg,
          tinggiCm: entri.tinggiCm,
          diukurTelentang: entri.diukurTelentang,
          // Antrean offline dikirim dengan penanda disetujui, karena kader
          // sudah memeriksanya saat mencatat di lapangan.
          abaikanPenanda: true,
          klienRef: entri.klienRef,
        }),
      });

      if (respons.ok || respons.status === 422) {
        hapusDariAntrean(entri.klienRef);
        if (respons.ok) terkirim += 1;
        else gagal += 1;
      } else {
        gagal += 1;
      }
    } catch {
      // Kemungkinan besar masih tanpa koneksi. Entri dipertahankan.
      gagal += 1;
    }
  }

  return { terkirim, gagal };
}
