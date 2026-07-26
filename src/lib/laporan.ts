/**
 * Penyusun laporan bulanan yang dapat diunduh (FR-02.8).
 *
 * Formatnya CSV, bukan PDF. Alasannya: laporan ini berakhir di tangan staf
 * dinas kesehatan yang perlu menyalin angkanya ke rekapitulasi mereka sendiri.
 * PDF terlihat lebih resmi namun angkanya harus diketik ulang, sedangkan CSV
 * langsung terbuka di Excel dan dapat diolah.
 *
 * Menambahkan pustaka pembuat PDF juga berarti menambah beban bundel untuk
 * keluaran yang lebih sulit dipakai. Keputusan ini dicatat di DECISIONS.md.
 *
 * Seluruh angka pada laporan berasal dari perhitungan deterministik yang sama
 * dengan dashboard. Tidak ada bagian laporan yang disusun LLM.
 */

import { LABEL_STATUS } from "./proses-pengukuran";
import { keTanggalIsoIndonesia, tanggalIndonesiaSingkat } from "./tanggal";
import { AMBANG_HILANG_HARI } from "./dashboard";
import type { AnakPrioritas, RingkasanDashboard } from "./dashboard";
import type { StatusGizi } from "./gizi/zscore";

/**
 * Bobot pengurutan laporan, dari yang paling perlu didahulukan.
 *
 * Ditulis di sini alih-alih memakai tabel keparahan pada modul gizi, sebab yang
 * dibutuhkan laporan berbeda: kekurangan gizi didahulukan atas kelebihan gizi
 * pada tingkat yang sama. Keduanya sama-sama perlu ditangani, tetapi anak yang
 * sangat kurus menghadapi risiko yang lebih cepat memburuk daripada anak yang
 * kelebihan berat, dan laporan ini dibaca dari atas.
 *
 * Anak yang belum dinilai diberi bobot terendah, bukan nol, agar tetap berada di
 * bawah anak berstatus normal. Ketiadaan data bukan temuan; yang perlu dibaca
 * lebih dahulu adalah temuan.
 */
const BOBOT_URUT: Record<StatusGizi, number> = {
  berat: 5,
  obesitas: 4,
  risiko: 3,
  lebih: 3,
  normal: 1,
};

/**
 * Tanda urutan bita UTF-8.
 *
 * Tanpa ini, Excel di Windows membuka CSV memakai penyandian lokal, bukan UTF-8,
 * sehingga setiap huruf beraksen dan tanda pisah rusak menjadi rangkaian
 * karakter aneh. Nama Indonesia memang jarang memakai aksen, tetapi label pada
 * laporan ini memakai tanda pisah dan tanda kurang sesungguhnya, dan
 * kerusakannya membuat laporan yang berpindah ke dinas kesehatan tampak seperti
 * berkas yang korup.
 *
 * LibreOffice dan Google Sheets menanganinya benar tanpa BOM, tetapi Excel yang
 * paling banyak dipakai di lingkungan puskesmas.
 */
const BOM = "\uFEFF";

/**
 * Karakter yang membuat Excel dan LibreOffice memperlakukan bidang sebagai
 * rumus, bukan sebagai teks.
 */
const AWALAN_RUMUS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Membungkus satu nilai agar aman sebagai bidang CSV.
 *
 * Dua hal ditangani sekaligus.
 *
 * Pertama, pemisah bidang. Nama anak di Indonesia dapat memuat koma pada gelar
 * atau sebutan, dan tanpa pengutipan bidangnya akan bergeser sehingga seluruh
 * baris salah terbaca.
 *
 * Kedua, penyisipan rumus. Bidang yang dimulai dengan tanda sama dengan, tambah,
 * kurang, atau at akan dievaluasi Excel sebagai rumus saat berkas dibuka.
 * Pengutipan dengan tanda petik tidak menolongnya; Excel tetap mengevaluasi isi
 * bidang berkutip.
 *
 * Jalur seranganya melewati batas kepercayaan, dan itu sebabnya ini penting:
 * kader di satu posyandu mendaftarkan anak dengan nama yang memuat rumus,
 * kemudian bidan di wilayah yang sama mengunduh laporan dan membukanya di Excel.
 * Berkas itu lalu berpindah tangan ke staf dinas kesehatan. Nama anak diterima
 * apa adanya sepanjang panjangnya wajar, sebab menolak karakter tertentu akan
 * menghalangi pencatatan nama yang sah.
 *
 * Nilai berbahaya diawali kutip tunggal, cara baku yang dikenali Excel sebagai
 * penanda "perlakukan sebagai teks". Nilainya tetap terbaca utuh oleh manusia.
 */
