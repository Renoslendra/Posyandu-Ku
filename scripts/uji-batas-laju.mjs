/**
 * Memeriksa apakah migrasi 0005 (pembatasan laju persisten) sudah dijalankan,
 * lalu menguji perilakunya terhadap basis data sungguhan.
 *
 * Yang diuji bukan hanya keberadaan fungsinya, melainkan bahwa batasnya
 * benar-benar menolak setelah ambang terlampaui, dan bahwa penghitung satu
 * pengguna tidak mempengaruhi pengguna lain.
 *
 * Jalankan: node scripts/uji-batas-laju.mjs
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

const UJI = "uji_batas";

async function main() {
  console.log("\nMenguji pembatasan laju persisten\n");

  const admin = createClient(URL, LAYANAN, { auth: { persistSession: false } });
  const kader = await masuk("kader@posyanduku.demo");
  const bidan = await masuk("bidan@posyanduku.demo");

  // Membersihkan sisa penghitung dari uji sebelumnya agar hasilnya berulang.
  await admin.from("batas_panggilan").delete().eq("endpoint", UJI);

  // --- Keberadaan fungsi ---
  const { error: galatPertama } = await kader.klien.rpc("catat_panggilan", {
    nama_endpoint: UJI,
    batas: 3,
    jendela_detik: 60,
  });

  if (galatPertama) {
    console.log(
      `\n  BELUM ADA — jalankan supabase/migrations/0005_batas_panggilan.sql`,
    );
    console.log(`  pesan: ${galatPertama.message}\n`);
    process.exit(1);
  }
  periksa("fungsi catat_panggilan tersedia", true);

  // --- Batas ditegakkan setelah ambang terlampaui ---
  // Panggilan pertama sudah tercatat di atas, jadi dua panggilan berikutnya
  // masih di dalam batas 3.
  const hasil = [];
  for (let i = 0; i < 3; i += 1) {
    const { data } = await kader.klien.rpc("catat_panggilan", {
      nama_endpoint: UJI,
      batas: 3,
      jendela_detik: 60,
    });
    hasil.push(data);
  }

  periksa("panggilan ke-2 dan ke-3 masih diizinkan", hasil[0] === false && hasil[1] === false);
  periksa("panggilan ke-4 ditolak karena melewati batas 3", hasil[2] === true);

  // --- Penghitung terpisah per pengguna ---
  const { data: bidanPertama } = await bidan.klien.rpc("catat_panggilan", {
    nama_endpoint: UJI,
    batas: 3,
    jendela_detik: 60,
  });
  periksa(
    "penghitung pengguna lain tidak terpengaruh",
    bidanPertama === false,
  );

  // --- Penghitung terpisah per endpoint ---
  const { data: endpointLain } = await kader.klien.rpc("catat_panggilan", {
    nama_endpoint: `${UJI}_lain`,
    batas: 3,
    jendela_detik: 60,
  });
  periksa("penghitung endpoint lain terpisah", endpointLain === false);

  // --- Jendela kedaluwarsa dimulai ulang ---
  // Memakai jendela 0 detik: seluruh catatan sebelumnya sudah kedaluwarsa,
  // sehingga penghitungnya harus dimulai ulang alih-alih diakumulasi.
  const { data: setelahKedaluwarsa } = await kader.klien.rpc("catat_panggilan", {
    nama_endpoint: UJI,
    batas: 3,
    jendela_detik: 0,
  });
  periksa(
    "jendela yang kedaluwarsa dimulai ulang, bukan diakumulasi",
    setelahKedaluwarsa === false,
  );

  // --- Pengguna tidak dapat membaca atau mengosongkan penghitungnya ---
  const { data: bacaSendiri } = await kader.klien
    .from("batas_panggilan")
    .select("jumlah");
  periksa(
    "pengguna tidak dapat membaca penghitungnya sendiri",
    (bacaSendiri ?? []).length === 0,
  );

  const { data: hapusSendiri } = await kader.klien
    .from("batas_panggilan")
    .delete()
    .eq("endpoint", UJI)
    .select("endpoint");
  periksa(
    "pengguna tidak dapat mengosongkan penghitungnya",
    (hapusSendiri ?? []).length === 0,
  );

  // --- Penghitung benar-benar tersimpan, bukan di memori ---
  const { data: tersimpan } = await admin
    .from("batas_panggilan")
    .select("pengguna_id, endpoint, jumlah")
    .eq("endpoint", UJI);
  periksa(
    "penghitung tersimpan di basis data, sehingga bertahan lintas invocation",
    (tersimpan ?? []).length > 0,
  );

  // --- Pembersihan ---
  await admin.from("batas_panggilan").delete().eq("endpoint", UJI);
  await admin.from("batas_panggilan").delete().eq("endpoint", `${UJI}_lain`);
  const { data: sisa } = await admin
    .from("batas_panggilan")
    .select("endpoint")
    .like("endpoint", `${UJI}%`);
  periksa("data uji berhasil dibersihkan", (sisa ?? []).length === 0);

  console.log(`\nHasil: ${lolos} lolos, ${gagal} gagal\n`);
  process.exit(gagal > 0 ? 1 : 0);
}

main().catch((galat) => {
  console.error(`\nGagal menjalankan uji: ${galat.message}\n`);
  process.exit(1);
});
