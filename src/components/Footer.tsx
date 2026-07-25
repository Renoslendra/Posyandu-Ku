import Link from "next/link";
import { Logo, LogoLengkap } from "./Logo";

/**
 * Footer bersama.
 *
 * Penafian "bukan alat diagnosis" dan pernyataan bahwa data demo bersifat
 * sintetis selalu ada di setiap halaman, bukan hanya di beranda. Keduanya
 * pernyataan yang harus terbaca di mana pun pengguna berada, karena halaman
 * mana pun dapat menjadi halaman pertama yang dibuka lewat tautan langsung.
 *
 * Tiga hal yang diperbaiki dari versi sebelumnya:
 *   1. ikon Material digantikan komponen Logo, sebab fontnya tidak pernah
 *      dimuat sehingga yang tampil adalah kata "clinical_notes"
 *   2. tag `a` digantikan `Link` agar perpindahan halaman tidak memuat ulang
 *      seluruh aplikasi
 *   3. kelas warna yang tidak ada di konfigurasi digantikan palet proyek
 */

const NAVIGASI = [
  { href: "/", label: "Beranda" },
  { href: "/kader", label: "Catat penimbangan" },
  { href: "/bidan", label: "Pemantauan bidan" },
  { href: "/orangtua", label: "Halaman orang tua" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-dasar-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <LogoLengkap ukuran="kecil" />
            <p className="mt-3 max-w-sm text-sm text-dasar-600">
              Mengubah catatan buku tulis posyandu menjadi deteksi dini risiko gizi
              anak. Perhitungan mengikuti WHO Child Growth Standards untuk anak 0
              sampai 5 tahun.
            </p>
          </div>

          <nav aria-label="Navigasi footer">
            <h2 className="text-base font-bold text-dasar-900">Halaman</h2>
            <ul className="mt-3 space-y-2">
              {NAVIGASI.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="text-sm text-dasar-600 transition-colors hover:text-brand-700"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-base font-bold text-dasar-900">Perhatian</h2>
            <p className="mt-3 rounded-xl border border-dasar-200 bg-dasar-50 p-3.5 text-sm text-dasar-700">
              Ini adalah alat bantu penapisan, bukan alat diagnosis. Keputusan rujukan
              tetap berada pada bidan atau puskesmas terdekat.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-dasar-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Logo ukuran={18} className="text-dasar-400" />
            <p className="text-sm text-dasar-500">
              Seluruh data pada lingkungan demo ini bersifat sintetis, bukan data anak
              sungguhan.
            </p>
          </div>
          {/*
            Tahun diambil saat render di server. Aman dari ketidaksesuaian
            hidrasi karena komponen ini bukan komponen klien.
          */}
          <p className="text-sm text-dasar-500">
            &copy; {new Date().getFullYear()} PosyanduKu
          </p>
        </div>
      </div>
    </footer>
  );
}
