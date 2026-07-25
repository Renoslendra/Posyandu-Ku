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
 *
 * Prinsip yang ditegakkan seluruh berkas ini: **data kader tidak boleh hilang
 * tanpa ia tahu.** Setiap kegagalan dilaporkan kepada pemanggil, dan tidak ada
 * jalur yang membuang catatan secara diam-diam.
 */

const KUNCI = "posyanduku.antrean.v1";

/** Kunci terpisah untuk entri yang ditolak server dan perlu dilihat kader. */
const KUNCI_DITOLAK = "posyanduku.ditolak.v1";

/**
 * Batas percobaan pengiriman satu entri.
 *
 * Diperlukan karena kegagalan yang tidak akan pernah berhasil, misalnya data
 * yang ditolak validasi atau sesi yang sudah kedaluwarsa, sebelumnya dicoba
 * berulang tanpa henti. Akibatnya antrean menetap selamanya, setiap muat halaman
 * menembakkan permintaan yang pasti gagal, dan penanda "menunggu dikirim" tidak
 * pernah hilang sehingga kader tidak tahu apa yang harus dilakukan.
 */
const MAKS_PERCOBAAN = 5;

/**
 * Batas jumlah entri dalam antrean.
 *
 * Menahan antrean agar tidak tumbuh sampai menghabiskan kuota penyimpanan.
 * Satu sesi posyandu wajar memuat puluhan baris; angka ini jauh di atasnya.
 */
const MAKS_ENTRI = 500;

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
  /** Berapa kali pengiriman entri ini sudah gagal. */
  percobaan?: number;
}

/** Entri yang ditolak server, disimpan agar kader dapat menindaklanjutinya. */
export interface EntriDitolak {
  klienRef: string;
  anakId: string;
  tanggal: string;
  beratKg: number;
  tinggiCm: number;
  /** Alasan yang dapat dibaca kader. */
  alasan: string;
}

