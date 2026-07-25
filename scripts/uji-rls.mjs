/**
 * Pengujian Row Level Security terhadap Supabase sungguhan.
 *
 * Mengaktifkan RLS tidak sama dengan membuktikannya bekerja. Kebijakan yang
 * salah tulis dapat tampak aktif namun tetap meloloskan akses. Skrip ini
 * membuktikannya dengan mencoba menembusnya.
 *
 * Skenario yang diuji:
 *   1. kader hanya menjangkau anak di posyandunya
 *   2. kader tidak dapat membaca anak di posyandu lain
 *   3. kader tidak dapat menulis pengukuran untuk anak di posyandu lain
 *   4. bidan menjangkau seluruh posyandu di wilayahnya
 *   5. bidan tidak menjangkau wilayah lain
 *   6. orang tua hanya menjangkau anaknya sendiri
 *   7. pengguna tanpa sesi tidak menjangkau apa pun
 *
 * Skrip menyiapkan datanya sendiri dan membersihkannya kembali.
 *
 * Jalankan: node scripts/uji-rls.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

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
    // Berkas tidak ada; variabel mungkin sudah tersedia di environment.
  }
}

muatEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error(
    "Membutuhkan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di .env.local",
  );
  process.exit(1);
}

/** Klien service role: menyiapkan data uji, melewati RLS. */
const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SANDI = "UjiRls#2026";
const PENANDA = `ujirls-${Date.now()}`;

let lolos = 0;
let gagal = 0;

function periksa(nama, kondisi, keterangan = "") {
  if (kondisi) {
    lolos += 1;
    console.log(`  LOLOS  ${nama}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL  ${nama}${keterangan ? ` — ${keterangan}` : ""}`);
  }
}

/** Membuat pengguna beserta barisnya di tabel profil. */
async function buatPengguna(surel, peran, kolom) {
  const { data, error } = await admin.auth.admin.createUser({
    email: surel,
    password: SANDI,
    email_confirm: true,
  });
  if (error) throw new Error(`Gagal membuat pengguna ${surel}: ${error.message}`);

  const { error: galatProfil } = await admin.from("profil").insert({
    id: data.user.id,
    peran,
    nama: surel.split("@")[0],
    ...kolom,
  });
  if (galatProfil) {
    throw new Error(`Gagal membuat profil ${surel}: ${galatProfil.message}`);
  }

  return data.user.id;
}

/** Klien dengan sesi pengguna: tunduk pada RLS, seperti peramban. */
async function klienSebagai(surel) {
  const klien = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await klien.auth.signInWithPassword({
    email: surel,
    password: SANDI,
  });
  if (error) throw new Error(`Gagal masuk sebagai ${surel}: ${error.message}`);
  return klien;
}

const dibuat = { pengguna: [], wilayah: [], posyandu: [], anak: [] };

