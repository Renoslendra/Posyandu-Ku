/**
 * Diagnosis koneksi Supabase.
 *
 * Skrip cek-kesiapan melaporkan galat dengan pesan kosong, yang tidak cukup
 * untuk menentukan penyebabnya. Berkas ini memanggil REST API secara langsung
 * agar kode status dan isi balasan HTTP terlihat apa adanya.
 */

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Menampilkan bentuk kunci tanpa membocorkan nilainya. */
function bentuk(nama, nilai) {
  if (!nilai) return `${nama}: KOSONG`;
  const bagian = nilai.split(".").length;
  return `${nama}: ${nilai.length} karakter, awalan "${nilai.slice(0, 8)}", ${bagian} bagian titik`;
}

console.log("\nKonfigurasi:");
console.log(`  URL: ${url}`);
console.log(`  ${bentuk("anon   ", anon)}`);
console.log(`  ${bentuk("service", service)}`);

async function coba(nama, kunci, jalur) {
  try {
    const respons = await fetch(`${url}/rest/v1/${jalur}`, {
      headers: { apikey: kunci, Authorization: `Bearer ${kunci}` },
    });
    const teks = await respons.text();
    console.log(`\n${nama} -> HTTP ${respons.status} ${respons.statusText}`);
    console.log(`  ${teks.slice(0, 300) || "(balasan kosong)"}`);
    return respons.status;
  } catch (galat) {
    console.log(`\n${nama} -> gagal menghubungi: ${galat.message}`);
    return null;
  }
}

async function main() {
  // Memanggil akar REST API lebih dahulu: bila ini gagal, masalahnya pada
  // kunci atau URL, bukan pada tabel.
  await coba("Akar REST API (service)", service, "");
  await coba("Tabel anak (service)", service, "anak?select=id&limit=1");
  await coba("Tabel anak (anon)", anon, "anak?select=id&limit=1");

  console.log("\nPetunjuk penafsiran:");
  console.log("  401/403        -> kunci salah atau tertukar");
  console.log("  404 + PGRST205 -> tabel belum ada, migrasi belum dijalankan");
  console.log("  200            -> koneksi dan tabel sudah siap");
  console.log("");
}

main();
