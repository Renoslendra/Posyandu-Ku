/**
 * Menguji perilaku sesi terhadap server yang sedang berjalan.
 *
 * Yang diperiksa bukan fungsi murni melainkan perilaku ujung ke ujung: apakah
 * pengguna yang sudah masuk masih ditawari tombol masuk, apakah peran yang salah
 * dialihkan, dan apakah keluar benar-benar mengakhiri sesi.
 *
 * Memakai permintaan HTTP sungguhan beserta cookie, sebab yang diuji justru
 * penanganan cookie sesi. Menirunya dengan mock akan melewatkan tepat bagian
 * yang paling mungkin salah.
 *
 * Jalankan: npm run start (di jendela lain), lalu node scripts/uji-sesi.mjs
 */

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

const ASAL = process.env.URI_UJI ?? "http://localhost:3000";
const SANDI = "Posyandu2026!";

const AKUN = [
  {
    surel: "kader@posyanduku.demo",
    peran: "kader",
    milik: "/kader",
    bukanMilik: ["/bidan", "/orangtua"],
  },
  {
    surel: "bidan@posyanduku.demo",
    peran: "bidan",
    milik: "/bidan",
    bukanMilik: ["/kader", "/orangtua"],
  },
  {
    surel: "ortu@posyanduku.demo",
    peran: "orang_tua",
    milik: "/orangtua",
    bukanMilik: ["/kader", "/bidan"],
  },
];

let lolos = 0;
let gagal = 0;

function periksa(nama, syarat, keterangan = "") {
  if (syarat) {
    lolos += 1;
    console.log(`  LOLOS  ${nama}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL  ${nama}${keterangan ? ` — ${keterangan}` : ""}`);
  }
}

/**
 * Wadah cookie sederhana.
 *
 * Diperlukan karena fetch bawaan Node tidak menyimpan cookie antar permintaan,
 * sedangkan sesi Supabase justru bersandar pada cookie.
 */
class Keranjang {
  constructor() {
    this.isi = new Map();
  }

  simpanDari(respons) {
    const semua = respons.headers.getSetCookie?.() ?? [];
    for (const baris of semua) {
      const [pasangan] = baris.split(";");
      const pisah = pasangan.indexOf("=");
      if (pisah < 1) continue;
      const nama = pasangan.slice(0, pisah).trim();
      const nilai = pasangan.slice(pisah + 1).trim();
      // Nilai kosong berarti server meminta cookie itu dihapus.
      if (nilai === "" ) this.isi.delete(nama);
      else this.isi.set(nama, nilai);
    }
  }

  get judul() {
    return [...this.isi.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function ambil(jalur, keranjang, opsi = {}) {
  const respons = await fetch(`${ASAL}${jalur}`, {
    ...opsi,
    redirect: "manual",
    headers: {
      ...(opsi.headers ?? {}),
      ...(keranjang.judul ? { cookie: keranjang.judul } : {}),
    },
  });
  keranjang.simpanDari(respons);
  return respons;
}

/** Masuk lewat Supabase, lalu memindahkan token ke cookie yang dipahami server. */
async function masuk(surel, keranjang) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const respons = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon },
    body: JSON.stringify({ email: surel, password: SANDI }),
  });

  if (!respons.ok) throw new Error(`Gagal masuk ${surel}: ${respons.status}`);

  const sesi = await respons.json();

  /*
   * Nama cookie mengikuti pola @supabase/ssr: sb-<ref proyek>-auth-token,
   * berisi JSON sesi yang dikodekan base64 dengan awalan penanda.
   */
  const ref = new URL(url).hostname.split(".")[0];
  const muatan = JSON.stringify({
    access_token: sesi.access_token,
    refresh_token: sesi.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + sesi.expires_in,
    expires_in: sesi.expires_in,
    token_type: "bearer",
    user: sesi.user,
  });

  const dikodekan = Buffer.from(muatan, "utf8").toString("base64");
  keranjang.isi.set(
    `sb-${ref}-auth-token`,
    encodeURIComponent(`base64-${dikodekan}`),
  );

  return sesi;
}

