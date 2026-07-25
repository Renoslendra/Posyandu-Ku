/**
 * Penjaga kualitas data (FR-12).
 *
 * Lapisan ini berjalan sebelum Z-score dihitung. Tujuannya menangkap salah
 * catat dan salah baca sebelum menjadi peringatan gizi buruk palsu.
 *
 * Dua tingkat keputusan:
 *   - `tolak`  : nilai mustahil secara fisik. Tidak boleh disimpan.
 *   - `tandai` : nilai mungkin benar tetapi patut diperiksa. Boleh disimpan
 *                setelah kader mengonfirmasi.
 *
 * Pemisahan ini penting: menolak semua yang mencurigakan akan menghalangi
 * kader mencatat kasus nyata yang memang ekstrem, sedangkan meloloskan semua
 * akan mencemari statistik.
 */

import { AMBANG_POLA, BATAS_WAJAR } from "./ambang";

export type TingkatTemuan = "tolak" | "tandai";

export interface Temuan {
  kode: string;
  tingkat: TingkatTemuan;
  /** Pesan berbahasa sederhana untuk kader (FR-12.6). */
  pesan: string;
}

export interface DataPengukuran {
  beratKg: number;
  tinggiCm: number;
  usiaBulan: number;
  tanggal: Date;
}

/** Pengukuran sebelumnya, dipakai memeriksa kewajaran perubahan. */
export interface PengukuranSebelumnya {
  beratKg: number;
  tinggiCm: number;
  tanggal: Date;
}

export interface HasilPemeriksaan {
  /** true bila tidak ada temuan bertingkat `tolak`. */
  bolehDisimpan: boolean;
  temuan: Temuan[];
}

const MS_PER_HARI = 24 * 60 * 60 * 1000;

function selisihHari(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_HARI);
}

/**
 * Memeriksa satu pengukuran, dengan pembanding opsional dari kunjungan
 * sebelumnya.
 *
 * Mengembalikan seluruh temuan sekaligus, bukan berhenti pada temuan pertama,
 * agar kader dapat memperbaiki semuanya dalam satu kali koreksi.
 */