export function bidangCsv(nilai: string | number | null): string {
  if (nilai === null || nilai === undefined) return "";

  let teks = String(nilai);

  /*
   * Bilangan dilewati tanpa penetralan.
   *
   * Z-score bernilai negatif adalah angka yang sah dan justru inti laporan ini,
   * misalnya -2,5. Menetralkannya akan mengubahnya menjadi teks di Excel,
   * sehingga kolomnya tidak dapat diurutkan maupun dijumlahkan, dan laporan
   * kehilangan gunanya. Bilangan tidak dapat memuat rumus, sehingga tidak ada
   * yang perlu dinetralkan.
   */
  const perluDinetralkan =
    typeof nilai === "string" && AWALAN_RUMUS.some((a) => teks.startsWith(a));

  if (perluDinetralkan) {
    teks = `'${teks}`;
  }

  if (/[",\r\n]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

function baris(kolom: (string | number | null)[]): string {
  return kolom.map(bidangCsv).join(",");
}

/**
 * Menerjemahkan status ke label yang dipahami pembaca laporan.
 *
 * Tanggal penimbangan terakhir menentukan label mana yang dipakai ketika status
 * kosong. Sebelumnya kosong selalu berarti "Belum ditimbang", sehingga label itu
 * muncul berdampingan dengan tanggal penimbangan yang nyata pada baris yang sama.
 * Status kosong pada anak yang sudah ditimbang berarti nilainya di luar rentang
 * tabel rujukan, dan itu perlu diperiksa, bukan diabaikan sebagai data kosong.
 */
function labelStatus(
  status: AnakPrioritas["status"],
  tanggalTerakhir: string | null,
): string {
  if (status) return LABEL_STATUS[status];
  return tanggalTerakhir ? "Tidak dapat dinilai" : "Belum ditimbang";
}

/**
 * Menampilkan tanggal dalam bentuk yang dibaca manusia.
 *
 * Bentuk ISO sengaja ditinggalkan di kolom laporan. Excel memperlakukan
 * "2026-03-12" tidak menentu: kadang menjadi tanggal, kadang tetap teks, dan
 * pada setelan wilayah tertentu tertukar bulan dengan harinya sehingga 12 Maret
 * terbaca sebagai 3 Desember. Bentuk "12 Mar 2026" tidak dapat ditafsirkan
 * keliru oleh pembaca maupun oleh Excel.
 */
function tanggalTampil(iso: string | null): string {
  return iso ? tanggalIndonesiaSingkat(iso) : "Belum pernah";
}

/**
 * Menampilkan nomor telepon agar tidak dirusak Excel.
 *
 * Nomor Indonesia dimulai dengan angka nol, dan Excel membuang nol di depan bila
 * bidangnya terbaca sebagai bilangan. Akibatnya 081234567890 tersimpan menjadi
 * 81234567890, dan nomor yang salah satu angka membuat seluruh kolom ini tidak
 * dapat dipercaya.
 *
 * Diawali kutip tunggal, penanda baku Excel untuk "perlakukan sebagai teks".
 * Nomornya tetap terbaca utuh oleh manusia dan tetap dapat disalin.
 */
function teleponTampil(nomor: string | null): string {
  if (!nomor) return "";
  return nomor.startsWith("0") ? `'${nomor}` : nomor;
}

/** Tanggal cetak, ditulis lengkap karena ia dibaca sekali di kepala laporan. */
function tanggalIndonesiaLengkap(d: Date): string {
  return tanggalIndonesiaSingkat(keTanggalIsoIndonesia(d));
}

export interface KonteksLaporan {
  namaWilayah: string;
  tanggalCetak: Date;
}

/**
 * Menyusun laporan bulanan dalam bentuk CSV.
 *
 * Susunannya tiga bagian: keterangan laporan, rekapitulasi angka, lalu rincian
 * per anak. Bagian rekapitulasi diletakkan sebelum rincian karena itu yang
 * dibutuhkan untuk pelaporan ke atas, sedangkan rincian dipakai saat menindak
 * lanjuti anak tertentu.
 */
export function susunLaporanCsv(
  ringkasan: RingkasanDashboard,
  konteks: KonteksLaporan,
): string {
  const larik: string[] = [];

  larik.push(baris(["LAPORAN PEMANTAUAN GIZI BALITA"]));
  larik.push(baris(["Wilayah", konteks.namaWilayah]));
  larik.push(
    baris(["Tanggal cetak", tanggalIndonesiaLengkap(konteks.tanggalCetak)]),
  );
  // Dinyatakan di dalam berkasnya sendiri, karena berkas akan berpindah tangan
  // terlepas dari antarmuka tempat ia diunduh.
  larik.push(
    baris([
      "Catatan",
      "Alat bantu pemantauan, bukan alat diagnosis. Keputusan rujukan berada pada tenaga kesehatan.",
    ]),
  );
  larik.push(baris(["Sumber angka", "Standar WHO Child Growth Standards 0-5 tahun"]));
  larik.push("");

  /*
   * Bagian pertama: yang perlu dikerjakan.
   *
   * Sebelumnya laporan dibuka dengan rekapitulasi, lalu rincian seluruh anak
   * berurutan menurut nama. Susunan itu benar untuk pelaporan ke atas, tetapi
   * salah untuk pemakaian sehari-hari: bidan yang membuka berkas ini pertama-tama
   * mencari siapa yang harus ditangani, dan pada posyandu berisi puluhan anak
   * pertanyaan itu tidak terjawab oleh daftar yang berurut menurut nama.
   *
   * Diletakkan paling atas dan diurutkan menurut tingkat keparahan, sehingga
   * baris pertama adalah anak yang paling perlu didahulukan.
   */
  larik.push(baris(["BAGIAN 1: ANAK YANG PERLU DITINDAKLANJUTI"]));

  if (ringkasan.prioritas.length === 0) {
    larik.push(baris(["Tidak ada anak yang perlu ditindaklanjuti."]));
  } else {
    larik.push(
      baris([
        "No",
        "Nama",
        "Status gizi",
        "Alasan",
        "Terakhir ditimbang",
        "Jeda (hari)",
        "Nomor telepon",
      ]),
    );

    ringkasan.prioritas.forEach((a, i) => {
      larik.push(
        baris([
          i + 1,
          a.nama,
          labelStatus(a.status, a.tanggalTerakhir),
          a.alasan.join("; "),
          tanggalTampil(a.tanggalTerakhir),
          a.jedaHari >= 0 ? a.jedaHari : "",
          teleponTampil(a.telepon),
        ]),
      );
    });
  }
  larik.push("");

  /*
   * Bagian kedua: anak yang berhenti datang.
   *
   * Dipisahkan dari bagian pertama walaupun sebagian namanya berulang di
   * keduanya. Alasannya, tindakannya berbeda: anak berstatus kurang gizi perlu
   * diperiksa saat ia datang, sedangkan anak yang berhenti datang perlu dicari
   * lebih dahulu. Menggabungkannya memaksa pembaca memilah sendiri mana yang
   * ditelepon dan mana yang diperiksa.
   */
  larik.push(baris(["BAGIAN 2: BERHENTI DATANG MENIMBANG"]));
  larik.push(
    baris([
      `Anak yang tidak menimbang lebih dari ${AMBANG_HILANG_HARI} hari, atau belum pernah menimbang.`,
    ]),
  );

  if (ringkasan.hilangDariPemantauan.length === 0) {
    larik.push(baris(["Semua anak rutin menimbang."]));
  } else {
    larik.push(
      baris([
        "No",
        "Nama",
        "Terakhir ditimbang",
        "Jeda (hari)",
        "Nomor telepon",
        "Status gizi terakhir",
      ]),
    );

    ringkasan.hilangDariPemantauan.forEach((a, i) => {
      larik.push(
        baris([
          i + 1,
          a.nama,
          tanggalTampil(a.tanggalTerakhir),
          a.jedaHari >= 0 ? a.jedaHari : "",
          teleponTampil(a.telepon),
          labelStatus(a.status, a.tanggalTerakhir),
        ]),
      );
    });
  }
  larik.push("");

  larik.push(baris(["BAGIAN 3: REKAPITULASI"]));
  larik.push(baris(["Keterangan", "Jumlah", "Persen"]));

  /*
   * Kolom persen ditambahkan karena angka mutlak tidak dapat dibandingkan antar
   * posyandu yang jumlah anaknya berbeda. Dihitung terhadap total anak
   * terdaftar, dan dikosongkan bila belum ada anak sama sekali supaya tidak
   * menghasilkan pembagian dengan nol.
   */
  const persen = (n: number): string => {
    if (ringkasan.totalAnak === 0) return "";
    const nilai = Math.round((n / ringkasan.totalAnak) * 1000) / 10;
    // Pemisah desimal Indonesia adalah koma. Bidang berkoma dikutip oleh
    // bidangCsv, sehingga kolomnya tetap utuh.
    return `${String(nilai).replace(".", ",")}%`;
  };

  const barisRekap = (label: string, nilai: number, pakaiPersen = true) =>
    larik.push(baris([label, nilai, pakaiPersen ? persen(nilai) : ""]));

  barisRekap("Total anak terdaftar", ringkasan.totalAnak, false);
  barisRekap("Sudah ditimbang", ringkasan.sudahDiukur);
  barisRekap("Belum pernah ditimbang", ringkasan.belumDinilai);
  /*
   * Baris ini dipisahkan dari "belum pernah ditimbang" supaya rekapitulasi dapat
   * dijumlahkan. Sebelumnya keduanya digabung, sehingga jumlah "sudah ditimbang"
   * dan "belum pernah ditimbang" tidak sama dengan total anak terdaftar, dan
   * staf dinas kesehatan yang memeriksanya akan meragukan seluruh laporan.
   */
  barisRekap(
    "Sudah ditimbang, status tidak dapat dinilai",
    ringkasan.tidakDapatDinilai,
  );

  larik.push("");
  larik.push(baris(["Sebaran status gizi", "Jumlah", "Persen"]));
  barisRekap(LABEL_STATUS.normal, ringkasan.distribusi.normal);
  barisRekap(LABEL_STATUS.risiko, ringkasan.distribusi.risiko);
  barisRekap(LABEL_STATUS.berat, ringkasan.distribusi.berat);
  barisRekap(LABEL_STATUS.lebih, ringkasan.distribusi.lebih);
  barisRekap(LABEL_STATUS.obesitas, ringkasan.distribusi.obesitas);

  larik.push("");
  barisRekap("Perlu ditindaklanjuti", ringkasan.prioritas.length);
  barisRekap("Berhenti datang menimbang", ringkasan.hilangDariPemantauan.length);
  larik.push("");

  /*
   * Bagian terakhir: seluruh anak.
   *
   * Tetap disertakan karena laporan ini juga dipakai memeriksa kelengkapan
   * pendataan, dan untuk itu diperlukan daftar utuh. Diurutkan menurut keparahan
   * lalu nama, bukan menurut nama saja, supaya susunannya sejalan dengan kedua
   * bagian di atas.
   */
  larik.push(baris(["BAGIAN 4: SELURUH ANAK TERDAFTAR"]));
  larik.push(
    baris([
      "No",
      "Nama",
      "Status gizi",
      "Terakhir ditimbang",
      "Jeda (hari)",
      "Nomor telepon",
      "Catatan",
    ]),
  );

  const semuaTerurut = [...ringkasan.semuaAnak].sort((a, b) => {
    const bobotA = a.status ? BOBOT_URUT[a.status] : 0;
    const bobotB = b.status ? BOBOT_URUT[b.status] : 0;
    if (bobotA !== bobotB) return bobotB - bobotA;
    return a.nama.localeCompare(b.nama, "id");
  });

  semuaTerurut.forEach((a, i) => {
    larik.push(
      baris([
        i + 1,
        a.nama,
        labelStatus(a.status, a.tanggalTerakhir),
        tanggalTampil(a.tanggalTerakhir),
        // Jeda -1 menandakan anak belum pernah ditimbang, sehingga jedanya
        // tidak bermakna dan dikosongkan alih-alih ditampilkan sebagai angka.
        a.jedaHari >= 0 ? a.jedaHari : "",
        teleponTampil(a.telepon),
        a.alasan.join("; "),
      ]),
    );
  });

  larik.push("");
  larik.push(baris(["Keterangan istilah"]));
  larik.push(
    baris([
      LABEL_STATUS.risiko,
      "Z-score antara -3 dan -2. Perlu diperiksa bidan.",
    ]),
  );
  larik.push(
    baris([
      LABEL_STATUS.berat,
      "Z-score di bawah -3. Perlu segera diperiksa.",
    ]),
  );
  larik.push(
    baris([
      "Tidak dapat dinilai",
      "Sudah ditimbang, tetapi nilainya di luar rentang tabel rujukan WHO. Perlu diperiksa ulang.",
    ]),
  );
  larik.push(
    baris([
      "Jeda (hari)",
      "Jumlah hari sejak penimbangan terakhir sampai tanggal cetak laporan.",
    ]),
  );

  // Diakhiri baris baru agar berkas tidak terpotong pada sebagian pengolah.
  // BOM di awal agar Excel di Windows membacanya sebagai UTF-8.
  return `${BOM}${larik.join("\r\n")}\r\n`;
}

/**
 * Menyusun nama berkas yang menyertakan wilayah dan tanggal.
 *
 * Bidan mengunduh laporan ini setiap bulan, sehingga nama berkas yang sama akan
 * saling menimpa di folder unduhan.
 */
export function namaBerkasLaporan(namaWilayah: string, tanggal: Date): string {
  const wilayah = namaWilayah
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `laporan-gizi-${wilayah || "posyandu"}-${keTanggalIsoIndonesia(tanggal)}.csv`;
}
