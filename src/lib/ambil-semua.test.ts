import { describe, expect, it } from "vitest";
import { ambilSemua } from "./ambil-semua";

/**
 * Pengujian pengambilan bertahap.
 *
 * Yang ditegakkan di sini bukan sekadar kelengkapan hasil, melainkan bahwa
 * ketidaklengkapan selalu dinyatakan. Batas baris PostgREST tidak menghasilkan
 * galat ketika terlampaui, sehingga satu-satunya perlindungan terhadap angka
 * yang salah adalah penanda yang jujur.
 */

/** Membentuk kueri palsu atas sejumlah baris. */
function kueriAtas(jumlahBaris: number) {
  const semua = Array.from({ length: jumlahBaris }, (_, i) => ({ id: i }));
  let panggilan = 0;

  const kueri = (dari: number, sampai: number) => {
    panggilan += 1;
    return Promise.resolve({
      data: semua.slice(dari, sampai + 1),
      error: null,
    });
  };

  return { kueri, jumlahPanggilan: () => panggilan };
}

describe("ambilSemua", () => {
  it("mengambil seluruh baris ketika jumlahnya di bawah satu halaman", async () => {
    const { kueri, jumlahPanggilan } = kueriAtas(6);
    const hasil = await ambilSemua(kueri);

    expect(hasil.baris).toHaveLength(6);
    expect(hasil.terpotong).toBe(false);
    // Halaman yang tidak penuh menandakan tidak ada lagi baris sesudahnya.
    expect(jumlahPanggilan()).toBe(1);
  });

  it("mengambil seluruh baris ketika jumlahnya melewati satu halaman", async () => {
    /*
     * Inilah keadaan yang sebelumnya rusak. Dengan satu permintaan tanpa
     * jangkauan, baris ke seribu satu dan sesudahnya hilang tanpa pemberitahuan.
     */
    const { kueri, jumlahPanggilan } = kueriAtas(2500);
    const hasil = await ambilSemua(kueri);

    expect(hasil.baris).toHaveLength(2500);
    expect(hasil.terpotong).toBe(false);
    expect(jumlahPanggilan()).toBe(3);
  });

  it("tidak melewatkan atau menggandakan baris di perbatasan halaman", async () => {
    // Kekeliruan satu langkah pada jangkauan akan terlihat di sini.
    const { kueri } = kueriAtas(2001);
    const hasil = await ambilSemua(kueri);

    const id = hasil.baris.map((b) => (b as { id: number }).id);
    expect(id).toHaveLength(2001);
    expect(new Set(id).size).toBe(2001);
    expect(id[0]).toBe(0);
    expect(id[id.length - 1]).toBe(2000);
  });

  it("mengambil tepat satu halaman tanpa meminta halaman kedua yang kosong", async () => {
    const { kueri, jumlahPanggilan } = kueriAtas(1000);
    const hasil = await ambilSemua(kueri);

    expect(hasil.baris).toHaveLength(1000);
    expect(hasil.terpotong).toBe(false);
    /*
     * Halaman pertama penuh, sehingga halaman kedua tetap diminta untuk
     * memastikan tidak ada baris sesudahnya. Halaman kedua yang kosong lalu
     * mengakhiri penjalanan.
     */
    expect(jumlahPanggilan()).toBe(2);
  });

  it("menyatakan terpotong ketika kueri gagal di tengah penjalanan", async () => {
    /*
     * Senarai separuh yang tampak lengkap lebih berbahaya daripada kegagalan yang
     * dinyatakan, sebab angka yang dihitung darinya tetap terbaca meyakinkan.
     */
    let panggilan = 0;
    const hasil = await ambilSemua<{ id: number }>(() => {
      panggilan += 1;
      if (panggilan === 2) {
        return Promise.resolve({ data: null, error: { message: "koneksi putus" } });
      }
      return Promise.resolve({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
        error: null,
      });
    });

    expect(hasil.terpotong).toBe(true);
    expect(hasil.baris).toHaveLength(1000);
  });

  it("berhenti pada batas pengaman alih-alih berputar tanpa henti", async () => {
    // Kueri yang selalu mengembalikan halaman penuh tidak boleh menggantung.
    let panggilan = 0;
    const hasil = await ambilSemua<{ id: number }>(() => {
      panggilan += 1;
      return Promise.resolve({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
        error: null,
      });
    });

    expect(hasil.terpotong).toBe(true);
    expect(panggilan).toBe(100);
  });

  it("menangani hasil kosong tanpa menyatakan terpotong", async () => {
    const hasil = await ambilSemua<{ id: number }>(() =>
      Promise.resolve({ data: [], error: null }),
    );

    expect(hasil.baris).toHaveLength(0);
    expect(hasil.terpotong).toBe(false);
  });

  it("menangani data bernilai null sebagai hasil kosong", async () => {
    // Supabase dapat mengembalikan null alih-alih senarai kosong.
    const hasil = await ambilSemua<{ id: number }>(() =>
      Promise.resolve({ data: null, error: null }),
    );

    expect(hasil.baris).toHaveLength(0);
    expect(hasil.terpotong).toBe(false);
  });
});
