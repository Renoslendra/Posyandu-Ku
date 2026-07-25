/**
 * Data contoh untuk demo dan pengembangan.
 *
 * SELURUH DATA DI SINI SINTETIS. Tidak ada data anak sungguhan. Nama dan
 * pengukuran dibangkitkan agar mencakup skenario yang perlu terlihat pada demo:
 * anak sehat, anak pendek, berat stagnan, dan anak yang berhenti menimbang.
 *
 * Dijalankan dengan service role karena melewati RLS. Jangan dijalankan pada
 * basis data produksi yang memuat data nyata.
 *
 * Jalankan: node scripts/seed.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Membaca .env.local secara sederhana, tanpa dependensi tambahan. */
function muatEnv() {
  try {
    const isi = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const baris of isi.split(/\r?\n/)) {
      const cocok = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (cocok && !process.env[cocok[1]]) {
        process.env[cocok[1]] = cocok[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Berkas tidak ada. Variabel mungkin sudah tersedia di environment.
  }
}

muatEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local",
  );
  process.exit(1);
}

const db = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Parameter LMS WHO untuk membangkitkan nilai pada Z-score tertentu. */
const tabel = JSON.parse(
  readFileSync(path.join(process.cwd(), "src", "lib", "gizi", "tabel-who.json"), "utf8"),
);

function lms(indikator, jk, x) {
  const t = tabel[indikator][jk];
  let bawah = t[0];
  let atas = t[t.length - 1];
  for (let i = 0; i < t.length - 1; i += 1) {
    if (t[i].x <= x && t[i + 1].x >= x) {
      bawah = t[i];
      atas = t[i + 1];
      break;
    }
  }
  if (bawah.x === atas.x) return bawah;
  const p = (x - bawah.x) / (atas.x - bawah.x);
  return {
    l: bawah.l + (atas.l - bawah.l) * p,
    m: bawah.m + (atas.m - bawah.m) * p,
    s: bawah.s + (atas.s - bawah.s) * p,
  };
}

/** Mengubah Z-score menjadi nilai pengukuran, agar skenario dapat ditentukan. */
function nilaiPadaZ(indikator, jk, x, z) {
  const p = lms(indikator, jk, x);
  const v = p.l === 0 ? p.m * Math.exp(p.s * z) : p.m * Math.pow(1 + p.l * p.s * z, 1 / p.l);
  return Math.round(v * 10) / 10;
}

function tanggalMundur(hari) {
  const d = new Date();
  d.setDate(d.getDate() - hari);
  return d.toISOString().slice(0, 10);
}

function tanggalLahirUntukUsia(bulan) {
  const d = new Date();
  d.setMonth(d.getMonth() - bulan);
  return d.toISOString().slice(0, 10);
}

/**
 * Skenario anak.
 *
 * `zTarget` menyatakan Z-score TB/U yang diinginkan pada setiap kunjungan,
 * sehingga status gizi pada demo dapat dipastikan, bukan kebetulan.
 */
const SKENARIO = [
  {
    nama: "Aisyah Putri",
    jk: "P",
    usiaBulan: 30,
    orangTua: "Ibu Sari",
    // Sehat dan tumbuh konsisten.
    kunjungan: [
      { hariLalu: 90, zTinggi: -0.4, zBerat: -0.3 },
      { hariLalu: 60, zTinggi: -0.35, zBerat: -0.25 },
      { hariLalu: 30, zTinggi: -0.3, zBerat: -0.2 },
    ],
  },
  {
    nama: "Bagas Pratama",
    jk: "L",
    usiaBulan: 26,
    orangTua: "Ibu Wati",
    // Pendek berat: menjadi contoh utama pada demo.
    kunjungan: [
      { hariLalu: 90, zTinggi: -3.1, zBerat: -2.4 },
      { hariLalu: 60, zTinggi: -3.2, zBerat: -2.6 },
      { hariLalu: 25, zTinggi: -3.3, zBerat: -2.8 },
    ],
  },
  {
    nama: "Citra Dewi",
    jk: "P",
    usiaBulan: 20,
    orangTua: "Ibu Nur",
    // Status gizi masih normal, tetapi berat berhenti naik tiga bulan.
    // Kasus yang tidak terlihat pada pencatatan buku tulis.
    kunjungan: [
      { hariLalu: 90, zTinggi: -1.2, zBerat: -1.0, beratTetap: true },
      { hariLalu: 60, zTinggi: -1.4, zBerat: -1.0, beratTetap: true },
      { hariLalu: 28, zTinggi: -1.6, zBerat: -1.0, beratTetap: true },
    ],
  },
  {
    nama: "Dimas Saputra",
    jk: "L",
    usiaBulan: 42,
    orangTua: "Bapak Joko",
    // Berhenti menimbang lebih dari 90 hari.
    kunjungan: [
      { hariLalu: 240, zTinggi: -1.8, zBerat: -1.9 },
      { hariLalu: 150, zTinggi: -2.1, zBerat: -2.2 },
    ],
  },
  {
    nama: "Elsa Maharani",
    jk: "P",
    usiaBulan: 14,
    orangTua: "Ibu Rina",
    // Risiko, diukur telentang karena di bawah dua tahun.
    telentang: true,
    kunjungan: [
      { hariLalu: 60, zTinggi: -2.3, zBerat: -2.1 },
      { hariLalu: 30, zTinggi: -2.4, zBerat: -2.2 },
    ],
  },
  {
    nama: "Fajar Nugroho",
    jk: "L",
    usiaBulan: 8,
    orangTua: "Ibu Lestari",
    telentang: true,
    // Belum pernah menimbang: menguji tampilan data kosong.
    kunjungan: [],
  },
];

