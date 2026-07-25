import Link from "next/link";
import { LogoLengkap } from "@/components/Logo";
import { LencanaStatus } from "@/components/LencanaStatus";
import { TombolRingkasan } from "@/components/TombolRingkasan";
import {
  AMBANG_HILANG_HARI,
  susunRingkasan,
  type BarisAnak,
  type BarisPengukuran,
} from "@/lib/dashboard";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * Dashboard bidan.
 *
 * Tersusun menurut urutan keputusan bidan, bukan menurut kelengkapan data:
 * pertama siapa yang perlu ditindaklanjuti, baru gambaran keseluruhan. Bidan
 * membaca dari atas dan boleh berhenti kapan pun.
 */
export default async function HalamanBidan() {
  if (!supabaseTerkonfigurasi()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <LogoLengkap />
        <div className="mt-8 rounded-xl border-2 border-status-risiko bg-amber-50 p-5">
          <h1 className="text-xl font-bold text-amber-900">
            Basis data belum terhubung
          </h1>
          <p className="mt-2 text-base text-amber-900">
            Isi kredensial Supabase pada <code>.env.local</code> sesuai{" "}
            <code>.env.example</code>, lalu muat ulang halaman ini.
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
            Dashboard ini hanya dapat dibuka oleh bidan yang sudah masuk.
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

  // RLS membatasi kedua kueri ini pada wilayah bidan yang sedang masuk.
  const [{ data: anak }, { data: pengukuran }] = await Promise.all([
    supabase.from("anak").select("id, nama, tanggal_lahir, jenis_kelamin").order("nama"),
    supabase
      .from("pengukuran")
      .select("anak_id, tanggal, berat_kg, status, dikonfirmasi")
      .order("tanggal"),
  ]);

  const ringkasan = susunRingkasan(
    (anak ?? []) as BarisAnak[],
    (pengukuran ?? []) as BarisPengukuran[],
  );

  const kartu = [
    { label: "Total anak", nilai: ringkasan.totalAnak, warna: "text-slate-900" },
    { label: "Normal", nilai: ringkasan.distribusi.normal, warna: "text-status-normal" },
    {
      label: "Perlu perhatian",
      nilai: ringkasan.distribusi.risiko,
      warna: "text-status-risiko",
    },
    {
      label: "Perlu segera diperiksa",
      nilai: ringkasan.distribusi.berat,
      warna: "text-status-berat",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <LogoLengkap />
        <Link href="/kader" className="text-sm font-medium text-brand-700 underline">
          Catat penimbangan
        </Link>
      </header>

      <h1 className="mt-8 text-2xl font-bold text-slate-900">Pemantauan gizi anak</h1>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kartu.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className={`text-3xl font-bold ${k.warna}`}>{k.nilai}</p>
            <p className="mt-1 text-sm text-slate-600">{k.label}</p>
          </div>
        ))}
      </section>

      {ringkasan.belumDinilai > 0 && (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {ringkasan.belumDinilai} anak belum memiliki hasil penimbangan yang
          terkonfirmasi.
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">Perlu ditindaklanjuti</h2>
        <p className="mt-1 text-sm text-slate-600">
          Diurutkan dari yang paling mendesak.
        </p>

        {ringkasan.prioritas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-base text-slate-700">
            Tidak ada anak yang perlu ditindaklanjuti saat ini.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ringkasan.prioritas.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-slate-900">{a.nama}</span>
                  <LencanaStatus status={a.status} />
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {a.alasan.map((alasan) => (
                    <li key={alasan}>{alasan}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">Berhenti datang menimbang</h2>
        <p className="mt-1 text-sm text-slate-600">
          Anak yang tidak menimbang lebih dari {AMBANG_HILANG_HARI} hari. Kondisi ini
          tidak terlihat pada pencatatan buku tulis, karena yang tidak datang tidak
          tercatat.
        </p>

        {ringkasan.hilangDariPemantauan.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-base text-slate-700">
            Semua anak menimbang secara rutin.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {ringkasan.hilangDariPemantauan.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span className="font-semibold text-slate-900">{a.nama}</span>
                <span className="text-sm text-slate-700">
                  {a.tanggalTerakhir
                    ? `Terakhir menimbang ${a.jedaHari} hari lalu`
                    : "Belum pernah tercatat menimbang"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <TombolRingkasan />
      </div>

      <footer className="mt-12 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-600">
        <p>
          Ini adalah alat bantu, bukan alat diagnosis. Keputusan rujukan tetap berada
          pada tenaga kesehatan.
        </p>
        <p className="text-slate-500">
          Data pada lingkungan demo ini bersifat sintetis, bukan data anak sungguhan.
        </p>
      </footer>
    </main>
  );
}
