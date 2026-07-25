"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, LogoLengkap } from "@/components/Logo";
import { IkonCentang, IkonPanahKanan } from "@/components/Ikon";
import { klienBrowser } from "@/lib/supabase-browser";

/**
 * Halaman masuk.
 *
 * Memakai surel dan kata sandi karena itu yang paling mudah dijelaskan kepada
 * kader dan tidak menuntut pengiriman SMS. Kata sandi ditangani sepenuhnya oleh
 * Supabase Auth; aplikasi tidak pernah menyimpannya.
 *
 * Setelah masuk, pengguna diarahkan sesuai perannya, agar kader tidak perlu
 * memilih menu yang bukan wewenangnya.
 *
 * Tata letaknya dua kolom pada desktop dan satu kolom pada ponsel. Kolom kiri
 * berisi keterangan produk, yang pada ponsel disembunyikan: kader yang membuka
 * halaman ini di ponsel sedang hendak masuk, bukan sedang membaca penjelasan.
 */

/*
 * Akun demo.
 *
 * Kredensial ini memang terbuka: seluruh data pada lingkungan demo bersifat
 * sintetis, dan penguji perlu dapat masuk tanpa dibuatkan akun lebih dahulu.
 *
 * Pada penerapan sungguhan, bagian ini beserta akun-akunnya wajib dihapus.
 * Peringatan itu ditulis langsung di antarmuka, bukan hanya di dokumen, supaya
 * tidak ikut terbawa tanpa disadari.
 *
 * Tiap akun ditampilkan dengan nama dan inisial, bukan foto orang.
 * Alasannya dua. Foto wajah pada lingkungan demo selalu bermasalah: entah foto
 * itu milik orang sungguhan yang tidak pernah memberi izin, atau foto hasil
 * bangkitan yang menyiratkan pengguna nyata padahal tidak ada. Inisial tidak
 * membawa masalah itu, dan tidak dapat gagal dimuat.
 */
const AKUN_DEMO = [
  {
    nama: "Bu Sari",
    peran: "Kader",
    tugas: "Mencatat penimbangan",
    surel: "kader@posyanduku.demo",
    inisial: "SR",
    gaya: "bg-brand-500",
  },
  {
    nama: "Bidan Rina",
    peran: "Bidan",
    tugas: "Memantau anak berisiko",
    surel: "bidan@posyanduku.demo",
    inisial: "RN",
    gaya: "bg-brand-700",
  },
  {
    nama: "Pak Andi",
    peran: "Orang tua",
    tugas: "Melihat pertumbuhan anak",
    surel: "ortu@posyanduku.demo",
    inisial: "AN",
    gaya: "bg-dasar-600",
  },
];

const SANDI_DEMO = "Posyandu2026!";

const NILAI_JUAL = [
  "Perhitungan Z-score mengikuti WHO, dikerjakan kode yang teruji",
  "Tetap dapat mencatat saat sinyal hilang",
  "Tiap peran hanya melihat data yang menjadi wewenangnya",
];

