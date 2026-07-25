/**
 * Uji alur pengguna sungguhan melalui sesi Supabase.
 *
 * Berbeda dari uji-rls.mjs yang menguji kebijakan basis data, berkas ini menguji
 * apa yang benar-benar terlihat oleh tiap peran setelah masuk memakai akun demo,
 * memakai kueri yang sama dengan halaman aplikasi.
 *
 * Tujuannya menangkap kesenjangan antara kebijakan yang benar dan kueri yang
 * salah: RLS dapat bekerja sempurna sementara halaman tetap kosong karena
 * kuerinya tidak sesuai.
 *
 * Jalankan setelah buat-akun-demo.mjs: node scripts/uji-alur.mjs
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

async function main() {
  console.log("\nMenguji alur tiap peran\n");

  // --- Kader -------------------------------------------------------------
  console.log("Kader:");
  const { klien: kader, pengguna: penggunaKader } = await masuk(
    "kader@posyanduku.demo",
  );

  const { data: profilKader } = await kader
    .from("profil")
    .select("peran, posyandu_id")
    .eq("id", penggunaKader.id)
    .maybeSingle();

  periksa("dapat membaca profilnya sendiri", profilKader?.peran === "kader");
  periksa("profilnya tertaut ke satu posyandu", Boolean(profilKader?.posyandu_id));

  // Kueri yang sama dengan halaman kader.
  const { data: anakKader, error: galatAnakKader } = await kader
    .from("anak")
    .select("id, nama, tanggal_lahir, jenis_kelamin")
    .order("nama");

  periksa(
    "melihat daftar anak di posyandunya",
    (anakKader ?? []).length === 6,
    galatAnakKader?.message ?? `terlihat ${(anakKader ?? []).length} anak`,
  );

  // Mencatat pengukuran untuk anak pertama, seperti yang dilakukan formulir.
  const anakPertama = anakKader?.[0];
  if (anakPertama) {
    const { error: galatTulis } = await kader.from("pengukuran").insert({
      anak_id: anakPertama.id,
      tanggal: new Date().toISOString().slice(0, 10),
      berat_kg: 12.5,
      tinggi_cm: 89,
      usia_bulan: 30,
      z_bb_u: 0.1,
      z_tb_u: 0.2,
      z_bb_tb: 0.1,
      status: "normal",
      sumber: "manual",
      dikonfirmasi: true,
      dicatat_oleh: penggunaKader.id,
      klien_ref: `ujialur-${Date.now()}`,
    });
    periksa("dapat mencatat pengukuran", !galatTulis, galatTulis?.message);
  }

  // --- Bidan -------------------------------------------------------------
  console.log("\nBidan:");
  const { klien: bidan, pengguna: penggunaBidan } = await masuk(
    "bidan@posyanduku.demo",
  );

  const { data: profilBidan } = await bidan
    .from("profil")
    .select("peran, wilayah_id")
    .eq("id", penggunaBidan.id)
    .maybeSingle();

  periksa("profilnya berperan bidan", profilBidan?.peran === "bidan");
  periksa("profilnya tertaut ke satu wilayah", Boolean(profilBidan?.wilayah_id));

  // Kueri yang sama dengan dashboard bidan.
  const [{ data: anakBidan }, { data: ukurBidan }] = await Promise.all([
    bidan.from("anak").select("id, nama, tanggal_lahir, jenis_kelamin").order("nama"),
    bidan
      .from("pengukuran")
      .select("anak_id, tanggal, berat_kg, status, dikonfirmasi")
      .order("tanggal"),
  ]);

  periksa(
    "melihat anak di wilayahnya",
    (anakBidan ?? []).length === 6,
    `terlihat ${(anakBidan ?? []).length} anak`,
  );
  periksa(
    "melihat data pengukuran untuk dashboard",
    (ukurBidan ?? []).length >= 13,
    `terlihat ${(ukurBidan ?? []).length} pengukuran`,
  );

  // Memastikan data yang dibutuhkan dashboard benar-benar ada, bukan hanya
  // kuerinya berhasil.
  const adaStatusBerat = (ukurBidan ?? []).some((p) => p.status === "berat");
  periksa("data demo memuat anak berstatus berat", adaStatusBerat);

  // --- Orang tua ---------------------------------------------------------
  console.log("\nOrang tua:");
  const { klien: ortu } = await masuk("ortu@posyanduku.demo");

  const { data: anakOrtu } = await ortu.from("anak").select("id, nama");

  periksa(
    "melihat tepat satu anak (anaknya sendiri)",
    (anakOrtu ?? []).length === 1,
    `terlihat ${(anakOrtu ?? []).length} anak`,
  );

  if (anakOrtu?.[0]) {
    const { data: ukurOrtu } = await ortu
      .from("pengukuran")
      .select("tanggal, status")
      .eq("anak_id", anakOrtu[0].id);
    periksa("melihat riwayat pengukuran anaknya", (ukurOrtu ?? []).length > 0);
  }

  // Memastikan orang tua tidak menjangkau anak lain meski mengetahui idnya.
  const anakLain = anakKader?.find((a) => a.id !== anakOrtu?.[0]?.id);
  if (anakLain) {
    const { data: bocor } = await ortu
      .from("anak")
      .select("id")
      .eq("id", anakLain.id)
      .maybeSingle();
    periksa("tidak dapat mengakses anak lain meski id diketahui", !bocor);
  }

  console.log(`\n${lolos} lolos, ${gagal} gagal`);
  if (gagal > 0) process.exit(1);
  console.log("\nSeluruh alur peran berjalan sesuai rancangan.\n");
}

main().catch((galat) => {
  console.error(`\nGagal: ${galat.message}\n`);
  process.exit(1);
});
