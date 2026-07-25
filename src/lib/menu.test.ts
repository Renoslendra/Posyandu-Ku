import { describe, expect, it } from "vitest";
import { daftarBelanja, hitungBiaya, kerangkaMenu } from "./menu";

describe("kerangkaMenu — kelayakan usia", () => {
  it("tidak memberi saran menu untuk bayi di bawah 6 bulan", () => {
    // Pemberian makan pada usia ini adalah wilayah air susu ibu. Saran
    // makanan justru berbahaya, sehingga sengaja tidak dikeluarkan.
    expect(kerangkaMenu("normal", 3)).toBeNull();
    expect(kerangkaMenu("berat", 5)).toBeNull();
  });

  it("memberi saran mulai usia 6 bulan", () => {
    expect(kerangkaMenu("normal", 6)).not.toBeNull();
  });

  it("memakai hidangan lunak untuk anak di bawah 12 bulan", () => {
    const bayi = kerangkaMenu("normal", 8)!;
    expect(bayi.menu[0].hidangan).toMatch(/bubur/i);

    const balita = kerangkaMenu("normal", 30)!;
    expect(balita.menu[0].hidangan).toMatch(/nasi/i);
  });
});

describe("kerangkaMenu — penyesuaian menurut status", () => {
  it("menambah frekuensi makan seiring beratnya kondisi", () => {
    const normal = kerangkaMenu("normal", 24)!;
    const risiko = kerangkaMenu("risiko", 24)!;
    const berat = kerangkaMenu("berat", 24)!;

    expect(normal.menu.length).toBeLessThan(risiko.menu.length);
    expect(risiko.menu.length).toBeLessThanOrEqual(berat.menu.length);
  });

  it("menambahkan santan pada status risiko dan berat", () => {
    // Santan adalah cara termurah menaikkan kalori tanpa menambah volume
    // makanan, yang penting bagi anak yang sulit makan.
    const normal = daftarBelanja(kerangkaMenu("normal", 24)!.menu).map((b) => b.nama);
    const berat = daftarBelanja(kerangkaMenu("berat", 24)!.menu).map((b) => b.nama);

    expect(normal).not.toContain("Santan kelapa");
    expect(berat).toContain("Santan kelapa");
  });

  it("menambahkan hati ayam pada status risiko dan berat", () => {
    const risiko = daftarBelanja(kerangkaMenu("risiko", 24)!.menu).map((b) => b.nama);
    expect(risiko).toContain("Hati ayam");
  });

  it("mengarahkan ke puskesmas pada status berat", () => {
    // Menu tidak boleh terkesan sebagai pengganti pemeriksaan.
    const catatan = kerangkaMenu("berat", 24)!.catatan.join(" ");
    expect(catatan).toMatch(/puskesmas|bidan/i);
    expect(catatan).toMatch(/bukan pengganti/i);
  });

  it("tidak mengarahkan ke puskesmas pada status normal", () => {
    const catatan = kerangkaMenu("normal", 24)!.catatan.join(" ");
    expect(catatan).not.toMatch(/puskesmas/i);
  });
});

describe("kerangkaMenu — bahan lokal", () => {
  it("hanya memakai bahan yang tersedia di pasar desa", () => {
    const diizinkan = new Set([
      "Tempe",
      "Telur ayam",
      "Ikan teri kering",
      "Hati ayam",
      "Bayam",
      "Kangkung",
      "Wortel",
      "Beras",
      "Pisang",
      "Santan kelapa",
      "Kacang hijau",
    ]);

    for (const status of ["normal", "risiko", "berat"] as const) {
      for (const usia of [8, 24, 48]) {
        for (const b of daftarBelanja(kerangkaMenu(status, usia)!.menu)) {
          expect(diizinkan.has(b.nama)).toBe(true);
        }
      }
    }
  });

  it("setiap bahan menyertakan takaran dan manfaat", () => {
    for (const b of daftarBelanja(kerangkaMenu("berat", 24)!.menu)) {
      expect(b.takaran.length).toBeGreaterThan(0);
      expect(b.manfaat.length).toBeGreaterThan(0);
      expect(b.hargaRp).toBeGreaterThan(0);
    }
  });
});

