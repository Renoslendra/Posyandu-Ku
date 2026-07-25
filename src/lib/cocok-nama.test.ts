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
    for (const sebutan of ["An.", "An", "Ananda", "Adik", "By.", "Baby"]) {
      expect(normalkanNama(`${sebutan} Aisyah`)).toBe("aisyah");
    }
  });

  it("mempertahankan kata Anak karena bagian sah nama Bali", () => {
    /*
     * "Anak Agung" adalah gelar kehormatan Bali dan merupakan bagian sah dari
     * nama seseorang. Membuangnya mengubah identitas orangnya, dan dapat
     * menabrakkan nama itu dengan anak lain yang memang bernama Agung.
     */
    expect(normalkanNama("Anak Agung Ngurah")).toBe("anak agung ngurah");
    expect(normalkanNama("Anak Aisyah")).toBe("anak aisyah");
  });

  it("menormalkan sebutan yang ditulis rapat tanpa spasi", () => {
    // Tulisan tangan pada buku posyandu sering rapat seperti ini.
    expect(normalkanNama("An.Aisyah")).toBe("aisyah");
    expect(normalkanNama("By.Bagas")).toBe("bagas");
  });

  it("menyetarakan aksara beraksen dengan bentuk dasarnya", () => {
    // Nama yang tampak serupa di layar harus dapat dicocokkan.
    expect(normalkanNama("Aisyáh")).toBe("aisyah");
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

describe("pencocokan tidak boleh menukar data anak", () => {
  /*
   * Kelompok pengujian ini menegakkan perbaikan atas cacat paling berbahaya
   * pada modul ini: pembandingan memakai potongan huruf, bukan kata.
   *
   * Menuliskan berat badan seorang anak ke rekam anak lain tidak terlihat
   * setelah tersimpan, dapat memicu peringatan gizi buruk palsu, dan sekaligus
   * menyembunyikan yang sungguhan.
   */

  it("tidak mencocokkan nama yang hanya bersarang sebagai potongan huruf", () => {
    // "ani" adalah potongan dari "handayani", tetapi keduanya orang berbeda.
    const hasil = cocokkanNama("Handayani", [{ id: "a", nama: "Ani" }]);
    expect(hasil.jenis).toBe("tidak_ada");
    expect(hasil.anakId).toBeNull();
  });

  it("menolak beberapa contoh bersarang lain yang tidak berkaitan", () => {
    const pasangan: [string, string][] = [
      ["Sitawati", "Ita"],
      ["Hadi", "Adi"],
      ["Wulandari", "Andi"],
      ["Kartika", "Tika"],
    ];

    for (const [dibaca, terdaftar] of pasangan) {
      const hasil = cocokkanNama(dibaca, [{ id: "a", nama: terdaftar }]);
      expect(hasil.jenis, `${dibaca} tidak boleh cocok dengan ${terdaftar}`).toBe(
        "tidak_ada",
      );
    }
  });

  it("tetap mencocokkan nama yang benar-benar berbagi kata", () => {
    // Perbaikan tidak boleh mematikan kegunaan aslinya.
    expect(cocokkanNama("Aisyah", [{ id: "a", nama: "Aisyah Putri" }]).jenis).toBe(
      "sebagian",
    );
    expect(
      cocokkanNama("Citra Dewi", [{ id: "a", nama: "Citra Dewi Lestari" }]).jenis,
    ).toBe("sebagian");
    expect(
      cocokkanNama("Bagas Pratama", [{ id: "a", nama: "Bagas" }]).jenis,
    ).toBe("sebagian");
  });

  it("menolak nama sekata yang terlalu pendek sebagai dasar pencocokan", () => {
    // Kata tiga huruf terlalu umum untuk membedakan seorang anak.
    const hasil = cocokkanNama("Eka", [{ id: "a", nama: "Eka Wijaya" }]);
    expect(hasil.jenis).toBe("tidak_ada");
  });

  it("tidak menjadikan nama tanpa huruf sebagai pencocok segala", () => {
    /*
     * Nama yang seluruhnya tanda baca menormalkan menjadi kosong. Pada
     * pembandingan lama, calon semacam itu cocok dengan setiap nama, sehingga
     * satu baris placeholder menyerap seluruh pengukuran yang namanya tidak
     * dikenali.
     */
    for (const namaKosong of ["..", "--", "()", "-/"]) {
      const hasil = cocokkanNama("Aisyah Putri", [{ id: "a", nama: namaKosong }]);
      expect(hasil.jenis, `nama "${namaKosong}" tidak boleh cocok`).toBe("tidak_ada");
      expect(hasil.anakId).toBeNull();
    }
  });

  it("mengabaikan calon tanpa huruf saat memilih di antara beberapa calon", () => {
    // Calon placeholder tidak boleh membuat kecocokan yang sah menjadi ganda.
    const hasil = cocokkanNama("Aisyah", [
      { id: "a", nama: "Aisyah Putri" },
      { id: "b", nama: ".." },
    ]);
    expect(hasil.jenis).toBe("sebagian");
    expect(hasil.anakId).toBe("a");
  });

  it("tetap menyerahkan keputusan kepada kader bila dua nama sama-sama menyerupai", () => {
    const hasil = cocokkanNama("Siti", [
      { id: "a", nama: "Siti Aminah" },
      { id: "b", nama: "Siti Fatimah" },
    ]);
    expect(hasil.jenis).toBe("ganda");
    expect(hasil.anakId).toBeNull();
    expect(hasil.kandidat).toHaveLength(2);
  });
});
