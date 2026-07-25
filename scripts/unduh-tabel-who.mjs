/**
 * Mengunduh tabel referensi WHO Child Growth Standards dan mengubahnya
 * menjadi JSON ringkas yang dipakai aplikasi.
 *
 * Sumber: paket R resmi WHO (github.com/WorldHealthOrganization/anthro),
 * berkas data-raw/growthstandards. Berkas tersebut adalah tabel LMS yang
 * sama dengan publikasi WHO Child Growth Standards 0-5 tahun.
 *
 * Skrip ini sengaja dipisah dari aplikasi: data referensi diunduh sekali,
 * hasilnya di-commit, sehingga proses build tidak bergantung pada jaringan
 * dan nilai yang dipakai dapat ditinjau di dalam riwayat repositori.
 *
 * Jalankan: node scripts/unduh-tabel-who.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASIS =
  "https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards";

/**
 * Pemetaan berkas WHO ke indikator yang dipakai PosyanduKu.
 *
 * kolomX menyatakan nama kolom pembanding pada berkas sumber:
 *   - "age"    : usia dalam hari
 *   - "length" : panjang badan (cm), pengukuran telentang
 *   - "height" : tinggi badan (cm), pengukuran berdiri
 */
const SUMBER = [
  { berkas: "weianthro.txt", indikator: "bb_u", kolomX: "age", satuanX: "hari" },
  // lenanthro memuat DUA tabel dalam satu berkas, dibedakan kolom "loh":
  //   L = length, panjang badan (telentang), dipakai 0-24 bulan
  //   H = height, tinggi badan (berdiri), dipakai 24-60 bulan
  // Keduanya berbeda sekitar 0,7 cm pada usia yang sama, karena pengukuran
  // berdiri selalu menghasilkan angka lebih pendek daripada telentang.
  // Mencampurnya membuat median di titik peralihan salah.
  {
    berkas: "lenanthro.txt",
    indikator: "pb_u",
    kolomX: "age",
    satuanX: "hari",
    filterLoh: "L",
  },
  {
    berkas: "lenanthro.txt",
    indikator: "tb_u",
    kolomX: "age",
    satuanX: "hari",
    filterLoh: "H",
  },
  { berkas: "wflanthro.txt", indikator: "bb_pb", kolomX: "length", satuanX: "cm" },
  { berkas: "wfhanthro.txt", indikator: "bb_tb", kolomX: "height", satuanX: "cm" },
];

/** Membaca berkas WHO berformat tab-separated dengan baris kepala. */
function uraikan(teks) {
  const baris = teks.trim().split(/\r?\n/);
  const kepala = baris[0].trim().split(/\s+/).map((k) => k.toLowerCase());
  return baris.slice(1).map((b) => {
    const nilai = b.trim().split(/\s+/);
    return Object.fromEntries(kepala.map((k, i) => [k, nilai[i]]));
  });
}

/**
 * Usia pada berkas WHO dinyatakan dalam hari. Posyandu memakai bulan penuh,
 * sehingga dikonversi memakai 30,4375 hari per bulan (365,25 / 12) — nilai
 * yang dipakai WHO Anthro untuk konversi yang sama.
 */
const HARI_PER_BULAN = 30.4375;

