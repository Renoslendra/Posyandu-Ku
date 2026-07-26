import Link from "next/link";
import { FormAnakBaru } from "@/components/FormAnakBaru";
import { FormPengukuran } from "@/components/FormPengukuran";
import { ImportFoto } from "@/components/ImportFoto";
import { BilahNavigasi } from "@/components/BilahNavigasi";
import { Footer } from "@/components/Footer";
import { PagarBelumMasuk, PagarBelumTerhubung } from "@/components/Pagar";
import { RiwayatInput, type BarisRiwayatInput } from "@/components/RiwayatInput";
import { wajibPeran } from "@/lib/sesi";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";
import { tanggalHariIni } from "@/lib/tanggal";
import type { StatusGizi } from "@/lib/gizi/zscore";

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

  /*
   * Hanya kader. Peran lain dialihkan ke halamannya sendiri, bukan ditolak,
   * sebab pengguna yang tersesat lebih tertolong bila diantar ke tempat yang
   * benar. RLS tetap menjadi penjaga sesungguhnya.
   */
  const sesi = await wajibPeran(["kader"]);

  if (!sesi) {
    return (
      <PagarBelumMasuk pesan="Halaman pencatatan hanya dapat dibuka oleh kader yang sudah masuk."
      />
    );
  }

  const supabase = await klienServer();

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

  /*
   * Catatan yang dibuat kader ini pada tanggal hari ini.
   *
   * Disaring menurut `dicatat_oleh`, bukan hanya tanggal: pada posyandu dengan
   * lebih dari satu kader, daftar seluruh catatan hari itu tidak menjawab
   * pertanyaan yang sesungguhnya, yaitu apa yang sudah saya masukkan.
   *
   * Tanggalnya dihitung memakai tanggal lokal, sebab hari posyandu adalah hari
   * menurut kader, bukan menurut UTC. Memakai tanggal basis data akan membuat
   * catatan sebelum pukul tujuh pagi tampak sebagai catatan hari sebelumnya.
   */
  const hariIni = tanggalHariIni();

  const { data: catatanHariIni } = await supabase
    .from("pengukuran")
    .select("id, anak_id, tanggal, berat_kg, tinggi_cm, status, sumber, dikonfirmasi")
    .eq("tanggal", hariIni)
    .eq("dicatat_oleh", sesi.id);

  const namaAnak = new Map(daftarAnak.map((a) => [a.id, a.nama]));

  const riwayatInput: BarisRiwayatInput[] = (catatanHariIni ?? []).map((p) => ({
    id: p.id,
    anakId: p.anak_id,
    nama: namaAnak.get(p.anak_id) ?? "Anak tidak dikenali",
    tanggal: p.tanggal,
    beratKg: p.berat_kg,
    tinggiCm: p.tinggi_cm,
    status: p.status as StatusGizi,
    dikonfirmasi: p.dikonfirmasi !== false,
    dariFoto: p.sumber === "ocr_ai",
  }));

  return (
    <>
      <BilahNavigasi />

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

        {/*
          Riwayat diletakkan setelah formulir, bukan sebelumnya. Yang pertama
          dicari kader saat membuka halaman ini adalah tempat mengisi; daftar
          catatan berguna untuk memeriksa, dan pemeriksaan terjadi setelah
          pengisian.
        */}
        <div className="animate-munculNaik" style={{ animationDelay: '0.4s' }}>
          <RiwayatInput baris={riwayatInput} />
        </div>
      </main>

      <Footer />
    </>
  );
}
