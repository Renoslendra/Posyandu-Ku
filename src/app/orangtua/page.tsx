import Link from "next/link";
import { LogoLengkap } from "@/components/Logo";
import { LencanaStatus } from "@/components/LencanaStatus";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";
import { statusPemantauan } from "@/lib/gizi/pola";
import type { StatusGizi } from "@/lib/gizi/zscore";

/**
 * Halaman orang tua.
 *
 * Menampilkan anak yang tertaut pada akun ini. RLS sudah membatasi aksesnya,
 * tetapi sebelumnya belum ada jalur masuk bagi orang tua sehingga peran ketiga
 * pada rancangan tidak dapat dipakai.
 *
 * Nadanya berbeda dari dashboard bidan: orang tua tidak membutuhkan daftar
 * prioritas, melainkan kepastian tentang anaknya sendiri dan langkah yang jelas
 * bila ada yang perlu diperhatikan.
 */
export default async function HalamanOrangTua() {
  if (!supabaseTerkonfigurasi()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <LogoLengkap />
        <p className="mt-8 rounded-xl border-2 border-status-risiko bg-amber-50 p-5 text-base text-amber-900">
          Basis data belum terhubung. Isi kredensial Supabase pada{" "}
          <code>.env.local</code>.
        </p>
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
            Masuk untuk melihat perkembangan anak Anda.
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
    .select("id, nama, tanggal_lahir")
    .order("nama");

  const daftar = anak ?? [];

  // Mengambil pengukuran terakhir setiap anak. Dilakukan satu kueri agar
  // halaman tetap ringan pada koneksi lambat.
  const { data: pengukuran } = await supabase
    .from("pengukuran")
    .select("anak_id, tanggal, status, usia_bulan, dikonfirmasi")
    .eq("dikonfirmasi", true)
    .order("tanggal", { ascending: false });

  const terakhirPerAnak = new Map<string, NonNullable<typeof pengukuran>[number]>();
  for (const p of pengukuran ?? []) {
    if (!terakhirPerAnak.has(p.anak_id)) terakhirPerAnak.set(p.anak_id, p);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <LogoLengkap />

      <h1 className="mt-8 text-2xl font-bold text-slate-900">Perkembangan anak Anda</h1>

      {daftar.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-base text-slate-700">
          Belum ada anak yang tertaut pada akun Anda. Hubungi kader posyandu untuk
          menautkan data anak Anda.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {daftar.map((a) => {
            const terakhir = terakhirPerAnak.get(a.id);
            const pemantauan = statusPemantauan(
              terakhir ? new Date(`${terakhir.tanggal}T00:00:00Z`) : null,
            );

            return (
              <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/anak/${a.id}`}
                    className="text-lg font-semibold text-brand-700 underline"
                  >
                    {a.nama}
                  </Link>
                  <LencanaStatus status={(terakhir?.status as StatusGizi) ?? null} />
                </div>

                <p className="mt-2 text-base text-slate-700">
                  {terakhir
                    ? `Usia ${terakhir.usia_bulan} bulan. ${pemantauan.pesan}`
                    : "Belum ada catatan penimbangan."}
                </p>

                {terakhir?.status === "normal" && (
                  <p className="mt-2 text-base text-slate-700">
                    Pertumbuhan anak Anda dalam rentang normal. Tetap timbang setiap
                    bulan di posyandu.
                  </p>
                )}

                {(terakhir?.status === "risiko" || terakhir?.status === "berat") && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-3 text-base text-amber-900">
                    Mohon bawa anak Anda ke bidan atau puskesmas untuk diperiksa lebih
                    lanjut. Semakin cepat diperiksa, semakin mudah ditangani.
                  </p>
                )}

                {pemantauan.hilang && (
                  <p className="mt-2 rounded-lg bg-slate-100 p-3 text-base text-slate-800">
                    Sudah lama tidak menimbang. Mohon datang ke posyandu pada jadwal
                    berikutnya.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-10 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-600">
        <p>
          Ini adalah alat bantu, bukan alat diagnosis. Untuk pemeriksaan resmi,
          silakan ke bidan atau puskesmas terdekat.
        </p>
      </footer>
    </main>
  );
}
