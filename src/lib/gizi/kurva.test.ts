import { describe, expect, it } from "vitest";
import {
  GARIS_SD,
  gabungkanDenganDataAnak,
  kurvaReferensi,
  type TitikKurva,
} from "./kurva";

describe("kurvaReferensi", () => {
  it("menghasilkan titik untuk seluruh rentang tabel", () => {
    const kurva = kurvaReferensi("bb_u", "L");
    expect(kurva).toHaveLength(61);
    expect(kurva[0].x).toBe(0);
    expect(kurva[60].x).toBe(60);
  });

  it("menyertakan seluruh garis SD yang diminta", () => {
    const titik = kurvaReferensi("bb_u", "L")[12];
    expect(titik.sd_3n).toBeDefined();
    expect(titik.sd_2n).toBeDefined();
    expect(titik.sd_0).toBeDefined();
    expect(titik.sd_2p).toBeDefined();
  });

  it("menempatkan garis dalam urutan naik", () => {
    // Urutan ini harus benar di setiap titik, bukan hanya sebagian.
    for (const titik of kurvaReferensi("bb_u", "P")) {
      expect(titik.sd_3n).toBeLessThan(titik.sd_2n);
      expect(titik.sd_2n).toBeLessThan(titik.sd_0);
      expect(titik.sd_0).toBeLessThan(titik.sd_2p);
    }
  });

  it("garis median sesuai nilai M pada tabel", () => {
    // Median adalah Z = 0, yang menurut rumus LMS sama dengan M.
    const titik = kurvaReferensi("bb_u", "L").find((t) => t.x === 0)!;
    expect(titik.sd_0).toBeCloseTo(3.3, 1);
  });

  it("garis -2 SD sesuai angka terbitan WHO", () => {
    const bbu = kurvaReferensi("bb_u", "L");
    expect(bbu.find((t) => t.x === 12)!.sd_2n).toBeCloseTo(7.7, 1);
    expect(bbu.find((t) => t.x === 60)!.sd_2n).toBeCloseTo(14.1, 1);

    const tbu = kurvaReferensi("tb_u", "L");
    expect(tbu.find((t) => t.x === 60)!.sd_2n).toBeCloseTo(100.7, 1);
  });

  it("membedakan kurva laki-laki dan perempuan", () => {
    const l = kurvaReferensi("bb_u", "L").find((t) => t.x === 24)!;
    const p = kurvaReferensi("bb_u", "P").find((t) => t.x === 24)!;
    expect(l.sd_0).not.toBe(p.sd_0);
  });

  it("membatasi rentang bila diminta", () => {
    const kurva = kurvaReferensi("bb_u", "L", { min: 12, maks: 24 });
    expect(kurva[0].x).toBe(12);
    expect(kurva[kurva.length - 1].x).toBe(24);
  });

  it("bekerja untuk kurva berbasis panjang badan", () => {
    // Pembanding pada BB/PB adalah panjang badan, bukan usia.
    const kurva = kurvaReferensi("bb_pb", "L");
    expect(kurva[0].x).toBe(45);
    expect(kurva[0].sd_0).toBeGreaterThan(0);
  });

  it("memakai empat garis referensi", () => {
    expect(GARIS_SD).toHaveLength(4);
  });
});

describe("gabungkanDenganDataAnak", () => {
  const kurva: TitikKurva[] = [
    { x: 0, sd_0: 3.3 },
    { x: 1, sd_0: 4.5 },
    { x: 2, sd_0: 5.6 },
  ];

  it("menyisipkan nilai anak pada titik yang sudah ada", () => {
    const hasil = gabungkanDenganDataAnak(kurva, [{ x: 1, nilai: 4.2 }]);
    expect(hasil).toHaveLength(3);
    expect(hasil.find((t) => t.x === 1)?.anak).toBe(4.2);
    // Garis referensi tetap utuh.
    expect(hasil.find((t) => t.x === 1)?.sd_0).toBe(4.5);
  });

  it("menambahkan baris baru bila usia anak di antara titik tabel", () => {
    const hasil = gabungkanDenganDataAnak(kurva, [{ x: 1.5, nilai: 5 }]);
    expect(hasil).toHaveLength(4);
    expect(hasil.find((t) => t.x === 1.5)?.anak).toBe(5);
  });

  it("mengurutkan hasil menurut x", () => {
    const hasil = gabungkanDenganDataAnak(kurva, [
      { x: 2, nilai: 5.1 },
      { x: 0, nilai: 3.1 },
    ]);
    expect(hasil.map((t) => t.x)).toEqual([0, 1, 2]);
  });

  it("mengembalikan kurva apa adanya bila anak belum punya data", () => {
    const hasil = gabungkanDenganDataAnak(kurva, []);
    expect(hasil).toHaveLength(3);
    expect(hasil.every((t) => t.anak === undefined)).toBe(true);
  });

  it("tidak mengubah senarai masukan", () => {
    const asli = JSON.parse(JSON.stringify(kurva));
    gabungkanDenganDataAnak(kurva, [{ x: 1, nilai: 4.2 }]);
    expect(kurva).toEqual(asli);
  });
});
