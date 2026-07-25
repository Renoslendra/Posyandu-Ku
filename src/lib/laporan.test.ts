import { describe, expect, it } from "vitest";
import { bidangCsv, namaBerkasLaporan, susunLaporanCsv } from "./laporan";
import type { AnakPrioritas, RingkasanDashboard } from "./dashboard";

function entri(
  nama: string,
  status: AnakPrioritas["status"],
  pilihan: Partial<AnakPrioritas> = {},
): AnakPrioritas {
  return {
    id: nama,
    nama,
    status,
    alasan: [],
    jedaHari: 30,
    tanggalTerakhir: "2026-07-01",
    telepon: null,
    ...pilihan,
  };
}

function ringkasan(pilihan: Partial<RingkasanDashboard> = {}): RingkasanDashboard {
  return {
    totalAnak: 3,
    sudahDiukur: 2,
    distribusi: { normal: 1, risiko: 1, berat: 0 },
    belumDinilai: 1,
    tidakDapatDinilai: 0,
    prioritas: [],
    hilangDariPemantauan: [],
    semuaAnak: [],
    ...pilihan,
  };
}

const KONTEKS = {
  namaWilayah: "Desa Sukamakmur",
  tanggalCetak: new Date("2026-07-26T00:00:00Z"),
};

describe("bidangCsv", () => {
  it("membiarkan nilai sederhana tanpa pengutipan", () => {
    expect(bidangCsv("Aisyah")).toBe("Aisyah");
    expect(bidangCsv(12)).toBe("12");
  });

  it("mengutip nilai yang memuat koma", () => {
    // Nama di Indonesia dapat memuat koma pada gelar atau sebutan. Tanpa
    // pengutipan, bidangnya bergeser dan seluruh baris salah terbaca.
    expect(bidangCsv("Aisyah, S.Pd")).toBe('"Aisyah, S.Pd"');
  });

  it("menggandakan tanda kutip di dalam nilai", () => {
    expect(bidangCsv('Anak "Kecil"')).toBe('"Anak ""Kecil"""');
  });

  it("mengutip nilai yang memuat baris baru", () => {
    expect(bidangCsv("baris\nkedua")).toBe('"baris\nkedua"');
  });

  it("mengubah nilai kosong menjadi bidang kosong", () => {
    expect(bidangCsv(null)).toBe("");
  });
});

describe("susunLaporanCsv — keterangan dan rekapitulasi", () => {
  it("menyertakan nama wilayah dan tanggal cetak", () => {
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    expect(csv).toContain("Desa Sukamakmur");
    expect(csv).toContain("2026-07-26");
  });

  it("menyertakan penafian bukan alat diagnosis di dalam berkas", () => {
    // Berkas berpindah tangan terlepas dari antarmuka tempat ia diunduh,
    // sehingga penafian harus ikut di dalamnya.
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    expect(csv).toMatch(/bukan alat diagnosis/i);
  });

  it("memuat seluruh angka rekapitulasi", () => {
    const csv = susunLaporanCsv(
      ringkasan({
        totalAnak: 10,
        sudahDiukur: 8,
        belumDinilai: 2,
        distribusi: { normal: 5, risiko: 2, berat: 1 },
      }),
      KONTEKS,
    );

    expect(csv).toContain("Total anak terdaftar,10");
    expect(csv).toContain("Sudah ditimbang,8");
    expect(csv).toContain("Belum pernah ditimbang,2");
    expect(csv).toContain("Status normal,5");
    expect(csv).toContain("Status perlu perhatian,2");
    expect(csv).toContain("Status perlu segera diperiksa,1");
  });

  it("meletakkan rekapitulasi sebelum rincian", () => {
    // Rekapitulasi yang dibutuhkan untuk pelaporan ke atas harus terbaca
    // lebih dulu, tanpa menggulir seluruh daftar anak.
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    expect(csv.indexOf("REKAPITULASI")).toBeLessThan(csv.indexOf("RINCIAN PER ANAK"));
  });
});

