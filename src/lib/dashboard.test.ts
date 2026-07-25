import { describe, expect, it } from "vitest";
import { susunRingkasan, type BarisAnak, type BarisPengukuran } from "./dashboard";

const SEKARANG = new Date("2026-07-25T00:00:00Z");

function anak(id: string, nama: string): BarisAnak {
  return { id, nama, tanggal_lahir: "2024-01-01", jenis_kelamin: "L" };
}

function ukur(
  anakId: string,
  tanggal: string,
  beratKg: number,
  status: BarisPengukuran["status"],
  dikonfirmasi = true,
): BarisPengukuran {
  return { anak_id: anakId, tanggal, berat_kg: beratKg, status, dikonfirmasi };
}

describe("susunRingkasan — hitungan dasar", () => {
  it("menghitung total anak dan yang sudah diukur", () => {
    const r = susunRingkasan(
      [anak("a", "Ana"), anak("b", "Budi"), anak("c", "Cici")],
      [ukur("a", "2026-07-01", 10, "normal")],
      SEKARANG,
    );
    expect(r.totalAnak).toBe(3);
    expect(r.sudahDiukur).toBe(1);
    expect(r.belumDinilai).toBe(2);
  });

  it("menghitung distribusi status dari pengukuran terakhir", () => {
    const r = susunRingkasan(
      [anak("a", "Ana"), anak("b", "Budi")],
      [
        // Ana pernah berstatus berat, tetapi kini normal. Yang dihitung
        // adalah kondisi terkini, bukan yang terburuk sepanjang riwayat.
        ukur("a", "2026-05-01", 8, "berat"),
        ukur("a", "2026-07-01", 11, "normal"),
        ukur("b", "2026-07-01", 8, "risiko"),
      ],
      SEKARANG,
    );
    expect(r.distribusi).toEqual({ normal: 1, risiko: 1, berat: 0 });
  });

  it("mengabaikan pengukuran yang belum dikonfirmasi", () => {
    // Hasil ekstraksi AI tidak boleh masuk statistik sebelum disetujui kader.
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [ukur("a", "2026-07-01", 8, "berat", false)],
      SEKARANG,
    );
    expect(r.sudahDiukur).toBe(0);
    expect(r.belumDinilai).toBe(1);
    expect(r.distribusi.berat).toBe(0);
  });

  it("menangani daftar anak kosong", () => {
    const r = susunRingkasan([], [], SEKARANG);
    expect(r.totalAnak).toBe(0);
    expect(r.prioritas).toEqual([]);
  });
});

describe("susunRingkasan — daftar prioritas", () => {
  it("memasukkan anak berstatus berat", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [ukur("a", "2026-07-01", 8, "berat")],
      SEKARANG,
    );
    expect(r.prioritas).toHaveLength(1);
    expect(r.prioritas[0].alasan[0]).toMatch(/segera diperiksa/i);
  });

  it("tidak memasukkan anak yang normal dan rutin menimbang", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [
        ukur("a", "2026-05-01", 10, "normal"),
        ukur("a", "2026-06-01", 10.5, "normal"),
        ukur("a", "2026-07-01", 11, "normal"),
      ],
      SEKARANG,
    );
    expect(r.prioritas).toEqual([]);
  });

  it("memasukkan anak berstatus normal yang beratnya stagnan", () => {
    // Status gizi masih normal, tetapi pertumbuhannya berhenti. Kasus seperti
    // ini yang tidak terlihat pada pencatatan buku tulis.
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [
        ukur("a", "2026-05-01", 11, "normal"),
        ukur("a", "2026-06-01", 11, "normal"),
        ukur("a", "2026-07-01", 11, "normal"),
      ],
      SEKARANG,
    );
    expect(r.prioritas).toHaveLength(1);
    expect(r.prioritas[0].alasan.some((a) => /tidak naik/i.test(a))).toBe(true);
  });

  it("mengurutkan status berat sebelum risiko", () => {
    const r = susunRingkasan(
      [anak("a", "Ana"), anak("b", "Budi")],
      [ukur("a", "2026-07-01", 9, "risiko"), ukur("b", "2026-07-01", 8, "berat")],
      SEKARANG,
    );
    expect(r.prioritas[0].nama).toBe("Budi");
    expect(r.prioritas[1].nama).toBe("Ana");
  });

  it("mengurutkan jeda kunjungan terlama lebih dulu pada status sama", () => {
    const r = susunRingkasan(
      [anak("a", "Ana"), anak("b", "Budi")],
      [ukur("a", "2026-07-01", 8, "berat"), ukur("b", "2026-01-01", 8, "berat")],
      SEKARANG,
    );
    expect(r.prioritas[0].nama).toBe("Budi");
  });

  it("menggabungkan beberapa alasan pada satu anak", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [
        ukur("a", "2026-01-01", 9, "berat"),
        ukur("a", "2026-02-01", 9, "berat"),
        ukur("a", "2026-03-01", 9, "berat"),
      ],
      SEKARANG,
    );
    // Status berat, berat stagnan, dan sudah lama tidak menimbang.
    expect(r.prioritas[0].alasan.length).toBeGreaterThanOrEqual(3);
  });
});

