/**
 * Uji fitur yang ditambahkan pada versi 3.1: pendaftaran anak, perbaikan data,
 * penyaringan, dan saran menu.
 *
 * Menguji terhadap basis data sungguhan memakai sesi akun demo, bukan mock,
 * karena yang ingin dipastikan adalah kebijakan RLS untuk penulisan benar-benar
 * mengizinkan kader dan menolak peran lain.
 *
 * Data uji yang dibuat dihapus kembali di akhir agar data demo tetap sesuai
 * skenario yang tertulis di DEMO.md.
 *
 * Jalankan: node scripts/uji-fitur-baru.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

for (const baris of readFileSync(
  path.join(process.cwd(), ".env.local"),
  "utf8",
).split(/\r?\n/)) {
  const cocok = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (cocok && !process.env[cocok[1]]) {
    process.env[cocok[1]] = cocok[2].trim().replace(/^["']|["']$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LAYANAN = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SANDI = "Posyandu2026!";

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

async function masuk(surel) {
  const klien = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await klien.auth.signInWithPassword({
    email: surel,
    password: SANDI,
  });
  if (error) throw new Error(`Gagal masuk sebagai ${surel}: ${error.message}`);
  return { klien, pengguna: data.user };
}

const NAMA_UJI = "ZZZ Anak Uji Otomatis";
let idAnakUji = null;

async function main() {
  console.log("\nMenguji fitur versi 3.1\n");

  // --- Kader: pendaftaran anak baru (FR-01.1) ---
  console.log("Kader — pendaftaran anak baru");
  const kader = await masuk("kader@posyanduku.demo");

  const { data: profilKader } = await kader.klien
    .from("profil")
    .select("peran, posyandu_id")
    .eq("id", kader.pengguna.id)
    .maybeSingle();

  const { data: anakBaru, error: galatDaftar } = await kader.klien
    .from("anak")
    .insert({
      posyandu_id: profilKader.posyandu_id,
      nama: NAMA_UJI,
      tanggal_lahir: "2024-03-15",
      jenis_kelamin: "P",
      nama_orang_tua: "Ibu Uji",
    })
    .select("id, nama")
    .maybeSingle();

  periksa("kader dapat mendaftarkan anak baru", !galatDaftar, galatDaftar?.message);
  idAnakUji = anakBaru?.id ?? null;

  if (idAnakUji) {
    // Anak baru harus langsung muncul pada kueri yang dipakai halaman kader.
    const { data: daftar } = await kader.klien
      .from("anak")
      .select("id, nama")
      .eq("posyandu_id", profilKader.posyandu_id);

    periksa(
      "anak baru langsung muncul di daftar posyandunya",
      (daftar ?? []).some((a) => a.id === idAnakUji),
    );

    // --- Kader: perbaikan data (FR-04.6) ---
    const { data: diubah, error: galatUbah } = await kader.klien
      .from("anak")
      .update({ nama: `${NAMA_UJI} Diperbaiki` })
      .eq("id", idAnakUji)
      .select("nama")
      .maybeSingle();

    periksa("kader dapat memperbaiki nama anak", !galatUbah, galatUbah?.message);
    periksa(
      "nama tersimpan sesuai perubahan",
      diubah?.nama === `${NAMA_UJI} Diperbaiki`,
    );

    // Anak yang belum pernah ditimbang harus terhitung sebagai belum dinilai.
    const { data: ukurBaru } = await kader.klien
      .from("pengukuran")
      .select("id")
      .eq("anak_id", idAnakUji);

    periksa(
      "anak baru belum memiliki pengukuran, sehingga masuk kelompok belum dinilai",
      (ukurBaru ?? []).length === 0,
    );
  }

  // --- Bidan: tidak boleh mendaftarkan anak ---
  console.log("\nBidan — batas wewenang penulisan");
  const bidan = await masuk("bidan@posyanduku.demo");

  const { data: posyanduBidan } = await bidan.klien
    .from("posyandu")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { error: galatBidanTulis } = await bidan.klien.from("anak").insert({
    posyandu_id: posyanduBidan.id,
    nama: "ZZZ Tidak Boleh Ada",
    tanggal_lahir: "2024-01-01",
    jenis_kelamin: "L",
    nama_orang_tua: "Uji",
  });

  periksa(
    "bidan tidak dapat mendaftarkan anak, sesuai kebijakan hanya kader",
    Boolean(galatBidanTulis),
  );

  if (idAnakUji) {
    const { data: ubahBidan } = await bidan.klien
      .from("anak")
      .update({ nama: "ZZZ Diubah Bidan" })
      .eq("id", idAnakUji)
      .select("id");

    periksa(
      "bidan tidak dapat mengubah data anak",
      (ubahBidan ?? []).length === 0,
    );
  }

  // --- Orang tua: tidak boleh mendaftarkan maupun mengubah ---
  console.log("\nOrang tua — batas wewenang penulisan");
  const ortu = await masuk("ortu@posyanduku.demo");

  const { error: galatOrtuTulis } = await ortu.klien.from("anak").insert({
    posyandu_id: posyanduBidan.id,
    nama: "ZZZ Tidak Boleh Ada",
    tanggal_lahir: "2024-01-01",
    jenis_kelamin: "L",
    nama_orang_tua: "Uji",
  });

  periksa("orang tua tidak dapat mendaftarkan anak", Boolean(galatOrtuTulis));

  const { data: anakOrtu } = await ortu.klien.from("anak").select("id").limit(1);

  if (anakOrtu?.[0]) {
    const { data: ubahOrtu } = await ortu.klien
      .from("anak")
      .update({ nama: "ZZZ Diubah Ortu" })
      .eq("id", anakOrtu[0].id)
      .select("id");

    periksa(
      "orang tua tidak dapat mengubah data anaknya sendiri",
      (ubahOrtu ?? []).length === 0,
    );
  }

  // --- Data pendukung saran menu ---
  console.log("\nData pendukung saran menu");
  const { data: adaStatus } = await bidan.klien
    .from("pengukuran")
    .select("anak_id, status, usia_bulan")
    .eq("dikonfirmasi", true)
    .not("status", "is", null)
    .limit(50);

  const usiaLayak = (adaStatus ?? []).filter((p) => p.usia_bulan >= 6);
  periksa(
    "ada anak berusia 6 bulan atau lebih dengan status, sehingga saran menu dapat disusun",
    usiaLayak.length > 0,
  );

  const adaBerat = (adaStatus ?? []).some((p) => p.status === "berat");
  periksa("ada anak berstatus berat untuk menguji menu kalori tinggi", adaBerat);

  // --- Pembersihan ---
  console.log("\nMembersihkan data uji");
  if (idAnakUji) {
    // Memakai kunci layanan karena kader tidak diberi wewenang menghapus.
    const admin = createClient(URL, LAYANAN, { auth: { persistSession: false } });
    const { error: galatHapus } = await admin.from("anak").delete().eq("id", idAnakUji);
    periksa("data anak uji berhasil dihapus", !galatHapus, galatHapus?.message);
  }

  const admin = createClient(URL, LAYANAN, { auth: { persistSession: false } });
  const { data: sisa } = await admin.from("anak").select("id").ilike("nama", "ZZZ%");
  periksa("tidak ada sisa data uji di basis data", (sisa ?? []).length === 0);

  console.log(`\nHasil: ${lolos} lolos, ${gagal} gagal\n`);
  process.exit(gagal > 0 ? 1 : 0);
}

main().catch((galat) => {
  console.error(`\nGagal menjalankan uji: ${galat.message}\n`);
  process.exit(1);
});
