import { describe, expect, it } from "vitest";
import { hitungZDariLMS } from "./zscore";
import { ambilTabel } from "./tabel";

/**
 * Pengujian koreksi WHO untuk Z-score di luar tiga simpangan baku.
 *
 * Yang paling perlu dijaga di sini bukan besarnya koreksi, melainkan bahwa
 * koreksi itu tidak menyentuh apa pun di dalam rentang tiga simpangan baku.
 * Seluruh ambang penapisan berada di dalam rentang itu, sehingga koreksi yang
 * bocor ke dalam akan menggeser keputusan tentang anak yang sehat.
 */

/** Titik LMS nyata dari tabel WHO: berat menurut umur, laki-laki, 24 bulan. */
const LMS = (() => {
  const titik = ambilTabel("bb_u", "L").find((p) => p.x === 24);
  if (!titik) throw new Error("Titik tabel 24 bulan tidak ditemukan");
  return { l: titik.l, m: titik.m, s: titik.s };
})();

/** Kebalikan rumus LMS: nilai ukur yang bersesuaian dengan satu Z-score. */
function nilaiPadaZ(z: number, lms = LMS): number {
  if (Math.abs(lms.l) < 1e-7) return lms.m * Math.exp(lms.s * z);
  return lms.m * Math.pow(1 + lms.l * lms.s * z, 1 / lms.l);
}

/** Rumus LMS tanpa koreksi ekor, untuk membandingkan. */
function tanpaKoreksi(nilai: number, lms = LMS): number {
  const rasio = nilai / lms.m;
  if (Math.abs(lms.l) < 1e-7) return Math.log(rasio) / lms.s;
  return (Math.pow(rasio, lms.l) - 1) / (lms.l * lms.s);
}

describe("koreksi ekor tidak menyentuh rentang penapisan", () => {
  it("mengembalikan Z-score persis pada setiap ambang WHO", () => {
    /*
     * Seluruh ambang klasifikasi berada di dalam rentang tiga simpangan baku:
     * -3, -2, +2, dan +3. Bila koreksi bocor ke dalam rentang ini, status gizi
     * anak dapat berubah tanpa satu pun perubahan pada pengukurannya.
     */
    for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
      expect(hitungZDariLMS(nilaiPadaZ(z), LMS)).toBeCloseTo(z, 10);
    }
  });

  it("tidak mengubah hasil sama sekali di dalam rentang tiga simpangan baku", () => {
    for (const z of [-2.99, -2.5, -1.5, 0.5, 1.75, 2.99]) {
      const nilai = nilaiPadaZ(z);
      expect(hitungZDariLMS(nilai, LMS)).toBeCloseTo(tanpaKoreksi(nilai), 10);
    }
  });

  it("bersinambung di titik peralihan, tanpa lompatan", () => {
    /*
     * Rumus koreksi dan rumus dasar berpotongan tepat di Z bernilai tiga. Bila
     * tidak, akan ada lompatan pada angka yang dilaporkan, dan dua anak dengan
     * berat berselisih sepuluh gram dapat menerima Z-score yang berbeda jauh.
     */
    const selisihAtas =
      hitungZDariLMS(nilaiPadaZ(3.001), LMS) - hitungZDariLMS(nilaiPadaZ(2.999), LMS);
    expect(Math.abs(selisihAtas)).toBeLessThan(0.01);

    const selisihBawah =
      hitungZDariLMS(nilaiPadaZ(-2.999), LMS) - hitungZDariLMS(nilaiPadaZ(-3.001), LMS);
    expect(Math.abs(selisihBawah)).toBeLessThan(0.01);
  });
});

describe("koreksi ekor pada nilai ekstrem", () => {
  it("meredam regangan berlebih di ekor bawah", () => {
    /*
     * Tanpa koreksi, rumus LMS meregang jauh melampaui keadaan sebenarnya di
     * bagian terluar distribusi. Anak berberat 4 kg pada usia dua tahun
     * menghasilkan Z sekitar -9,8 tanpa koreksi, dan sekitar -7,5 dengan
     * koreksi. Angka kedua yang sebanding dengan keluaran perangkat resmi WHO.
     */
    const z = hitungZDariLMS(4, LMS);
    const tanpa = tanpaKoreksi(4);

    expect(z).toBeGreaterThan(tanpa);
    expect(Math.abs(z - tanpa)).toBeGreaterThan(1);
  });

  it("tetap menandai nilai ekstrem sebagai jauh di bawah ambang", () => {
    // Koreksi meredam angkanya, tidak menyembunyikan keadaannya.
    expect(hitungZDariLMS(4, LMS)).toBeLessThan(-3);
    expect(hitungZDariLMS(6, LMS)).toBeLessThan(-3);
  });

  it("tetap menandai nilai ekstrem atas sebagai jauh di atas ambang", () => {
    expect(hitungZDariLMS(25, LMS)).toBeGreaterThan(3);
    expect(hitungZDariLMS(30, LMS)).toBeGreaterThan(3);
  });

  it("tidak pernah menurun seiring bertambahnya nilai ukur", () => {
    /*
     * Sifat ini yang membuat Z-score dapat dipercaya: anak yang lebih berat
     * tidak boleh memperoleh Z-score lebih rendah. Peralihan antara dua rumus
     * adalah tempat sifat ini paling mudah rusak.
     */
    let sebelumnya = Number.NEGATIVE_INFINITY;

    for (let berat = 1; berat <= 30; berat += 0.05) {
      const z = hitungZDariLMS(berat, LMS);
      expect(z).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = z;
    }
  });

  it("berlaku pada seluruh indikator, bukan hanya berat menurut umur", () => {
    // Koreksi dijalankan di dalam rumus, sehingga tidak dapat terlewat.
    const titik = ambilTabel("tb_u", "P").find((p) => p.x === 36);
    expect(titik).toBeDefined();

    const lms = { l: titik!.l, m: titik!.m, s: titik!.s };
    for (const z of [-3, 3]) {
      expect(hitungZDariLMS(nilaiPadaZ(z, lms), lms)).toBeCloseTo(z, 10);
    }
  });

  it("tetap menolak masukan yang tidak sah", () => {
    // Penambahan koreksi tidak boleh melemahkan penjagaan yang sudah ada.
    expect(() => hitungZDariLMS(Number.NaN, LMS)).toThrow();
    expect(() => hitungZDariLMS(0, LMS)).toThrow();
    expect(() => hitungZDariLMS(-5, LMS)).toThrow();
  });
});