async function siapkan() {
  console.log("Menyiapkan data uji...\n");

  // Dua wilayah agar isolasi antar wilayah dapat diuji.
  for (const nama of ["Wilayah A", "Wilayah B"]) {
    const { data, error } = await admin
      .from("wilayah")
      .insert({
        nama: `${nama} ${PENANDA}`,
        kecamatan: "Uji",
        kabupaten: "Uji",
      })
      .select("id")
      .single();
    if (error) throw new Error(`Gagal membuat wilayah: ${error.message}`);
    dibuat.wilayah.push(data.id);
  }

  const [wilayahA, wilayahB] = dibuat.wilayah;

  // Dua posyandu di wilayah A, satu di wilayah B.
  for (const [nama, wilayah] of [
    ["Posyandu A1", wilayahA],
    ["Posyandu A2", wilayahA],
    ["Posyandu B1", wilayahB],
  ]) {
    const { data, error } = await admin
      .from("posyandu")
      .insert({ wilayah_id: wilayah, nama: `${nama} ${PENANDA}` })
      .select("id")
      .single();
    if (error) throw new Error(`Gagal membuat posyandu: ${error.message}`);
    dibuat.posyandu.push(data.id);
  }

  const [posA1, posA2, posB1] = dibuat.posyandu;

  const surelKader = `kader.${PENANDA}@contoh.test`;
  const surelBidan = `bidan.${PENANDA}@contoh.test`;
  const surelOrangTua = `ortu.${PENANDA}@contoh.test`;

  const idKader = await buatPengguna(surelKader, "kader", { posyandu_id: posA1 });
  const idBidan = await buatPengguna(surelBidan, "bidan", { wilayah_id: wilayahA });
  const idOrangTua = await buatPengguna(surelOrangTua, "orang_tua", {});
  dibuat.pengguna.push(idKader, idBidan, idOrangTua);

  // Satu anak di setiap posyandu. Anak di posyandu A1 ditautkan ke orang tua.
  for (const [nama, posyandu, ortu] of [
    ["Anak A1", posA1, idOrangTua],
    ["Anak A2", posA2, null],
    ["Anak B1", posB1, null],
  ]) {
    const { data, error } = await admin
      .from("anak")
      .insert({
        posyandu_id: posyandu,
        nama: `${nama} ${PENANDA}`,
        tanggal_lahir: "2024-01-01",
        jenis_kelamin: "L",
        nama_orang_tua: "Uji",
        orang_tua_id: ortu,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Gagal membuat anak: ${error.message}`);
    dibuat.anak.push(data.id);
  }

  return { surelKader, surelBidan, surelOrangTua, posA1, posA2, posB1 };
}

async function uji(konteks) {
  const [anakA1, anakA2, anakB1] = dibuat.anak;

  console.log("\nKader (Posyandu A1):");
  const kader = await klienSebagai(konteks.surelKader);

  const { data: anakKader } = await kader.from("anak").select("id, nama");
  const idTerlihat = (anakKader ?? []).map((a) => a.id);

  periksa("melihat anak di posyandunya", idTerlihat.includes(anakA1));
  periksa(
    "tidak melihat anak di posyandu lain (wilayah sama)",
    !idTerlihat.includes(anakA2),
    `terlihat ${idTerlihat.length} anak`,
  );
  periksa("tidak melihat anak di wilayah lain", !idTerlihat.includes(anakB1));

  // Menulis pengukuran untuk anak di luar wewenang harus ditolak.
  const { error: galatTulis } = await kader.from("pengukuran").insert({
    anak_id: anakA2,
    tanggal: "2026-07-01",
    berat_kg: 10,
    tinggi_cm: 80,
    usia_bulan: 24,
  });
  periksa(
    "tidak dapat menulis pengukuran untuk anak posyandu lain",
    Boolean(galatTulis),
    "penulisan justru berhasil",
  );

  const { error: galatTulisSah } = await kader.from("pengukuran").insert({
    anak_id: anakA1,
    tanggal: "2026-07-01",
    berat_kg: 10,
    tinggi_cm: 80,
    usia_bulan: 24,
  });
  periksa(
    "dapat menulis pengukuran untuk anak di posyandunya",
    !galatTulisSah,
    galatTulisSah?.message,
  );

  console.log("\nBidan (Wilayah A):");
  const bidan = await klienSebagai(konteks.surelBidan);
  const { data: anakBidan } = await bidan.from("anak").select("id");
  const idBidan = (anakBidan ?? []).map((a) => a.id);

  periksa("melihat anak di posyandu A1", idBidan.includes(anakA1));
  periksa("melihat anak di posyandu A2", idBidan.includes(anakA2));
  periksa("tidak melihat anak di wilayah B", !idBidan.includes(anakB1));

  // Bidan hanya memantau; pencatatan adalah wewenang kader.
  const { error: galatBidanTulis } = await bidan.from("anak").insert({
    posyandu_id: konteks.posA1,
    nama: `Selundupan ${PENANDA}`,
    tanggal_lahir: "2024-01-01",
    jenis_kelamin: "L",
    nama_orang_tua: "Uji",
  });
  periksa("tidak dapat menambah data anak", Boolean(galatBidanTulis));

  console.log("\nOrang tua:");
  const ortu = await klienSebagai(konteks.surelOrangTua);
  const { data: anakOrtu } = await ortu.from("anak").select("id");
  const idOrtu = (anakOrtu ?? []).map((a) => a.id);

  periksa("melihat anaknya sendiri", idOrtu.includes(anakA1));
  periksa(
    "tidak melihat anak orang lain",
    !idOrtu.includes(anakA2) && !idOrtu.includes(anakB1),
    `terlihat ${idOrtu.length} anak`,
  );

  console.log("\nTanpa sesi:");
  const tamu = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anakTamu } = await tamu.from("anak").select("id");
  periksa("tidak melihat data anak sama sekali", (anakTamu ?? []).length === 0);

  const { data: ukurTamu } = await tamu.from("pengukuran").select("id");
  periksa("tidak melihat data pengukuran", (ukurTamu ?? []).length === 0);
}

async function bersihkan() {
  console.log("\nMembersihkan data uji...");

  // Pengukuran terhapus otomatis karena anak dihapus (on delete cascade).
  for (const id of dibuat.anak) await admin.from("anak").delete().eq("id", id);
  for (const id of dibuat.pengguna) {
    await admin.from("profil").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
  for (const id of dibuat.posyandu) await admin.from("posyandu").delete().eq("id", id);
  for (const id of dibuat.wilayah) await admin.from("wilayah").delete().eq("id", id);

  // Baris sisa dari percobaan penulisan yang seharusnya gagal.
  await admin.from("anak").delete().like("nama", `%${PENANDA}%`);
}

async function main() {
  let konteks;
  try {
    konteks = await siapkan();
    await uji(konteks);
  } catch (galat) {
    console.error(`\nGalat: ${galat.message}`);
    gagal += 1;
  } finally {
    try {
      await bersihkan();
    } catch (galat) {
      console.error(`Gagal membersihkan: ${galat.message}`);
    }
  }

  console.log(`\n${lolos} lolos, ${gagal} gagal`);
  if (gagal > 0) {
    console.log("\nRLS belum sepenuhnya mengisolasi data. Periksa kebijakan.");
    process.exit(1);
  }
  console.log("\nRLS mengisolasi data antar peran sebagaimana dirancang.");
}

main();