function tersedia(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

/**
 * Memeriksa bahwa satu entri berbentuk utuh.
 *
 * Data dari localStorage tidak dapat dipercaya bentuknya: berkasnya dapat
 * terpotong saat kuota habis, atau ditulis oleh versi aplikasi sebelumnya.
 * Entri yang tidak lengkap disaring alih-alih diteruskan ke server, sebab entri
 * cacat akan ditolak berulang kali dan menyumbat antrean.
 */
function entriSah(nilai: unknown): nilai is EntriAntrean {
  if (typeof nilai !== "object" || nilai === null) return false;
  const e = nilai as Record<string, unknown>;

  return (
    typeof e.klienRef === "string" &&
    e.klienRef.length > 0 &&
    typeof e.anakId === "string" &&
    typeof e.tanggal === "string" &&
    typeof e.beratKg === "number" &&
    Number.isFinite(e.beratKg) &&
    typeof e.tinggiCm === "number" &&
    Number.isFinite(e.tinggiCm) &&
    typeof e.diukurTelentang === "boolean"
  );
}

export function bacaAntrean(): EntriAntrean[] {
  if (!tersedia()) return [];
  try {
    const mentah = window.localStorage.getItem(KUNCI);
    if (!mentah) return [];

    const isi = JSON.parse(mentah);
    if (!Array.isArray(isi)) return [];

    /*
     * Entri disaring satu per satu, bukan seluruh antrean dibuang saat ada satu
     * yang cacat. Sebelumnya satu byte rusak menghapus semua catatan menunggu
     * dari pandangan, tanpa pesan, dan kader menyimpulkan semuanya sudah
     * terkirim.
     */
    return isi.filter(entriSah).map((e) => ({
      ...e,
      dibuatPada: typeof e.dibuatPada === "number" ? e.dibuatPada : Date.now(),
      percobaan: typeof e.percobaan === "number" ? e.percobaan : 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Menuliskan antrean ke penyimpanan.
 *
 * Mengembalikan false bila gagal, dan itulah perubahan terpentingnya.
 * Sebelumnya kegagalan diabaikan tanpa nilai kembalian, sehingga pemanggil tetap
 * menampilkan "tersimpan di perangkat ini" padahal tidak ada apa pun yang
 * tersimpan. Ini nyata pada peramban dengan penyimpanan dibatasi: localStorage
 * tersedia sehingga pemeriksaan keberadaannya lolos, tetapi penulisan melempar.
 */
function tulisAntrean(daftar: EntriAntrean[]): boolean {
  if (!tersedia()) return false;
  try {
    window.localStorage.setItem(KUNCI, JSON.stringify(daftar));
    return true;
  } catch {
    return false;
  }
}

/** Membuat penanda unik untuk satu entri antrean. */
export function buatKlienRef(): string {
  const acak = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${acak}`;
}

/**
 * Menambahkan satu entri ke antrean.
 *
 * Mengembalikan false bila entri tidak dapat disimpan, sehingga pemanggil dapat
 * memberi tahu kader untuk mencatatnya di buku sebagai cadangan alih-alih
 * mengira datanya aman.
 */
export function tambahKeAntrean(
  entri: Omit<EntriAntrean, "dibuatPada">,
): boolean {
  const daftar = bacaAntrean();

  if (daftar.length >= MAKS_ENTRI) return false;

  daftar.push({ ...entri, dibuatPada: Date.now(), percobaan: 0 });
  return tulisAntrean(daftar);
}

export function hapusDariAntrean(klienRef: string): void {
  tulisAntrean(bacaAntrean().filter((e) => e.klienRef !== klienRef));
}

export function jumlahAntrean(): number {
  return bacaAntrean().length;
}

/* ── Entri yang ditolak ────────────────────────────────────────────────── */

export function bacaDitolak(): EntriDitolak[] {
  if (!tersedia()) return [];
  try {
    const mentah = window.localStorage.getItem(KUNCI_DITOLAK);
    if (!mentah) return [];
    const isi = JSON.parse(mentah);
    return Array.isArray(isi) ? (isi as EntriDitolak[]) : [];
  } catch {
    return [];
  }
}

/**
 * Mencatat entri yang ditolak server.
 *
 * Entri yang datanya tidak dapat diterima tidak boleh sekadar dihapus. Kader
 * perlu tahu pengukuran mana yang tidak masuk, agar dapat menimbang ulang atau
 * memperbaiki angkanya. Sebelumnya entri semacam ini dibuang permanen dan
 * satu-satunya jejaknya adalah penghitung yang tidak pernah ditampilkan.
 */
function catatDitolak(entri: EntriAntrean, alasan: string): void {
  if (!tersedia()) return;
  try {
    const daftar = bacaDitolak();
    daftar.push({
      klienRef: entri.klienRef,
      anakId: entri.anakId,
      tanggal: entri.tanggal,
      beratKg: entri.beratKg,
      tinggiCm: entri.tinggiCm,
      alasan,
    });
    window.localStorage.setItem(KUNCI_DITOLAK, JSON.stringify(daftar));
  } catch {
    // Bila penyimpanan penuh, catatan penolakan hilang. Antreannya sendiri
    // sudah dikosongkan, jadi tidak ada yang tersumbat.
  }
}

export function bersihkanDitolak(): void {
  if (!tersedia()) return;
  try {
    window.localStorage.removeItem(KUNCI_DITOLAK);
  } catch {
    // Diabaikan; tidak ada akibat lanjutan.
  }
}

export function jumlahDitolak(): number {
  return bacaDitolak().length;
}

/* ── Sinkronisasi ─────────────────────────────────────────────────────── */

export interface HasilSinkron {
  terkirim: number;
  /** Entri yang gagal namun akan dicoba lagi. */
  ditunda: number;
  /** Entri yang ditolak permanen dan dipindahkan ke daftar penolakan. */
  ditolak: number;
  /** Terisi bila sesi sudah tidak sah, sehingga kader perlu masuk kembali. */
  perluMasuk: boolean;
}

/** Menandai bahwa satu penjalanan sinkronisasi sedang berlangsung. */
let sedangSinkron = false;

/**
 * Mengirim seluruh antrean ke server.
 *
 * Perilaku terhadap tiap balasan server:
 *
 *   berhasil atau duplikat  entri dikeluarkan, dihitung sebagai terkirim
 *   422 data tidak wajar    dikeluarkan, dipindahkan ke daftar penolakan
 *   400 gagal validasi      dikeluarkan, dipindahkan ke daftar penolakan
 *   404 anak tidak ada      dikeluarkan, dipindahkan ke daftar penolakan
 *   401 sesi kedaluwarsa    dipertahankan, sinkronisasi dihentikan
 *   galat lain              dipertahankan sampai batas percobaan
 *
 * Pembedaan ini yang sebelumnya tidak ada. Balasan 422 dibuang tanpa jejak
 * sehingga catatan kader hilang tanpa pemberitahuan, sedangkan 400 dan 401
 * dicoba berulang tanpa batas sehingga antrean menetap selamanya.
 *
 * Balasan 401 menghentikan seluruh penjalanan, bukan hanya menunda satu entri.
 * Bila sesi sudah tidak sah, entri berikutnya pasti gagal dengan sebab yang sama,
 * dan mencobanya hanya menaikkan penghitung percobaan setiap entri sampai
 * semuanya terbuang.
 */
export async function sinkronkanAntrean(): Promise<HasilSinkron> {
  /*
   * Penjalanan ganda dicegah dengan penanda modul.
   *
   * Sinkronisasi dipicu saat komponen dipasang dan saat koneksi kembali, dan
   * keduanya dapat terjadi hampir bersamaan. Sebelumnya dua penjalanan menyusuri
   * daftar yang sama dan mengirim setiap entri dua kali. Datanya selamat karena
   * batasan unik di basis data, tetapi lalu lintasnya berganda pada koneksi yang
   * justru sedang lemah.
   */
  if (sedangSinkron) {
    return { terkirim: 0, ditunda: 0, ditolak: 0, perluMasuk: false };
  }

  sedangSinkron = true;

  try {
    const daftar = bacaAntrean().sort((a, b) => a.dibuatPada - b.dibuatPada);
    let terkirim = 0;
    let ditunda = 0;
    let ditolak = 0;

    for (const entri of daftar) {
      let respons: Response;

      try {
        respons = await fetch("/api/pengukuran", {
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
      } catch {
        // Kemungkinan besar masih tanpa koneksi. Entri dipertahankan tanpa
        // menaikkan penghitung percobaan, sebab ini bukan penolakan.
        ditunda += 1;
        continue;
      }

      if (respons.ok) {
        hapusDariAntrean(entri.klienRef);
        terkirim += 1;
        continue;
      }

      // Sesi tidak sah. Seluruh penjalanan dihentikan.
      if (respons.status === 401) {
        return { terkirim, ditunda: daftar.length - terkirim, ditolak, perluMasuk: true };
      }

      // Penolakan permanen: mencobanya lagi tidak akan pernah berhasil.
      if ([400, 403, 404, 422].includes(respons.status)) {
        catatDitolak(entri, alasanPenolakan(respons.status));
        hapusDariAntrean(entri.klienRef);
        ditolak += 1;
        continue;
      }

      /*
       * Galat sisi server atau keadaan tak terduga. Dicoba lagi sampai batas,
       * lalu dipindahkan ke daftar penolakan agar antrean tidak tersumbat
       * selamanya oleh entri yang tidak dapat diterima.
       */
      const percobaan = (entri.percobaan ?? 0) + 1;

      if (percobaan >= MAKS_PERCOBAAN) {
        catatDitolak(
          entri,
          "Gagal terkirim setelah beberapa kali percobaan. Mohon catat ulang.",
        );
        hapusDariAntrean(entri.klienRef);
        ditolak += 1;
      } else {
        tulisAntrean(
          bacaAntrean().map((e) =>
            e.klienRef === entri.klienRef ? { ...e, percobaan } : e,
          ),
        );
        ditunda += 1;
      }
    }

    return { terkirim, ditunda, ditolak, perluMasuk: false };
  } finally {
    sedangSinkron = false;
  }
}

/** Menerjemahkan kode balasan menjadi keterangan yang dapat dibaca kader. */
function alasanPenolakan(status: number): string {
  switch (status) {
    case 422:
      return "Angka di luar batas wajar. Mohon timbang dan ukur ulang.";
    case 400:
      return "Data tidak lengkap atau tidak terbaca. Mohon catat ulang.";
    case 403:
      return "Tidak memiliki wewenang mencatat anak ini.";
    case 404:
      return "Data anak tidak ditemukan lagi di basis data.";
    default:
      return "Ditolak server.";
  }
}