async function main() {
  const keluaran = {};

  const singgahan = new Map();

  for (const { berkas, indikator, kolomX, satuanX, filterLoh } of SUMBER) {
    const url = `${BASIS}/${berkas}`;
    process.stdout.write(
      `${indikator.padEnd(6)} <- ${berkas}${filterLoh ? ` (loh=${filterLoh})` : ""} ... `,
    );

    // Satu berkas dapat menjadi sumber dua indikator, jadi diunduh sekali saja.
    if (!singgahan.has(berkas)) {
      const respons = await fetch(url);
      if (!respons.ok) {
        throw new Error(`Gagal mengunduh ${url}: ${respons.status}`);
      }
      singgahan.set(berkas, uraikan(await respons.text()));
    }

    const baris = singgahan.get(berkas);
    // sex pada berkas WHO: 1 = laki-laki, 2 = perempuan.
    const perJenisKelamin = { L: [], P: [] };

    for (const b of baris) {
      const jk = b.sex === "1" ? "L" : b.sex === "2" ? "P" : null;
      if (!jk) continue;

      // Kolom penanda panjang/tinggi bernama "loh" pada lenanthro dan
      // "lorh" pada tabel berat menurut panjang/tinggi.
      if (filterLoh) {
        const penanda = b.loh ?? b.lorh;
        if (penanda !== filterLoh) continue;
      }

      const xMentah = Number(b[kolomX]);
      const l = Number(b.l);
      const m = Number(b.m);
      const s = Number(b.s);
      if (![xMentah, l, m, s].every(Number.isFinite)) continue;

      const x = satuanX === "hari" ? xMentah / HARI_PER_BULAN : xMentah;

      // Hanya rentang layanan balita: 0-60 bulan.
      if (satuanX === "hari" && x > 61) continue;

      perJenisKelamin[jk].push({
        x: Math.round(x * 1000) / 1000,
        l: Math.round(l * 1e6) / 1e6,
        m: Math.round(m * 1e6) / 1e6,
        s: Math.round(s * 1e6) / 1e6,
      });
    }

    for (const jk of ["L", "P"]) {
      perJenisKelamin[jk].sort((a, b) => a.x - b.x);
    }

    // Tabel berbasis usia dipadatkan ke titik bulan bulat.
    //
    // Alasannya: usia di posyandu dicatat dalam bulan penuh, sehingga titik
    // harian tidak pernah terpakai. Memadatkan 1.827 titik menjadi 61 titik
    // memperkecil berkas secara drastis, dan itu penting karena aplikasi
    // harus ringan di koneksi lambat serta dapat disimpan untuk mode offline.
    //
    // Nilai pada bulan bulat diinterpolasi linier dari titik harian di
    // sekitarnya, cara yang sama dipakai aplikasi saat membaca tabel.
    if (satuanX === "hari") {
      for (const jk of ["L", "P"]) {
        const harian = perJenisKelamin[jk];
        const bulanan = [];

        // Hanya bulan yang benar-benar tercakup tabel sumber. Tabel panjang
        // badan berhenti di 24 bulan dan tabel tinggi badan mulai dari 24
        // bulan, sehingga rentangnya tidak boleh diekstrapolasi.
        //
        // Batas dibulatkan, bukan dipotong: titik terakhir tabel berada pada
        // hari 1826 yang setara 59,99 bulan, dan itu memang dimaksudkan
        // sebagai bulan ke-60. Memakai pembulatan ke bawah akan membuang
        // titik batas yang justru dibutuhkan.
        const pertama = harian[0];
        const terakhir = harian[harian.length - 1];
        const bulanMin = Math.round(pertama.x);
        const bulanMaks = Math.min(60, Math.round(terakhir.x));

        for (let bulan = bulanMin; bulan <= bulanMaks; bulan += 1) {
          // Bulan di luar rentang harian dijepit ke titik terdekat, bukan
          // diekstrapolasi. Selisihnya di bawah satu hari sehingga dapat
          // diabaikan untuk keperluan penapisan.
          if (bulan <= pertama.x) {
            bulanan.push({ x: bulan, l: pertama.l, m: pertama.m, s: pertama.s });
            continue;
          }
          if (bulan >= terakhir.x) {
            bulanan.push({
              x: bulan,
              l: terakhir.l,
              m: terakhir.m,
              s: terakhir.s,
            });
            continue;
          }

          let bawah = pertama;
          let atas = terakhir;

          for (let i = 0; i < harian.length - 1; i += 1) {
            if (harian[i].x <= bulan && harian[i + 1].x >= bulan) {
              bawah = harian[i];
              atas = harian[i + 1];
              break;
            }
          }

          if (bawah.x === atas.x) {
            bulanan.push({ x: bulan, l: bawah.l, m: bawah.m, s: bawah.s });
            continue;
          }

          const p = (bulan - bawah.x) / (atas.x - bawah.x);
          bulanan.push({
            x: bulan,
            l: Math.round((bawah.l + (atas.l - bawah.l) * p) * 1e6) / 1e6,
            m: Math.round((bawah.m + (atas.m - bawah.m) * p) * 1e6) / 1e6,
            s: Math.round((bawah.s + (atas.s - bawah.s) * p) * 1e6) / 1e6,
          });
        }

        perJenisKelamin[jk] = bulanan;
      }
    }

    keluaran[indikator] = perJenisKelamin;
    console.log(
      `${perJenisKelamin.L.length} titik (L), ${perJenisKelamin.P.length} titik (P)`,
    );
  }

  const tujuan = path.join(process.cwd(), "src", "lib", "gizi", "tabel-who.json");
  await mkdir(path.dirname(tujuan), { recursive: true });
  await writeFile(tujuan, JSON.stringify(keluaran), "utf8");
  console.log(`\nTersimpan di ${tujuan}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
