import Link from "next/link";
import { Logo, LogoLengkap } from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <LogoLengkap />

      <h1 className="mt-10 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
        Catatan buku tulis posyandu,
        <br />
        jadi peringatan dini gizi anak.
      </h1>

      <p className="mt-5 max-w-2xl text-lg text-slate-700">
        Kader mencatat berat dan tinggi anak seperti biasa. Sistem menghitung
        status gizi menurut standar WHO secara otomatis, lalu menyusun daftar
        anak yang perlu ditindaklanjuti bidan.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/kader"
          className="inline-flex min-h-touch items-center rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600"
        >
          Masuk sebagai kader
        </Link>
        <Link
          href="/bidan"
          className="inline-flex min-h-touch items-center rounded-lg border-2 border-brand-500 px-6 text-base font-semibold text-brand-700 hover:bg-brand-50"
        >
          Masuk sebagai bidan
        </Link>
      </div>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          {
            judul: "Hitung otomatis",
            isi: "Z-score menurut standar WHO dihitung tanpa perlu tabel manual.",
          },
          {
            judul: "Foto buku tulis",
            isi: "Catatan lama difoto, dibaca sistem, lalu dikonfirmasi kader.",
          },
          {
            judul: "Yang berhenti datang",
            isi: "Anak yang lama tidak menimbang ikut terdeteksi, bukan terlewat.",
          },
        ].map((k) => (
          <div
            key={k.judul}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <Logo ukuran={24} className="text-brand-500" />
            <h2 className="mt-3 font-semibold text-slate-900">{k.judul}</h2>
            <p className="mt-1 text-sm text-slate-600">{k.isi}</p>
          </div>
        ))}
      </section>

      <footer className="mt-14 space-y-2 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <p>
          Ini adalah alat bantu kader posyandu, bukan alat diagnosis. Untuk
          diagnosis resmi, silakan konsultasi ke bidan atau puskesmas terdekat.
        </p>
        <p className="text-slate-500">
          Seluruh data pada lingkungan demo ini bersifat sintetis, bukan data
          anak sungguhan.
        </p>
      </footer>
    </main>
  );
}
