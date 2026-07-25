import { describe, expect, it } from "vitest";
import { kodePenanda, periksaPengukuran } from "./penjaga-data";

/** Tanggal acuan agar pengujian tidak bergantung pada hari saat dijalankan. */
const kemarin = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
};

const bulanLalu = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
};

const dataSah = {
  beratKg: 10.5,
  tinggiCm: 80,
  usiaBulan: 24,
  tanggal: kemarin(),
};

describe("periksaPengukuran — nilai sah", () => {
  it("meloloskan pengukuran wajar tanpa temuan", () => {
    const hasil = periksaPengukuran(dataSah);
    expect(hasil.bolehDisimpan).toBe(true);
    expect(hasil.temuan).toHaveLength(0);
  });

  it("meloloskan nilai tepat di batas rentang", () => {
    expect(
      periksaPengukuran({ ...dataSah, beratKg: 0.5, tinggiCm: 30, usiaBulan: 0 })
        .bolehDisimpan,
    ).toBe(true);
    expect(
      periksaPengukuran({ ...dataSah, beratKg: 30, tinggiCm: 130, usiaBulan: 60 })
        .bolehDisimpan,
    ).toBe(true);
  });
});

describe("periksaPengukuran — penolakan (FR-12.1)", () => {
  it("menolak berat balita 90 kg", () => {
    // Kriteria penerimaan nomor 3 pada PRD.
    const hasil = periksaPengukuran({ ...dataSah, beratKg: 90 });
    expect(hasil.bolehDisimpan).toBe(false);
    expect(hasil.temuan.map((t) => t.kode)).toContain("berat_di_luar_batas");
    expect(hasil.temuan[0].pesan).toMatch(/periksa kembali/i);
  });

  it("menolak berat terlalu kecil", () => {
    expect(periksaPengukuran({ ...dataSah, beratKg: 0.2 }).bolehDisimpan).toBe(false);
  });

  it("menolak tinggi di luar batas", () => {
    expect(periksaPengukuran({ ...dataSah, tinggiCm: 5 }).bolehDisimpan).toBe(false);
    expect(periksaPengukuran({ ...dataSah, tinggiCm: 200 }).bolehDisimpan).toBe(false);
  });

  it("menolak usia di luar layanan balita", () => {
    const hasil = periksaPengukuran({ ...dataSah, usiaBulan: 72 });
    expect(hasil.bolehDisimpan).toBe(false);
    expect(hasil.temuan.map((t) => t.kode)).toContain("usia_di_luar_layanan");
  });

  it("menolak nilai bukan angka", () => {
    expect(periksaPengukuran({ ...dataSah, beratKg: NaN }).bolehDisimpan).toBe(false);
    expect(periksaPengukuran({ ...dataSah, tinggiCm: Infinity }).bolehDisimpan).toBe(
      false,
    );
  });

  it("menolak tanggal di masa depan (FR-12.4)", () => {
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const hasil = periksaPengukuran({ ...dataSah, tanggal: besok });
    expect(hasil.bolehDisimpan).toBe(false);
    expect(hasil.temuan.map((t) => t.kode)).toContain("tanggal_masa_depan");
  });

  it("meloloskan pengukuran bertanggal hari ini", () => {
    // Zona waktu tidak boleh menyebabkan penolakan palsu.
    const hasil = periksaPengukuran({ ...dataSah, tanggal: new Date() });
    expect(hasil.bolehDisimpan).toBe(true);
  });

  it("melaporkan seluruh temuan sekaligus, bukan hanya yang pertama", () => {
    const hasil = periksaPengukuran({
      beratKg: 90,
      tinggiCm: 300,
      usiaBulan: 99,
      tanggal: kemarin(),
    });
    expect(hasil.temuan.length).toBeGreaterThanOrEqual(3);
  });
});

describe("periksaPengukuran — penandaan terhadap kunjungan sebelumnya", () => {
  it("menandai tinggi badan yang menurun (FR-12.2)", () => {
    const hasil = periksaPengukuran(
      { ...dataSah, tinggiCm: 76 },
      { beratKg: 10, tinggiCm: 80, tanggal: bulanLalu() },
    );
    // Ditandai, bukan ditolak: nilai mungkin akibat perbedaan cara ukur.
    expect(hasil.bolehDisimpan).toBe(true);
    expect(hasil.temuan.map((t) => t.kode)).toContain("tinggi_menurun");
  });

  it("menandai lonjakan berat tidak wajar (FR-12.3)", () => {
    const hasil = periksaPengukuran(
      { ...dataSah, beratKg: 14 },
      { beratKg: 10, tinggiCm: 78, tanggal: bulanLalu() },
    );
    expect(hasil.bolehDisimpan).toBe(true);
    expect(hasil.temuan.map((t) => t.kode)).toContain("lonjakan_berat");
  });

  it("tidak menandai kenaikan berat yang wajar", () => {
    const hasil = periksaPengukuran(
      { ...dataSah, beratKg: 11 },
      { beratKg: 10.5, tinggiCm: 79, tanggal: bulanLalu() },
    );
    expect(hasil.temuan).toHaveLength(0);
  });

  it("menskalakan ambang lonjakan terhadap jarak kunjungan", () => {
    // Kenaikan 3 kg dalam 3 bulan wajar, dalam 1 bulan tidak.
    const tigaBulanLalu = new Date();
    tigaBulanLalu.setDate(tigaBulanLalu.getDate() - 90);

    const jauh = periksaPengukuran(
      { ...dataSah, beratKg: 13.5 },
      { beratKg: 10.5, tinggiCm: 76, tanggal: tigaBulanLalu },
    );
    expect(jauh.temuan.map((t) => t.kode)).not.toContain("lonjakan_berat");

    const dekat = periksaPengukuran(
      { ...dataSah, beratKg: 13.5 },
      { beratKg: 10.5, tinggiCm: 79, tanggal: bulanLalu() },
    );
    expect(dekat.temuan.map((t) => t.kode)).toContain("lonjakan_berat");
  });

  it("menandai penurunan berat tajam", () => {
    const hasil = periksaPengukuran(
      { ...dataSah, beratKg: 7 },
      { beratKg: 10.5, tinggiCm: 79, tanggal: bulanLalu() },
    );
    expect(hasil.temuan.map((t) => t.kode)).toContain("penurunan_berat_tajam");
    expect(hasil.temuan.find((t) => t.kode === "penurunan_berat_tajam")?.pesan).toMatch(
      /bidan/i,
    );
  });

  it("menandai tanggal yang lebih awal dari kunjungan terakhir", () => {
    const duaBulanLalu = new Date();
    duaBulanLalu.setDate(duaBulanLalu.getDate() - 60);
    const hasil = periksaPengukuran(
      { ...dataSah, tanggal: duaBulanLalu },
      { beratKg: 10, tinggiCm: 79, tanggal: bulanLalu() },
    );
    expect(hasil.temuan.map((t) => t.kode)).toContain("tanggal_mundur");
  });
});

describe("kodePenanda", () => {
  it("hanya mengambil temuan bertingkat tandai", () => {
    const hasil = periksaPengukuran(
      { ...dataSah, tinggiCm: 76 },
      { beratKg: 10, tinggiCm: 80, tanggal: bulanLalu() },
    );
    expect(kodePenanda(hasil)).toEqual(["tinggi_menurun"]);
  });

  it("mengembalikan senarai kosong bila tidak ada temuan", () => {
    expect(kodePenanda(periksaPengukuran(dataSah))).toEqual([]);
  });
});
