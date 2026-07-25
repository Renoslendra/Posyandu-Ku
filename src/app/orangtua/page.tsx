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
        <div className="mt-8 kartu p-5">
          <h1 className="text-xl font-bold text-dasar-900">Silakan masuk</h1>
          <p className="mt-2 text-base text-dasar-700">
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
    <>
      <header className="sticky top-0 z-40 border-b border-dasar-200/80 bg-dasar-50/85 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3.5">
          <LogoLengkap />
        </div>
      </header>

      <main id="isi-utama" className="mx-auto max-w-2xl px-4 pb-16">
        <div className="pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Halaman orang tua
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-dasar-900 sm:text-3xl">
            Perkembangan anak Anda
          </h1>
        </div>

      {daftar.length === 0 ? (
        <p className="pesan-netral mt-6">
          Belum ada anak yang tertaut pada akun Anda. Hubungi kader posyandu untuk
          menautkan data anak Anda.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {daftar.map((a) => {
            const terakhir = terakhirPerAnak.get(a.id);
            const pemantauan = statusPemantauan(
              terakhir ? new Date(`${terakhir.tanggal}T00:00:00Z`) : null,
            );

            return (
              <li
                key={a.id}
                /*
                  Garis di sisi kiri senada status, agar orang tua yang membuka
                  halaman ini tahu keadaan anaknya sebelum membaca satu kata pun.
                */
                className={`kartu-naik border-l-4 p-5 ${
                  terakhir?.status === "berat"
                    ? "border-l-status-berat"
                    : terakhir?.status === "risiko"
                      ? "border-l-status-risiko"
                      : terakhir?.status === "normal"
                        ? "border-l-status-normal"
                        : "border-l-dasar-300"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/anak/${a.id}`}
                    className="text-lg font-bold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-2 hover:text-brand-800"
                  >
                    {a.nama}
                  </Link>
                  <LencanaStatus status={(terakhir?.status as StatusGizi) ?? null} />
                </div>

                <p className="mt-2 text-base text-dasar-700">
                  {terakhir
                    ? `Usia ${terakhir.usia_bulan} bulan. ${pemantauan.pesan}`
                    : "Belum ada catatan penimbangan."}
                </p>

                {terakhir?.status === "normal" && (
                  <p className="mt-3 text-base text-dasar-700">
                    Pertumbuhan anak Anda dalam rentang normal. Tetap timbang setiap
                    bulan di posyandu.
                  </p>
                )}

                {(terakhir?.status === "risiko" || terakhir?.status === "berat") && (
                  <p className="pesan-peringatan mt-3">
                    Mohon bawa anak Anda ke bidan atau puskesmas untuk diperiksa lebih
                    lanjut. Semakin cepat diperiksa, semakin mudah ditangani.
                  </p>
                )}

                {pemantauan.hilang && (
                  <p className="pesan-netral mt-3">
                    Sudah lama tidak menimbang. Mohon datang ke posyandu pada jadwal
                    berikutnya.
                  </p>
                )}

                <Link
                  href={`/anak/${a.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-base font-semibold text-brand-700"
                >
                  Lihat grafik pertumbuhan
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      </main>

      <footer className="mt-12 border-t border-dasar-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-dasar-600">
          Ini adalah alat bantu, bukan alat diagnosis. Untuk pemeriksaan resmi,
          silakan ke bidan atau puskesmas terdekat.
        </div>
      </footer>
    </>
  );
}