describe("susunLaporanCsv — rincian per anak", () => {
  it("menuliskan satu baris untuk setiap anak", () => {
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [entri("Aisyah", "normal"), entri("Bagas", "berat")],
      }),
      KONTEKS,
    );
    expect(csv).toContain("Aisyah");
    expect(csv).toContain("Bagas");
  });

  it("memakai label yang dipahami pembaca laporan, bukan kode status", () => {
    const csv = susunLaporanCsv(
      ringkasan({ semuaAnak: [entri("Bagas", "berat")] }),
      KONTEKS,
    );
    // Kode internal 'berat' tidak bermakna bagi staf dinas kesehatan.
    expect(csv).not.toMatch(/,berat,/);
  });

  it("menandai anak yang belum pernah ditimbang", () => {
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [entri("Fajar", null, { tanggalTerakhir: null, jedaHari: -1 })],
      }),
      KONTEKS,
    );
    expect(csv).toContain("Belum ditimbang");
    expect(csv).toContain("Belum pernah");
  });

  it("mengosongkan jeda hari untuk anak yang belum pernah ditimbang", () => {
    // Jeda -1 adalah penanda internal, bukan jumlah hari. Menampilkannya
    // sebagai angka akan menyesatkan pembaca laporan.
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [entri("Fajar", null, { tanggalTerakhir: null, jedaHari: -1 })],
      }),
      KONTEKS,
    );
    expect(csv).not.toContain("-1");
  });

  it("menyertakan nomor telepon untuk tindak lanjut", () => {
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [entri("Dimas", "risiko", { telepon: "081234567890" })],
      }),
      KONTEKS,
    );
    expect(csv).toContain("081234567890");
  });

  it("menggabungkan beberapa alasan dalam satu bidang", () => {
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [
          entri("Dimas", "risiko", {
            alasan: ["Status gizi perlu perhatian", "Berat tidak naik"],
          }),
        ],
      }),
      KONTEKS,
    );
    // Dipisah titik koma, bukan koma, agar tidak memecah bidang CSV.
    expect(csv).toContain("Status gizi perlu perhatian; Berat tidak naik");
  });

  it("mengutip nama yang memuat koma tanpa memecah baris", () => {
    const csv = susunLaporanCsv(
      ringkasan({ semuaAnak: [entri("Aisyah, S.Pd", "normal")] }),
      KONTEKS,
    );
    expect(csv).toContain('"Aisyah, S.Pd"');
  });

  it("tetap menghasilkan berkas yang sah ketika belum ada anak", () => {
    const csv = susunLaporanCsv(ringkasan({ totalAnak: 0, semuaAnak: [] }), KONTEKS);
    expect(csv).toContain("RINCIAN PER ANAK");
    expect(csv).toContain("Total anak terdaftar,0");
  });

  it("mengakhiri berkas dengan baris baru", () => {
    // Sebagian pengolah memotong baris terakhir yang tidak diakhiri baris baru.
    expect(susunLaporanCsv(ringkasan(), KONTEKS).endsWith("\r\n")).toBe(true);
  });
});

describe("namaBerkasLaporan", () => {
  it("menyertakan wilayah dan tanggal agar berkas tidak saling menimpa", () => {
    const nama = namaBerkasLaporan("Desa Sukamakmur", new Date("2026-07-26T00:00:00Z"));
    expect(nama).toBe("laporan-gizi-desa-sukamakmur-2026-07-26.csv");
  });

  it("membersihkan karakter yang tidak aman untuk nama berkas", () => {
    const nama = namaBerkasLaporan("Desa A/B (Baru)", new Date("2026-07-26T00:00:00Z"));
    expect(nama).toMatch(/^laporan-gizi-[a-z0-9-]+-2026-07-26\.csv$/);
  });

  it("memakai nama pengganti bila wilayah tidak diketahui", () => {
    const nama = namaBerkasLaporan("", new Date("2026-07-26T00:00:00Z"));
    expect(nama).toBe("laporan-gizi-posyandu-2026-07-26.csv");
  });
});
