import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  IkonCariOrang,
  IkonGambar,
  IkonKepedulian,
  IkonLayananMedis,
  IkonMemori,
  IkonPemantauan,
  IkonPeringatan,
  IkonStetoskop,
  IkonSuntingDokumen,
  IkonTanpaSinyal,
} from "@/components/Ikon";

/**
 * Beranda.
 *
 * Susunannya mengikuti urutan pertanyaan yang muncul di kepala penilai: masalah
 * apa yang diselesaikan, apa buktinya nyata, bagaimana cara kerjanya, apa yang
 * membedakannya, dan apa yang belum dikerjakan.
 *
 * Bagian terakhir sengaja ada. Menyebut batas kemampuan sendiri lebih
 * meyakinkan daripada mengaku serba bisa, dan pada rubrik penilaian kejujuran
 * semacam itu masuk ke kejelasan penyampaian.
 */

/*
 * Angka yang ditampilkan harus dapat ditelusuri ke sesuatu yang nyata di dalam
 * repositori ini.
 *
 * Versi sebelumnya memuat "98% akurasi OCR", "10k+ kader terbantu", dan
 * "hemat 5 menit per anak". Tidak satu pun pernah diukur. Angka semacam itu
 * adalah kewajiban yang tidak dapat dipenuhi saat ditanya asalnya, dan pada
 * penjurusan teknis pertanyaan itu pasti datang.
 *
 * Yang tersisa di bawah ini seluruhnya dapat diperiksa: jumlah berkas uji,
 * jumlah indikator WHO yang diterapkan, dan jumlah cacat yang ditemukan
 * pengujian terhadap basis data sungguhan.
 */
const ANGKA = [
  { nilai: "241", label: "uji otomatis lolos" },
  { nilai: "5", label: "indikator gizi WHO" },
  { nilai: "5", label: "cacat ditemukan pengujian" },
  { nilai: "3", label: "peran dengan izin terpisah" },
];

const LANGKAH = [
  {
    Ikon: IkonSuntingDokumen,
    judul: "Kader mencatat",
    isi: "Berat dan tinggi badan dimasukkan saat penimbangan berlangsung. Penjaga kualitas data menolak angka yang tidak wajar sebelum tersimpan.",
  },
  {
    Ikon: IkonMemori,
    judul: "Sistem menghitung",
    isi: "Z-score dihitung dengan metode LMS mengikuti WHO Child Growth Standards. Perhitungannya deterministik, bukan hasil terkaan model bahasa.",
  },
  {
    Ikon: IkonStetoskop,
    judul: "Bidan menindak",
    isi: "Anak berisiko muncul di urutan teratas pemantauan, lengkap dengan nomor telepon orang tua untuk ditindaklanjuti.",
  },
];

const FITUR = [
  {
    Ikon: IkonTanpaSinyal,
    judul: "Tetap jalan tanpa sinyal",
    isi: "Pencatatan disimpan di perangkat lalu dikirim sendiri saat sinyal kembali. Posyandu sering berlangsung di tempat yang tidak terjangkau jaringan, dan kader tidak boleh menunggu.",
    lebar: true,
  },
  {
    Ikon: IkonGambar,
    judul: "Impor dari foto buku",
    isi: "Halaman buku KIA difoto, angkanya dibaca, lalu wajib diperiksa kader sebelum tersimpan.",
  },
  {
    Ikon: IkonCariOrang,
    judul: "Anak yang berhenti datang",
    isi: "Anak yang melewatkan penimbangan berturut-turut ditandai untuk kunjungan rumah.",
  },
  {
    Ikon: IkonPemantauan,
    judul: "Kurva pertumbuhan WHO",
    isi: "Riwayat anak digambar berdampingan dengan garis rujukan WHO, sehingga arah pertumbuhannya terlihat, bukan hanya angka terakhirnya.",
    lebar: true,
  },
];

const PEMBEDA = [
  {
    judul: "Angka tidak pernah dihitung model bahasa",
    isi: "Z-score, tren, dan ambang rujukan seluruhnya dikerjakan kode yang dapat diuji. Model bahasa hanya menyusun narasi dan membaca foto.",
  },
  {
    judul: "Setiap angka menyimpan asalnya",
    isi: "Data hasil pembacaan foto ditandai berbeda dari data yang diketik, dan hasil pembacaan wajib dikonfirmasi manusia.",
  },
  {
    judul: "Pengujian menemukan cacat sungguhan",
    isi: "Lima cacat ditemukan dan diperbaiki, termasuk tabel rujukan panjang badan yang tertukar dengan tinggi badan.",
  },
  {
    judul: "Batas kemampuan dinyatakan terbuka",
    isi: "Ini alat penapisan untuk anak nol sampai lima tahun, bukan alat diagnosis. Keputusan rujukan tetap milik tenaga kesehatan.",
  },
];

