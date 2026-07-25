import Link from "next/link";
import { LogoLengkap } from "@/components/Logo";

/**
 * Halaman beranda.
 *
 * Susunannya menjawab pertanyaan penguji dan calon pengguna dalam urutan yang
 * sama: masalah apa, untuk siapa, bagaimana cara kerjanya, dan apa buktinya.
 *
 * Angka pada bagian bukti sengaja ditempatkan lebih awal daripada penjelasan
 * fitur. Klaim tanpa angka mudah diabaikan; angka yang dapat diperiksa memaksa
 * pembaca menganggap serius sisanya.
 */

const PERAN = [
  {
    href: "/kader",
    judul: "Kader posyandu",
    isi: "Catat penimbangan, foto buku tulis lama",
    utama: true,
  },
  {
    href: "/bidan",
    judul: "Bidan desa",
    isi: "Lihat siapa yang perlu ditindaklanjuti",
    utama: false,
  },
  {
    href: "/orangtua",
    judul: "Orang tua",
    isi: "Pantau pertumbuhan anak Anda",
    utama: false,
  },
];

const LANGKAH = [
  {
    nomor: "1",
    judul: "Kader mencatat",
    isi: "Ketik berat dan tinggi, atau foto halaman buku tulis. Catatan bertahun-tahun bisa ikut masuk.",
  },
  {
    nomor: "2",
    judul: "Sistem menghitung",
    isi: "Z-score menurut standar WHO, dihitung kode yang teruji. Nilai mustahil ditolak sebelum tersimpan.",
  },
  {
    nomor: "3",
    judul: "Bidan menindaklanjuti",
    isi: "Daftar prioritas, anak yang berhenti datang, dan nomor yang bisa langsung dihubungi.",
  },
];

const PEMBEDA = [
  {
    judul: "Anak yang berhenti datang ikut terdeteksi",
    isi: "Buku tulis hanya mencatat yang hadir. Anak yang tidak datang tidak tertulis, dan justru mereka yang paling berisiko. Sinyal ini baru muncul setelah datanya digital.",
  },
  {
    judul: "AI tidak pernah menghitung",
    isi: "Z-score, klasifikasi status, dan deteksi tren dikerjakan kode deterministik yang punya pengujian. AI hanya membaca tulisan tangan dan menyusun kalimat.",
  },
  {
    judul: "Hasil pembacaan wajib dikonfirmasi",
    isi: "Angka dari foto ditampilkan untuk diperiksa kader lebih dahulu. Setiap nilai menyimpan asalnya, sehingga selalu bisa dibedakan dari yang diketik langsung.",
  },
  {
    judul: "Tetap bekerja tanpa sinyal",
    isi: "Posyandu di desa sering tanpa koneksi. Status gizi tetap muncul karena dihitung di perangkat, lalu data terkirim sendiri saat sinyal kembali.",
  },
];

const BUKTI = [
  { angka: "241", label: "pengujian otomatis" },
  { angka: "61", label: "uji terhadap basis data" },
  { angka: "0-5", label: "tahun rentang standar WHO" },
  { angka: "5", label: "indikator gizi" },
];