async function main() {
  console.log(`\nMenguji perilaku sesi terhadap ${ASAL}\n`);

  // Memastikan server hidup sebelum menyimpulkan apa pun.
  try {
    const cek = await fetch(ASAL, { redirect: "manual" });
    if (!cek.ok && cek.status !== 200) throw new Error(String(cek.status));
  } catch (e) {
    console.error(`Server tidak dapat dihubungi di ${ASAL}.`);
    console.error("Jalankan lebih dahulu: npm run build && npm run start\n");
    process.exit(1);
  }

  console.log("Pengunjung tanpa sesi:");
  {
    const keranjang = new Keranjang();
    const beranda = await ambil("/", keranjang);
    const isi = await beranda.text();

    periksa(
      "beranda menawarkan tombol masuk",
      isi.includes(">Masuk<"),
      "tombol masuk tidak ditemukan",
    );
    periksa(
      "beranda tidak menawarkan tombol keluar",
      !isi.includes(">Keluar<"),
      "tombol keluar justru tampil",
    );

    const masukHal = await ambil("/masuk", keranjang);
    periksa(
      "halaman masuk dapat dibuka",
      masukHal.status === 200,
      `status ${masukHal.status}`,
    );

    const kader = await ambil("/kader", keranjang);
    const isiKader = await kader.text();
    periksa(
      "halaman kader menampilkan pagar silakan masuk",
      isiKader.includes("Silakan masuk"),
      "pagar tidak muncul",
    );
  }

  for (const akun of AKUN) {
    console.log(`\nMasuk sebagai ${akun.peran}:`);
    const keranjang = new Keranjang();

    try {
      await masuk(akun.surel, keranjang);
    } catch (e) {
      periksa(`dapat masuk sebagai ${akun.peran}`, false, e.message);
      continue;
    }

    const milik = await ambil(akun.milik, keranjang);
    const isiMilik = await milik.text();

    periksa(
      `${akun.milik} dapat dibuka`,
      milik.status === 200,
      `status ${milik.status}`,
    );
    periksa(
      `${akun.milik} tidak lagi menampilkan pagar silakan masuk`,
      !isiMilik.includes("Silakan masuk"),
      "masih dianggap belum masuk",
    );
    periksa(
      "tombol masuk tidak ditawarkan lagi",
      !isiMilik.includes(">Masuk<"),
      "tombol masuk masih tampil padahal sudah masuk",
    );
    periksa(
      "tombol keluar tersedia",
      isiMilik.includes(">Keluar<"),
      "tidak ada jalan keluar dari aplikasi",
    );

    for (const asing of akun.bukanMilik) {
      const respons = await ambil(asing, keranjang);
      const dialihkan =
        respons.status >= 300 &&
        respons.status < 400 &&
        (respons.headers.get("location") ?? "").includes(akun.milik);

      periksa(
        `${asing} dialihkan ke ${akun.milik}`,
        dialihkan,
        `status ${respons.status}, tujuan ${respons.headers.get("location") ?? "tidak ada"}`,
      );
    }

    // Pengguna yang sudah masuk tidak perlu melihat formulir masuk lagi.
    const masukLagi = await ambil("/masuk", keranjang);
    periksa(
      "/masuk dialihkan ke halaman peran",
      masukLagi.status >= 300 &&
        masukLagi.status < 400 &&
        (masukLagi.headers.get("location") ?? "").includes(akun.milik),
      `status ${masukLagi.status}, tujuan ${masukLagi.headers.get("location") ?? "tidak ada"}`,
    );

    // Keluar harus benar-benar mengakhiri sesi, bukan sekadar berpindah halaman.
    const keluar = await ambil("/api/keluar", keranjang, { method: "POST" });
    periksa("permintaan keluar diterima", keluar.status === 200, `status ${keluar.status}`);

    const sesudah = await ambil(akun.milik, keranjang);
    const isiSesudah = await sesudah.text();
    periksa(
      "sesudah keluar, halaman peran kembali terkunci",
      isiSesudah.includes("Silakan masuk"),
      "sesi masih hidup setelah keluar",
    );
  }

  console.log("\nGET pada endpoint keluar:");
  {
    const keranjang = new Keranjang();
    const respons = await ambil("/api/keluar", keranjang);
    periksa(
      "GET ditolak, hanya POST dilayani",
      respons.status === 405,
      `status ${respons.status}, seharusnya 405`,
    );
  }

  console.log(`\nHasil: ${lolos} lolos, ${gagal} gagal\n`);
  process.exit(gagal > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