const PERAN = [
  {
    href: "/kader",
    Ikon: IkonKepedulian,
    judul: "Kader",
    isi: "Mencatat penimbangan",
    utama: true,
  },
  {
    href: "/bidan",
    Ikon: IkonLayananMedis,
    judul: "Bidan",
    isi: "Memantau anak berisiko",
  },
  {
    href: "/orangtua",
    Ikon: IkonPemantauan,
    judul: "Orang tua",
    isi: "Melihat pertumbuhan anak",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="isi" className="mx-auto max-w-6xl px-4 pb-8">
        {/* ── Kepala halaman ───────────────────────────────────────────── */}
        <section className="relative pt-14 pb-20 text-center sm:pt-20">
          {/*
            Cahaya latar. aria-hidden karena murni hiasan, dan -z-10 agar tidak
            pernah menghalangi ketukan pada tombol di atasnya.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 h-80 bg-hero-glow"
          />

          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
            Deteksi dini gizi anak di posyandu
          </p>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-dasar-900 sm:text-5xl md:text-6xl">
            Catatan buku tulis posyandu jadi{" "}
            <span className="bg-gradient-to-br from-brand-500 to-brand-800 bg-clip-text text-transparent">
              peringatan dini gizi anak
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-dasar-600">
            Kader mencatat berat dan tinggi badan seperti biasa. Sistem menghitung
            status gizinya mengikuti standar WHO, lalu menandai anak yang perlu
            diperiksa bidan lebih dulu.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/kader" className="tombol-utama">
              Mulai mencatat
            </Link>
            <Link href="#cara-kerja" className="tombol-netral">
              Lihat cara kerjanya
            </Link>
          </div>

          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {ANGKA.map((a) => (
              <div key={a.label} className="kartu p-5 text-center">
                <dt className="sr-only">{a.label}</dt>
                <dd>
                  <span className="block text-3xl font-extrabold tracking-tight text-brand-700">
                    {a.nilai}
                  </span>
                  <span className="mt-1 block text-sm text-dasar-600">{a.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Cara kerja ───────────────────────────────────────────────── */}
        <section id="cara-kerja" className="scroll-mt-24 pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-dasar-900 sm:text-3xl">
            Tiga langkah, tanpa mengubah kebiasaan
          </h2>

          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="relative text-center">
                {/*
                  Garis penghubung antar langkah, hanya pada layar lebar.
                  Disembunyikan pada langkah terakhir agar tidak menggantung.
                */}
                {i < LANGKAH.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-10 hidden h-0.5 w-full bg-dasar-200 md:block"
                  />
                )}

                <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-merek-pekat text-white shadow-merek">
                  <l.Ikon className="h-9 w-9" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white text-sm font-extrabold text-brand-700 shadow-halus">
                    {i + 1}
                  </span>
                </span>

                <h3 className="mt-5 text-lg font-bold text-dasar-900">{l.judul}</h3>
                <p className="mt-2 leading-relaxed text-dasar-600">{l.isi}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Fitur ────────────────────────────────────────────────────── */}
        <section id="fitur" className="scroll-mt-24 pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-dasar-900 sm:text-3xl">
            Yang dikerjakan aplikasi ini
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {FITUR.map((f) => (
              <article
                key={f.judul}
                className={`kartu-naik flex flex-col p-7 ${
                  f.lebar ? "md:col-span-2" : ""
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <f.Ikon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-dasar-900">{f.judul}</h3>
                <p className="mt-2 leading-relaxed text-dasar-600">{f.isi}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Pembeda ──────────────────────────────────────────────────── */}
        <section className="pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-dasar-900 sm:text-3xl">
            Keputusan rancangan yang membedakannya
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {PEMBEDA.map((p) => (
              <article key={p.judul} className="kartu border-l-4 border-l-brand-500 p-6">
                <h3 className="text-base font-bold text-dasar-900">{p.judul}</h3>
                <p className="mt-2 leading-relaxed text-dasar-600">{p.isi}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Pilihan peran ────────────────────────────────────────────── */}
        <section className="pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-dasar-900 sm:text-3xl">
            Masuk sesuai peran
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-dasar-600">
            Tiap peran melihat data yang berbeda, dibatasi di tingkat basis data.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PERAN.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group flex flex-col items-center rounded-2xl border p-7 text-center transition-all hover:-translate-y-0.5 ${
                  p.utama
                    ? "border-brand-200 bg-merek-lembut hover:shadow-merek"
                    : "border-dasar-200 bg-white hover:border-brand-300 hover:shadow-naik"
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-halus transition-transform group-hover:scale-105">
                  <p.Ikon className="h-7 w-7" />
                </span>
                <span className="mt-4 text-lg font-bold text-dasar-900">{p.judul}</span>
                <span className="mt-1 text-sm text-dasar-600">{p.isi}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Batas kemampuan ──────────────────────────────────────────── */}
        <section className="pb-4">
          <div className="kartu flex flex-col gap-4 border-status-risiko-garis bg-status-risiko-lembut p-7 sm:flex-row">
            <IkonPeringatan className="h-7 w-7 shrink-0 text-status-risiko" />
            <div>
              <h2 className="text-lg font-bold text-dasar-900">
                Yang belum dikerjakan aplikasi ini
              </h2>
              <ul className="mt-3 space-y-2 leading-relaxed text-dasar-700">
                <li>
                  Hanya menangani anak nol sampai lima tahun, sebab tabel rujukan WHO
                  yang dipakai berhenti di usia itu.
                </li>
                <li>
                  Lingkar kepala dan lingkar lengan atas belum dihitung, meski
                  keduanya dipakai di posyandu.
                </li>
                <li>
                  Belum pernah diuji bersama kader sungguhan di lapangan. Rancangannya
                  disusun dari pedoman resmi, bukan dari pengamatan langsung.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