export default function HomePage() {
  return (
    <>
      {/* Bilah atas. Tetap terlihat saat menggulir agar jalan masuk selalu dekat. */}
      <header className="sticky top-0 z-40 border-b border-dasar-200/80 bg-dasar-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <LogoLengkap />
          <Link href="/masuk" className="tombol-kedua !min-h-[2.75rem] !px-5">
            Masuk
          </Link>
        </div>
      </header>

      <main id="isi-utama" className="mx-auto max-w-5xl px-4 pb-20">
        {/* Bagian pembuka */}
        <section className="pt-14 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-500" />
            Untuk kader posyandu di desa
          </p>

          <h1 className="mt-6 max-w-3xl text-3xl font-extrabold leading-[1.1] text-dasar-900 sm:text-4xl lg:text-5xl">
            Catatan buku tulis posyandu,{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              jadi peringatan dini gizi anak
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-dasar-700">
            Data berat dan tinggi anak sudah dicatat kader bertahun-tahun, tetapi tidak
            pernah diolah. PosyanduKu mengubahnya menjadi daftar anak yang perlu
            ditolong, sebelum kondisinya memburuk.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/kader" className="tombol-utama">
              Mulai sebagai kader
            </Link>
            <Link href="/bidan" className="tombol-kedua">
              Lihat dashboard bidan
            </Link>
          </div>

          <p className="mt-5 text-sm text-dasar-600">
            Lingkungan demo. Seluruh data anak bersifat sintetis, bukan data sungguhan.
          </p>
        </section>

        {/* Angka yang dapat diperiksa, ditempatkan sebelum penjelasan fitur. */}
        <section className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BUKTI.map((b) => (
            <div key={b.label} className="kartu p-5">
              <p className="text-3xl font-extrabold text-brand-600">{b.angka}</p>
              <p className="mt-1 text-sm font-medium text-dasar-600">{b.label}</p>
            </div>
          ))}
        </section>

        {/* Tiga langkah alur kerja */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-dasar-900">Bagaimana cara kerjanya</h2>
          <p className="mt-2 max-w-2xl text-base text-dasar-700">
            Tiga langkah. Kader tidak perlu belajar hal baru selain menekan tombol.
          </p>

          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {LANGKAH.map((l) => (
              <li key={l.nomor} className="kartu relative p-6">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-merek-pekat text-lg font-bold text-white shadow-merek"
                >
                  {l.nomor}
                </span>
                <h3 className="mt-4 text-lg font-bold text-dasar-900">{l.judul}</h3>
                <p className="mt-2 text-base text-dasar-700">{l.isi}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pembeda utama */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-dasar-900">
            Yang membedakannya dari sekadar digitalisasi
          </h2>
          <p className="mt-2 max-w-2xl text-base text-dasar-700">
            Memindahkan buku tulis ke layar tidak menyelesaikan masalahnya. Empat hal
            berikut yang menyelesaikannya.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PEMBEDA.map((p) => (
              <article key={p.judul} className="kartu-naik p-6">
                <h3 className="text-lg font-bold text-dasar-900">{p.judul}</h3>
                <p className="mt-2 text-base text-dasar-700">{p.isi}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pemilihan peran */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-dasar-900">Masuk sesuai peran Anda</h2>
          <p className="mt-2 text-base text-dasar-700">
            Setiap peran melihat data yang berbeda, dan hanya yang menjadi
            wewenangnya.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PERAN.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group flex flex-col rounded-2xl border-2 p-6 transition-all duration-200 ${
                  p.utama
                    ? "border-brand-500 bg-merek-lembut shadow-naik hover:shadow-tinggi"
                    : "border-dasar-200 bg-white shadow-kartu hover:border-brand-300 hover:shadow-naik"
                }`}
              >
                <span className="text-lg font-bold text-dasar-900">{p.judul}</span>
                <span className="mt-1.5 text-base text-dasar-700">{p.isi}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-base font-semibold text-brand-700">
                  Buka
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Batasan yang diakui. Ditempatkan di halaman utama, bukan disembunyikan. */}
        <section className="mt-20">
          <div className="rounded-2xl border-2 border-dasar-300 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-dasar-900">
              Yang perlu Anda ketahui sebelum memakainya
            </h2>
            <ul className="mt-4 space-y-3 text-base text-dasar-700">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dasar-400" />
                <span>
                  <strong className="font-semibold text-dasar-900">
                    Ini bukan alat diagnosis.
                  </strong>{" "}
                  Hasilnya adalah penapisan awal untuk membantu kader. Diagnosis dan
                  keputusan rujukan tetap berada pada bidan atau puskesmas.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dasar-400" />
                <span>
                  <strong className="font-semibold text-dasar-900">
                    Indikator terbatas pada berat dan tinggi.
                  </strong>{" "}
                  Penapisan gizi di lapangan juga memakai lingkar lengan dan
                  pemeriksaan edema. Keduanya belum ada di sini.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dasar-400" />
                <span>
                  <strong className="font-semibold text-dasar-900">
                    Rentang usia 0 sampai 5 tahun.
                  </strong>{" "}
                  Mengikuti WHO Child Growth Standards. Anak di luar rentang itu tidak
                  dinilai, alih-alih dinilai dengan tabel yang salah.
                </span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-dasar-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-10 text-sm text-dasar-600">
          <LogoLengkap />
          <p className="max-w-2xl">
            Alat bantu kader posyandu, bukan alat diagnosis. Perhitungan mengikuti WHO
            Child Growth Standards untuk anak 0 sampai 5 tahun.
          </p>
          <p className="text-dasar-500">
            Seluruh data pada lingkungan demo ini bersifat sintetis, bukan data anak
            sungguhan.
          </p>
        </div>
      </footer>
    </>
  );
}
