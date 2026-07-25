import Link from "next/link";
import { DaftarAnak } from "@/components/DaftarAnak";
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
        <div className="mt-8 kartu p-5">
          <h1 className="text-xl font-bold text-dasar-900">Silakan masuk</h1>
          <p className="mt-2 text-base text-dasar-700">
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
    supabase
      .from("anak")
      .select("id, nama, tanggal_lahir, jenis_kelamin, telepon")
      .order("nama"),
    supabase
      .from("pengukuran")
      .select("anak_id, tanggal, berat_kg, status, dikonfirmasi")
      .order("tanggal"),
  ]);

  const ringkasan = susunRingkasan(
    (anak ?? []) as BarisAnak[],
    (pengukuran ?? []) as BarisPengukuran[],
  );

  /*
   * Kartu ringkasan.
   *
   * Latar diberi warna lembut senada statusnya, bukan putih seragam, agar
   * bidan dapat menemukan angka yang dicarinya tanpa membaca labelnya lebih
   * dahulu. Garis tepi tetap pekat supaya kartunya tidak hilang di bawah
   * sinar matahari.
   */
  const kartu = [
    {
      label: "Total anak",
      nilai: ringkasan.totalAnak,
      warna: "text-dasar-900",
      gaya: "border-dasar-200 bg-white",
    },
    {
      label: "Normal",
      nilai: ringkasan.distribusi.normal,
      warna: "text-status-normal",
      gaya: "border-status-normal-garis bg-status-normal-lembut",
    },
    {
      label: "Perlu perhatian",
      nilai: ringkasan.distribusi.risiko,
      warna: "text-status-risiko",
      gaya: "border-status-risiko-garis bg-status-risiko-lembut",
    },
    {
      label: "Perlu segera diperiksa",
      nilai: ringkasan.distribusi.berat,
      warna: "text-status-berat",
      gaya: "border-status-berat-garis bg-status-berat-lembut",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-dasar-200/80 bg-dasar-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <LogoLengkap />
          <Link href="/kader" className="tautan text-sm">
            Catat penimbangan
          </Link>
        </div>
      </header>

      <main id="isi-utama" className="mx-auto max-w-5xl px-4 pb-16">
        <div className="pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Dashboard bidan
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-dasar-900 sm:text-3xl">
            Pemantauan gizi anak
          </h1>
        </div>

        {/*
          Kartu ringkasan. Angka dibuat besar karena inilah yang dibaca bidan
          lebih dulu, sebelum menggulir ke daftar.
        */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kartu.map((k) => (
            <div key={k.label} className={`rounded-2xl border-2 p-4 ${k.gaya}`}>
              <p className={`text-3xl font-extrabold sm:text-4xl ${k.warna}`}>
                {k.nilai}
              </p>
              <p className="mt-1 text-sm font-medium text-dasar-700">{k.label}</p>
            </div>
          ))}
        </section>

        {ringkasan.belumDinilai > 0 && (
          <p className="pesan-netral mt-4 text-sm">
            {ringkasan.belumDinilai} anak belum memiliki hasil penimbangan yang
            terkonfirmasi.
          </p>
        )}

        <section className="mt-12">
          <h2 className="text-xl font-bold text-dasar-900">Perlu ditindaklanjuti</h2>
          <p className="mt-1 text-base text-dasar-700">
            Diurutkan dari yang paling mendesak. Bidan membaca dari atas dan berhenti
            kapan pun.
          </p>

          {ringkasan.prioritas.length === 0 ? (
            <p className="pesan-berhasil mt-4">
              Tidak ada anak yang perlu ditindaklanjuti saat ini.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {ringkasan.prioritas.map((a) => (
                <li
                  key={a.id}
                  /*
                    Garis tebal di sisi kiri menandai tingkat kegentingan.
                    Penanda di tepi lebih cepat ditangkap saat menggulir
                    daripada lencana yang berada di tengah baris.
                  */
                  className={`kartu-naik border-l-4 p-5 ${
                    a.status === "berat"
                      ? "border-l-status-berat"
                      : a.status === "risiko"
                        ? "border-l-status-risiko"
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
                    <LencanaStatus status={a.status} />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {a.alasan.map((alasan) => (
                      <li key={alasan} className="flex gap-2.5 text-base text-dasar-700">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dasar-400"
                        />
                        {alasan}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-dasar-900">Berhenti datang menimbang</h2>
          <p className="mt-1 max-w-2xl text-base text-dasar-700">
            Anak yang tidak menimbang lebih dari {AMBANG_HILANG_HARI} hari. Kondisi ini
            tidak terlihat pada pencatatan buku tulis, karena yang tidak datang tidak
            tercatat.
          </p>

          {ringkasan.hilangDariPemantauan.length === 0 ? (
            <p className="pesan-berhasil mt-4">Semua anak menimbang secara rutin.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {ringkasan.hilangDariPemantauan.map((a) => (
                <li
                  key={a.id}
                  className="kartu flex flex-wrap items-center justify-between gap-3 p-5"
                >
                  <div>
                    <Link
                      href={`/anak/${a.id}`}
                      className="text-lg font-bold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-2 hover:text-brand-800"
                    >
                      {a.nama}
                    </Link>
                    <span className="mt-0.5 block text-base text-dasar-700">
                      {a.tanggalTerakhir
                        ? `Terakhir menimbang ${a.jedaHari} hari lalu`
                        : "Belum pernah tercatat menimbang"}
                    </span>
                  </div>

                {/*
                  Daftar ini hanya berguna bila dapat ditindaklanjuti. Tanpa
                  nomor telepon, bidan hanya dapat melihat siapa yang hilang
                  tanpa cara menjangkaunya.

                  Memakai tautan tel: alih-alih menyalin nomor, karena bidan
                  membuka dashboard ini dari ponsel.
                */}
                  {a.telepon ? (
                    <a href={`tel:${a.telepon}`} className="tombol-kedua !px-5">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5z" />
                      </svg>
                      Hubungi {a.telepon}
                    </a>
                  ) : (
                    <span className="text-sm text-dasar-600">
                      Nomor telepon belum dicatat
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <DaftarAnak daftar={ringkasan.semuaAnak} />

        {/*
          Tautan biasa, bukan tombol dengan pemanggilan fetch, agar peramban
          menangani unduhannya sendiri. Ini juga berarti unduhan tetap bekerja
          tanpa JavaScript.
        */}
        <section className="kartu mt-12 p-6">
          <h2 className="text-xl font-bold text-dasar-900">Laporan bulanan</h2>
          <p className="mt-1.5 max-w-2xl text-base text-dasar-700">
            Unduh rekapitulasi dan rincian per anak dalam format CSV, siap dibuka di
            Excel untuk pelaporan ke dinas kesehatan.
          </p>
          <a href="/api/laporan" className="tombol-kedua mt-5">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M10 2a1 1 0 011 1v7.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 10.586V3a1 1 0 011-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
            Unduh laporan CSV
          </a>
          <p className="mt-3 text-sm text-dasar-600">
            Seluruh angka pada laporan dihitung sistem, bukan disusun AI.
          </p>
        </section>

        <div className="mt-6">
          <TombolRingkasan />
        </div>
      </main>

      <footer className="mt-12 border-t border-dasar-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-8 text-sm text-dasar-600">
          <p>
            Ini adalah alat bantu, bukan alat diagnosis. Keputusan rujukan tetap berada
            pada tenaga kesehatan.
          </p>
          <p className="text-dasar-500">
            Data pada lingkungan demo ini bersifat sintetis, bukan data anak sungguhan.
          </p>
        </div>
      </footer>
    </>
  );
}
