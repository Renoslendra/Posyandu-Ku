"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoLengkap } from "@/components/Logo";
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
 */
export default function HalamanMasuk() {
  const router = useRouter();
  const [surel, setSurel] = useState("");
  const [sandi, setSandi] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

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

  /*
   * Pengisi cepat akun demo.
   *
   * Kredensial ini memang terbuka: seluruh data pada lingkungan demo bersifat
   * sintetis, dan penguji perlu dapat masuk tanpa dibuatkan akun lebih dahulu.
   *
   * Pada penerapan sungguhan, bagian ini beserta akun-akunnya wajib dihapus.
   * Peringatan itu ditulis langsung di antarmuka, bukan hanya di dokumen,
   * supaya tidak ikut terbawa tanpa disadari.
   */
  const AKUN_DEMO = [
    { peran: "Kader", surel: "kader@posyanduku.demo" },
    { peran: "Bidan", surel: "bidan@posyanduku.demo" },
    { peran: "Orang tua", surel: "ortu@posyanduku.demo" },
  ];

  return (
    <main
      id="isi-utama"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12"
    >
      <div className="animate-munculNaik">
        <LogoLengkap />

        <h1 className="mt-8 text-2xl font-extrabold text-dasar-900 sm:text-3xl">
          Masuk
        </h1>
        <p className="mt-2 text-base text-dasar-700">
          Setelah masuk, Anda langsung diarahkan ke halaman sesuai peran Anda.
        </p>

        <form onSubmit={masuk} className="kartu mt-6 space-y-5 p-6">
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

        <div className="mt-5 rounded-2xl border-2 border-dashed border-dasar-300 bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-dasar-600">
            Akun demo
          </p>
          <p className="mt-1.5 text-sm text-dasar-700">
            Tekan salah satu untuk mengisi otomatis. Kata sandi ketiganya sama.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AKUN_DEMO.map((a) => (
              <button
                key={a.surel}
                type="button"
                onClick={() => {
                  setSurel(a.surel);
                  setSandi("Posyandu2026!");
                  setGalat(null);
                }}
                className="min-h-touch rounded-xl border-2 border-brand-200 bg-brand-50 px-4 text-base font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-100"
              >
                {a.peran}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-dasar-600">
            Seluruh data pada akun ini sintetis, bukan data anak sungguhan.
          </p>
        </div>

        <p className="mt-6 text-sm text-dasar-600">
          Pada penerapan sungguhan, akun dibuatkan pengelola posyandu. Bila belum
          memiliki akun, hubungi bidan desa atau pengelola posyandu Anda.
        </p>
      </div>
    </main>
  );
}
