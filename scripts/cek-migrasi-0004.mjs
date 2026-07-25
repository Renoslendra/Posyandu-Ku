/**
 * Memeriksa apakah migrasi 0004 (kolom telepon pada tabel anak) sudah
 * dijalankan di basis data.
 *
 * Migrasi dijalankan manual lewat SQL Editor Supabase, sehingga perlu
 * pemeriksaan terpisah agar tidak ada kolom yang terlewat. Bila kolom belum
 * ada, pendaftaran anak akan gagal saat demo.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((baris) => baris.includes("=") && !baris.trim().startsWith("#"))
    .map((baris) => {
      const pisah = baris.indexOf("=");
      return [baris.slice(0, pisah).trim(), baris.slice(pisah + 1).trim()];
    }),
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Meminta kolom secara eksplisit. Bila kolom tidak ada, PostgREST menolak
// dengan galat, dan itulah sinyal yang dicari.
const { error } = await admin.from("anak").select("id, telepon").limit(1);

if (error) {
  console.log("BELUM ADA — jalankan supabase/migrations/0004_telepon_anak.sql");
  console.log(`   pesan: ${error.message}`);
  process.exit(1);
}

console.log("SUDAH ADA — kolom anak.telepon tersedia");
