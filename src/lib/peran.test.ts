import { describe, expect, it } from "vitest";
import {
  HALAMAN_PERAN,
  LABEL_PERAN,
  bolehBuka,
  inisial,
  namaRingkas,
  type Peran,
} from "./peran";

/**
 * Pengujian pembantu peran.
 *
 * Yang diuji di sini adalah aturan yang menentukan tautan apa yang dilihat
 * pengguna dan halaman apa yang dapat dibukanya. Kesalahan pada bagian ini tidak
 * memunculkan galat: pengguna hanya melihat tautan yang salah, atau dialihkan
 * bolak-balik tanpa penjelasan.
 */

describe("inisial", () => {
  it("mengambil dua huruf pertama dari nama", () => {
    expect(inisial("Ratna Sari")).toBe("RS");
  });

  it("membuang keterangan peran di dalam tanda kurung", () => {
    // Nama pada data demo berbentuk seperti ini. Tanpa pembersihan, inisialnya
    // akan terambil dari kata "Kader", bukan dari nama orangnya. Sisa nama
    // hanya satu kata berarti, sehingga inisialnya pun satu huruf.
    expect(inisial("Bu Ani (Kader)")).toBe("A");
    expect(inisial("Bu Ratna (Bidan)")).toBe("R");
  });

  it("melewati gelar sapaan selama ada kata berarti sesudahnya", () => {
    expect(inisial("Bu Ani Suryani")).toBe("AS");
    expect(inisial("Ibu Wati Handayani")).toBe("WH");
    expect(inisial("Bapak Joko Susilo")).toBe("JS");
    expect(inisial("Bidan Ratna Dewi")).toBe("RD");
  });

  it("tetap memakai sapaan bila itu satu-satunya kata", () => {
    // Lebih baik menampilkan satu huruf daripada tanda tanya.
    expect(inisial("Bu")).toBe("B");
    expect(inisial("Bidan")).toBe("B");
  });

  it("mengembalikan tanda tanya untuk nama yang tidak ada", () => {
    expect(inisial(null)).toBe("?");
    expect(inisial(undefined)).toBe("?");
    expect(inisial("")).toBe("?");
    expect(inisial("   ")).toBe("?");
    expect(inisial("(Kader)")).toBe("?");
  });

  it("menghasilkan huruf besar meski masukannya huruf kecil", () => {
    expect(inisial("ratna sari")).toBe("RS");
  });
});

describe("namaRingkas", () => {
  it("membuang keterangan peran", () => {
    expect(namaRingkas("Bu Ani (Kader)")).toBe("Bu Ani");
    expect(namaRingkas("Bu Ratna (Bidan)")).toBe("Bu Ratna");
  });

  it("mengembalikan kata pengganti bila nama tidak ada", () => {
    expect(namaRingkas(null)).toBe("Pengguna");
    expect(namaRingkas("(Kader)")).toBe("Pengguna");
  });

  it("membiarkan nama tanpa tanda kurung apa adanya", () => {
    expect(namaRingkas("Ratna Sari")).toBe("Ratna Sari");
  });
});

describe("bolehBuka", () => {
  const peran: Peran[] = ["kader", "bidan", "orang_tua"];

  it("mengizinkan beranda untuk semua peran", () => {
    for (const p of peran) {
      expect(bolehBuka(p, "/")).toBe(true);
    }
  });

  it("mengizinkan halaman anak untuk ketiga peran", () => {
    // Bidan menelaah dari daftar prioritas, orang tua melihat grafik anaknya,
    // kader memperbaiki data. Anak mana yang terlihat ditentukan RLS.
    for (const p of peran) {
      expect(bolehBuka(p, "/anak/abc-123")).toBe(true);
    }
  });

  it("membatasi halaman pencatatan hanya untuk kader", () => {
    expect(bolehBuka("kader", "/kader")).toBe(true);
    expect(bolehBuka("bidan", "/kader")).toBe(false);
    expect(bolehBuka("orang_tua", "/kader")).toBe(false);
  });

  it("membatasi halaman pemantauan hanya untuk bidan", () => {
    expect(bolehBuka("bidan", "/bidan")).toBe(true);
    expect(bolehBuka("kader", "/bidan")).toBe(false);
    expect(bolehBuka("orang_tua", "/bidan")).toBe(false);
  });

  it("membatasi halaman orang tua hanya untuk orang tua", () => {
    expect(bolehBuka("orang_tua", "/orangtua")).toBe(true);
    expect(bolehBuka("kader", "/orangtua")).toBe(false);
    expect(bolehBuka("bidan", "/orangtua")).toBe(false);
  });

  it("menolak jalur yang tidak dikenal", () => {
    for (const p of peran) {
      expect(bolehBuka(p, "/entah")).toBe(false);
    }
  });
});

describe("pemetaan peran", () => {
  it("memiliki label dan halaman untuk setiap peran", () => {
    // Peran tanpa label akan tampil kosong pada bilah navigasi, dan peran tanpa
    // halaman membuat pengalihan menuju undefined.
    const semua: Peran[] = ["kader", "bidan", "orang_tua"];
    for (const p of semua) {
      expect(LABEL_PERAN[p]).toBeTruthy();
      expect(HALAMAN_PERAN[p]).toMatch(/^\//);
    }
  });

  it("mengarahkan setiap peran ke halaman yang boleh dibukanya", () => {
    // Menangkap keadaan mustahil: peran dialihkan ke halaman yang justru akan
    // memantulkannya kembali.
    const semua: Peran[] = ["kader", "bidan", "orang_tua"];
    for (const p of semua) {
      expect(bolehBuka(p, HALAMAN_PERAN[p])).toBe(true);
    }
  });
});