function klasifikasi(z) {
  if (z < -3) return "berat";
  if (z < -2) return "risiko";
  return "normal";
}

const NAMA_WILAYAH = "Desa Sukamakmur";
const NAMA_POSYANDU = "Posyandu Melati";

/**
 * Mencari wilayah dan posyandu demo, membuatnya bila belum ada.
 *
 * Keduanya sengaja dipakai ulang alih-alih dihapus lalu dibuat kembali, karena
 * penghapusan posyandu akan mengosongkan `profil.posyandu_id` melalui aturan
 * `on delete set null`, dan nilai kosong itu melanggar check constraint
 * `kader_wajib_punya_posyandu`. Penghapusannya akan gagal, dan bila berhasil
 * akun kader yang sudah dibuat justru menjadi tidak dapat dipakai.
 *
 * Memakai ulang keduanya juga berarti akun kader dan bidan tetap sah setelah
 * seed dijalankan ulang, sehingga tidak perlu membuat akun lagi sebelum demo.
 */
async function siapkanWilayahPosyandu() {
  const { data: wilayahAda } = await db
    .from("wilayah")
    .select("id")
    .eq("nama", NAMA_WILAYAH)
    .maybeSingle();

  let wilayahId = wilayahAda?.id;

  if (!wilayahId) {
    const { data, error } = await db
      .from("wilayah")
      .insert({ nama: NAMA_WILAYAH, kecamatan: "Cibadak", kabupaten: "Sukabumi" })
      .select("id")
      .single();
    if (error) throw new Error(`Gagal membuat wilayah: ${error.message}`);
    wilayahId = data.id;
  }

  const { data: posyanduAda } = await db
    .from("posyandu")
    .select("id")
    .eq("nama", NAMA_POSYANDU)
    .maybeSingle();

  let posyanduId = posyanduAda?.id;

  if (!posyanduId) {
    const { data, error } = await db
      .from("posyandu")
      .insert({
        wilayah_id: wilayahId,
        nama: NAMA_POSYANDU,
        alamat: "Dusun Melati RT 02 RW 01",
      })
      .select("id")
      .single();
    if (error) throw new Error(`Gagal membuat posyandu: ${error.message}`);
    posyanduId = data.id;
  }

  return {
    wilayah: { id: wilayahId },
    posyandu: { id: posyanduId },
    dibuatBaru: !posyanduAda?.id,
  };
}

/**
 * Menghapus anak demo beserta pengukurannya.
 *
 * Cakupannya dibatasi pada anak di posyandu demo, bukan seluruh tabel, agar
 * skrip ini tidak pernah menyentuh data di posyandu lain seandainya basis data
 * yang sama dipakai untuk hal lain.
 *
 * Pengukuran terhapus sendiri melalui `on delete cascade` pada `pengukuran`,
 * demikian pula ringkasan bulanan yang menempel pada posyandu.
 */
async function bersihkanAnakDemo(posyanduId) {
  const { data: lama } = await db
    .from("anak")
    .select("id")
    .eq("posyandu_id", posyanduId);

  if (!lama?.length) return 0;

  const { error } = await db.from("anak").delete().eq("posyandu_id", posyanduId);
  if (error) throw new Error(`Gagal membersihkan data lama: ${error.message}`);

  return lama.length;
}

