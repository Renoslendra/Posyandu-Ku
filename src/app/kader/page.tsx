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
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold text-slate-900">Silakan masuk</h1>
          <p className="mt-2 text-base text-slate-700">
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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <LogoLengkap />
        <Link href="/bidan" className="text-sm font-medium text-brand-700 underline">
          Lihat dashboard bidan
        </Link>
      </header>

      <h1 className="mt-8 text-2xl font-bold text-slate-900">Catat penimbangan</h1>
      <p className="mt-2 text-base text-slate-700">
        Masukkan berat dan tinggi anak. Status gizi langsung dihitung menurut
        standar WHO.
      </p>

      {daftarAnak.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-base text-slate-700">
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
      <div className="mt-6">
        <FormAnakBaru />
      </div>

      <div className="mt-10">
        <ImportFoto daftarAnak={daftarAnak} />
      </div>

      <footer className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-600">
        Ini adalah alat bantu kader posyandu, bukan alat diagnosis. Untuk diagnosis
        resmi, silakan konsultasi ke bidan atau puskesmas terdekat.
      </footer>
    </main>
  );
}
