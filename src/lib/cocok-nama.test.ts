import { describe, expect, it } from "vitest";
import { cocokkanNama, normalkanNama, type CalonAnak } from "./cocok-nama";

const DAFTAR: CalonAnak[] = [
  { id: "1", nama: "Aisyah Putri" },
  { id: "2", nama: "Bagas Pratama" },
  { id: "3", nama: "Citra" },
  { id: "4", nama: "Dimas Saputra" },
];

describe("normalkanNama", () => {
  it("mengabaikan perbedaan huruf besar kecil", () => {
    expect(normalkanNama("AISYAH")).toBe(normalkanNama("aisyah"));
  });

  it("merapikan spasi berlebih", () => {
    expect(normalkanNama("  Aisyah   Putri  ")).toBe("aisyah putri");
  });

  it("membuang sebutan yang lazim ditulis kader", () => {
    // Kader sering menulis sebutan di depan nama pada buku posyandu.
    for (const sebutan of ["An.", "An", "Ananda", "Adik", "By.", "Anak"]) {
      expect(normalkanNama(`${sebutan} Aisyah`)).toBe("aisyah");
    }
  });

  it("tidak membuang kata yang kebetulan berawalan sama dengan sebutan", () => {
    // "Anisa" berawalan 'an' namun bukan sebutan.
    expect(normalkanNama("Anisa")).toBe("anisa");
  });

  it("mengubah tanda hubung menjadi spasi, bukan menghapusnya", () => {
    // Tanpa ini "sri-wahyuni" akan menyatu menjadi "sriwahyuni" dan tidak
    // cocok dengan "Sri Wahyuni" di basis data.
    expect(normalkanNama("Sri-Wahyuni")).toBe("sri wahyuni");
  });

  it("membuang tanda baca lain", () => {
    expect(normalkanNama("Aisyah, S")).toBe("aisyah s");
  });

  it("mengembalikan teks kosong untuk masukan kosong", () => {
    expect(normalkanNama("   ")).toBe("");
  });
});

describe("cocokkanNama — kecocokan persis", () => {
  it("mencocokkan nama yang sama", () => {
    const h = cocokkanNama("Aisyah Putri", DAFTAR);
    expect(h.jenis).toBe("persis");
    expect(h.anakId).toBe("1");
  });

  it("mencocokkan meski huruf besar kecil berbeda", () => {
    expect(cocokkanNama("bagas pratama", DAFTAR).anakId).toBe("2");
  });

  it("mencocokkan meski ada sebutan di depan", () => {
    expect(cocokkanNama("An. Citra", DAFTAR).anakId).toBe("3");
  });

  it("mengutamakan kecocokan persis di atas kecocokan sebagian", () => {
    // "Siti" harus tercocok ke anak bernama "Siti", bukan dianggap ganda
    // karena ada "Siti Aminah" di daftar yang sama.
    const daftar: CalonAnak[] = [
      { id: "a", nama: "Siti" },
      { id: "b", nama: "Siti Aminah" },
    ];
    const h = cocokkanNama("Siti", daftar);
    expect(h.jenis).toBe("persis");
    expect(h.anakId).toBe("a");
  });
});

describe("cocokkanNama — kecocokan sebagian", () => {
  it("menerima satu calon yang mengandung nama yang dibaca", () => {
    // Kader sering menulis nama panggilan saja di buku tulis.
    const h = cocokkanNama("Aisyah", DAFTAR);
    expect(h.jenis).toBe("sebagian");
    expect(h.anakId).toBe("1");
  });

  it("menerima nama yang dibaca lebih panjang daripada data", () => {
    // Pembacaan foto dapat memuat nama lengkap sementara basis data hanya
    // menyimpan nama pendek.
    const h = cocokkanNama("Citra Dewi Lestari", DAFTAR);
    expect(h.jenis).toBe("sebagian");
    expect(h.anakId).toBe("3");
  });
});

describe("cocokkanNama — penolakan yang disengaja", () => {
  it("menolak memilih ketika beberapa calon menyerupai", () => {
    /*
     * Mencocokkan ke anak yang salah berarti menuliskan berat seorang anak ke
     * rekam anak lain. Kesalahan itu tidak terlihat setelah tersimpan dan
     * dapat memicu peringatan gizi buruk palsu sekaligus menyembunyikan yang
     * sungguhan.
     */
    const daftar: CalonAnak[] = [
      { id: "a", nama: "Siti Aminah" },
      { id: "b", nama: "Siti Fatimah" },
    ];
    const h = cocokkanNama("Siti", daftar);
    expect(h.jenis).toBe("ganda");
    expect(h.anakId).toBeNull();
    expect(h.kandidat).toHaveLength(2);
  });

  it("menolak memilih ketika dua anak bernama identik", () => {
    // Nama identik di satu desa memang mungkin terjadi.
    const daftar: CalonAnak[] = [
      { id: "a", nama: "Ahmad" },
      { id: "b", nama: "Ahmad" },
    ];
    const h = cocokkanNama("Ahmad", daftar);
    expect(h.jenis).toBe("ganda");
    expect(h.anakId).toBeNull();
  });

  it("melaporkan tidak ada kecocokan untuk nama asing", () => {
    const h = cocokkanNama("Zulkifli", DAFTAR);
    expect(h.jenis).toBe("tidak_ada");
    expect(h.anakId).toBeNull();
    expect(h.kandidat).toHaveLength(0);
  });

  it("melaporkan tidak ada kecocokan untuk nama kosong", () => {
    // Baris tanpa nama terbaca tidak boleh tercocok ke anak mana pun.
    expect(cocokkanNama("", DAFTAR).jenis).toBe("tidak_ada");
    expect(cocokkanNama("   ", DAFTAR).jenis).toBe("tidak_ada");
  });

  it("melaporkan tidak ada kecocokan ketika daftar anak kosong", () => {
    expect(cocokkanNama("Aisyah", []).jenis).toBe("tidak_ada");
  });

  it("tidak pernah mengembalikan anakId ketika jenisnya bukan kecocokan", () => {
    for (const nama of ["Zulkifli", "", "Siti"]) {
      const h = cocokkanNama(nama, [
        { id: "a", nama: "Siti Aminah" },
        { id: "b", nama: "Siti Fatimah" },
      ]);
      if (h.jenis === "tidak_ada" || h.jenis === "ganda") {
        expect(h.anakId).toBeNull();
      }
    }
  });
});
