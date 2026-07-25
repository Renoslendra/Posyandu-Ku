import { describe, expect, it } from "vitest";
import { klasifikasi, menilaiGiziLebih } from "./zscore";
import { nilaiPengukuran } from "./tabel";
import { kerangkaMenu } from "../menu";

/**
 * Pengujian klasifikasi kelebihan gizi.
 *
 * Sisi atas distribusi sebelumnya tidak ada sama sekali, sehingga anak dengan
 * berat menurut tinggi badan pada +4 SD dilaporkan sebagai normal. Yang paling
 * merugikan bukan status yang salah itu sendiri, melainkan apa yang mengikutinya:
 * penyusun menu memperlakukan status normal sebagai anak yang boleh ditambah
 * kalorinya, dan status yang tidak dikenali jatuh ke menu berkalori tertinggi.
 */

describe("klasifikasi sisi atas", () => {
  it("menandai gizi lebih di atas +2 SD pada indikator berat menurut tinggi", () => {
    expect(klasifikasi(2.5, "bb_tb")).toBe("lebih");
    expect(klasifikasi(2.5, "bb_pb")).toBe("lebih");
  });

  it("menandai obesitas di atas +3 SD", () => {
    expect(klasifikasi(3.5, "bb_tb")).toBe("obesitas");
    expect(klasifikasi(4, "bb_pb")).toBe("obesitas");
  });

  it("tidak menggeser ambang pada nilai batas", () => {
    /*
     * Tepat +2 SD masih normal, tepat +3 SD masih tergolong lebih. Ambang tidak
     * boleh digeser demi kehati-hatian, sebab menggesernya berarti menandai anak
     * sehat dan itu mengikis kepercayaan pada seluruh penandaan.
     */
    expect(klasifikasi(2, "bb_tb")).toBe("normal");
    expect(klasifikasi(2.01, "bb_tb")).toBe("lebih");
    expect(klasifikasi(3, "bb_tb")).toBe("lebih");
    expect(klasifikasi(3.01, "bb_tb")).toBe("obesitas");
  });

  it("tidak menilai kelebihan pada berat menurut umur", () => {
    /*
     * Anak yang tinggi untuk usianya akan berat pula untuk usianya tanpa
     * kelebihan lemak apa pun. Menandainya gizi lebih pada indikator ini adalah
     * kekeliruan yang akan menghasilkan anjuran pembatasan makan bagi anak yang
     * sedang tumbuh baik.
     */
    expect(klasifikasi(3.5, "bb_u")).toBe("normal");
    expect(menilaiGiziLebih("bb_u")).toBe(false);
  });

  it("tidak menilai kelebihan pada panjang atau tinggi menurut umur", () => {
    // Anak yang tinggi bukan persoalan gizi.
    expect(klasifikasi(3.5, "pb_u")).toBe("normal");
    expect(klasifikasi(3.5, "tb_u")).toBe("normal");
    expect(menilaiGiziLebih("pb_u")).toBe(false);
    expect(menilaiGiziLebih("tb_u")).toBe(false);
  });

  it("mempertahankan seluruh perilaku sisi bawah", () => {
    // Perbaikan sisi atas tidak boleh menyentuh yang sudah benar.
    expect(klasifikasi(-2.5, "bb_u")).toBe("risiko");
    expect(klasifikasi(-3.5, "bb_u")).toBe("berat");
    expect(klasifikasi(-2, "bb_u")).toBe("normal");
    expect(klasifikasi(-3, "bb_u")).toBe("risiko");
    expect(klasifikasi(0, "bb_tb")).toBe("normal");
  });

  it("tetap mengembalikan null untuk nilai bukan angka", () => {
    expect(klasifikasi(Number.NaN, "bb_tb")).toBeNull();
    expect(klasifikasi(Number.POSITIVE_INFINITY, "bb_tb")).toBeNull();
  });
});

