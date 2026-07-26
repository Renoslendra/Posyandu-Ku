import { describe, expect, it } from "vitest";
import { tanggalIndonesiaSingkat } from "./tanggal";

/**
 * Pengujian pemformatan tanggal singkat.
 *
 * Fungsi ini dipakai pada tabel riwayat yang dibaca orang tua, sehingga
 * kekeliruannya langsung terlihat oleh pemakai. Yang diuji terutama bukan jalur
 * normalnya, melainkan masukan yang menyimpang: bulan di luar rentang, bentuk
 * yang bukan ISO, dan nilai kosong. Ketiganya pernah menjadi sumber tulisan
 * "Invalid Date" pada antarmuka di proyek lain, dan tampilan seperti itu
 * menyembunyikan datanya alih-alih memperlihatkan ada yang salah.
 */
describe("tanggalIndonesiaSingkat", () => {
  it("mengubah tanggal ISO menjadi bentuk singkat", () => {
    expect(tanggalIndonesiaSingkat("2025-03-12")).toBe("12 Mar 2025");
  });

  it("membuang angka nol di depan tanggal", () => {
    expect(tanggalIndonesiaSingkat("2025-01-05")).toBe("5 Jan 2025");
  });

  it("memakai Mei, bukan May, pada bulan kelima", () => {
    // Nama bulan Indonesia dan Inggris berbeda pada bulan ini, sehingga
    // kekeliruan penerjemahan paling mudah tertangkap di sini.
    expect(tanggalIndonesiaSingkat("2025-05-20")).toBe("20 Mei 2025");
  });

  it("memakai Agu dan Okt sesuai singkatan Indonesia", () => {
    expect(tanggalIndonesiaSingkat("2025-08-01")).toBe("1 Agu 2025");
    expect(tanggalIndonesiaSingkat("2025-10-31")).toBe("31 Okt 2025");
  });

  it("menangani Desember sebagai bulan terakhir tanpa melampaui tabel", () => {
    expect(tanggalIndonesiaSingkat("2024-12-25")).toBe("25 Des 2024");
  });

  it("mengembalikan masukan apa adanya bila bukan bentuk ISO", () => {
    expect(tanggalIndonesiaSingkat("12/03/2025")).toBe("12/03/2025");
    expect(tanggalIndonesiaSingkat("")).toBe("");
    expect(tanggalIndonesiaSingkat("2025-3-12")).toBe("2025-3-12");
  });

  it("mengembalikan masukan apa adanya bila bulan di luar rentang", () => {
    // Tanpa penjagaan ini, bulan 13 akan mengambil indeks di luar tabel dan
    // menghasilkan "undefined" di tengah tanggal.
    expect(tanggalIndonesiaSingkat("2025-13-01")).toBe("2025-13-01");
    expect(tanggalIndonesiaSingkat("2025-00-01")).toBe("2025-00-01");
  });

  it("tidak bergantung pada zona waktu peladen", () => {
    /*
     * Diurai sebagai teks, bukan lewat konstruktor Date. Bila fungsi ini memakai
     * `new Date("2025-01-01")`, tanggal itu diartikan tengah malam UTC dan pada
     * zona waktu negatif akan tergeser menjadi 31 Desember tahun sebelumnya.
     * Pengujian ini mengunci perilakunya agar tetap sama di mana pun ia berjalan.
     */
    expect(tanggalIndonesiaSingkat("2025-01-01")).toBe("1 Jan 2025");
    expect(tanggalIndonesiaSingkat("2025-12-31")).toBe("31 Des 2025");
  });
});
