import { describe, expect, it, vi } from "vitest";
import { BATAS, periksaBatas } from "./batas-laju";

/**
 * Membuat klien Supabase palsu yang hanya menyediakan rpc.
 *
 * Cukup untuk menguji perilaku pembatasan laju, karena modul ini tidak
 * menyentuh tabel secara langsung.
 */
function klienPalsu(hasil: { data?: unknown; error?: { message: string } }) {
  return {
    rpc: vi.fn().mockResolvedValue({
      data: hasil.data ?? null,
      error: hasil.error ?? null,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("periksaBatas", () => {
  it("mengizinkan permintaan ketika batas belum terlampaui", async () => {
    const klien = klienPalsu({ data: false });
    const hasil = await periksaBatas(klien, BATAS.menu);

    expect(hasil.ditolak).toBe(false);
    expect(hasil.pesan).toBeUndefined();
  });

  it("menolak permintaan ketika batas terlampaui", async () => {
    const klien = klienPalsu({ data: true });
    const hasil = await periksaBatas(klien, BATAS.menu);

    expect(hasil.ditolak).toBe(true);
    expect(hasil.pesan).toMatch(/terlalu banyak/i);
  });

  it("menyebutkan lama tunggu pada pesan penolakan", async () => {
    // Pengguna perlu tahu berapa lama harus menunggu, bukan hanya bahwa
    // permintaannya ditolak.
    const klien = klienPalsu({ data: true });
    const hasil = await periksaBatas(klien, BATAS.ringkasan);

    expect(hasil.pesan).toContain(String(BATAS.ringkasan.jendelaDetik));
  });

  it("mengirimkan nama endpoint, batas, dan jendela ke basis data", async () => {
    const klien = klienPalsu({ data: false });
    await periksaBatas(klien, BATAS.importFoto);

    expect(klien.rpc).toHaveBeenCalledWith("catat_panggilan", {
      nama_endpoint: "import_foto",
      batas: BATAS.importFoto.batas,
      jendela_detik: BATAS.importFoto.jendelaDetik,
    });
  });

  it("mengizinkan permintaan bila pemeriksaan batas gagal", async () => {
    /*
     * Keputusan yang disengaja: kegagalan pembatasan laju tidak boleh
     * mematikan fitur yang sedang dipakai kader di lapangan.
     *
     * Risiko yang diterima terbatas pada biaya API, sedangkan menolak
     * permintaan akan menghentikan pekerjaan yang sah.
     */
    const klien = klienPalsu({ error: { message: "fungsi tidak ditemukan" } });
    const diam = vi.spyOn(console, "warn").mockImplementation(() => {});

    const hasil = await periksaBatas(klien, BATAS.menu);

    expect(hasil.ditolak).toBe(false);
    // Kegagalannya tetap tercatat agar terlihat di log, bukan ditelan diam-diam.
    expect(diam).toHaveBeenCalled();
    diam.mockRestore();
  });

  it("memperlakukan balasan selain true sebagai izin", async () => {
    // Bila fungsi mengembalikan null karena alasan tak terduga, permintaan
    // tetap diizinkan, sejalan dengan prinsip gagal-terbuka di atas.
    for (const nilai of [null, undefined, 0, "false"]) {
      const hasil = await periksaBatas(klienPalsu({ data: nilai }), BATAS.menu);
      expect(hasil.ditolak).toBe(false);
    }
  });
});

describe("BATAS", () => {
  it("membatasi ringkasan lebih ketat daripada menu", () => {
    // Prompt ringkasan paling besar dan hasilnya jarang berubah dalam
    // hitungan menit.
    expect(BATAS.ringkasan.batas).toBeLessThan(BATAS.menu.batas);
  });

  it("memberi ruang paling lapang pada import foto", () => {
    // Kader memang memfoto beberapa halaman berurutan.
    expect(BATAS.importFoto.batas).toBeGreaterThan(BATAS.menu.batas);
  });

  it("memakai nama endpoint yang berbeda untuk setiap aturan", () => {
    const nama = Object.values(BATAS).map((b) => b.endpoint);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it("memakai jendela yang wajar", () => {
    for (const b of Object.values(BATAS)) {
      expect(b.jendelaDetik).toBeGreaterThan(0);
      expect(b.batas).toBeGreaterThan(0);
    }
  });
});