async function main() {
  console.log("Menyiapkan data contoh sintetis...\n");

  const { wilayah, posyandu, dibuatBaru } = await siapkanWilayahPosyandu();

  console.log(
    dibuatBaru
      ? `${NAMA_POSYANDU} dibuat (wilayah: ${NAMA_WILAYAH})`
      : `${NAMA_POSYANDU} sudah ada, dipakai ulang (wilayah: ${NAMA_WILAYAH})`,
  );

  /*
   * Dijalankan sebelum penyisipan agar skrip ini dapat dijalankan berkali-kali
   * dengan hasil yang sama. Sebelumnya setiap kali dijalankan menambah satu set
   * anak baru, sehingga dashboard bidan berisi nama ganda dan angka
   * ringkasannya menyesatkan.
   */
  const terhapus = await bersihkanAnakDemo(posyandu.id);
  if (terhapus > 0) {
    console.log(`${terhapus} anak demo sebelumnya dihapus beserta pengukurannya\n`);
  }

  let jumlahUkur = 0;

  for (const s of SKENARIO) {
    const { data: anak, error: galatAnak } = await db
      .from("anak")
      .insert({
        posyandu_id: posyandu.id,
        nama: s.nama,
        tanggal_lahir: tanggalLahirUntukUsia(s.usiaBulan),
        jenis_kelamin: s.jk,
        nama_orang_tua: s.orangTua,
        alamat: "Dusun Melati",
      })
      .select("id")
      .single();

    if (galatAnak) throw new Error(`Gagal membuat anak ${s.nama}: ${galatAnak.message}`);

    const telentang = Boolean(s.telentang);
    const indPanjang = telentang || s.usiaBulan < 24 ? "pb_u" : "tb_u";
    const indBerat = telentang || s.usiaBulan < 24 ? "bb_pb" : "bb_tb";

    let beratPertama = null;

    for (const k of s.kunjungan) {
      // Usia pada saat kunjungan, bukan usia sekarang.
      const usiaSaatItu = Math.max(0, s.usiaBulan - Math.round(k.hariLalu / 30));

      const tinggi = nilaiPadaZ(indPanjang, s.jk, usiaSaatItu, k.zTinggi);
      let berat = nilaiPadaZ("bb_u", s.jk, usiaSaatItu, k.zBerat);

      // Skenario berat stagnan: nilai dipertahankan dari kunjungan pertama.
      if (k.beratTetap) {
        if (beratPertama === null) beratPertama = berat;
        berat = beratPertama;
      }

      const zBB = k.beratTetap
        ? hitungZ("bb_u", s.jk, usiaSaatItu, berat)
        : k.zBerat;
      const zBT = hitungZ(indBerat, s.jk, tinggi, berat);
      const zTB = k.zTinggi;

      const status = klasifikasi(Math.min(zBB, zTB, zBT ?? 0));

      const { error: galatUkur } = await db.from("pengukuran").insert({
        anak_id: anak.id,
        tanggal: tanggalMundur(k.hariLalu),
        berat_kg: berat,
        tinggi_cm: tinggi,
        diukur_telentang: telentang,
        usia_bulan: usiaSaatItu,
        z_bb_u: Math.round(zBB * 100) / 100,
        z_tb_u: Math.round(zTB * 100) / 100,
        z_bb_tb: zBT === null ? null : Math.round(zBT * 100) / 100,
        status,
        sumber: "manual",
        dikonfirmasi: true,
      });

      if (galatUkur) {
        throw new Error(`Gagal menyimpan pengukuran ${s.nama}: ${galatUkur.message}`);
      }
      jumlahUkur += 1;
    }

    const ket = s.kunjungan.length === 0 ? "belum pernah menimbang" : `${s.kunjungan.length} kunjungan`;
    console.log(`  ${s.nama.padEnd(18)} ${ket}`);
  }

  console.log(`\nSelesai. ${SKENARIO.length} anak, ${jumlahUkur} pengukuran.`);
  console.log("\nSeluruh data di atas sintetis, bukan data anak sungguhan.");
  console.log("\nLangkah berikutnya:");
  console.log("  node scripts/buat-akun-demo.mjs    membuat tiga akun demo");
  console.log("\nSkrip itu menuliskan baris profil sekaligus, yang tidak terjadi");
  console.log("bila akun dibuat lewat dashboard Supabase Auth. Bila perlu manual,");
  console.log("pakai nilai berikut pada tabel profil:");
  console.log(`  posyandu_id = ${posyandu.id}   (untuk kader)`);
  console.log(`  wilayah_id  = ${wilayah.id}   (untuk bidan)`);
}

function hitungZ(indikator, jk, x, nilai) {
  const t = tabel[indikator]?.[jk];
  if (!t) return null;
  if (x < t[0].x || x > t[t.length - 1].x) return null;
  const p = lms(indikator, jk, x);
  return p.l === 0
    ? Math.log(nilai / p.m) / p.s
    : (Math.pow(nilai / p.m, p.l) - 1) / (p.l * p.s);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
