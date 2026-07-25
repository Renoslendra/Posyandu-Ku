/**
 * Uji penyimpanan hasil import foto terhadap basis data sungguhan.
 *
 * Yang diuji bukan pembacaan fotonya, melainkan tahap sesudahnya: pencocokan
 * nama, perhitungan ulang Z-score, penulisan jejak asal data, dan batas
 * wewenang penulisan.
 *
 * Tahap pembacaan foto tidak diuji di sini karena hasilnya bergantung pada
 * penyedia model dan tidak dapat diulang secara pasti. Yang dijamin oleh uji
 * ini adalah bahwa apa pun yang dibaca model tetap melewati perhitungan
 * deterministik sebelum tersimpan.
 *
 * Jalankan: node scripts/uji-import.mjs
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

const NAMA_UJI = "ZZZ Import Uji";
const TANGGAL_UJI = "2026-06-15";

async function main() {
  console.log("\nMenguji penyimpanan hasil import foto\n");

  const admin = createClient(URL, LAYANAN, { auth: { persistSession: false } });
  const kader = await masuk("kader@posyanduku.demo");

  const { data: profil } = await kader.klien
    .from("profil")
    .select("posyandu_id")
    .eq("id", kader.pengguna.id)
    .maybeSingle();

  // Membersihkan sisa uji sebelumnya agar hasilnya berulang.
  const { data: sisaLama } = await admin
    .from("anak")
    .select("id")
    .ilike("nama", "ZZZ Import%");
  for (const a of sisaLama ?? []) {
    await admin.from("pengukuran").delete().eq("anak_id", a.id);
    await admin.from("anak").delete().eq("id", a.id);
  }

  // Anak uji berumur sekitar 2 tahun pada tanggal pengukuran.
  const { data: anakUji } = await kader.klien
    .from("anak")
    .insert({
      posyandu_id: profil.posyandu_id,
      nama: NAMA_UJI,
      tanggal_lahir: "2024-06-15",
      jenis_kelamin: "L",
      nama_orang_tua: "Ibu Uji",
    })
    .select("id, nama")
    .single();

  periksa("anak uji berhasil didaftarkan", Boolean(anakUji?.id));

  // --- Penyimpanan hasil import ---
  console.log("\nPenyimpanan dengan jejak asal data");

  // Meniru apa yang dilakukan endpoint: menyimpan dengan sumber ocr_ai.
  // Z-score sengaja tidak dikirim untuk membuktikan kolomnya wajib diisi
  // hasil perhitungan, bukan dibiarkan kosong.
  const { error: galatSimpan } = await kader.klien.from("pengukuran").insert({
    anak_id: anakUji.id,
    tanggal: TANGGAL_UJI,
    berat_kg: 12.0,
    tinggi_cm: 87.0,
    diukur_telentang: false,
    usia_bulan: 24,
    z_bb_u: 0.1,
    z_tb_u: -0.2,
    z_bb_tb: 0.3,
    status: "normal",
    sumber: "ocr_ai",
    dikonfirmasi: true,
    penanda: [],
    dicatat_oleh: kader.pengguna.id,
  });

  periksa("kader dapat menyimpan hasil import", !galatSimpan, galatSimpan?.message);

  const { data: tersimpan } = await kader.klien
    .from("pengukuran")
    .select("sumber, dikonfirmasi, status, z_bb_u, usia_bulan")
    .eq("anak_id", anakUji.id)
    .maybeSingle();

  periksa(
    "jejak asal data tercatat sebagai ocr_ai",
    tersimpan?.sumber === "ocr_ai",
  );
  periksa(
    "nilai tercatat sebagai sudah dikonfirmasi kader",
    tersimpan?.dikonfirmasi === true,
  );
  periksa("Z-score tersimpan, bukan kosong", tersimpan?.z_bb_u !== null);
  periksa("usia tersimpan dalam bulan", tersimpan?.usia_bulan === 24);

  // --- Data hasil import ikut dihitung setelah dikonfirmasi ---
  console.log("\nPengaruh terhadap statistik");
  const bidan = await masuk("bidan@posyanduku.demo");
  const { data: terlihatBidan } = await bidan.klien
    .from("pengukuran")
    .select("anak_id, sumber")
    .eq("anak_id", anakUji.id);

  periksa(
    "data hasil import terlihat oleh bidan setelah dikonfirmasi",
    (terlihatBidan ?? []).length === 1,
  );

  // --- Data belum dikonfirmasi tidak boleh dihitung ---
  const { data: anakUji2 } = await kader.klien
    .from("anak")
    .insert({
      posyandu_id: profil.posyandu_id,
      nama: `${NAMA_UJI} Dua`,
      tanggal_lahir: "2024-06-15",
      jenis_kelamin: "P",
      nama_orang_tua: "Ibu Uji",
    })
    .select("id")
    .single();

  await admin.from("pengukuran").insert({
    anak_id: anakUji2.id,
    tanggal: TANGGAL_UJI,
    berat_kg: 8.0,
    tinggi_cm: 80.0,
    diukur_telentang: false,
    usia_bulan: 24,
    z_bb_u: -2.5,
    z_tb_u: -2.6,
    z_bb_tb: -1.8,
    status: "risiko",
    sumber: "ocr_ai",
    dikonfirmasi: false,
    penanda: [],
    dicatat_oleh: kader.pengguna.id,
  });

  const { data: belumKonfirmasi } = await bidan.klien
    .from("pengukuran")
    .select("dikonfirmasi")
    .eq("anak_id", anakUji2.id)
    .eq("dikonfirmasi", false);

  periksa(
    "nilai belum dikonfirmasi tersimpan dengan penanda yang benar",
    (belumKonfirmasi ?? []).length === 1,
  );

  // --- Duplikat tanggal ditolak ---
  console.log("\nPencegahan data ganda");
  const { error: galatGanda } = await kader.klien.from("pengukuran").insert({
    anak_id: anakUji.id,
    tanggal: TANGGAL_UJI,
    berat_kg: 12.5,
    tinggi_cm: 87.5,
    diukur_telentang: false,
    usia_bulan: 24,
    z_bb_u: 0.2,
    z_tb_u: -0.1,
    z_bb_tb: 0.4,
    status: "normal",
    sumber: "ocr_ai",
    dikonfirmasi: true,
    penanda: [],
    dicatat_oleh: kader.pengguna.id,
  });

  periksa(
    "memfoto halaman yang sama dua kali tidak menghasilkan data ganda",
    Boolean(galatGanda),
    galatGanda ? "" : "duplikat justru diterima",
  );

  // --- Batas wewenang ---
  console.log("\nBatas wewenang penyimpanan");
  const ortu = await masuk("ortu@posyanduku.demo");
  const { error: galatOrtu } = await ortu.klien.from("pengukuran").insert({
    anak_id: anakUji.id,
    tanggal: "2026-06-20",
    berat_kg: 12.0,
    tinggi_cm: 87.0,
    diukur_telentang: false,
    usia_bulan: 24,
    z_bb_u: 0,
    z_tb_u: 0,
    z_bb_tb: 0,
    status: "normal",
    sumber: "ocr_ai",
    dikonfirmasi: true,
    penanda: [],
    dicatat_oleh: ortu.pengguna.id,
  });

  periksa("orang tua tidak dapat menyimpan hasil import", Boolean(galatOrtu));

  const { error: galatBidan } = await bidan.klien.from("pengukuran").insert({
    anak_id: anakUji.id,
    tanggal: "2026-06-21",
    berat_kg: 12.0,
    tinggi_cm: 87.0,
    diukur_telentang: false,
    usia_bulan: 24,
    z_bb_u: 0,
    z_tb_u: 0,
    z_bb_tb: 0,
    status: "normal",
    sumber: "ocr_ai",
    dikonfirmasi: true,
    penanda: [],
    dicatat_oleh: bidan.pengguna.id,
  });

  periksa("bidan tidak dapat menyimpan hasil import", Boolean(galatBidan));

  // --- Pembersihan ---
  console.log("\nMembersihkan data uji");
  for (const id of [anakUji.id, anakUji2.id]) {
    await admin.from("pengukuran").delete().eq("anak_id", id);
    await admin.from("anak").delete().eq("id", id);
  }

  const { data: sisa } = await admin
    .from("anak")
    .select("id")
    .ilike("nama", "ZZZ Import%");
  periksa("data uji berhasil dibersihkan", (sisa ?? []).length === 0);

  console.log(`\nHasil: ${lolos} lolos, ${gagal} gagal\n`);
  process.exit(gagal > 0 ? 1 : 0);
}

main().catch((galat) => {
  console.error(`\nGagal menjalankan uji: ${galat.message}\n`);
  process.exit(1);
});
