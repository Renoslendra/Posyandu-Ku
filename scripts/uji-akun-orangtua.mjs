/*
 * Menguji pembuatan akun orang tua terhadap peladen yang sedang berjalan.
 *
 * Memakai permintaan HTTP sungguhan beserta cookie sesi, sebab yang diuji
 * mencakup pembatasan peran di lapisan endpoint. Pembatasan itu tidak dapat
 * diuji lewat basis data: endpointnya bekerja dengan service role yang memang
 * melewati seluruh kebijakan RLS, sehingga pemeriksaan peran di endpoint adalah
 * satu-satunya pertahanan yang ada.
 *
 * Empat pemeriksaan yang paling penting memastikan sesuatu TIDAK dapat terjadi:
 * permintaan tanpa sesi ditolak, bidan ditolak walaupun ia berwenang membaca
 * anaknya, anak yang sudah tertaut tidak dapat ditautkan dua kali, dan akun yang
 * baru dibuat hanya melihat anaknya sendiri.
 *
 * Yang terakhir itu penutup rangkaiannya: ia membuktikan akun yang dibuat kader
 * benar-benar dapat dipakai keluarga, dan sekaligus tidak dapat dipakai melihat
 * anak keluarga lain.
 *
 * Menyetel BASIS_URL untuk menguji terhadap peladen lokal.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
for (const b of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(b.trim());
  if (m) process.env[m[1]] = m[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASIS = process.env.BASIS_URL ?? "https://posyandu-ku.vercel.app";
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let lulus = 0, gagal = 0;
const cek = (n, ok, k = "") => { if (ok) { lulus++; console.log(`  LULUS  ${n}`); } else { gagal++; console.log(`  GAGAL  ${n} ${k}`); } };

async function kuki(surel) {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { "content-type": "application/json", apikey: anon },
    body: JSON.stringify({ email: surel, password: "Posyandu2026!" }),
  });
  const s = await r.json();
  const ref = new URL(url).hostname.split(".")[0];
  const muatan = JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Math.floor(Date.now()/1000)+s.expires_in, expires_in: s.expires_in, token_type: "bearer", user: s.user });
  return `sb-${ref}-auth-token=${encodeURIComponent("base64-"+Buffer.from(muatan,"utf8").toString("base64"))}`;
}

const kKader = await kuki("kader@posyanduku.demo");
const kBidan = await kuki("bidan@posyanduku.demo");

// anak tanpa orang tua tertaut
const { data: anak } = await admin.from("anak").select("id, nama, orang_tua_id").is("orang_tua_id", null).limit(1).maybeSingle();
cek("ada anak belum tertaut", !!anak, anak ? "" : "semua sudah tertaut");
if (!anak) process.exit(1);

const surelUji = `uji-ortu-${Date.now()}@posyanduku.demo`;
const panggil = (kk, body) => fetch(`${BASIS}/api/akun-orangtua`, {
  method: "POST", headers: { "content-type": "application/json", cookie: kk }, body: JSON.stringify(body),
});

// 1. tanpa sesi -> 401
const r0 = await fetch(`${BASIS}/api/akun-orangtua`, { method: "POST", headers: {"content-type":"application/json"}, body: "{}" });
cek("tanpa sesi ditolak 401", r0.status === 401, `status ${r0.status}`);

// 2. bidan -> 403
const r1 = await panggil(kBidan, { anakId: anak.id, email: surelUji, nama: "Uji" });
cek("bidan ditolak 403", r1.status === 403, `status ${r1.status}`);

// 3. email tidak sah -> 400
const r2 = await panggil(kKader, { anakId: anak.id, email: "bukan-email", nama: "Uji" });
cek("email tidak sah ditolak 400", r2.status === 400, `status ${r2.status}`);

// 4. kader berhasil
const r3 = await panggil(kKader, { anakId: anak.id, email: surelUji, nama: "Ibu Uji Otomatis" });
const isi3 = await r3.json();
cek("kader berhasil membuat akun", r3.status === 200 && isi3.ok, `status ${r3.status} ${isi3.galat ?? ""}`);
cek("sandi awal dikembalikan 12 huruf", (isi3.sandiAwal?.length ?? 0) === 12, `panjang ${isi3.sandiAwal?.length}`);

// 5. anak tertaut
const { data: sesudah } = await admin.from("anak").select("orang_tua_id").eq("id", anak.id).maybeSingle();
cek("anak tertaut ke akun baru", !!sesudah?.orang_tua_id);

// 6. profil berperan orang_tua
const { data: profil } = await admin.from("profil").select("peran, nama").eq("id", sesudah?.orang_tua_id).maybeSingle();
cek("profil berperan orang_tua", profil?.peran === "orang_tua", `peran ${profil?.peran}`);

// 7. akun baru dapat masuk dan melihat anaknya
const ortu = createClient(url, anon, { auth: { persistSession: false } });
const { error: eMasuk } = await ortu.auth.signInWithPassword({ email: surelUji, password: isi3.sandiAwal });
cek("akun baru dapat masuk", !eMasuk, eMasuk?.message ?? "");
const { data: lihat } = await ortu.from("anak").select("id, nama");
cek("melihat tepat 1 anak (RLS)", lihat?.length === 1 && lihat[0].id === anak.id, `n=${lihat?.length}`);

// 8. anak yang sudah tertaut -> 409
const r4 = await panggil(kKader, { anakId: anak.id, email: `lain-${Date.now()}@posyanduku.demo`, nama: "Lain" });
cek("anak sudah tertaut ditolak 409", r4.status === 409, `status ${r4.status}`);

// bersihkan
await admin.from("anak").update({ orang_tua_id: null }).eq("id", anak.id);
await admin.from("profil").delete().eq("id", sesudah?.orang_tua_id);
await admin.auth.admin.deleteUser(sesudah?.orang_tua_id);
console.log(`\n  ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
