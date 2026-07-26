/*
 * Menguji tabel riwayat saran menu dan tindak lanjut terhadap basis data
 * sungguhan, bukan mock.
 *
 * Yang diuji di sini tidak dapat diuji dengan pengujian unit: kebijakan RLS,
 * batasan check, dan penolakan enum semuanya ditegakkan PostgreSQL, sehingga
 * satu-satunya cara memastikannya bekerja adalah mencobanya.
 *
 * Dua pemeriksaan yang paling penting justru yang memastikan sesuatu TIDAK
 * dapat dilakukan: orang tua tidak boleh membaca catatan tindak lanjut, dan
 * petugas tidak boleh mencatat atas nama orang lain. Keduanya adalah jenis
 * kekeliruan yang tidak memunculkan galat apa pun bila kebijakannya tertulis
 * salah, sehingga tanpa pengujian ini kebocorannya tidak akan diketahui.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
for (const b of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(b.trim());
  if (m) process.env[m[1]] = m[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let lulus = 0, gagal = 0;
const cek = (n, ok, ket = "") => { if (ok) { lulus++; console.log(`  LULUS  ${n}`); } else { gagal++; console.log(`  GAGAL  ${n} ${ket}`); } };

const { data: anak } = await admin.from("anak").select("id, nama").eq("nama", "Bagas Pratama").maybeSingle();
cek("anak demo Bagas ditemukan", !!anak);

// 1. saran_menu: tulis via service role
const { data: sm, error: e1 } = await admin.from("saran_menu").insert({
  anak_id: anak.id, status: "berat", usia_bulan: 30,
  isi: { narasi: "uji", totalBiayaRp: 15000, menu: [1,2,3] }, dari_fallback: true,
}).select("id").single();
cek("saran_menu dapat ditulis service role", !e1, e1?.message ?? "");

// 2. kolom dari_fallback benar (bukan salah tulis)
const { data: baca } = await admin.from("saran_menu").select("dari_fallback, isi").eq("id", sm?.id).maybeSingle();
cek("kolom dari_fallback terbaca", baca?.dari_fallback === true);
cek("isi jsonb utuh", baca?.isi?.totalBiayaRp === 15000);

// 3. constraint usia
const { error: e2 } = await admin.from("saran_menu").insert({ anak_id: anak.id, status: "normal", usia_bulan: 99, isi: {} });
cek("usia 99 bulan ditolak constraint", !!e2, e2 ? "" : "TIDAK DITOLAK");

// 4. enum status_gizi lebih diterima
const { data: sm2, error: e3 } = await admin.from("saran_menu").insert({ anak_id: anak.id, status: "obesitas", usia_bulan: 40, isi: {} }).select("id").single();
cek("status obesitas diterima", !e3, e3?.message ?? "");

// 5. tindak_lanjut: tulis
const { data: tl, error: e4 } = await admin.from("tindak_lanjut").insert({
  anak_id: anak.id, jenis: "ditelepon", catatan: "uji otomatis",
}).select("id").single();
cek("tindak_lanjut dapat ditulis", !e4, e4?.message ?? "");

// 6. enum jenis ditolak bila asing
const { error: e5 } = await admin.from("tindak_lanjut").insert({ anak_id: anak.id, jenis: "dikirim_surat" });
cek("jenis asing ditolak enum", !!e5, e5 ? "" : "TIDAK DITOLAK");

// 7. catatan hanya spasi ditolak
const { error: e6 } = await admin.from("tindak_lanjut").insert({ anak_id: anak.id, jenis: "hadir", catatan: "   " });
cek("catatan hanya spasi ditolak", !!e6, e6 ? "" : "TIDAK DITOLAK");

// 8. anon tidak boleh menulis saran_menu
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: e7 } = await anon.from("saran_menu").insert({ anak_id: anak.id, status: "normal", usia_bulan: 20, isi: {} });
cek("anon TIDAK dapat menulis saran_menu", !!e7);

// 9. orang tua dapat membaca saran_menu anaknya
const ortu = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
await ortu.auth.signInWithPassword({ email: "ortu@posyanduku.demo", password: "Posyandu2026!" });
const { data: bacaOrtu, error: e8 } = await ortu.from("saran_menu").select("id").eq("anak_id", anak.id);
cek("orang tua dapat membaca riwayat menu anaknya", !e8 && (bacaOrtu?.length ?? 0) > 0, e8?.message ?? `n=${bacaOrtu?.length}`);

// 10. orang tua TIDAK dapat membaca tindak_lanjut
const { data: tlOrtu } = await ortu.from("tindak_lanjut").select("id").eq("anak_id", anak.id);
cek("orang tua TIDAK dapat membaca tindak lanjut", (tlOrtu?.length ?? 0) === 0);

// 11. bidan dapat membaca tindak_lanjut
const bidan = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
await bidan.auth.signInWithPassword({ email: "bidan@posyanduku.demo", password: "Posyandu2026!" });
const { data: tlBidan, error: e9 } = await bidan.from("tindak_lanjut").select("id").eq("anak_id", anak.id);
cek("bidan dapat membaca tindak lanjut", !e9 && (tlBidan?.length ?? 0) > 0, e9?.message ?? `n=${tlBidan?.length}`);

// 12. bidan dapat menulis tindak_lanjut dengan dicatat_oleh dirinya
const { data: uBidan } = await bidan.auth.getUser();
const { error: e10 } = await bidan.from("tindak_lanjut").insert({ anak_id: anak.id, jenis: "dikunjungi", dicatat_oleh: uBidan.user.id });
cek("bidan dapat mencatat tindak lanjut", !e10, e10?.message ?? "");

// 13. bidan TIDAK dapat memalsukan dicatat_oleh orang lain
const { error: e11 } = await bidan.from("tindak_lanjut").insert({ anak_id: anak.id, jenis: "hadir", dicatat_oleh: "00000000-0000-0000-0000-000000000000" });
cek("dicatat_oleh tidak dapat dipalsukan", !!e11);

// bersihkan
await admin.from("saran_menu").delete().eq("anak_id", anak.id);
await admin.from("tindak_lanjut").delete().eq("anak_id", anak.id);
console.log(`\n  ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