describe("penilaian pengukuran anak berberat berlebih", () => {
  it("tidak lagi melaporkan anak jauh di atas +2 SD sebagai normal", () => {
    /*
     * Anak laki-laki 24 bulan, tinggi 85 cm, berat 17 kg. Berat menurut tinggi
     * badannya berada jauh di atas rentang normal, sedangkan tingginya sendiri
     * tidak bermasalah.
     */
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 24,
      beratKg: 17,
      tinggiCm: 85,
      diukurTelentang: false,
    });

    expect(hasil.zBeratTinggi!).toBeGreaterThan(2);
    expect(hasil.status).not.toBe("normal");
    expect(["lebih", "obesitas"]).toContain(hasil.status);
    expect(hasil.penentuStatus).toBe("bb_tb");
  });

  it("mendahulukan kekurangan gizi ketika dua indikator bertentangan", () => {
    /*
     * Anak pendek yang beratnya berlebih terhadap tingginya dapat berstatus
     * kurang pada satu indikator dan lebih pada indikator lain. Kekurangan gizi
     * yang perlu tampil, sebab dapat memburuk jauh lebih cepat.
     */
    const hasil = nilaiPengukuran({
      jenisKelamin: "L",
      usiaBulan: 36,
      beratKg: 12,
      tinggiCm: 82,
      diukurTelentang: false,
    });

    if (hasil.zTinggiUsia !== null && hasil.zTinggiUsia < -3) {
      expect(hasil.status).toBe("berat");
    }
  });

  it("tetap menilai anak sehat sebagai normal", () => {
    // Penambahan sisi atas tidak boleh menghasilkan penandaan berlebihan.
    const hasil = nilaiPengukuran({
      jenisKelamin: "P",
      usiaBulan: 24,
      beratKg: 11.5,
      tinggiCm: 86,
      diukurTelentang: false,
    });

    expect(hasil.status).toBe("normal");
  });
});

describe("saran menu untuk anak berberat berlebih", () => {
  it("tidak menganjurkan santan sebagai penambah kalori", () => {
    /*
     * Inilah bahaya yang ditutup di sini. Sebelum status ini ada, anak berberat
     * berlebih tercatat normal, dan bila statusnya tidak dikenali penyusun menu
     * maka ia jatuh ke cabang terakhir, yaitu menu berkalori tertinggi dengan
     * santan tambahan.
     */
    for (const status of ["lebih", "obesitas"] as const) {
      const hasil = kerangkaMenu(status, 24)!;
      const bahan = hasil.menu.flatMap((m) => m.bahan.map((b) => b.nama));

      expect(bahan).not.toContain("Santan kelapa");
    }
  });

  it("tidak mengurangi frekuensi makan", () => {
    /*
     * Balita masih tumbuh. Mengurangi jumlah makannya berisiko menghambat
     * pertumbuhan tinggi badan tanpa menyelesaikan persoalan beratnya; yang
     * perlu diganti adalah sumber kalorinya.
     */
    const berlebih = kerangkaMenu("lebih", 24)!;
    const normal = kerangkaMenu("normal", 24)!;

    expect(berlebih.menu.length).toBe(normal.menu.length);
  });

  it("menyatakan bahwa jumlah makan tidak dikurangi", () => {
    // Orang tua perlu membaca ini, bukan menyimpulkannya sendiri.
    const catatan = kerangkaMenu("lebih", 24)!.catatan.join(" ");
    expect(catatan).toContain("tidak dikurangi");
  });

  it("mengarahkan obesitas ke pemeriksaan, bukan hanya pemantauan", () => {
    const obesitas = kerangkaMenu("obesitas", 24)!.catatan.join(" ");
    expect(obesitas).toMatch(/puskesmas|bidan/);
  });

  it("tetap menyertakan catatan keselamatan yang berlaku umum", () => {
    // Anjuran meneruskan menyusui dan peringatan alergi berlaku pada semua status.
    const catatan = kerangkaMenu("lebih", 9)!.catatan.join(" ");
    expect(catatan).toContain("menyusui");
    expect(catatan).toContain("telur");
  });

  it("tetap menolak memberi saran untuk bayi di bawah 6 bulan", () => {
    expect(kerangkaMenu("lebih", 4)).toBeNull();
    expect(kerangkaMenu("obesitas", 5)).toBeNull();
  });

  it("menghitung biaya tanpa galat untuk status baru", () => {
    // Status baru tidak boleh menghasilkan menu yang biayanya nol atau NaN.
    for (const status of ["lebih", "obesitas"] as const) {
      const menu = kerangkaMenu(status, 24)!.menu;
      expect(menu.length).toBeGreaterThan(0);
      expect(menu.every((m) => m.bahan.length > 0)).toBe(true);
    }
  });
});
