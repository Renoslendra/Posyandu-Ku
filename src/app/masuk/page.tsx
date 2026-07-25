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

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <LogoLengkap />

      <h1 className="mt-10 text-2xl font-bold text-slate-900">Masuk</h1>

      <form onSubmit={masuk} className="mt-6 space-y-5">
        <div>
          <label htmlFor="surel" className="block text-base font-semibold text-slate-900">
            Surel
          </label>
          <input
            id="surel"
            type="email"
            autoComplete="email"
            value={surel}
            onChange={(e) => setSurel(e.target.value)}
            required
            className="mt-2 min-h-touch w-full rounded-lg border-2 border-slate-300 px-3 text-base"
          />
        </div>

        <div>
          <label htmlFor="sandi" className="block text-base font-semibold text-slate-900">
            Kata sandi
          </label>
          <input
            id="sandi"
            type="password"
            autoComplete="current-password"
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            required
            className="mt-2 min-h-touch w-full rounded-lg border-2 border-slate-300 px-3 text-base"
          />
        </div>

        {galat && (
          <p
            role="alert"
            className="rounded-lg border-2 border-status-berat bg-red-50 p-3 text-base text-red-900"
          >
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={memuat}
          className="min-h-touch w-full rounded-lg bg-brand-500 px-6 text-lg font-semibold text-white hover:bg-brand-600 disabled:bg-slate-300"
        >
          {memuat ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p className="mt-8 text-sm text-slate-600">
        Akun dibuatkan oleh pengelola posyandu. Bila belum memiliki akun, hubungi
        bidan desa atau pengelola posyandu Anda.
      </p>
    </main>
  );
}
