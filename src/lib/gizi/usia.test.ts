import { describe, expect, it } from "vitest";
import { usiaBulan, usiaBulanTepat } from "./zscore";
import { nilaiPengukuran } from "./tabel";

/**
 * Pengujian perhitungan usia.
 *
 * Usia menentukan titik referensi WHO, sehingga kekeliruan di sini menggeser
 * seluruh penilaian gizi tanpa satu pun tanda pada hasilnya. Kesalahannya tidak
 * tampak sebagai galat, hanya sebagai angka yang salah, dan itu jenis kegagalan
 * yang paling perlu dijaga pengujian.
 */

function tgl(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe("usiaBulan", () => {
  it("menghitung usia nol pada hari kelahiran", () => {
    expect(usiaBulan(tgl("2026-01-15"), tgl("2026-01-15"))).toBe(0);
  });

  it("menghitung bulan penuh pada hari ulang bulan", () => {
    expect(usiaBulan(tgl("2026-01-15"), tgl("2026-02-15"))).toBe(1);
    expect(usiaBulan(tgl("2026-01-15"), tgl("2026-07-15"))).toBe(6);
    expect(usiaBulan(tgl("2021-01-15"), tgl("2026-01-15"))).toBe(60);
  });

  it("belum menghitung bulan penuh sehari sebelum ulang bulan", () => {
    expect(usiaBulan(tgl("2026-01-15"), tgl("2026-02-14"))).toBe(0);
  });

  it("menghitung ulang bulan anak yang lahir di akhir bulan", () => {
    /*
     * Ini yang sebelumnya keliru. Perbandingan memakai angka tanggal, sehingga
     * anak yang lahir 31 Januari dan diukur 28 Februari dihitung berusia nol
     * bulan, sebab 28 lebih kecil daripada 31. Padahal Februari tidak memiliki
     * tanggal 31, sehingga hari ulang bulannya memang 28 Februari.
     *
     * Usia yang kurang satu bulan menggeser titik referensi WHO, dan pada bayi
     * pergeseran itu cukup untuk mengubah status gizinya.
     */
    expect(usiaBulan(tgl("2026-01-31"), tgl("2026-02-28"))).toBe(1);
    expect(usiaBulan(tgl("2026-01-31"), tgl("2026-02-27"))).toBe(0);

    expect(usiaBulan(tgl("2026-03-31"), tgl("2026-04-30"))).toBe(1);
    expect(usiaBulan(tgl("2026-03-31"), tgl("2026-04-29"))).toBe(0);

    // Tahun kabisat: Februari memiliki 29 hari.
    expect(usiaBulan(tgl("2024-01-31"), tgl("2024-02-29"))).toBe(1);
  });

  it("menangani anak yang lahir pada 29 Februari", () => {
    expect(usiaBulan(tgl("2024-02-29"), tgl("2025-02-28"))).toBe(12);
  });

  it("tidak bergantung pada zona waktu proses yang menjalankannya", () => {
    /*
     * Tanggal dibentuk sebagai tengah malam UTC di seluruh aplikasi, sehingga
     * komponennya wajib dibaca dengan getter UTC. Bila dibaca dengan getter
     * waktu lokal, hasilnya berbeda satu bulan pada zona waktu negatif.
     */
    expect(usiaBulan(tgl("2026-03-01"), tgl("2026-04-01"))).toBe(1);
  });
});

describe("usiaBulanTepat", () => {
  it("sama dengan usia bulat pada hari ulang bulan", () => {
    expect(usiaBulanTepat(tgl("2026-01-15"), tgl("2026-01-15"))).toBe(0);
    expect(usiaBulanTepat(tgl("2026-01-15"), tgl("2026-02-15"))).toBe(1);
    expect(usiaBulanTepat(tgl("2026-01-15"), tgl("2026-07-15"))).toBe(6);
  });

  it("menghasilkan pecahan di antara dua hari ulang bulan", () => {
    // 1 Februari adalah 17 hari dari 15 Januari, dari 31 hari sebulan itu.
    expect(usiaBulanTepat(tgl("2026-01-15"), tgl("2026-02-01"))).toBeCloseTo(
      17 / 31,
      4,
    );
  });

  it("mendekati satu bulan penuh sehari sebelum ulang bulan", () => {
    const usia = usiaBulanTepat(tgl("2026-01-15"), tgl("2026-02-14"));
    expect(usia).toBeGreaterThan(0.9);
    expect(usia).toBeLessThan(1);
  });

  it("menjaga invarian bulat <= tepat < bulat + 1 pada rentang layanan penuh", () => {
    /*
     * Diperiksa menyeluruh, bukan pada beberapa contoh pilihan. Kekeliruan pada
     * luapan tanggal akhir bulan hanya muncul pada kombinasi tertentu, dan
     * pengujian contoh mudah melewatkannya.
     */
    let diperiksa = 0;

    for (let hariLahir = 0; hariLahir < 400; hariLahir += 1) {
      const lahir = new Date(Date.UTC(2024, 0, 1 + hariLahir));

      for (let selang = 0; selang < 740; selang += 11) {
        const ukur = new Date(lahir.getTime() + selang * 24 * 60 * 60 * 1000);
        const bulat = usiaBulan(lahir, ukur);
        const tepat = usiaBulanTepat(lahir, ukur);

        expect(bulat).toBeGreaterThanOrEqual(0);
        expect(tepat).toBeGreaterThanOrEqual(bulat);
        expect(tepat).toBeLessThan(bulat + 1);
        diperiksa += 1;
      }
    }

    expect(diperiksa).toBeGreaterThan(20_000);
  });

  it("naik tanpa pernah menurun seiring bertambahnya tanggal ukur", () => {
    const lahir = tgl("2026-01-31");
    let sebelumnya = -1;

    for (let hari = 0; hari < 400; hari += 1) {
      const usia = usiaBulanTepat(lahir, new Date(lahir.getTime() + hari * 86_400_000));
      expect(usia).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = usia;
    }
  });
});

describe("pengaruh usia tepat pada penilaian gizi", () => {
  it("mengoreksi bias yang membuat bayi tampak lebih baik daripada keadaannya", () => {
    /*
     * Bayi berusia 27 hari sebelumnya dinilai terhadap referensi usia nol bulan.
     * Pada bulan pertama pertumbuhan paling cepat, sehingga referensi yang
     * terlalu muda membuat anak tampak jauh lebih baik daripada keadaan
     * sebenarnya. Arah bias itu yang berbahaya bagi alat penapisan.
     */
    const lahir = tgl("2026-01-01");
    const ukur = tgl("2026-01-28");
    const bulat = usiaBulan(lahir, ukur);
    const tepat = usiaBulanTepat(lahir, ukur);

    const dasar = {
      jenisKelamin: "L" as const,
      beratKg: 3.6,
      tinggiCm: 52,
      diukurTelentang: true,
    };

    const lama = nilaiPengukuran({ ...dasar, usiaBulan: bulat });
    const baru = nilaiPengukuran({ ...dasar, usiaBulan: bulat, usiaBulanTepat: tepat });

    // Kedua Z-score bergeser ke bawah, yakni ke arah keadaan sebenarnya.
    expect(baru.zBeratUsia!).toBeLessThan(lama.zBeratUsia!);
    expect(baru.zTinggiUsia!).toBeLessThan(lama.zTinggiUsia!);

    // Besarnya bukan pembulatan kecil: lebih dari satu setengah simpangan baku.
    expect(lama.zTinggiUsia! - baru.zTinggiUsia!).toBeGreaterThan(1.5);
  });

  it("berpengaruh kecil pada anak di atas dua tahun", () => {
    // Kurva melandai, sehingga pecahan bulan tidak lagi menentukan.
    const lahir = tgl("2024-01-01");
    const ukur = tgl("2026-06-28");
    const bulat = usiaBulan(lahir, ukur);
    const tepat = usiaBulanTepat(lahir, ukur);

    const dasar = {
      jenisKelamin: "L" as const,
      beratKg: 11,
      tinggiCm: 86,
      diukurTelentang: false,
    };

    const lama = nilaiPengukuran({ ...dasar, usiaBulan: bulat });
    const baru = nilaiPengukuran({ ...dasar, usiaBulan: bulat, usiaBulanTepat: tepat });

    expect(Math.abs(lama.zTinggiUsia! - baru.zTinggiUsia!)).toBeLessThan(0.3);
  });

  it("tidak mengubah hasil bila usia tepat tidak diberikan", () => {
    // Pemanggil lama tetap memperoleh perilaku yang sama.
    const dasar = {
      jenisKelamin: "P" as const,
      usiaBulan: 24,
      beratKg: 11,
      tinggiCm: 85,
      diukurTelentang: false,
    };

    expect(nilaiPengukuran(dasar)).toEqual(
      nilaiPengukuran({ ...dasar, usiaBulanTepat: 24 }),
    );
  });

  it("memakai usia bulat untuk memilih tabel, bukan usia tepat", () => {
    /*
     * Batas dua tahun antara tabel PB/U dan TB/U bekerja pada satuan bulan bulat
     * sebagaimana kader mencatatnya. Anak berusia 23 bulan lebih 20 hari tetap
     * dinilai dengan tabel panjang badan, bukan tinggi badan.
     */
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 23,
      usiaBulanTepat: 23.67,
      beratKg: 11,
      tinggiCm: 85,
      diukurTelentang: true,
    });

    expect(hasil.indikatorPanjangUsia).toBe("pb_u");
  });
});
