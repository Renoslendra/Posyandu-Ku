import Link from "next/link";
import { FormAnakBaru } from "@/components/FormAnakBaru";
import { FormPengukuran } from "@/components/FormPengukuran";
import { ImportFoto } from "@/components/ImportFoto";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PagarBelumMasuk, PagarBelumTerhubung } from "@/components/Pagar";
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
      <PagarBelumTerhubung
        pesan={
          <>
            Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> pada berkas{" "}
            <code>.env.local</code>, lalu muat ulang halaman ini. Contohnya ada di{" "}
            <code>.env.example</code>.
          </>
        }
      />
    );
  }

  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return (
      <PagarBelumMasuk
        peran="Kader"
        pesan="Halaman pencatatan hanya dapat dibuka oleh kader yang sudah masuk."
      />
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
      <Navbar />

      {/*
        Tanpa pt besar: bilah navigasi memakai sticky, bukan fixed, sehingga
        sudah menempati ruangnya sendiri dalam aliran tata letak. Memberi
        padding atas di sini akan menyisakan celah kosong di bawah bilah.
      */}
      <main
        id="isi"
        className="mx-auto flex w-full max-w-2xl animate-muncul flex-col gap-8 px-4 py-8"
      >
        {/* Header & Context */}
        <div>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-dasar-900 sm:text-3xl">Input Pengukuran</h1>
          <p className="text-dasar-600">Catat data pertumbuhan balita. Pastikan koneksi internet stabil atau data akan disimpan luring.</p>
        </div>

        {/* Import Foto (Smart Import Banner) */}
        <div className="animate-munculNaik" style={{ animationDelay: '0.1s' }}>
          <ImportFoto daftarAnak={daftarAnak} />
        </div>

        {daftarAnak.length === 0 ? (
          <p className="pesan-netral">
            Belum ada anak terdaftar di posyandu Anda. Daftarkan anak terlebih dahulu.
          </p>
        ) : (
          <div className="animate-munculNaik" style={{ animationDelay: '0.2s' }}>
            <FormPengukuran daftarAnak={daftarAnak} />
          </div>
        )}

        {/* 
          Pendaftaran anak baru disederhanakan sebagai form dropdown atau tombol, 
          disini kita biarkan terbuka di bawah.
        */}
        <div className="animate-munculNaik" style={{ animationDelay: '0.3s' }}>
          <FormAnakBaru />
        </div>
      </main>

      <Footer />
    </>
  );
}