export function periksaPengukuran(
  data: DataPengukuran,
  sebelumnya?: PengukuranSebelumnya,
): HasilPemeriksaan {
  const temuan: Temuan[] = [];

  // --- Nilai bukan angka -----------------------------------------------
  if (!Number.isFinite(data.beratKg)) {
    temuan.push({
      kode: "berat_bukan_angka",
      tingkat: "tolak",
      pesan: "Berat badan belum diisi dengan angka.",
    });
  }
  if (!Number.isFinite(data.tinggiCm)) {
    temuan.push({
      kode: "tinggi_bukan_angka",
      tingkat: "tolak",
      pesan: "Tinggi badan belum diisi dengan angka.",
    });
  }

  // --- Batas kewajaran (FR-12.1) ---------------------------------------
  if (
    Number.isFinite(data.beratKg) &&
    (data.beratKg < BATAS_WAJAR.beratKgMin || data.beratKg > BATAS_WAJAR.beratKgMaks)
  ) {
    temuan.push({
      kode: "berat_di_luar_batas",
      tingkat: "tolak",
      pesan: `Berat ${data.beratKg} kg di luar batas wajar balita (${BATAS_WAJAR.beratKgMin}-${BATAS_WAJAR.beratKgMaks} kg). Mohon periksa kembali angkanya.`,
    });
  }

  if (
    Number.isFinite(data.tinggiCm) &&
    (data.tinggiCm < BATAS_WAJAR.tinggiCmMin || data.tinggiCm > BATAS_WAJAR.tinggiCmMaks)
  ) {
    temuan.push({
      kode: "tinggi_di_luar_batas",
      tingkat: "tolak",
      pesan: `Tinggi ${data.tinggiCm} cm di luar batas wajar balita (${BATAS_WAJAR.tinggiCmMin}-${BATAS_WAJAR.tinggiCmMaks} cm). Mohon periksa kembali angkanya.`,
    });
  }

  if (
    data.usiaBulan < BATAS_WAJAR.usiaBulanMin ||
    data.usiaBulan > BATAS_WAJAR.usiaBulanMaks
  ) {
    temuan.push({
      kode: "usia_di_luar_layanan",
      tingkat: "tolak",
      pesan: `Usia ${data.usiaBulan} bulan berada di luar layanan posyandu balita (0-${BATAS_WAJAR.usiaBulanMaks} bulan).`,
    });
  }

  // --- Tanggal di masa depan (FR-12.4) ---------------------------------
  // Dibandingkan pada tingkat hari agar zona waktu tidak menimbulkan
  // penolakan palsu untuk pengukuran hari ini.
  const hariIni = new Date();
  hariIni.setHours(23, 59, 59, 999);
  if (data.tanggal.getTime() > hariIni.getTime()) {
    temuan.push({
      kode: "tanggal_masa_depan",
      tingkat: "tolak",
      pesan: "Tanggal pengukuran tidak boleh melewati hari ini.",
    });
  }

  // --- Perbandingan dengan kunjungan sebelumnya ------------------------
  if (sebelumnya) {
    const jarakHari = selisihHari(data.tanggal, sebelumnya.tanggal);

    if (jarakHari < 0) {
      temuan.push({
        kode: "tanggal_mundur",
        tingkat: "tandai",
        pesan: "Tanggal pengukuran lebih awal dari kunjungan terakhir yang tercatat.",
      });
    }

    // Tinggi badan tidak menyusut. Selisih negatif hampir pasti salah catat
    // atau perbedaan cara ukur (telentang vs berdiri) (FR-12.2).
    if (Number.isFinite(data.tinggiCm) && data.tinggiCm < sebelumnya.tinggiCm) {
      const selisih = (sebelumnya.tinggiCm - data.tinggiCm).toFixed(1);
      temuan.push({
        kode: "tinggi_menurun",
        tingkat: "tandai",
        pesan: `Tinggi badan tercatat ${selisih} cm lebih pendek dari kunjungan sebelumnya. Mohon periksa cara pengukuran atau angka yang dicatat.`,
      });
    }

    // Lonjakan berat tidak wajar (FR-12.3). Ambang diskalakan terhadap
    // jarak kunjungan agar jeda 3 bulan tidak selalu ikut tertandai.
    if (Number.isFinite(data.beratKg) && jarakHari > 0) {
      const bulan = Math.max(jarakHari / 30, 1);
      const kenaikan = data.beratKg - sebelumnya.beratKg;
      const batas = AMBANG_POLA.lonjakanBeratKg * bulan;
      if (kenaikan > batas) {
        temuan.push({
          kode: "lonjakan_berat",
          tingkat: "tandai",
          pesan: `Berat naik ${kenaikan.toFixed(1)} kg sejak kunjungan terakhir, di atas kewajaran. Mohon periksa kembali angkanya.`,
        });
      }

      // Penurunan berat tajam juga patut diperiksa, sekaligus berpotensi
      // menjadi temuan klinis yang penting.
      if (kenaikan < -batas) {
        temuan.push({
          kode: "penurunan_berat_tajam",
          tingkat: "tandai",
          pesan: `Berat turun ${Math.abs(kenaikan).toFixed(1)} kg sejak kunjungan terakhir. Mohon pastikan angkanya benar, lalu laporkan ke bidan.`,
        });
      }
    }
  }

  return {
    bolehDisimpan: !temuan.some((t) => t.tingkat === "tolak"),
    temuan,
  };
}

/** Mengambil kode temuan untuk disimpan pada kolom `penanda`. */
export function kodePenanda(hasil: HasilPemeriksaan): string[] {
  return hasil.temuan.filter((t) => t.tingkat === "tandai").map((t) => t.kode);
}
