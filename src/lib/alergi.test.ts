import { describe, expect, it } from "vitest";
import { daftarBelanja, hitungBiaya, kerangkaMenu } from "./menu";

/**
 * Pengujian penyaringan bahan yang perlu dihindari.
 *
 * Yang dijaga di sini bukan sekadar bahwa bahannya hilang dari daftar belanja,
 * melainkan bahwa ia tidak disebut di mana pun yang dibaca orang tua. Penyaringan
 * yang hanya menyentuh daftar bahan meninggalkan nama hidangan dan catatan gizi
 * yang tetap menyebutnya, dan orang tua akan memasak sesuai nama hidangannya.
 * Penyaringan yang tidak lengkap lebih berbahaya daripada tidak ada, sebab ia
 * menimbulkan rasa aman yang tidak berdasar.
 */

const SEMUA_STATUS = ["normal", "risiko", "berat", "lebih", "obesitas"] as const;

/** Seluruh teks yang akan dibaca orang tua, selain pemberitahuan penggantian. */
function teksTerbaca(status: (typeof SEMUA_STATUS)[number], usia: number, alergi: string[]) {
  const hasil = kerangkaMenu(status, usia, alergi)!;
  return [
    ...hasil.menu.map((m) => m.hidangan),
    // Catatan pertama memang menyebut bahan yang dihindari, itu memang tugasnya.
    ...hasil.catatan.slice(1),
  ]
    .join(" | ")
    .toLowerCase();
}

