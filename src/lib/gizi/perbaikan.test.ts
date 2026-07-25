import { describe, expect, it } from "vitest";
import {
  SELISIH_TELENTANG_BERDIRI_CM,
  hitungZ,
  hitungZDariLMS,
  klasifikasi,
  pilihIndikatorPanjangUsia,
  setarakanPanjangTinggi,
} from "./zscore";
import { ambilTabel, nilaiPengukuran } from "./tabel";

/**
 * Pengujian atas cacat yang ditemukan pemeriksaan menyeluruh.
 *
 * Berkas ini dipisahkan agar setiap pengujian di dalamnya dapat dibaca sebagai
 * catatan satu cacat: apa yang salah, mengapa berbahaya, dan apa yang kini
 * dijamin. Ketiga cacat pertama sama-sama menghasilkan kabar baik yang keliru,
 * yaitu jenis kegagalan paling berbahaya pada alat penapisan.
 */

describe("stunting pada anak yang diukur telentang di atas dua tahun", () => {
  /*
   * Cacat aslinya: tabel panjang menurut umur dipilih berdasarkan cara ukur.
   * Anak berusia 30 bulan yang diukur telentang diarahkan ke tabel PB/U yang
   * hanya memuat 0 sampai 24 bulan, sehingga Z-score panjangnya tidak terhitung
   * dan stunting-nya tidak pernah terlihat.
   */
  it("memilih tabel menurut usia, bukan menurut cara ukur", () => {
    expect(pilihIndikatorPanjangUsia(30)).toBe("tb_u");
    expect(pilihIndikatorPanjangUsia(24)).toBe("tb_u");
    expect(pilihIndikatorPanjangUsia(23)).toBe("pb_u");
    expect(pilihIndikatorPanjangUsia(0)).toBe("pb_u");
  });

  it("menghitung Z-score panjang badan meski diukur telentang pada usia 30 bulan", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 30,
      beratKg: 11.5,
      tinggiCm: 85,
      diukurTelentang: true,
    });

    // Sebelum diperbaiki, nilai ini null dan pb_u masuk daftar tidak terhitung.
    expect(hasil.zTinggiUsia).not.toBeNull();
    expect(hasil.indikatorPanjangUsia).toBe("tb_u");
    expect(hasil.tidakTerhitung).not.toContain("pb_u");
  });

  it("menemukan stunting pada anak pendek yang beratnya proporsional", () => {
    /*
     * Kasus yang paling ingin ditemukan alat ini, dan tepat kasus yang dahulu
     * terlewat: anak pendek namun berat badannya sesuai tinggi tubuhnya,
     * sehingga hanya indikator panjang menurut umur yang dapat melihatnya.
     */
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 30,
      beratKg: 10.5,
      tinggiCm: 82,
      diukurTelentang: true,
    });

    expect(hasil.zTinggiUsia).not.toBeNull();
    expect(hasil.zTinggiUsia!).toBeLessThan(-2);
    expect(hasil.status).not.toBe("normal");
  });
});

describe("penyetaraan panjang dan tinggi badan", () => {
  it("mengurangi 0,7 cm bila usia dua tahun lebih namun diukur telentang", () => {
    expect(setarakanPanjangTinggi(85, 30, true)).toBeCloseTo(84.3, 10);
  });

  it("menambah 0,7 cm bila usia di bawah dua tahun namun diukur berdiri", () => {
    expect(setarakanPanjangTinggi(70, 18, false)).toBeCloseTo(70.7, 10);
  });

  it("tidak mengubah nilai bila cara ukur sudah sesuai usia", () => {
    expect(setarakanPanjangTinggi(70, 18, true)).toBe(70);
    expect(setarakanPanjangTinggi(95, 40, false)).toBe(95);
  });

  it("memakai batas dua tahun secara tepat", () => {
    // Tepat 24 bulan sudah termasuk kelompok berdiri.
    expect(setarakanPanjangTinggi(87, 24, true)).toBeCloseTo(86.3, 10);
    expect(setarakanPanjangTinggi(87, 23, true)).toBe(87);
  });

  it("memakai selisih baku WHO", () => {
    expect(SELISIH_TELENTANG_BERDIRI_CM).toBe(0.7);
  });

  it("membuat anak yang diukur telentang dinilai lebih pendek, bukan lebih tinggi", () => {
    /*
     * Arah koreksinya penting. Pengukuran telentang selalu menghasilkan angka
     * lebih besar, sehingga tanpa koreksi anak tampak lebih tinggi daripada
     * kenyataannya dan stunting terlewat.
     */
    const tanpaKoreksi = hitungZ(ambilTabel("tb_u", "L"), 30, 85);
    const denganKoreksi = hitungZ(
      ambilTabel("tb_u", "L"),
      30,
      setarakanPanjangTinggi(85, 30, true),
    );

    expect(denganKoreksi!).toBeLessThan(tanpaKoreksi!);
  });
});