export default function HalamanMasuk() {
  const router = useRouter();
  const [surel, setSurel] = useState("");
  const [sandi, setSandi] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [terpilih, setTerpilih] = useState<string | null>(null);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setGalat(null);

    try {
      const supabase = klienBrowser();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: surel.trim(),
        password: sandi,
      });

      if (error) {
        // Pesan dari Supabase berbahasa Inggris dan bernuansa teknis, sehingga
        // digantikan pesan yang dapat dipahami kader.
        setGalat("Surel atau kata sandi tidak cocok. Mohon periksa kembali.");
        return;
      }

      const { data: profil } = await supabase
        .from("profil")
        .select("peran")
        .eq("id", data.user.id)
        .maybeSingle();

      // Tiap peran diarahkan ke halamannya sendiri agar pengguna tidak perlu
      // memilih menu yang bukan wewenangnya.
      const tujuan =
        profil?.peran === "bidan"
          ? "/bidan"
          : profil?.peran === "orang_tua"
            ? "/orangtua"
            : "/kader";

      router.push(tujuan);
      router.refresh();
    } catch {
      setGalat("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setMemuat(false);
    }
  }

  function pilihAkun(akun: (typeof AKUN_DEMO)[number]) {
    setSurel(akun.surel);
    setSandi(SANDI_DEMO);
    setTerpilih(akun.surel);
    setGalat(null);
  }

  return (
    <main id="isi" className="min-h-screen bg-merek-lembut">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-2 lg:gap-16">
        {/*
          Kolom keterangan. Disembunyikan pada layar sempit karena pengguna
          ponsel yang membuka halaman ini sedang hendak masuk, bukan membaca.
        */}
        <section className="hidden lg:block">
          <Link href="/" className="inline-block">
            <LogoLengkap ukuran="besar" />
          </Link>

          <h1 className="mt-10 text-4xl font-extrabold leading-tight tracking-tight text-dasar-900">
            Catatan penimbangan hari ini,{" "}
            <span className="bg-gradient-to-br from-brand-500 to-brand-800 bg-clip-text text-transparent">
              peringatan dini besok
            </span>
          </h1>

          <ul className="mt-8 space-y-4">
            {NILAI_JUAL.map((n) => (
              <li key={n} className="flex items-start gap-3">
                <IkonCentang className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span className="leading-relaxed text-dasar-700">{n}</span>
              </li>
            ))}
          </ul>

          <p className="mt-10 flex items-center gap-2.5 text-sm text-dasar-600">
            <Logo ukuran={18} className="text-dasar-400" />
            Alat bantu penapisan, bukan alat diagnosis.
          </p>
        </section>

        {/* Kolom formulir */}
        <section className="animate-munculNaik">
          {/* Identitas ringkas, hanya pada ponsel karena kolom kiri tersembunyi. */}
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <LogoLengkap ukuran="normal" />
          </Link>

          <div className="rounded-3xl border border-dasar-200 bg-white p-6 shadow-naik sm:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-dasar-900">
              Masuk
            </h2>
            <p className="mt-1.5 text-dasar-600">
              Anda langsung diarahkan ke halaman sesuai peran.
            </p>

            <form onSubmit={masuk} className="mt-7 space-y-5">
              <div>
                <label htmlFor="surel" className="label">
                  Surel
                </label>
                <input
                  id="surel"
                  type="email"
                  autoComplete="email"
                  value={surel}
                  onChange={(e) => setSurel(e.target.value)}
                  required
                  className="kolom mt-2"
                />
              </div>

              <div>
                <label htmlFor="sandi" className="label">
                  Kata sandi
                </label>
                <input
                  id="sandi"
                  type="password"
                  autoComplete="current-password"
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                  required
                  className="kolom mt-2"
                />
              </div>

              {galat && (
                <p role="alert" className="pesan-galat">
                  {galat}
                </p>
              )}

              <button
                type="submit"
                disabled={memuat}
                className="tombol-utama !min-h-touch-lg w-full text-lg"
              >
                {memuat ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
          </div>

          {/* Pengisi cepat akun demo */}
          <div className="mt-5 rounded-3xl border-2 border-dashed border-dasar-300 bg-white/70 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-dasar-600">
              Akun demo
            </p>
            <p className="mt-1.5 text-sm text-dasar-700">
              Tekan salah satu untuk mengisi otomatis. Kata sandi ketiganya sama.
            </p>

            <ul className="mt-4 space-y-2.5">
              {AKUN_DEMO.map((a) => {
                const aktif = terpilih === a.surel;
                return (
                  <li key={a.surel}>
                    <button
                      type="button"
                      onClick={() => pilihAkun(a)}
                      aria-pressed={aktif}
                      className={`flex w-full items-center gap-3.5 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.99] ${
                        aktif
                          ? "border-brand-500 bg-brand-50"
                          : "border-dasar-200 bg-white hover:border-brand-300 hover:bg-brand-50/50"
                      }`}
                    >
                      {/*
                        Inisial, bukan foto. Latar berwarna pekat dengan huruf
                        putih agar rasio kontrasnya tetap aman.
                      */}
                      <span
                        aria-hidden="true"
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tracking-wide text-white ${a.gaya}`}
                      >
                        {a.inisial}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span className="font-bold text-dasar-900">{a.nama}</span>
                          <span className="rounded-full bg-dasar-100 px-2 py-0.5 text-xs font-semibold text-dasar-700">
                            {a.peran}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-dasar-600">
                          {a.tugas}
                        </span>
                      </span>

                      {aktif ? (
                        <IkonCentang className="h-5 w-5 shrink-0 text-brand-600" />
                      ) : (
                        <IkonPanahKanan className="h-5 w-5 shrink-0 text-dasar-400" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 text-sm text-dasar-600">
              Nama di atas bukan orang sungguhan. Seluruh data pada lingkungan demo
              ini sintetis, dan bagian ini wajib dihapus pada penerapan nyata.
            </p>
          </div>

          <p className="mt-6 text-sm text-dasar-600">
            Pada penerapan sungguhan, akun dibuatkan pengelola posyandu. Bila belum
            memiliki akun, hubungi bidan desa atau pengelola posyandu Anda.
          </p>
        </section>
      </div>
    </main>
  );
}
