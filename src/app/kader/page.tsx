import Link from "next/link";
import { FormAnakBaru } from "@/components/FormAnakBaru";
import { FormPengukuran } from "@/components/FormPengukuran";
import { ImportFoto } from "@/components/ImportFoto";
import { LogoLengkap } from "@/components/Logo";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * Halaman kader: mencatat pengukuran.
 *
 * Daftar anak diambil di server agar RLS berlaku dan kader hanya melihat anak
 * di posyandunya. Bila Supabase belum dikonfigurasi, halaman tetap terbuka
 * dengan pesan yang jelas alih-alih gagal total.
 */
export default async function HalamanKader() {
  if (!supabaseTerkonfigurasi()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <LogoLengkap />
        <div className="mt-8 rounded-xl border-2 border-status-risiko bg-amber-50 p-5">
          <h1 className="text-xl font-bold text-amber-900">
            Basis data belum terhubung
          </h1>
          <p className="mt-2 text-base text-amber-900">
            Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> pada berkas{" "}
            <code>.env.local</code>, lalu muat ulang halaman ini. Contohnya ada di{" "}
            <code>.env.example</code>.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <LogoLengkap />
        <div className="mt-8 kartu p-5">
          <h1 className="text-xl font-bold text-dasar-900">Silakan masuk</h1>
          <p className="mt-2 text-base text-dasar-700">
            Halaman ini hanya dapat dibuka oleh kader yang sudah masuk.
          </p>
          <Link
            href="/masuk"
            className="mt-4 inline-flex min-h-touch items-center rounded-lg bg-brand-500 px-6 font-semibold text-white"
          >
            Masuk
          </Link>
        </div>
      </main>
    );
  }

  const { data: anak } = await supabase
    .from("anak")
    .select("id, nama, tanggal_lahir, jenis_kelamin")
    .order("nama");

  // Jenis kelamin dan tanggal lahir dikirim ke klien agar Z-score dapat
  // dihitung di perangkat saat tanpa sinyal.
  const daftarAnak = (anak ?? []).map((a) => ({
    id: a.id,
    nama: a.nama,
    tanggalLahir: a.tanggal_lahir,
    jenisKelamin: a.jenis_kelamin as "L" | "P",
  }));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-dasar-200/80 bg-dasar-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <LogoLengkap />
          <Link href="/bidan" className="tautan text-sm">
            Dashboard bidan
          </Link>
        </div>
      </header>

      <main id="isi-utama" className="mx-auto max-w-2xl px-4 pb-16">
        <div className="pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Halaman kader
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-dasar-900 sm:text-3xl">
            Catat penimbangan
          </h1>
          <p className="mt-2 text-base text-dasar-700">
            Masukkan berat dan tinggi anak. Status gizi langsung dihitung menurut
            standar WHO.
          </p>
        </div>

        {daftarAnak.length === 0 ? (
          <p className="pesan-netral mt-6">
            Belum ada anak terdaftar di posyandu Anda. Daftarkan anak terlebih dahulu
            melalui tombol di bawah.
          </p>
        ) : (
          <div className="mt-6">
            <FormPengukuran daftarAnak={daftarAnak} />
          </div>
        )}

        {/*
          Pendaftaran anak diletakkan sesudah formulir penimbangan karena
          menimbang adalah kegiatan harian kader, sedangkan anak baru hanya
          muncul sesekali.
        */}
        <div className="mt-5">
          <FormAnakBaru />
        </div>

        <div className="mt-10">
          <ImportFoto daftarAnak={daftarAnak} />
        </div>
      </main>

      <footer className="mt-12 border-t border-dasar-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-dasar-600">
          Ini adalah alat bantu kader posyandu, bukan alat diagnosis. Untuk diagnosis
          resmi, silakan konsultasi ke bidan atau puskesmas terdekat.
        </div>
      </footer>
    </>
  );
}
