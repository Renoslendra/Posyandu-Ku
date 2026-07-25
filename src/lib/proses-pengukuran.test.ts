import { describe, expect, it } from "vitest";
import { prosesPengukuran } from "./proses-pengukuran";

/**
 * Pengujian alur lengkap: penjaga kualitas data, perhitungan Z-score, dan
 * klasifikasi status dalam satu jalur.
 */

const anakSehat = {
  tanggalLahir: "2024-07-01",
  jenisKelamin: "L" as const,
  tanggal: "2026-07-01",
  beratKg: 12.2,
  tinggiCm: 87.1,
  diukurTelentang: false,
};

describe("prosesPengukuran — jalur normal", () => {
  it("memproses anak sehat menjadi status normal", () => {
    const hasil = prosesPengukuran(anakSehat);
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;

    expect(hasil.usiaBulan).toBe(24);
    expect(hasil.penilaian.status).toBe("normal");
    expect(hasil.penanda).toEqual([]);
  });

  it("menghitung usia dari tanggal lahir dan tanggal ukur", () => {
    const hasil = prosesPengukuran({
      ...anakSehat,
      tanggalLahir: "2025-01-15",
      tanggal: "2026-07-14",
      beratKg: 10,
      tinggiCm: 80,
    });
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.usiaBulan).toBe(17);
  });

  it("menghasilkan Z-score untuk ketiga indikator", () => {
    const hasil = prosesPengukuran(anakSehat);
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;

    expect(hasil.penilaian.zBeratUsia).not.toBeNull();
    expect(hasil.penilaian.zTinggiUsia).not.toBeNull();
    expect(hasil.penilaian.zBeratTinggi).not.toBeNull();
    expect(hasil.penilaian.tidakTerhitung).toEqual([]);
  });
});

describe("prosesPengukuran — penolakan sebelum menghitung", () => {
  it("menolak berat mustahil tanpa menghitung Z-score", () => {
    // Penting: nilai mustahil tidak boleh menghasilkan angka yang tampak sah.
    const hasil = prosesPengukuran({ ...anakSehat, beratKg: 90 });
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.temuan.map((t) => t.kode)).toContain("berat_di_luar_batas");
  });

  it("menolak anak di luar usia layanan balita", () => {
    const hasil = prosesPengukuran({
      ...anakSehat,
      tanggalLahir: "2019-01-01",
      tanggal: "2026-07-01",
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(hasil.temuan.map((t) => t.kode)).toContain("usia_di_luar_layanan");
      expect(hasil.usiaBulan).toBeGreaterThan(60);
    }
  });

  it("menolak tanggal yang tidak valid", () => {
    const hasil = prosesPengukuran({ ...anakSehat, tanggalLahir: "bukan-tanggal" });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(hasil.temuan[0].kode).toBe("tanggal_tidak_valid");
      expect(hasil.usiaBulan).toBeNull();
    }
  });
});

describe("prosesPengukuran — deteksi status bermasalah", () => {
  it("mengenali anak pendek sebagai status berat", () => {
    const hasil = prosesPengukuran({ ...anakSehat, beratKg: 9.5, tinggiCm: 76 });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.penilaian.status).toBe("berat");
    expect(hasil.penilaian.penentuStatus).toBe("tb_u");
  });

  it("mengenali status risiko pada nilai di antara ambang", () => {
    // Tinggi 80 cm pada usia 24 bulan menghasilkan Z TB/U sekitar -2,33,
    // yaitu di antara -2 dan -3, sehingga tergolong risiko.
    const hasil = prosesPengukuran({ ...anakSehat, beratKg: 10.5, tinggiCm: 80 });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.penilaian.status).toBe("risiko");
    expect(hasil.penilaian.zTinggiUsia).toBeLessThan(-2);
    expect(hasil.penilaian.zTinggiUsia).toBeGreaterThan(-3);
  });

  it("tidak menandai anak yang masih dalam rentang normal", () => {
    // Tinggi 83 cm pada usia yang sama menghasilkan Z sekitar -1,35 dan
    // tetap normal. Batas -2 SD tidak boleh digeser demi kehati-hatian.
    const hasil = prosesPengukuran({ ...anakSehat, beratKg: 10.5, tinggiCm: 83 });
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.penilaian.status).toBe("normal");
  });
});

describe("prosesPengukuran — dengan pengukuran sebelumnya", () => {
  it("menandai tinggi yang menurun namun tetap boleh disimpan", () => {
    const hasil = prosesPengukuran(
      { ...anakSehat, tinggiCm: 84 },
      { beratKg: 11.8, tinggiCm: 86, tanggal: "2026-06-01" },
    );
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.penanda).toContain("tinggi_menurun");
    // Z-score tetap dihitung karena nilainya masih mungkin benar.
    expect(hasil.penilaian.zTinggiUsia).not.toBeNull();
  });

  it("tidak menandai pertumbuhan yang wajar", () => {
    const hasil = prosesPengukuran(anakSehat, {
      beratKg: 11.9,
      tinggiCm: 86.5,
      tanggal: "2026-06-01",
    });
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.penanda).toEqual([]);
  });

  it("menandai penurunan berat tajam", () => {
    const hasil = prosesPengukuran(
      { ...anakSehat, beratKg: 9 },
      { beratKg: 12.2, tinggiCm: 86.5, tanggal: "2026-06-01" },
    );
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.penanda).toContain("penurunan_berat_tajam");
  });
});

describe("prosesPengukuran — pemilihan indikator", () => {
  it("memakai tabel panjang badan untuk bayi", () => {
    const hasil = prosesPengukuran({
      tanggalLahir: "2026-01-01",
      jenisKelamin: "P",
      tanggal: "2026-07-01",
      beratKg: 7.3,
      tinggiCm: 65.7,
      diukurTelentang: true,
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.penilaian.indikatorPanjangUsia).toBe("pb_u");
    expect(hasil.penilaian.indikatorBeratTinggi).toBe("bb_pb");
  });

  it("memakai tabel tinggi badan untuk anak yang diukur berdiri", () => {
    const hasil = prosesPengukuran({
      tanggalLahir: "2022-07-01",
      jenisKelamin: "L",
      tanggal: "2026-07-01",
      beratKg: 16.3,
      tinggiCm: 103.3,
      diukurTelentang: false,
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.penilaian.indikatorPanjangUsia).toBe("tb_u");
    expect(hasil.penilaian.indikatorBeratTinggi).toBe("bb_tb");
  });
});
