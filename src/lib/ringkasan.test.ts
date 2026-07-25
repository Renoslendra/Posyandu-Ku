import { describe, expect, it } from "vitest";
import type { AnakPrioritas, RingkasanDashboard } from "./dashboard";
import { ringkasanTemplate } from "./ringkasan";

/**
 * Pengujian jalur fallback.
 *
 * Jalur ini yang berjalan saat penyedia model bermasalah, dan justru paling
 * penting diuji: ia harus tetap menghasilkan ringkasan yang benar tanpa
 * bergantung pada jaringan.
 */

function data(ubah: Partial<RingkasanDashboard> = {}): RingkasanDashboard {
  return {
    totalAnak: 20,
    sudahDiukur: 18,
    distribusi: { normal: 14, risiko: 3, berat: 1 },
    belumDinilai: 2,
    tidakDapatDinilai: 0,
    prioritas: [],
    hilangDariPemantauan: [],
    semuaAnak: [],
    ...ubah,
  };
}

/** Membentuk satu entri anak untuk pengujian, dengan medan wajib terisi. */
function anak(ubah: Partial<AnakPrioritas> & { id: string; nama: string }): AnakPrioritas {
  return {
    status: null,
    alasan: [],
    jedaHari: 0,
    tanggalTerakhir: null,
    telepon: null,
    ...ubah,
  };
}

describe("ringkasanTemplate", () => {
  it("memuat seluruh angka pokok", () => {
    const teks = ringkasanTemplate(data());
    expect(teks).toContain("20 anak terdaftar");
    expect(teks).toContain("18 anak sudah memiliki hasil");
    expect(teks).toContain("14 normal");
    expect(teks).toContain("3 perlu perhatian");
    expect(teks).toContain("1 perlu segera diperiksa");
  });

  it("menyebutkan anak yang belum dinilai", () => {
    expect(ringkasanTemplate(data())).toContain("2 anak belum memiliki hasil");
  });

  it("tidak menyebut anak belum dinilai bila tidak ada", () => {
    const teks = ringkasanTemplate(data({ belumDinilai: 0 }));
    expect(teks).not.toMatch(/belum memiliki hasil penimbangan\./);
  });

  it("menyatakan tidak ada tindak lanjut bila daftar prioritas kosong", () => {
    expect(ringkasanTemplate(data())).toContain("Tidak ada anak yang perlu ditindaklanjuti");
  });

  it("menyebut nama pada daftar prioritas", () => {
    const teks = ringkasanTemplate(
      data({
        prioritas: [
          anak({ id: "a", nama: "Ana", status: "berat", alasan: ["x"], jedaHari: 10, tanggalTerakhir: "2026-07-01" }),
          anak({ id: "b", nama: "Budi", status: "risiko", alasan: ["y"], jedaHari: 5, tanggalTerakhir: "2026-07-05" }),
        ],
      }),
    );
    expect(teks).toContain("2 anak");
    expect(teks).toContain("Ana, Budi");
  });

  it("membatasi jumlah nama yang disebut agar ringkasan tetap terbaca", () => {
    const banyak = Array.from({ length: 12 }, (_, i) =>
      anak({
        id: String(i),
        nama: `Anak${i}`,
        status: "risiko",
        alasan: ["x"],
        jedaHari: 1,
        tanggalTerakhir: "2026-07-01",
      }),
    );
    const teks = ringkasanTemplate(data({ prioritas: banyak }));
    expect(teks).toContain("12 anak");
    expect(teks).toContain("Anak4");
    expect(teks).not.toContain("Anak5");
  });

  it("menyebut anak yang berhenti menimbang", () => {
    const teks = ringkasanTemplate(
      data({
        hilangDariPemantauan: [
          anak({ id: "a", nama: "Ana", status: null, alasan: [], jedaHari: 120, tanggalTerakhir: "2026-03-01" }),
        ],
      }),
    );
    expect(teks).toContain("1 anak sudah lama tidak menimbang");
  });

  it("selalu menutup dengan pengingat bukan diagnosis", () => {
    // Wajib ada pada setiap keluaran, termasuk jalur fallback.
    expect(ringkasanTemplate(data())).toMatch(/bukan diagnosis/i);
    expect(ringkasanTemplate(data({ totalAnak: 0, sudahDiukur: 0 }))).toMatch(
      /bukan diagnosis/i,
    );
  });

  it("tetap menghasilkan ringkasan saat belum ada data sama sekali", () => {
    const teks = ringkasanTemplate(
      data({
        totalAnak: 0,
        sudahDiukur: 0,
        belumDinilai: 0,
        distribusi: { normal: 0, risiko: 0, berat: 0 },
      }),
    );
    expect(teks.length).toBeGreaterThan(0);
    expect(teks).toContain("0 anak terdaftar");
  });

  it("tidak memuat angka yang tidak ada pada data masukan", () => {
    // Menjaga agar template tidak pernah mengarang angka.
    const teks = ringkasanTemplate(
      data({
        totalAnak: 7,
        sudahDiukur: 7,
        belumDinilai: 0,
        distribusi: { normal: 7, risiko: 0, berat: 0 },
      }),
    );
    const angka = teks.match(/\d+/g) ?? [];
    const diizinkan = new Set(["7", "0"]);
    for (const a of angka) expect(diizinkan.has(a)).toBe(true);
  });
});
