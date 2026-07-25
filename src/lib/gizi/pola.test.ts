import { describe, expect, it } from "vitest";
import { analisisPola, statusPemantauan, type TitikPertumbuhan } from "./pola";

/** Membuat titik pertumbuhan berjarak satu bulan ke belakang dari acuan. */
function riwayat(berat: number[], opsi: { dikonfirmasi?: boolean[] } = {}) {
  const acuan = new Date(2026, 6, 1);
  return berat.map<TitikPertumbuhan>((beratKg, i) => {
    const tanggal = new Date(acuan);
    tanggal.setMonth(acuan.getMonth() - (berat.length - 1 - i));
    return {
      tanggal,
      beratKg,
      dikonfirmasi: opsi.dikonfirmasi?.[i],
    };
  });
}

describe("analisisPola — kecukupan data", () => {
  it("menolak menilai tren bila data kurang dari 3 titik", () => {
    expect(analisisPola(riwayat([8, 8.5])).jenis).toBe("data_kurang");
    expect(analisisPola([]).jenis).toBe("data_kurang");
    expect(analisisPola(riwayat([8, 8.5])).perluPerhatian).toBe(false);
  });

  it("menyebutkan jumlah pengukuran yang dibutuhkan", () => {
    expect(analisisPola(riwayat([8])).pesan).toMatch(/minimal 3/);
  });
});

describe("analisisPola — stagnan", () => {
  it("menandai berat tidak naik 2 kali berturut-turut", () => {
    const hasil = analisisPola(riwayat([8, 9, 9, 9]));
    expect(hasil.jenis).toBe("stagnan");
    expect(hasil.beruntunTidakNaik).toBe(2);
    expect(hasil.perluPerhatian).toBe(true);
    expect(hasil.pesan).toMatch(/bidan/i);
  });

  it("belum menandai bila baru 1 kali tidak naik", () => {
    const hasil = analisisPola(riwayat([8, 9, 10, 10]));
    expect(hasil.perluPerhatian).toBe(false);
    expect(hasil.beruntunTidakNaik).toBe(1);
  });

  it("menghitung dari kunjungan terbaru, bukan dari masa lalu", () => {
    // Pernah stagnan di awal, tetapi kini naik. Tidak perlu perhatian.
    const hasil = analisisPola(riwayat([8, 8, 8, 9, 10]));
    expect(hasil.perluPerhatian).toBe(false);
    expect(hasil.beruntunTidakNaik).toBe(0);
  });

  it("membedakan menurun dari sekadar stagnan", () => {
    const menurun = analisisPola(riwayat([10, 9.5, 9, 8.5]));
    expect(menurun.jenis).toBe("menurun");
    expect(menurun.perluPerhatian).toBe(true);

    const datar = analisisPola(riwayat([9, 9, 9, 9]));
    expect(datar.jenis).toBe("stagnan");
  });

  it("memperlakukan berat sama persis sebagai tidak naik", () => {
    // Ambang beratTidakNaikKg = 0, jadi selisih 0 termasuk tidak naik.
    expect(analisisPola(riwayat([9, 9, 9])).perluPerhatian).toBe(true);
  });
});

describe("analisisPola — pola sehat", () => {
  it("mengenali kenaikan konsisten", () => {
    const hasil = analisisPola(riwayat([7, 8, 9, 10]));
    expect(hasil.jenis).toBe("naik");
    expect(hasil.perluPerhatian).toBe(false);
  });

  it("mengenali fluktuasi dengan kenaikan bersih", () => {
    const hasil = analisisPola(riwayat([8, 9, 8.8, 9.5]));
    expect(hasil.jenis).toBe("berfluktuasi");
    expect(hasil.perluPerhatian).toBe(false);
    expect(hasil.pesan).toMatch(/naik secara keseluruhan/i);
  });

  it("mengenali fluktuasi tanpa kenaikan bersih", () => {
    const hasil = analisisPola(riwayat([9, 10, 8.5, 9]));
    expect(hasil.jenis).toBe("berfluktuasi");
    expect(hasil.pesan).toMatch(/naik-turun/i);
  });
});

describe("analisisPola — hanya memakai data terkonfirmasi", () => {
  it("mengabaikan nilai hasil ekstraksi yang belum dikonfirmasi", () => {
    // Nilai terakhir belum dikonfirmasi, sehingga tidak boleh memicu
    // peringatan stagnan (FR-10.5).
    const hasil = analisisPola(
      riwayat([7, 8, 9, 9], { dikonfirmasi: [true, true, true, false] }),
    );
    expect(hasil.jenis).toBe("naik");
    expect(hasil.perluPerhatian).toBe(false);
  });

  it("menganggap nilai tanpa penanda sebagai terkonfirmasi", () => {
    // Data manual tidak selalu menyertakan flag; anggapan bawaannya sah.
    expect(analisisPola(riwayat([9, 9, 9])).perluPerhatian).toBe(true);
  });

  it("kembali ke data_kurang bila terlalu banyak yang belum dikonfirmasi", () => {
    const hasil = analisisPola(
      riwayat([7, 8, 9], { dikonfirmasi: [true, false, false] }),
    );
    expect(hasil.jenis).toBe("data_kurang");
  });
});

describe("analisisPola — urutan masukan", () => {
  it("mengurutkan riwayat sendiri sebelum menganalisis", () => {
    const urut = riwayat([7, 8, 9, 9]);
    const acak = [urut[2], urut[0], urut[3], urut[1]];
    expect(analisisPola(acak)).toEqual(analisisPola(urut));
  });
});

describe("statusPemantauan (FR-11)", () => {
  const sekarang = new Date(2026, 6, 25);

  function tanggalMundur(hari: number) {
    const d = new Date(sekarang);
    d.setDate(d.getDate() - hari);
    return d;
  }

  it("menandai anak dengan jeda lebih dari 90 hari", () => {
    const hasil = statusPemantauan(tanggalMundur(100), sekarang);
    expect(hasil.hilang).toBe(true);
    expect(hasil.jedaHari).toBe(100);
    expect(hasil.pesan).toMatch(/dikunjungi kader/i);
  });

  it("tidak menandai jeda tepat 90 hari", () => {
    // Ambang bersifat "lebih dari", agar kunjungan triwulanan tidak
    // langsung tertandai.
    expect(statusPemantauan(tanggalMundur(90), sekarang).hilang).toBe(false);
    expect(statusPemantauan(tanggalMundur(91), sekarang).hilang).toBe(true);
  });

  it("tidak menandai kunjungan bulan lalu", () => {
    const hasil = statusPemantauan(tanggalMundur(30), sekarang);
    expect(hasil.hilang).toBe(false);
    expect(hasil.pesan).toMatch(/30 hari lalu/);
  });

  it("menandai anak yang belum pernah menimbang", () => {
    const hasil = statusPemantauan(null, sekarang);
    expect(hasil.hilang).toBe(true);
    expect(hasil.pesan).toMatch(/belum pernah/i);
  });

  it("menghitung jeda 0 hari untuk kunjungan hari ini", () => {
    expect(statusPemantauan(sekarang, sekarang).jedaHari).toBe(0);
  });
});