describe("hitungBiaya", () => {
  it("tidak menghitung bahan yang sama dua kali", () => {
    // Telur muncul pada beberapa waktu makan untuk status berat, tetapi
    // dibeli sekali sehingga harganya tidak boleh berlipat.
    const menu = kerangkaMenu("berat", 24)!.menu;
    const bahanUnik = daftarBelanja(menu);
    const jumlahManual = bahanUnik.reduce((total, b) => total + b.hargaRp, 0);

    expect(hitungBiaya(menu)).toBe(jumlahManual);
  });

  it("menghasilkan biaya harian yang terjangkau", () => {
    /*
     * Batas kewajaran belanja harian satu anak di desa.
     *
     * Batas ini dinaikkan dari 25.000 menjadi 30.000 setelah perhitungan biaya
     * diperbaiki. Sebelumnya bahan yang muncul di beberapa waktu makan hanya
     * dihitung sekali, termasuk telur dan santan yang nyatanya harus dibeli
     * sebanyak kemunculannya, sehingga total yang ditampilkan lebih rendah
     * daripada belanja sebenarnya. Angka yang naik di sini bukan menu yang
     * menjadi lebih mahal, melainkan angka yang menjadi jujur.
     */
    for (const status of ["normal", "risiko", "berat"] as const) {
      const biaya = hitungBiaya(kerangkaMenu(status, 24)!.menu);
      expect(biaya).toBeGreaterThan(0);
      expect(biaya).toBeLessThanOrEqual(30_000);
    }
  });

  it("menghitung bahan per hidangan sebanyak kemunculannya", () => {
    /*
     * Menu status berat memuat telur pada waktu pagi dan malam, jadi dua butir.
     * Bila keduanya hanya dihitung satu kali, orang tua datang ke pasar dengan
     * uang yang tidak cukup.
     */
    const menu = kerangkaMenu("berat", 24)!.menu;
    const jumlahTelur = menu.filter((m) =>
      m.bahan.some((b) => b.nama === "Telur ayam"),
    ).length;
    expect(jumlahTelur).toBe(2);

    const belanja = daftarBelanja(menu);
    const telur = belanja.find((b) => b.nama === "Telur ayam")!;
    expect(telur.hargaRp).toBe(2800 * jumlahTelur);
    expect(telur.takaran).toContain("2 kali hidang");
  });

  it("tidak melipatgandakan bahan yang dibeli dalam satuan besar", () => {
    // Satu takaran beras melayani beberapa kali makan, jadi dibeli sekali saja.
    const belanja = daftarBelanja(kerangkaMenu("normal", 24)!.menu);
    const beras = belanja.find((b) => b.nama === "Beras")!;
    expect(beras.hargaRp).toBe(3000);
  });

  it("total biaya sama dengan jumlah harga di daftar belanja", () => {
    // Angka yang dilihat orang tua di dua tempat tidak boleh berbeda.
    for (const status of ["normal", "risiko", "berat"] as const) {
      const menu = kerangkaMenu(status, 24)!.menu;
      const total = daftarBelanja(menu).reduce((j, b) => j + b.hargaRp, 0);
      expect(hitungBiaya(menu)).toBe(total);
    }
  });

  it("biaya naik seiring beratnya kondisi", () => {
    const normal = hitungBiaya(kerangkaMenu("normal", 24)!.menu);
    const berat = hitungBiaya(kerangkaMenu("berat", 24)!.menu);
    expect(berat).toBeGreaterThan(normal);
  });

  it("mengembalikan nol untuk menu kosong", () => {
    expect(hitungBiaya([])).toBe(0);
  });
});

describe("daftarBelanja", () => {
  it("mengembalikan bahan tanpa duplikat", () => {
    const daftar = daftarBelanja(kerangkaMenu("berat", 24)!.menu);
    const nama = daftar.map((b) => b.nama);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it("mencakup seluruh bahan yang dipakai menu", () => {
    const menu = kerangkaMenu("risiko", 24)!.menu;
    const daftar = daftarBelanja(menu).map((b) => b.nama);
    for (const m of menu) {
      for (const b of m.bahan) expect(daftar).toContain(b.nama);
    }
  });
});