describe("susunRingkasan — anak hilang dari pemantauan", () => {
  it("menandai anak dengan jeda lebih dari 90 hari", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [ukur("a", "2026-01-01", 10, "normal")],
      SEKARANG,
    );
    expect(r.hilangDariPemantauan).toHaveLength(1);
    expect(r.hilangDariPemantauan[0].jedaHari).toBeGreaterThan(90);
  });

  it("menandai anak yang belum pernah menimbang", () => {
    const r = susunRingkasan([anak("a", "Ana")], [], SEKARANG);
    expect(r.hilangDariPemantauan).toHaveLength(1);
    expect(r.hilangDariPemantauan[0].tanggalTerakhir).toBeNull();
    // Jeda tak terhingga diwakili -1 agar dapat dikirim sebagai JSON.
    expect(r.hilangDariPemantauan[0].jedaHari).toBe(-1);
  });

  it("tidak menandai anak yang menimbang bulan lalu", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [ukur("a", "2026-07-01", 10, "normal")],
      SEKARANG,
    );
    expect(r.hilangDariPemantauan).toEqual([]);
  });

  it("mengurutkan dari yang paling lama tidak menimbang", () => {
    const r = susunRingkasan(
      [anak("a", "Ana"), anak("b", "Budi")],
      [ukur("a", "2026-03-01", 10, "normal"), ukur("b", "2026-01-01", 10, "normal")],
      SEKARANG,
    );
    expect(r.hilangDariPemantauan[0].nama).toBe("Budi");
  });
});

describe("susunRingkasan — ketahanan masukan", () => {
  it("menerima berat bertipe teks dari basis data", () => {
    // Kolom numeric PostgreSQL dikembalikan sebagai teks oleh driver.
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [
        { anak_id: "a", tanggal: "2026-05-01", berat_kg: "11.0", status: "normal", dikonfirmasi: true },
        { anak_id: "a", tanggal: "2026-06-01", berat_kg: "11.0", status: "normal", dikonfirmasi: true },
        { anak_id: "a", tanggal: "2026-07-01", berat_kg: "11.0", status: "normal", dikonfirmasi: true },
      ],
      SEKARANG,
    );
    expect(r.prioritas[0].alasan.some((a) => /tidak naik/i.test(a))).toBe(true);
  });

  it("mengurutkan pengukuran yang datang tidak berurutan", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [ukur("a", "2026-07-01", 11, "normal"), ukur("a", "2026-05-01", 8, "berat")],
      SEKARANG,
    );
    // Pengukuran terbaru adalah Juli, sehingga statusnya normal.
    expect(r.distribusi.normal).toBe(1);
  });

  it("mengabaikan pengukuran untuk anak yang tidak ada di daftar", () => {
    const r = susunRingkasan(
      [anak("a", "Ana")],
      [ukur("zzz", "2026-07-01", 8, "berat")],
      SEKARANG,
    );
    expect(r.totalAnak).toBe(1);
    expect(r.distribusi.berat).toBe(0);
  });
});
