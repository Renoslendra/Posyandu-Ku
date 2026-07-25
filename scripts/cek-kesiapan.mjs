/**
 * Pemeriksa kesiapan lingkungan.
 *
 * Dijalankan sebelum seed dan uji RLS untuk memastikan kredensial terisi,
 * koneksi berjalan, migrasi sudah dijalankan, dan RLS benar-benar aktif.
 *
 * Tujuannya memindahkan kegagalan dari tengah proses ke awal, dengan pesan yang
 * menyebutkan langkah perbaikannya. Galat Supabase mentah sulit ditafsirkan
 * ketika muncul di tengah skrip seed.
 *
 * Jalankan: node scripts/cek-kesiapan.mjs
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
        process.env[cocok[1]] = cocok[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Berkas belum ada; ditangani pemeriksaan di bawah.
  }
}

muatEnv();

let masalah = 0;

function lolos(pesan) {
  console.log(`  OK     ${pesan}`);
}

function gagal(pesan, saran) {
  masalah += 1;
  console.log(`  BELUM  ${pesan}`);
  if (saran) console.log(`         -> ${saran}`);
}

const TABEL_WAJIB = [
  "wilayah",
  "posyandu",
  "profil",
  "anak",
  "pengukuran",
  "ringkasan_bulanan",
];

async function main() {
  console.log("\nMemeriksa kesiapan PosyanduKu\n");

  // --- Kredensial ---------------------------------------------------------
  console.log("Kredensial:");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url) lolos("NEXT_PUBLIC_SUPABASE_URL terisi");
  else gagal("NEXT_PUBLIC_SUPABASE_URL kosong", "isi di .env.local");

  if (anon) lolos("NEXT_PUBLIC_SUPABASE_ANON_KEY terisi");
  else
    gagal(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY kosong",
      "ambil dari Settings > API, bagian anon/public",
    );

  if (service) lolos("SUPABASE_SERVICE_ROLE_KEY terisi");
  else
    gagal(
      "SUPABASE_SERVICE_ROLE_KEY kosong",
      "ambil dari Settings > API, bagian service_role (klik Reveal)",
    );

  if (process.env.LLM_API_KEY) {
    lolos("LLM_API_KEY terisi (import foto dan ringkasan AI aktif)");
  } else {
    console.log(
      "  CATATAN LLM_API_KEY kosong. Aplikasi tetap berjalan memakai fallback,",
    );
    console.log("         namun import foto tidak dapat didemokan.");
  }

  if (!url || !service) {
    console.log("\nKredensial belum lengkap. Pemeriksaan dihentikan.\n");
    process.exit(1);
  }

  // --- Koneksi dan skema -------------------------------------------------
  console.log("\nKoneksi dan skema:");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let skemaSiap = true;

  for (const tabel of TABEL_WAJIB) {
    const { error } = await admin.from(tabel).select("*", { head: true, count: "exact" });

    if (!error) {
      lolos(`tabel ${tabel} ada`);
      continue;
    }

    skemaSiap = false;
    // 42P01 = tabel tidak ada, artinya migrasi belum dijalankan.
    if (error.code === "42P01") {
      gagal(`tabel ${tabel} belum ada`, "jalankan supabase/migrations/0001_skema_awal.sql");
    } else {
      gagal(`tabel ${tabel} tidak dapat dibaca: ${error.message}`);
    }
  }

  if (!skemaSiap) {
    console.log("\nSkema belum lengkap. Jalankan kedua berkas migrasi berurutan.\n");
    process.exit(1);
  }

  // --- RLS ---------------------------------------------------------------
  //
  // Diperiksa dengan anon key tanpa sesi. Bila RLS aktif dan kebijakannya
  // benar, pembacaan tanpa sesi harus mengembalikan nol baris. Bila data
  // terbaca, kebijakan belum terpasang.
  console.log("\nRow Level Security:");

  if (!anon) {
    gagal("tidak dapat memeriksa RLS", "anon key belum terisi");
  } else {
    const tamu = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (const tabel of ["anak", "pengukuran"]) {
      const { data, error } = await tamu.from(tabel).select("id").limit(1);

      if (error) {
        // Galat izin juga menandakan akses tertutup, yang memang diinginkan.
        lolos(`tabel ${tabel} tertutup tanpa sesi`);
      } else if ((data ?? []).length === 0) {
        lolos(`tabel ${tabel} tidak mengembalikan data tanpa sesi`);
      } else {
        gagal(
          `tabel ${tabel} TERBACA tanpa sesi`,
          "jalankan supabase/migrations/0002_rls.sql",
        );
      }
    }
  }

  // --- Toleransi zona waktu pada batasan tanggal --------------------------
  //
  // Batasan tanggal semula dievaluasi memakai tanggal basis data, yang berjalan
  // pada UTC. Antara tengah malam dan pukul tujuh pagi Waktu Indonesia Barat,
  // tanggal UTC masih menunjuk hari sebelumnya, sehingga tanggal hari ini yang
  // diisi formulir ditolak dan catatan kader dapat hilang dari antrean luring.
  //
  // Diperiksa dengan menyisipkan baris bertanggal esok hari, lalu menghapusnya.
  // Migrasi 0008 memberi toleransi satu hari, jadi baris itu harus diterima.
  console.log("\nToleransi zona waktu (migrasi 0008):");

  const { data: posyanduAda } = await admin.from("posyandu").select("id").limit(1);

  if (!posyanduAda || posyanduAda.length === 0) {
    console.log("  CATATAN belum ada posyandu, pemeriksaan dilewati.");
  } else {
    const esok = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const namaProbe = "ZZZ Uji Zona Waktu";

    const { error: galatProbe } = await admin.from("anak").insert({
      posyandu_id: posyanduAda[0].id,
      nama: namaProbe,
      tanggal_lahir: esok,
      jenis_kelamin: "L",
      nama_orang_tua: "Uji",
    });

    if (!galatProbe) {
      lolos("batasan tanggal memberi toleransi satu hari");
    } else if (galatProbe.code === "23514") {
      gagal(
        "batasan tanggal masih memakai tanggal basis data",
        "jalankan supabase/migrations/0008_tanggal_zona_waktu.sql",
      );
    } else {
      gagal(`tidak dapat memeriksa batasan tanggal: ${galatProbe.message}`);
    }

    await admin.from("anak").delete().eq("nama", namaProbe);
  }

  // --- Kolom dan nilai enum yang ditambahkan migrasi kemudian --------------
  //
  // Keduanya tidak dapat dipastikan dari kode, sebab yang menentukan adalah
  // keadaan basis data. Bila terlewat, kegagalannya tidak menyatakan diri:
  // saran menu berhenti menyaring bahan yang perlu dihindari, dan status
  // kelebihan gizi gagal disimpan pada saat penyimpanan pengukuran.
  console.log("\nMigrasi lanjutan:");

  const { error: galatAlergi } = await admin.from("anak").select("alergi").limit(1);

  if (!galatAlergi) {
    lolos("kolom alergi tersedia pada tabel anak");
  } else {
    gagal(
      "kolom alergi belum ada",
      "jalankan supabase/migrations/0010_alergi_anak.sql",
    );
  }

  const { data: anakUji } = await admin.from("anak").select("id").limit(1);

  if (!anakUji || anakUji.length === 0) {
    console.log("  CATATAN belum ada anak, pemeriksaan status gizi dilewati.");
  } else {
    const TANGGAL_UJI = "2020-01-01";

    const { error: galatEnum } = await admin.from("pengukuran").insert({
      anak_id: anakUji[0].id,
      tanggal: TANGGAL_UJI,
      berat_kg: 10,
      tinggi_cm: 80,
      usia_bulan: 24,
      status: "lebih",
      dikonfirmasi: false,
      sumber: "manual",
    });

    if (!galatEnum) {
      lolos("status gizi lebih dan obesitas dikenali basis data");
    } else if (galatEnum.code === "22P02") {
      gagal(
        "status gizi lebih belum dikenali",
        "jalankan supabase/migrations/0009_status_gizi_lebih.sql",
      );
    } else {
      gagal(`tidak dapat memeriksa status gizi: ${galatEnum.message}`);
    }

    await admin
      .from("pengukuran")
      .delete()
      .eq("anak_id", anakUji[0].id)
      .eq("tanggal", TANGGAL_UJI);
  }

  // --- Isi data ----------------------------------------------------------
  console.log("\nData:");

  const { count: jumlahAnak } = await admin
    .from("anak")
    .select("*", { head: true, count: "exact" });

  if ((jumlahAnak ?? 0) > 0) {
    lolos(`${jumlahAnak} anak sudah ada di basis data`);
  } else {
    console.log("  CATATAN belum ada data anak.");
    console.log("         -> jalankan: node scripts/seed.mjs");
  }

  const { count: jumlahProfil } = await admin
    .from("profil")
    .select("*", { head: true, count: "exact" });

  if ((jumlahProfil ?? 0) > 0) {
    lolos(`${jumlahProfil} profil pengguna sudah ada`);
  } else {
    console.log("  CATATAN belum ada profil pengguna.");
    console.log("         -> buat akun di Authentication, lalu tambahkan baris di profil");
  }

  // --- Kesimpulan --------------------------------------------------------
  if (masalah === 0) {
    console.log("\nLingkungan siap.\n");
    console.log("Langkah berikutnya:");
    if ((jumlahAnak ?? 0) === 0) console.log("  node scripts/seed.mjs");
    console.log("  node scripts/uji-rls.mjs");
    console.log("  npm run dev\n");
  } else {
    console.log(`\n${masalah} hal masih perlu dibereskan.\n`);
    process.exit(1);
  }
}

main().catch((galat) => {
  console.error(`\nGagal memeriksa: ${galat.message}`);
  console.error("Periksa kembali URL dan kunci Supabase pada .env.local.\n");
  process.exit(1);
});