describe("nilai bukan angka tidak boleh menjadi status normal", () => {
  /*
   * Cacat aslinya berlapis dua. Perbandingan `nilai <= 0` bernilai false untuk
   * NaN sehingga NaN lolos ke perhitungan, lalu ketiga perbandingan pada
   * klasifikasi juga bernilai false sehingga NaN jatuh ke cabang terakhir dan
   * dilaporkan sebagai normal.
   *
   * Jalurnya nyata: kader tanpa sinyal mengetik angka yang tidak terbaca, dan
   * perhitungan dilakukan di perangkat tanpa melewati penjaga data di server.
   */
  it("menolak NaN pada perhitungan Z-score", () => {
    expect(() => hitungZDariLMS(NaN, { l: 1, m: 10, s: 0.1 })).toThrow();
    expect(() => hitungZDariLMS(Infinity, { l: 1, m: 10, s: 0.1 })).toThrow();
  });

  it("mengembalikan null, bukan angka, saat nilai tidak dapat dihitung", () => {
    const tabel = ambilTabel("bb_u", "L");
    expect(hitungZ(tabel, 24, NaN)).toBeNull();
    expect(hitungZ(tabel, NaN, 12)).toBeNull();
    expect(hitungZ(tabel, 24, Infinity)).toBeNull();
  });

  it("tidak melempar pengecualian, agar formulir kader tidak hilang", () => {
    // Dipanggil dari peramban di jalur tanpa sinyal, tempat pengecualian akan
    // menghentikan render dan menghapus isian yang sedang dikerjakan.
    const tabel = ambilTabel("bb_u", "L");
    expect(() => hitungZ(tabel, 24, NaN)).not.toThrow();
  });

  it("mengembalikan null pada klasifikasi nilai bukan angka", () => {
    expect(klasifikasi(NaN)).toBeNull();
    expect(klasifikasi(Infinity)).toBeNull();
    expect(klasifikasi(-Infinity)).toBeNull();
  });

  it("melaporkan indikator sebagai tidak terhitung, bukan normal", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 24,
      beratKg: NaN,
      tinggiCm: NaN,
      diukurTelentang: false,
    });

    expect(hasil.status).toBeNull();
    expect(hasil.zBeratUsia).toBeNull();
    expect(hasil.zTinggiUsia).toBeNull();
    expect(hasil.tidakTerhitung.length).toBeGreaterThan(0);
  });

  it("tetap menghitung indikator lain bila satu nilai tidak terbaca", () => {
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 24,
      beratKg: 11,
      tinggiCm: NaN,
      diukurTelentang: false,
    });

    // Berat menurut umur tidak bergantung pada tinggi, sehingga tetap terhitung.
    expect(hasil.zBeratUsia).not.toBeNull();
    expect(hasil.zTinggiUsia).toBeNull();
  });
});

describe("kestabilan perhitungan di sekitar L bernilai nol", () => {
  it("memakai bentuk limit logaritmik saat L sangat kecil", () => {
    /*
     * Parameter L pada tabel WHO berganti tanda di beberapa titik usia, dan
     * karena parameter diinterpolasi, hasilnya dapat berupa bilangan sangat
     * kecil yang bukan nol. Membaginya menghasilkan angka tidak stabil.
     */
    const lms = { l: 1e-12, m: 10, s: 0.1 };
    const z = hitungZDariLMS(12, lms);

    expect(Number.isFinite(z)).toBe(true);
    // Setara dengan bentuk logaritmik pada L = 0.
    expect(z).toBeCloseTo(Math.log(12 / 10) / 0.1, 6);
  });

  it("menghasilkan nilai berdekatan di kedua sisi titik silang", () => {
    const kiri = hitungZDariLMS(12, { l: 1e-9, m: 10, s: 0.1 });
    const kanan = hitungZDariLMS(12, { l: -1e-9, m: 10, s: 0.1 });

    expect(Math.abs(kiri - kanan)).toBeLessThan(1e-4);
  });
});
