import { describe, expect, it } from "vitest";
import {
  ambilLMS,
  bulatkanZ,
  hitungZ,
  hitungZDariLMS,
  klasifikasi,
  pilihIndikatorBeratTinggi,
  usiaBulan,
  type TitikLMS,
} from "./zscore";

/**
 * Golden test mesin Z-score.
 *
 * Strategi pengujian dibagi dua:
 *
 *  1. Identitas matematis — berlaku untuk parameter LMS apa pun, sehingga
 *     kebenarannya tidak bergantung pada tabel referensi. Bagian ini
 *     membuktikan rumus LMS diimplementasikan benar.
 *
 *  2. Kasus tabel referensi — memerlukan nilai L, M, S dari publikasi WHO.
 *     Nilai pada berkas tabel wajib diverifikasi terhadap publikasi resmi
 *     sebelum dipakai untuk penilaian gizi sungguhan.
 */

describe("hitungZDariLMS — identitas matematis", () => {
  it("mengembalikan 0 tepat saat nilai sama dengan median", () => {
    // Definisi Z-score: nilai = M berarti tepat di median, sehingga Z = 0.
    // Berlaku untuk L apa pun.
    expect(hitungZDariLMS(3.3464, { l: 0.3487, m: 3.3464, s: 0.14602 })).toBeCloseTo(0, 10);
    expect(hitungZDariLMS(10, { l: 0, m: 10, s: 0.1 })).toBeCloseTo(0, 10);
    expect(hitungZDariLMS(7.5, { l: -0.5, m: 7.5, s: 0.08 })).toBeCloseTo(0, 10);
  });

  it("memakai cabang logaritma saat L = 0", () => {
    // L = 0 adalah bentuk limit rumus Box-Cox: Z = ln(nilai/M) / S.
    const z = hitungZDariLMS(11, { l: 0, m: 10, s: 0.1 });
    expect(z).toBeCloseTo(Math.log(1.1) / 0.1, 10);
  });

  it("memakai cabang pangkat saat L bukan 0", () => {
    const l = 0.35;
    const m = 3.3;
    const s = 0.146;
    const nilai = 4;
    const harapan = (Math.pow(nilai / m, l) - 1) / (l * s);
    expect(hitungZDariLMS(nilai, { l, m, s })).toBeCloseTo(harapan, 10);
  });

  it("bernilai negatif di bawah median dan positif di atas median", () => {
    const lms = { l: 0.35, m: 10, s: 0.12 };
    expect(hitungZDariLMS(8, lms)).toBeLessThan(0);
    expect(hitungZDariLMS(12, lms)).toBeGreaterThan(0);
  });

  it("naik monoton terhadap nilai pengukuran", () => {
    const lms = { l: -0.2, m: 12, s: 0.09 };
    let sebelumnya = -Infinity;
    for (let nilai = 6; nilai <= 20; nilai += 0.5) {
      const z = hitungZDariLMS(nilai, lms);
      expect(z).toBeGreaterThan(sebelumnya);
      sebelumnya = z;
    }
  });

  it("konsisten pada perjalanan balik: dari Z kembali ke nilai", () => {
    // Membalik rumus LMS: nilai = M * (1 + L*S*Z)^(1/L).
    const { l, m, s } = { l: 0.35, m: 8.5, s: 0.11 };
    for (const zTarget of [-3, -2, -1, 0, 1, 2, 3]) {
      const nilai = m * Math.pow(1 + l * s * zTarget, 1 / l);
      expect(hitungZDariLMS(nilai, { l, m, s })).toBeCloseTo(zTarget, 8);
    }
  });

  it("menolak nilai pengukuran yang tidak masuk akal", () => {
    expect(() => hitungZDariLMS(0, { l: 0.3, m: 10, s: 0.1 })).toThrow();
    expect(() => hitungZDariLMS(-5, { l: 0.3, m: 10, s: 0.1 })).toThrow();
    expect(() => hitungZDariLMS(10, { l: 0.3, m: 0, s: 0.1 })).toThrow();
    expect(() => hitungZDariLMS(10, { l: 0.3, m: 10, s: 0 })).toThrow();
  });
});

describe("ambilLMS — interpolasi tabel", () => {
  const tabel: TitikLMS[] = [
    { x: 0, l: 0.3, m: 3.0, s: 0.14 },
    { x: 1, l: 0.2, m: 4.0, s: 0.13 },
    { x: 2, l: 0.1, m: 5.0, s: 0.12 },
    { x: 3, l: 0.0, m: 6.0, s: 0.11 },
  ];

  it("mengembalikan nilai persis pada titik tabel", () => {
    expect(ambilLMS(tabel, 2)).toEqual({ l: 0.1, m: 5.0, s: 0.12 });
  });

  it("mengembalikan nilai pada batas bawah dan batas atas tabel", () => {
    expect(ambilLMS(tabel, 0)).toEqual({ l: 0.3, m: 3.0, s: 0.14 });
    expect(ambilLMS(tabel, 3)).toEqual({ l: 0.0, m: 6.0, s: 0.11 });
  });

  it("menginterpolasi linier di antara dua titik", () => {
    const hasil = ambilLMS(tabel, 1.5);
    expect(hasil).not.toBeNull();
    expect(hasil!.l).toBeCloseTo(0.15, 10);
    expect(hasil!.m).toBeCloseTo(4.5, 10);
    expect(hasil!.s).toBeCloseTo(0.125, 10);
  });

  it("tidak mengekstrapolasi di luar rentang tabel", () => {
    // Mengembalikan null, bukan angka menyesatkan.
    expect(ambilLMS(tabel, -0.5)).toBeNull();
    expect(ambilLMS(tabel, 3.5)).toBeNull();
  });

  it("mengembalikan null untuk tabel kosong", () => {
    expect(ambilLMS([], 1)).toBeNull();
  });

  it("hitungZ mengembalikan null bila x di luar tabel", () => {
    expect(hitungZ(tabel, 99, 10)).toBeNull();
  });
});

