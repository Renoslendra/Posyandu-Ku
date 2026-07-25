import { describe, expect, it } from "vitest";
import { anakBaruSchema, pengukuranBaruSchema } from "./validasi";

const anakSah = {
  nama: "Budi Santoso",
  tanggalLahir: "2024-01-15",
  jenisKelamin: "L" as const,
  namaOrangTua: "Wati",
  telepon: "081234567890",
  alamat: "Dusun Melati RT 02",
};

describe("anakBaruSchema", () => {
  it("menerima data anak yang lengkap dan wajar", () => {
    expect(anakBaruSchema.safeParse(anakSah).success).toBe(true);
  });

  it("menerima data tanpa telepon dan alamat", () => {
    const { telepon, alamat, ...tanpaOpsional } = anakSah;
    expect(anakBaruSchema.safeParse(tanpaOpsional).success).toBe(true);
    expect(
      anakBaruSchema.safeParse({ ...anakSah, telepon: "", alamat: "" }).success,
    ).toBe(true);
  });

  it("menolak nama yang terlalu pendek", () => {
    const hasil = anakBaruSchema.safeParse({ ...anakSah, nama: "A" });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.errors[0].message).toMatch(/minimal 2 huruf/);
    }
  });

  it("menolak tanggal lahir di masa depan", () => {
    const tahunDepan = new Date();
    tahunDepan.setFullYear(tahunDepan.getFullYear() + 1);
    const iso = tahunDepan.toISOString().slice(0, 10);
    expect(anakBaruSchema.safeParse({ ...anakSah, tanggalLahir: iso }).success).toBe(
      false,
    );
  });

  it("menolak format tanggal yang bukan ISO", () => {
    expect(
      anakBaruSchema.safeParse({ ...anakSah, tanggalLahir: "15-01-2024" }).success,
    ).toBe(false);
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(
      anakBaruSchema.safeParse({ ...anakSah, tanggalLahir: "2024-02-31" }).success,
    ).toBe(false);
  });

  it("menerima berbagai format nomor telepon Indonesia", () => {
    for (const tel of ["081234567890", "6281234567890", "+6281234567890"]) {
      expect(anakBaruSchema.safeParse({ ...anakSah, telepon: tel }).success).toBe(
        true,
      );
    }
  });

  it("menolak nomor telepon yang tidak dikenali", () => {
    for (const tel of ["12345", "071234567890", "abcdefghij"]) {
      expect(anakBaruSchema.safeParse({ ...anakSah, telepon: tel }).success).toBe(
        false,
      );
    }
  });

  it("memangkas spasi berlebih pada nama", () => {
    const hasil = anakBaruSchema.safeParse({ ...anakSah, nama: "  Budi  " });
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.nama).toBe("Budi");
  });

  it("menolak jenis kelamin di luar L dan P", () => {
    expect(anakBaruSchema.safeParse({ ...anakSah, jenisKelamin: "X" }).success).toBe(
      false,
    );
  });
});

const ukurSah = {
  anakId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  tanggal: "2026-07-01",
  beratKg: 10.5,
  tinggiCm: 80,
  diukurTelentang: false,
};

describe("pengukuranBaruSchema", () => {
  it("menerima pengukuran yang wajar", () => {
    expect(pengukuranBaruSchema.safeParse(ukurSah).success).toBe(true);
  });

  it("menolak ID anak yang bukan UUID", () => {
    expect(
      pengukuranBaruSchema.safeParse({ ...ukurSah, anakId: "bukan-uuid" }).success,
    ).toBe(false);
  });

  it("menolak berat di luar batas wajar balita", () => {
    expect(pengukuranBaruSchema.safeParse({ ...ukurSah, beratKg: 90 }).success).toBe(
      false,
    );
    expect(pengukuranBaruSchema.safeParse({ ...ukurSah, beratKg: 0.1 }).success).toBe(
      false,
    );
  });

  it("menolak tinggi di luar batas wajar balita", () => {
    expect(pengukuranBaruSchema.safeParse({ ...ukurSah, tinggiCm: 5 }).success).toBe(
      false,
    );
    expect(
      pengukuranBaruSchema.safeParse({ ...ukurSah, tinggiCm: 200 }).success,
    ).toBe(false);
  });

  it("menolak berat yang dikirim sebagai teks", () => {
    // Penting untuk masukan dari formulir, yang selalu bertipe teks.
    const hasil = pengukuranBaruSchema.safeParse({ ...ukurSah, beratKg: "10.5" });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.errors[0].message).toMatch(/harus berupa angka/);
    }
  });

  it("memberi nilai bawaan untuk diukurTelentang", () => {
    const { diukurTelentang, ...tanpa } = ukurSah;
    const hasil = pengukuranBaruSchema.safeParse(tanpa);
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.diukurTelentang).toBe(false);
  });

  it("menerima penanda klien untuk sinkronisasi offline", () => {
    const hasil = pengukuranBaruSchema.safeParse({
      ...ukurSah,
      klienRef: "antrean-2026-07-25-001",
    });
    expect(hasil.success).toBe(true);
  });

  it("menolak tanggal pengukuran di masa depan", () => {
    const besok = new Date();
    besok.setDate(besok.getDate() + 3);
    expect(
      pengukuranBaruSchema.safeParse({
        ...ukurSah,
        tanggal: besok.toISOString().slice(0, 10),
      }).success,
    ).toBe(false);
  });
});
