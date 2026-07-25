import { describe, expect, it } from "vitest";
import { ambilTabel, nilaiPengukuran } from "./tabel";
import { hitungZDariLMS } from "./zscore";

/**
 * Verifikasi tabel referensi WHO.
 *
 * Pengujian ini membandingkan nilai pada tabel terhadap angka yang tercantum
 * pada tabel terbitan WHO Child Growth Standards. Bila tabel salah unduh atau
 * salah konversi, pengujian di berkas ini gagal.
 *
 * Toleransi 0,1 dipakai karena angka pembanding diambil dari tabel terbitan
 * yang sudah dibulatkan satu desimal.
 */

/** Mengubah Z-score menjadi nilai pengukuran, kebalikan rumus LMS. */
function nilaiPadaZ(lms: { l: number; m: number; s: number }, z: number): number {
  if (lms.l === 0) return lms.m * Math.exp(lms.s * z);
  return lms.m * Math.pow(1 + lms.l * lms.s * z, 1 / lms.l);
}

function titik(indikator: "bb_u" | "pb_u" | "tb_u", jk: "L" | "P", x: number) {
  const t = ambilTabel(indikator, jk).find((p) => p.x === x);
  if (!t) throw new Error(`Titik ${indikator} ${jk} x=${x} tidak ada di tabel`);
  return t;
}

const SEMUA_INDIKATOR = ["bb_u", "pb_u", "tb_u", "bb_pb", "bb_tb"] as const;