describe("klasifikasi status gizi", () => {
  it("menempatkan Z >= -2 sebagai normal", () => {
    expect(klasifikasi(0, "bb_u")).toBe("normal");
    expect(klasifikasi(1.5, "bb_u")).toBe("normal");
    expect(klasifikasi(-1.99, "bb_u")).toBe("normal");
    expect(klasifikasi(-2, "bb_u")).toBe("normal");
  });

  it("menempatkan -3 <= Z < -2 sebagai risiko", () => {
    expect(klasifikasi(-2.01, "bb_u")).toBe("risiko");
    expect(klasifikasi(-2.5, "bb_u")).toBe("risiko");
    expect(klasifikasi(-3, "bb_u")).toBe("risiko");
  });

  it("menempatkan Z < -3 sebagai berat", () => {
    expect(klasifikasi(-3.01, "bb_u")).toBe("berat");
    expect(klasifikasi(-4, "bb_u")).toBe("berat");
  });

  it("memperlakukan ambang tepat sebagai batas inklusif ke arah lebih baik", () => {
    // Anak dengan Z tepat -2 belum dikategorikan risiko. Batas dibuat
    // eksplisit agar klasifikasi tidak berubah karena galat pembulatan.
    expect(klasifikasi(-2, "bb_u")).toBe("normal");
    expect(klasifikasi(-3, "bb_u")).toBe("risiko");
  });
});

describe("pilihIndikatorBeratTinggi", () => {
  it("memakai BB/PB saat diukur telentang", () => {
    expect(pilihIndikatorBeratTinggi(30, true)).toBe("bb_pb");
  });

  it("memakai BB/PB untuk usia di bawah 24 bulan", () => {
    expect(pilihIndikatorBeratTinggi(23, false)).toBe("bb_pb");
  });

  it("memakai BB/TB untuk usia 24 bulan ke atas yang diukur berdiri", () => {
    expect(pilihIndikatorBeratTinggi(24, false)).toBe("bb_tb");
    expect(pilihIndikatorBeratTinggi(60, false)).toBe("bb_tb");
  });
});

describe("usiaBulan", () => {
  it("menghitung 0 bulan pada hari kelahiran", () => {
    expect(usiaBulan(new Date(2025, 0, 15), new Date(2025, 0, 15))).toBe(0);
  });

  it("menghitung bulan penuh, bukan pembulatan ke atas", () => {
    // Belum melewati tanggal lahir, jadi bulan belum penuh.
    expect(usiaBulan(new Date(2025, 0, 15), new Date(2025, 1, 14))).toBe(0);
    expect(usiaBulan(new Date(2025, 0, 15), new Date(2025, 1, 15))).toBe(1);
  });

  it("menghitung lintas tahun dengan benar", () => {
    expect(usiaBulan(new Date(2024, 6, 10), new Date(2026, 6, 10))).toBe(24);
    expect(usiaBulan(new Date(2024, 6, 10), new Date(2026, 6, 9))).toBe(23);
  });

  it("menangani batas usia layanan 60 bulan", () => {
    expect(usiaBulan(new Date(2021, 0, 1), new Date(2026, 0, 1))).toBe(60);
  });
});

describe("bulatkanZ", () => {
  it("membulatkan ke dua desimal", () => {
    expect(bulatkanZ(-2.3456)).toBe(-2.35);
    expect(bulatkanZ(1.2345)).toBe(1.23);
    expect(bulatkanZ(1.2367)).toBe(1.24);
    expect(bulatkanZ(0)).toBe(0);
  });

  it("tidak mengubah klasifikasi di sekitar ambang", () => {
    // Pembulatan hanya untuk penyimpanan dan tampilan. Klasifikasi tetap
    // memakai nilai Z penuh agar hasilnya tidak bergeser karena pembulatan.
    expect(klasifikasi(-2.004, "bb_u")).toBe("risiko");
    expect(bulatkanZ(-2.004)).toBe(-2);
    // Nilai tersimpan tampak -2 (normal bila diklasifikasi ulang), sehingga
    // klasifikasi wajib dihitung dari nilai penuh, bukan dari nilai bulat.
  });

  it("mengikuti keterbatasan floating point secara terdokumentasi", () => {
    // 1.005 tidak tersimpan persis sebagai 1.005 melainkan 1.00499...,
    // sehingga membulat ke bawah. Perilaku ini diterima karena selisih
    // 0,01 SD tidak mengubah keputusan penapisan.
    expect(bulatkanZ(1.005)).toBe(1);
  });
});
