/**
 * Membuat akun demo untuk kader, bidan, dan orang tua.
 *
 * Diperlukan karena aplikasi tidak dapat dipakai tanpa akun, sedangkan
 * pendaftaran mandiri sengaja tidak disediakan: akun kader dibuatkan pengelola
 * posyandu, bukan didaftarkan sendiri.
 *
 * Akun ditautkan ke posyandu dan wilayah yang dibuat skrip seed, sehingga
 * cakupan RLS tiap peran langsung berlaku.
 *
 * Jalankan setelah seed: node scripts/buat-akun-demo.mjs
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
        process.env[cocok[1]] = cocok[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Ditangani pemeriksaan di bawah.
  }
}

muatEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib terisi.");
  process.exit(1);
}

const db = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Kata sandi akun demo.
 *
 * Sengaja sederhana dan diumumkan di README karena seluruh data pada
 * lingkungan ini sintetis. Tidak ada data anak sungguhan yang dilindungi
 * kata sandi ini.
 */
const SANDI = "Posyandu2026!";

const AKUN = [
  { surel: "kader@posyanduku.demo", peran: "kader", nama: "Bu Ani (Kader)" },
  { surel: "bidan@posyanduku.demo", peran: "bidan", nama: "Bu Ratna (Bidan)" },
  { surel: "ortu@posyanduku.demo", peran: "orang_tua", nama: "Ibu Wati (Orang Tua)" },
];

/**
 * Anak yang ditautkan ke akun orang tua.
 *
 * Dipilih menurut nama, bukan menurut urutan, dengan dua alasan.
 *
 * Pertama, ketepatan. Akun orang tua bernama Ibu Wati, dan pada data contoh
 * Ibu Wati adalah orang tua Bagas Pratama. Pemilihan sebelumnya memakai anak
 * pertama secara alfabetis, yaitu Aisyah Putri, yang orang tuanya Ibu Sari.
 * Akibatnya akun orang tua menampilkan anak milik orang lain.
 *
 * Kedua, kegunaan pada demo. Bagas berstatus pendek berat, sehingga halaman
 * orang tua menampilkan anjuran memeriksakan anak ke bidan. Aisyah berstatus
 * normal, sehingga bagian terpenting halaman itu tidak pernah terlihat.
 */
const ANAK_TERTAUT = "Bagas Pratama";

async function main() {
  console.log("\nMembuat akun demo...\n");

  // Mengambil posyandu dan wilayah hasil seed, agar tidak perlu menempelkan
  // pengenal secara manual.
  const { data: posyandu, error: galatPosyandu } = await db
    .from("posyandu")
    .select("id, nama, wilayah_id")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (galatPosyandu || !posyandu) {
    console.error("Belum ada posyandu. Jalankan dulu: node scripts/seed.mjs");
    process.exit(1);
  }

  for (const akun of AKUN) {
    // Menghapus akun bernama sama bila ada, agar skrip dapat dijalankan ulang
    // tanpa menimbulkan galat duplikat.
    const { data: daftar } = await db.auth.admin.listUsers();
    const lama = daftar?.users?.find((u) => u.email === akun.surel);
    if (lama) {
      await db.from("profil").delete().eq("id", lama.id);
      await db.auth.admin.deleteUser(lama.id);
    }

    const { data: dibuat, error } = await db.auth.admin.createUser({
      email: akun.surel,
      password: SANDI,
      email_confirm: true,
    });

    if (error) {
      console.error(`Gagal membuat ${akun.surel}: ${error.message}`);
      continue;
    }

    const kolom =
      akun.peran === "kader"
        ? { posyandu_id: posyandu.id }
        : akun.peran === "bidan"
          ? { wilayah_id: posyandu.wilayah_id }
          : {};

    const { error: galatProfil } = await db.from("profil").insert({
      id: dibuat.user.id,
      peran: akun.peran,
      nama: akun.nama,
      ...kolom,
    });

    if (galatProfil) {
      console.error(`Gagal membuat profil ${akun.surel}: ${galatProfil.message}`);
      continue;
    }

    console.log(`  ${akun.peran.padEnd(10)} ${akun.surel}`);
  }

  // Menautkan anak ke akun orang tua agar peran ketiga dapat ditunjukkan.
  const { data: daftarPengguna } = await db.auth.admin.listUsers();
  const ortu = daftarPengguna?.users?.find((u) => u.email === "ortu@posyanduku.demo");

  if (ortu) {
    const { data: anak } = await db
      .from("anak")
      .select("id, nama")
      .eq("nama", ANAK_TERTAUT)
      .maybeSingle();

    if (anak) {
      /*
       * Tautan lama dibersihkan lebih dahulu. Tanpa ini, anak yang pernah
       * ditautkan pada penjalanan sebelumnya tetap menempel pada profil yang
       * sudah dihapus, dan akun orang tua baru akan melihat lebih dari satu
       * anak tanpa alasan yang jelas.
       */
      await db
        .from("anak")
        .update({ orang_tua_id: null })
        .not("orang_tua_id", "is", null);

      await db.from("anak").update({ orang_tua_id: ortu.id }).eq("id", anak.id);
      console.log(`\n  ${anak.nama} ditautkan ke akun orang tua`);
    } else {
      console.error(
        `\n  ${ANAK_TERTAUT} tidak ditemukan. Jalankan dulu: node scripts/seed.mjs`,
      );
    }
  }

  console.log(`\nKata sandi ketiga akun: ${SANDI}`);
  console.log("\nSeluruh data pada lingkungan ini sintetis, bukan data anak sungguhan.");
  console.log("\nJalankan npm run dev, lalu masuk untuk mencoba tiap peran.\n");
}

main().catch((galat) => {
  console.error(`\nGagal: ${galat.message}\n`);
  process.exit(1);
});