describe("tabel WHO — kelengkapan", () => {
  it("memuat 61 titik bulan untuk berat menurut umur", () => {
    for (const jk of ["L", "P"] as const) {
      expect(ambilTabel("bb_u", jk)).toHaveLength(61);
    }
  });

  it("memisahkan rentang panjang badan dan tinggi badan pada 24 bulan", () => {
    // WHO memakai panjang badan (telentang) hingga 24 bulan dan tinggi badan
    // (berdiri) dari 24 bulan. Keduanya tabel terpisah, bukan satu rentang.
    for (const jk of ["L", "P"] as const) {
      const pb = ambilTabel("pb_u", jk);
      const tb = ambilTabel("tb_u", jk);
      expect(pb[0].x).toBe(0);
      expect(pb[pb.length - 1].x).toBe(24);
      expect(tb[0].x).toBe(24);
      expect(tb[tb.length - 1].x).toBe(60);
    }
  });

  it("mencakup usia berturut-turut tanpa lubang", () => {
    ambilTabel("bb_u", "L").forEach((p, i) => expect(p.x).toBe(i));
    ambilTabel("pb_u", "L").forEach((p, i) => expect(p.x).toBe(i));
    ambilTabel("tb_u", "L").forEach((p, i) => expect(p.x).toBe(i + 24));
  });

  it("memuat tabel berat menurut panjang dan tinggi badan", () => {
    expect(ambilTabel("bb_pb", "L").length).toBeGreaterThan(500);
    expect(ambilTabel("bb_tb", "L").length).toBeGreaterThan(500);
  });

  it("tersusun urut naik menurut x", () => {
    for (const ind of SEMUA_INDIKATOR) {
      for (const jk of ["L", "P"] as const) {
        const tabel = ambilTabel(ind, jk);
        for (let i = 1; i < tabel.length; i += 1) {
          expect(tabel[i].x).toBeGreaterThan(tabel[i - 1].x);
        }
      }
    }
  });

  it("memiliki parameter M dan S yang positif di seluruh titik", () => {
    for (const ind of SEMUA_INDIKATOR) {
      for (const jk of ["L", "P"] as const) {
        for (const p of ambilTabel(ind, jk)) {
          expect(p.m).toBeGreaterThan(0);
          expect(p.s).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("tabel WHO — kesesuaian dengan angka terbitan", () => {
  // Median berat lahir dan usia terpilih, tabel WHO Weight-for-age.
  it("median berat badan sesuai terbitan WHO", () => {
    expect(titik("bb_u", "L", 0).m).toBeCloseTo(3.3464, 3);
    expect(titik("bb_u", "P", 0).m).toBeCloseTo(3.2322, 3);
    expect(titik("bb_u", "L", 60).m).toBeCloseTo(18.3, 1);
    expect(titik("bb_u", "P", 60).m).toBeCloseTo(18.2, 1);
  });

  // Median panjang badan, tabel WHO Length-for-age (0-24 bulan).
  it("median panjang badan sesuai terbitan WHO", () => {
    expect(titik("pb_u", "L", 0).m).toBeCloseTo(49.8842, 3);
    expect(titik("pb_u", "P", 0).m).toBeCloseTo(49.1477, 3);
    expect(titik("pb_u", "L", 12).m).toBeCloseTo(75.7, 1);
    expect(titik("pb_u", "L", 24).m).toBeCloseTo(87.8, 1);
  });

  // Median tinggi badan, tabel WHO Height-for-age (24-60 bulan).
  it("median tinggi badan sesuai terbitan WHO", () => {
    expect(titik("tb_u", "L", 24).m).toBeCloseTo(87.1, 1);
    expect(titik("tb_u", "L", 60).m).toBeCloseTo(110.0, 1);
    expect(titik("tb_u", "P", 60).m).toBeCloseTo(109.4, 1);
  });

  it("membedakan panjang dan tinggi badan pada usia 24 bulan", () => {
    // Pengukuran berdiri menghasilkan angka lebih pendek daripada telentang.
    // Selisihnya sekitar 0,7 cm. Bila kedua tabel tercampur, median di titik
    // peralihan akan salah dan seluruh klasifikasi pada usia tersebut bergeser.
    const panjang = titik("pb_u", "L", 24).m;
    const tinggi = titik("tb_u", "L", 24).m;
    expect(panjang).toBeGreaterThan(tinggi);
    expect(panjang - tinggi).toBeCloseTo(0.7, 1);
  });

  // Ambang -2 SD adalah batas yang dipakai di lapangan, sehingga wajib tepat.
  it("ambang -2 SD berat badan sesuai terbitan WHO", () => {
    expect(nilaiPadaZ(titik("bb_u", "L", 0), -2)).toBeCloseTo(2.5, 1);
    expect(nilaiPadaZ(titik("bb_u", "L", 12), -2)).toBeCloseTo(7.7, 1);
    expect(nilaiPadaZ(titik("bb_u", "P", 12), -2)).toBeCloseTo(7.0, 1);
    expect(nilaiPadaZ(titik("bb_u", "L", 60), -2)).toBeCloseTo(14.1, 1);
  });

  it("ambang -2 SD panjang badan sesuai terbitan WHO", () => {
    // Batas stunting yang dipakai di lapangan.
    expect(nilaiPadaZ(titik("pb_u", "L", 0), -2)).toBeCloseTo(46.1, 1);
    expect(nilaiPadaZ(titik("pb_u", "L", 12), -2)).toBeCloseTo(71.0, 1);
    expect(nilaiPadaZ(titik("pb_u", "L", 24), -2)).toBeCloseTo(81.7, 1);
  });

  it("ambang -2 SD tinggi badan sesuai terbitan WHO", () => {
    expect(nilaiPadaZ(titik("tb_u", "L", 24), -2)).toBeCloseTo(81.0, 1);
    expect(nilaiPadaZ(titik("tb_u", "L", 60), -2)).toBeCloseTo(100.7, 1);
    expect(nilaiPadaZ(titik("tb_u", "P", 60), -2)).toBeCloseTo(99.9, 1);
  });

  it("ambang -3 SD sesuai terbitan WHO", () => {
    expect(nilaiPadaZ(titik("bb_u", "L", 12), -3)).toBeCloseTo(6.9, 1);
    expect(nilaiPadaZ(titik("pb_u", "L", 12), -3)).toBeCloseTo(68.6, 1);
  });

  it("menghasilkan Z = 0 pada nilai median", () => {
    const p = titik("bb_u", "L", 12);
    expect(hitungZDariLMS(p.m, p)).toBeCloseTo(0, 10);
  });
});

describe("nilaiPengukuran", () => {
  it("menilai anak sehat sebagai normal", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 24,
      beratKg: 12.2,
      tinggiCm: 87.1,
      diukurTelentang: false,
    });
    expect(hasil.status).toBe("normal");
    expect(hasil.tidakTerhitung).toEqual([]);
    expect(hasil.zBeratUsia).toBeCloseTo(0, 1);
    expect(hasil.zTinggiUsia).toBeCloseTo(0, 1);
  });

  it("mengenali anak pendek (stunting) lewat indikator TB/U", () => {
    // Berat sesuai tinggi, tetapi tinggi jauh di bawah usia.
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 24,
      beratKg: 9.5,
      tinggiCm: 76,
      diukurTelentang: false,
    });
    expect(hasil.status).toBe("berat");
    expect(hasil.penentuStatus).toBe("tb_u");
    expect(hasil.zTinggiUsia!).toBeLessThan(-3);
  });

  it("memilih PB/U untuk bayi dan TB/U untuk anak yang diukur berdiri", () => {
    const bayi = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 12,
      beratKg: 9.6,
      tinggiCm: 75.7,
      diukurTelentang: true,
    });
    expect(bayi.indikatorPanjangUsia).toBe("pb_u");

    const balita = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 48,
      beratKg: 16.3,
      tinggiCm: 103.3,
      diukurTelentang: false,
    });
    expect(balita.indikatorPanjangUsia).toBe("tb_u");
  });

  it("mengenali gizi kurang (wasting) lewat indikator BB/TB", () => {
    // Tinggi normal untuk usianya, tetapi berat sangat kurang.
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 24,
      beratKg: 8.5,
      tinggiCm: 87,
      diukurTelentang: false,
    });
    expect(hasil.status).toBe("berat");
    expect(hasil.zBeratTinggi!).toBeLessThan(-3);
  });

  it("mengambil status terburuk di antara indikator", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "P",
      usiaBulan: 36,
      beratKg: 10,
      tinggiCm: 88,
      diukurTelentang: false,
    });
    expect(hasil.status).not.toBeNull();
    expect(["risiko", "berat"]).toContain(hasil.status);
  });

  it("memilih BB/PB untuk bayi yang diukur telentang", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 6,
      beratKg: 7.9,
      tinggiCm: 67.6,
      diukurTelentang: true,
    });
    expect(hasil.indikatorBeratTinggi).toBe("bb_pb");
    expect(hasil.status).toBe("normal");
  });

  it("memilih BB/TB untuk anak 24 bulan ke atas yang diukur berdiri", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 36,
      beratKg: 14.3,
      tinggiCm: 96.1,
      diukurTelentang: false,
    });
    expect(hasil.indikatorBeratTinggi).toBe("bb_tb");
  });

  it("melaporkan indikator di luar rentang tabel, bukan menganggapnya normal", () => {
    // Tinggi 45 cm berada di bawah rentang tabel BB/TB (mulai 65 cm).
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 30,
      beratKg: 12,
      tinggiCm: 45,
      diukurTelentang: false,
    });
    expect(hasil.tidakTerhitung).toContain("bb_tb");
    expect(hasil.zBeratTinggi).toBeNull();
    // Indikator lain tetap dihitung.
    expect(hasil.zBeratUsia).not.toBeNull();
  });

  it("membulatkan Z-score ke dua desimal", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 12,
      beratKg: 8.2,
      tinggiCm: 74,
      diukurTelentang: false,
    });
    for (const z of [hasil.zBeratUsia, hasil.zTinggiUsia, hasil.zBeratTinggi]) {
      if (z !== null) {
        expect(Math.abs(z * 100 - Math.round(z * 100))).toBeLessThan(1e-9);
      }
    }
  });
});
