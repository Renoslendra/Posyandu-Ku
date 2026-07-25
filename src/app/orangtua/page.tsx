import Link from "next/link";
import { LencanaStatus } from "@/components/LencanaStatus";
import { BilahNavigasi } from "@/components/BilahNavigasi";
import { Footer } from "@/components/Footer";
import { PagarBelumMasuk, PagarBelumTerhubung } from "@/components/Pagar";
import { wajibPeran } from "@/lib/sesi";
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
      <PagarBelumTerhubung
        pesan={
          <>
            Isi kredensial Supabase pada <code>.env.local</code> sesuai{" "}
            <code>.env.example</code>, lalu muat ulang halaman ini.
          </>
        }
      />
    );
  }

  /*
   * Hanya orang tua. Kader dan bidan dialihkan ke halamannya sendiri.
   *
   * Tanpa pemeriksaan ini, kader yang membuka halaman ini akan melihat seluruh
   * anak di posyandunya disajikan dengan nada bicara untuk orang tua, lengkap
   * dengan anjuran "bawa anak Anda ke bidan". RLS tidak mencegahnya karena
   * kader memang berhak membaca data itu; yang salah adalah halamannya.
   */
  const sesi = await wajibPeran(["orang_tua"]);

  if (!sesi) {
    return (
      <PagarBelumMasuk pesan="Masuk untuk melihat perkembangan anak Anda."
      />
    );
  }

  const supabase = await klienServer();

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
      <BilahNavigasi />

      <main id="isi" className="mx-auto max-w-2xl px-4 pb-16">
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

      <Footer />
    </>
  );
}
