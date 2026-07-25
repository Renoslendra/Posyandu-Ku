import Link from "next/link";
import { notFound } from "next/navigation";
import { FormEditAnak } from "@/components/FormEditAnak";
import { GrafikPertumbuhan } from "@/components/GrafikPertumbuhan";
import { LencanaStatus } from "@/components/LencanaStatus";
import { LogoLengkap } from "@/components/Logo";
import { SaranMenu } from "@/components/SaranMenu";
import { analisisPola, statusPemantauan } from "@/lib/gizi/pola";
import { pilihIndikatorPanjangUsia, type JenisKelamin } from "@/lib/gizi/zscore";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";
import type { StatusGizi } from "@/lib/gizi/zscore";

/**
 * Profil satu anak: riwayat pengukuran dan grafik pertumbuhan.
 *
 * Halaman ini yang dibuka bidan setelah melihat daftar prioritas, dan yang
 * ditunjukkan kepada orang tua. Karena itu grafiknya diletakkan lebih dahulu
 * daripada tabel angka: garis lebih mudah dipahami daripada deretan Z-score.
 *
 * RLS menentukan siapa yang dapat membukanya. Anak di luar wewenang pengguna
 * tidak akan ditemukan, sehingga menghasilkan halaman tidak ditemukan.
 */
export default async function HalamanAnak({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!supabaseTerkonfigurasi()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <LogoLengkap />
        <div className="mt-8 kartu p-5">
          <h1 className="text-xl font-bold text-dasar-900">Silakan masuk</h1>
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
    .select("id, nama, tanggal_lahir, jenis_kelamin, nama_orang_tua, telepon, alamat")
    .eq("id", id)
    .maybeSingle();

  if (!anak) notFound();

  // Perbaikan data hanya untuk kader. Peran diambil dari basis data, bukan
  // dari sisi klien, agar tombolnya tidak dapat dimunculkan dengan menyunting
  // permintaan. RLS tetap menjadi penjaga terakhirnya.
  const { data: profil } = await supabase
    .from("profil")
    .select("peran")
    .eq("id", pengguna.user.id)
    .maybeSingle();

  const bolehSunting = profil?.peran === "kader";

  const { data: pengukuran } = await supabase
    .from("pengukuran")
    .select("tanggal, berat_kg, tinggi_cm, usia_bulan, status, diukur_telentang, dikonfirmasi")
    .eq("anak_id", id)
    .order("tanggal");

  const riwayat = pengukuran ?? [];
  // Hanya nilai terkonfirmasi yang digambarkan, sejalan dengan statistik.
  const terkonfirmasi = riwayat.filter((p) => p.dikonfirmasi);
  const terakhir = terkonfirmasi.at(-1);

  const jk = anak.jenis_kelamin as JenisKelamin;
  const telentangTerakhir = Boolean(terakhir?.diukur_telentang);
  const usiaTerakhir = terakhir?.usia_bulan ?? 0;
  const indPanjang = pilihIndikatorPanjangUsia(usiaTerakhir, telentangTerakhir);

  const pola = analisisPola(
    terkonfirmasi.map((p) => ({
      tanggal: new Date(`${p.tanggal}T00:00:00Z`),
      beratKg: Number(p.berat_kg),
    })),
  );

  const pemantauan = statusPemantauan(
    terakhir ? new Date(`${terakhir.tanggal}T00:00:00Z`) : null,
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-dasar-200/80 bg-dasar-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <LogoLengkap />
          <Link href="/bidan" className="tautan text-sm">
            Kembali ke dashboard
          </Link>
        </div>
      </header>

      <main id="isi-utama" className="mx-auto max-w-3xl px-4 pb-16">
        {/*
          Kepala halaman memakai latar bergradasi lembut agar identitas anak
          terpisah tegas dari data di bawahnya. Nama dan status adalah dua hal
          pertama yang dicari bidan saat membuka halaman ini.
        */}
        <div className="mt-6 rounded-2xl border border-brand-100 bg-merek-lembut p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-dasar-900 sm:text-3xl">
              {anak.nama}
            </h1>
            <LencanaStatus
              status={(terakhir?.status as StatusGizi) ?? null}
              ukuran="besar"
            />
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Usia", terakhir ? `${terakhir.usia_bulan} bulan` : "belum diukur"],
              ["Jenis kelamin", jk === "L" ? "Laki-laki" : "Perempuan"],
              ["Orang tua", anak.nama_orang_tua],
              ["Pemantauan", pemantauan.pesan],
            ].map(([label, nilai]) => (
              <div key={label}>
                <dt className="text-sm font-medium text-brand-700">{label}</dt>
                <dd className="mt-0.5 text-base font-semibold text-dasar-900">
                  {nilai}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {pola.perluPerhatian && (
          <p className="pesan-peringatan mt-5">{pola.pesan}</p>
        )}

      <section className="mt-8 space-y-5">
        <GrafikPertumbuhan
          indikator="bb_u"
          jenisKelamin={jk}
          judul="Berat badan menurut umur"
          satuan="kg"
          data={terkonfirmasi.map((p) => ({
            usiaBulan: p.usia_bulan,
            nilai: Number(p.berat_kg),
          }))}
        />

        <GrafikPertumbuhan
          indikator={indPanjang}
          jenisKelamin={jk}
          judul={
            indPanjang === "pb_u"
              ? "Panjang badan menurut umur"
              : "Tinggi badan menurut umur"
          }
          satuan="cm"
          data={terkonfirmasi.map((p) => ({
            usiaBulan: p.usia_bulan,
            nilai: Number(p.tinggi_cm),
          }))}
        />
      </section>

      {terakhir && (
        <div className="mt-10">
          <SaranMenu anakId={anak.id} />
        </div>
      )}

      {bolehSunting && (
        <div className="mt-10">
          <FormEditAnak anak={anak} adaRiwayat={terkonfirmasi.length > 0} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold text-dasar-900">Riwayat penimbangan</h2>

        {riwayat.length === 0 ? (
          <p className="mt-3 kartu p-5 text-base text-dasar-700">
            Belum ada catatan penimbangan.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto kartu">
            <table className="w-full text-left text-base">
              <thead className="border-b border-dasar-200 text-sm text-dasar-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Usia</th>
                  <th className="px-4 py-3 font-medium">Berat</th>
                  <th className="px-4 py-3 font-medium">Tinggi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...riwayat].reverse().map((p, i) => (
                  <tr key={i} className="border-b border-dasar-200 last:border-0">
                    <td className="px-4 py-3">{p.tanggal}</td>
                    <td className="px-4 py-3">{p.usia_bulan} bln</td>
                    <td className="px-4 py-3">{Number(p.berat_kg)} kg</td>
                    <td className="px-4 py-3">{Number(p.tinggi_cm)} cm</td>
                    <td className="px-4 py-3">
                      {p.dikonfirmasi ? (
                        <LencanaStatus status={p.status as StatusGizi} />
                      ) : (
                        <span className="text-sm text-amber-800">
                          Belum dikonfirmasi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      </main>

      <footer className="mt-12 border-t border-dasar-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-dasar-600">
          Ini adalah alat bantu, bukan alat diagnosis. Untuk diagnosis resmi, silakan
          konsultasi ke bidan atau puskesmas terdekat.
        </div>
      </footer>
    </>
  );
}
