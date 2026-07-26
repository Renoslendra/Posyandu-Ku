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
    distribusi: { normal: 1, risiko: 1, berat: 0, lebih: 0, obesitas: 0 },
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
    /*
     * Tanggal ditulis "26 Jul 2026", bukan bentuk ISO. Excel menafsirkan
     * "2026-07-26" tidak menentu, dan pada setelan wilayah tertentu menukar
     * bulan dengan harinya.
     */
    expect(csv).toContain("26 Jul 2026");
  });

  it("dimulai dengan BOM agar Excel membacanya sebagai UTF-8", () => {
    // Tanpa BOM, Excel di Windows memakai penyandian lokal sehingga tanda pisah
    // dan huruf beraksen rusak. Laporan yang berpindah ke dinas kesehatan akan
    // tampak seperti berkas yang korup.
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    expect(csv.startsWith("\uFEFF")).toBe(true);
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
        distribusi: { normal: 5, risiko: 2, berat: 1, lebih: 0, obesitas: 0 },
      }),
      KONTEKS,
    );

    // Kolom ketiga adalah persentase terhadap total anak terdaftar.
    expect(csv).toContain("Total anak terdaftar,10");
    expect(csv).toContain("Sudah ditimbang,8,80%");
    expect(csv).toContain("Belum pernah ditimbang,2,20%");
    expect(csv).toContain("Normal,5,50%");
    expect(csv).toContain("Perlu perhatian,2,20%");
    expect(csv).toContain("Perlu segera diperiksa,1,10%");
  });

  it("memakai koma sebagai pemisah desimal persen", () => {
    /*
     * Pemisah desimal Indonesia adalah koma. Menulis 83.3% pada laporan yang
     * dibaca staf dinas kesehatan salah menurut kaidah, dan pada Excel bersetelan
     * Indonesia angka itu tidak dikenali sebagai bilangan.
     *
     * Bidang berkoma dikutip oleh bidangCsv, sehingga kolomnya tetap utuh.
     */
    const csv = susunLaporanCsv(
      ringkasan({
        totalAnak: 6,
        sudahDiukur: 5,
        belumDinilai: 1,
        distribusi: { normal: 2, risiko: 2, berat: 1, lebih: 0, obesitas: 0 },
      }),
      KONTEKS,
    );
    expect(csv).toContain('"83,3%"');
    expect(csv).not.toContain("83.3%");
  });

  it("tidak membagi dengan nol ketika belum ada anak terdaftar", () => {
    const csv = susunLaporanCsv(
      ringkasan({
        totalAnak: 0,
        sudahDiukur: 0,
        belumDinilai: 0,
        distribusi: { normal: 0, risiko: 0, berat: 0, lebih: 0, obesitas: 0 },
      }),
      KONTEKS,
    );
    expect(csv).not.toContain("NaN");
    expect(csv).not.toContain("Infinity");
  });

  it("meletakkan daftar tindak lanjut sebelum rekapitulasi", () => {
    /*
     * Susunannya dibalik dari versi terdahulu, dan itu perubahan yang sengaja.
     *
     * Rekapitulasi dibutuhkan untuk pelaporan ke atas, tetapi bidan yang membuka
     * berkas ini pertama-tama mencari siapa yang harus ditangani. Pertanyaan itu
     * tidak terjawab oleh angka rekapitulasi, dan meletakkannya di atas memaksa
     * pembaca menggulir melewatinya setiap kali.
     */
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    expect(csv.indexOf("BAGIAN 1")).toBeLessThan(csv.indexOf("BAGIAN 3: REKAPITULASI"));
  });

  it("menyusun keempat bagian secara berurutan", () => {
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    const urutan = [
      "BAGIAN 1: ANAK YANG PERLU DITINDAKLANJUTI",
      "BAGIAN 2: BERHENTI DATANG MENIMBANG",
      "BAGIAN 3: REKAPITULASI",
      "BAGIAN 4: SELURUH ANAK TERDAFTAR",
    ].map((b) => csv.indexOf(b));

    expect(urutan.every((i) => i >= 0)).toBe(true);
    for (let i = 1; i < urutan.length; i += 1) {
      expect(urutan[i - 1]).toBeLessThan(urutan[i]);
    }
  });

  it("menjelaskan istilah yang dipakai di dalam berkas", () => {
    // Berkas dibaca staf dinas kesehatan yang tidak membuka aplikasinya, sehingga
    // istilahnya tidak dapat mengandalkan penjelasan di antarmuka.
    const csv = susunLaporanCsv(ringkasan(), KONTEKS);
    expect(csv).toContain("Keterangan istilah");
    expect(csv).toMatch(/Z-score di bawah -3/);
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

  it("melindungi nol di depan nomor telepon dari Excel", () => {
    /*
     * Excel membuang nol di depan bila bidangnya terbaca sebagai bilangan,
     * sehingga 081234567890 tersimpan menjadi 81234567890. Nomor yang salah satu
     * angka membuat seluruh kolom ini tidak dapat dipercaya, dan justru kolom
     * inilah yang dipakai menghubungi keluarga.
     *
     * Kutip tunggal adalah penanda baku Excel untuk "perlakukan sebagai teks".
     */
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [entri("Dimas", "risiko", { telepon: "081234567890" })],
      }),
      KONTEKS,
    );
    expect(csv).toContain("'081234567890");
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
    expect(csv).toContain("BAGIAN 4: SELURUH ANAK TERDAFTAR");
    expect(csv).toContain("Total anak terdaftar,0");
  });

  it("menyatakan secara tegas bila tidak ada yang perlu ditindaklanjuti", () => {
    /*
     * Bagian kosong tanpa keterangan tidak dapat dibedakan dari bagian yang gagal
     * terisi. Pembaca yang menemukan judul tanpa baris di bawahnya akan menduga
     * laporannya rusak, dan keraguan itu menular ke seluruh berkas.
     */
    const csv = susunLaporanCsv(
      ringkasan({ prioritas: [], hilangDariPemantauan: [] }),
      KONTEKS,
    );
    expect(csv).toContain("Tidak ada anak yang perlu ditindaklanjuti.");
    expect(csv).toContain("Semua anak rutin menimbang.");
  });

  it("mendahulukan anak berstatus paling berat pada daftar seluruh anak", () => {
    // Laporan dibaca dari atas, sehingga temuan yang paling perlu ditangani
    // harus berada di baris pertama, bukan tersebar menurut abjad.
    const csv = susunLaporanCsv(
      ringkasan({
        semuaAnak: [
          entri("Aisyah", "normal"),
          entri("Zulfa", "berat"),
          entri("Bagas", "risiko"),
        ],
      }),
      KONTEKS,
    );

    const bagian4 = csv.slice(csv.indexOf("BAGIAN 4"));
    expect(bagian4.indexOf("Zulfa")).toBeLessThan(bagian4.indexOf("Bagas"));
    expect(bagian4.indexOf("Bagas")).toBeLessThan(bagian4.indexOf("Aisyah"));
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