describe("penyaringan bahan yang perlu dihindari", () => {
  it("membuang bahan dari daftar belanja", () => {
    const belanja = daftarBelanja(kerangkaMenu("berat", 24, ["telur"])!.menu);
    expect(belanja.map((b) => b.nama)).not.toContain("Telur ayam");
  });

  it("tidak menyebut bahan itu pada nama hidangan", () => {
    /*
     * Ini bagian yang paling mudah terlewat. Nama hidangan adalah teks tetap,
     * sehingga tanpa penulisan ulang, "Nasi tim telur dan bayam" tetap tertulis
     * meski telur sudah hilang dari daftar belanjanya.
     */
    const menu = kerangkaMenu("berat", 24, ["telur"])!.menu;
    for (const m of menu) {
      expect(m.hidangan.toLowerCase()).not.toContain("telur");
    }
  });

  it("tidak menyebut bahan itu pada catatan gizi", () => {
    /*
     * Menu risiko memuat catatan bahwa santan menambah kalori. Bila santan
     * dihindari, catatan itu membuat orang tua menambahkannya sendiri.
     */
    const catatan = kerangkaMenu("risiko", 24, ["santan"])!.catatan.slice(1).join(" ");
    expect(catatan.toLowerCase()).not.toContain("santan");
  });

  it("tidak meninggalkan bekas bahan pada seluruh kombinasi status dan usia", () => {
    const bahan: Record<string, string> = {
      telur: "telur",
      "ikan teri": "teri",
      tempe: "tempe",
      "hati ayam": "hati",
      bayam: "bayam",
      wortel: "wortel",
      pisang: "pisang",
    };

    for (const status of SEMUA_STATUS) {
      for (const usia of [9, 24]) {
        for (const [nama, kata] of Object.entries(bahan)) {
          const teks = teksTerbaca(status, usia, [nama]);
          const pola = new RegExp(`\\b${kata}\\b`, "iu");
          expect(pola.test(teks), `${status}/${usia} masih menyebut ${kata}`).toBe(false);
        }
      }
    }
  });

  it("menggantikan sumber protein, tidak sekadar membuangnya", () => {
    /*
     * Menu penambah berat yang kehilangan sumber proteinnya tidak lagi
     * menjalankan tugasnya, meski tampak aman. Telur diganti tempe, bukan
     * dihapus begitu saja.
     */
    const menu = kerangkaMenu("berat", 24, ["telur"])!.menu;
    const pagi = menu.find((m) => m.waktu === "Pagi")!;

    expect(pagi.bahan.map((b) => b.nama)).toContain("Tempe");
  });

  it("tidak meninggalkan hidangan tanpa bahan sama sekali", () => {
    for (const status of SEMUA_STATUS) {
      for (const nama of ["telur", "tempe", "ikan teri", "santan", "beras"]) {
        const hasil = kerangkaMenu(status, 24, [nama]);
        if (!hasil) continue;
        for (const m of hasil.menu) {
          expect(m.bahan.length, `${status}/${nama}: ${m.hidangan}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("tidak meninggalkan kalimat yang menggantung", () => {
    /*
     * Membuang "santan" dari "Nasi tim telur, bayam, sedikit santan" pernah
     * meninggalkan kata "sedikit" di ujung kalimat. Hasil seperti itu memaksa
     * orang tua menebak apa yang hilang.
     */
    for (const status of SEMUA_STATUS) {
      for (const usia of [9, 24]) {
        for (const nama of ["santan", "telur", "tempe", "ikan teri"]) {
          const hasil = kerangkaMenu(status, usia, [nama]);
          if (!hasil) continue;

          for (const m of hasil.menu) {
            expect(m.hidangan).not.toMatch(/\b(dan|dengan|sedikit|tambahan)\s*$/iu);
            expect(m.hidangan).not.toMatch(/,\s*,/u);
            expect(m.hidangan).not.toMatch(/^[,\s]/u);
            expect(m.hidangan.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("menyatakan penggantian kepada orang tua", () => {
    /*
     * Bila menu yang tercetak berbeda dari yang disebut kader tanpa penjelasan,
     * orang tua akan menganggapnya keliru lalu kembali ke menu yang disebut
     * kader, yaitu menu yang memuat bahan berbahaya bagi anaknya.
     */
    const catatan = kerangkaMenu("berat", 24, ["telur"])!.catatan;
    expect(catatan[0]).toContain("Telur ayam");
    expect(catatan[0]).toContain("perlu dihindari");
  });

  it("menyebut seluruh bahan yang diganti bila lebih dari satu", () => {
    const catatan = kerangkaMenu("berat", 24, ["telur", "ikan teri"])!.catatan;
    expect(catatan[0]).toContain("Telur ayam");
    expect(catatan[0]).toContain("Ikan teri kering");
  });

  it("mencocokkan kata, bukan potongan huruf", () => {
    /*
     * Catatan kader berupa teks bebas. Kata yang tidak berkaitan tidak boleh
     * membuang bahan apa pun, sebab menu yang menyusut tanpa alasan akan
     * kekurangan zat gizi.
     */
    const tanpaAlergi = kerangkaMenu("berat", 24, [])!;
    const denganKataAsing = kerangkaMenu("berat", 24, ["kacang tanah"])!;

    expect(daftarBelanja(denganKataAsing.menu).length).toBe(
      daftarBelanja(tanpaAlergi.menu).length,
    );
  });

  it("mengabaikan catatan alergi yang kosong", () => {
    const dasar = kerangkaMenu("berat", 24)!;
    for (const kosong of [[], [""], ["   "]]) {
      const hasil = kerangkaMenu("berat", 24, kosong)!;
      expect(hasil.menu.length).toBe(dasar.menu.length);
      expect(hitungBiaya(hasil.menu)).toBe(hitungBiaya(dasar.menu));
    }
  });

  it("menjaga biaya tetap wajar setelah penggantian", () => {
    for (const status of SEMUA_STATUS) {
      for (const nama of ["telur", "ikan teri", "tempe", "santan"]) {
        const hasil = kerangkaMenu(status, 24, [nama]);
        if (!hasil) continue;

        const biaya = hitungBiaya(hasil.menu);
        expect(biaya).toBeGreaterThan(0);
        expect(biaya).toBeLessThanOrEqual(30_000);
      }
    }
  });

  it("tetap menolak memberi saran untuk bayi di bawah 6 bulan", () => {
    expect(kerangkaMenu("berat", 4, ["telur"])).toBeNull();
  });
});
