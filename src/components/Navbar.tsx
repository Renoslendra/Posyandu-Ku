"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import {
  IkonKelompok,
  IkonPemantauan,
  IkonSuntingDokumen,
} from "./Ikon";

/**
 * Navigasi utama.
 *
 * Dua bentuk untuk dua ukuran layar, karena kebutuhannya memang berbeda:
 *
 * Pada desktop, tautan berjajar di bilah atas. Ruangnya cukup dan penunjuk
 * tetikus membuat sasaran kecil tetap mudah dituju.
 *
 * Pada ponsel, tautan berpindah ke bilah bawah. Alasannya bukan tren: kader
 * memegang perangkat dengan satu tangan sambil tangan lain menimbang anak, dan
 * bagian bawah layar adalah satu-satunya area yang terjangkau jempol tanpa
 * mengubah cara memegang.
 *
 * Tiga hal yang diperbaiki dari versi sebelumnya:
 *   1. foto profil dari domain pihak ketiga dibuang; identitas kini memakai
 *      inisial peran, yang tidak dapat gagal dimuat
 *   2. font ikon Material digantikan SVG inline, sebab fontnya tidak pernah
 *      dimuat sehingga ikon tampil sebagai teks mentah
 *   3. kelas warna yang tidak ada di konfigurasi digantikan palet proyek
 */

const TAUTAN = [
  { href: "/", label: "Beranda", ringkas: "Beranda", Ikon: IkonKelompok },
  { href: "/kader", label: "Catat", ringkas: "Catat", Ikon: IkonSuntingDokumen },
  { href: "/bidan", label: "Pemantauan", ringkas: "Pantau", Ikon: IkonPemantauan },
];

export function Navbar({ peran }: { peran?: string }) {
  const pathname = usePathname();

  /*
   * Beranda dicocokkan persis, halaman lain dicocokkan lewat awalannya, agar
   * halaman anak yang dibuka dari dashboard tetap menandai "Pemantauan"
   * sebagai halaman aktif.
   */
  const aktif = (href: string) =>
    href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-dasar-200/80 bg-dasar-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-85"
          >
            <Logo ukuran={38} berbingkai />
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight text-brand-700">
                Posyandu<span className="font-extrabold text-brand-500">Ku</span>
              </span>
              {peran && (
                <span className="text-xs font-semibold uppercase tracking-wide text-dasar-500">
                  {peran}
                </span>
              )}
            </span>
          </Link>

          {/* Tautan berjajar, hanya pada layar lebar. */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {TAUTAN.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={aktif(t.href) ? "page" : undefined}
                className={`inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors ${
                  aktif(t.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-dasar-700 hover:bg-dasar-100 hover:text-brand-700"
                }`}
              >
                <t.Ikon className="h-[1.15rem] w-[1.15rem]" />
                {t.label}
              </Link>
            ))}
          </nav>

          <Link href="/masuk" className="tombol-kedua !min-h-[2.75rem] !px-4 !text-sm sm:!px-5 sm:!text-base">
            Masuk
          </Link>
        </div>
      </header>

      {/*
        Bilah bawah untuk ponsel.

        pb-[env(safe-area-inset-bottom)] mencegah tautan tertutup batang gestur
        pada iPhone tanpa tombol beranda.
      */}
      <nav
        aria-label="Navigasi utama"
        className="fixed bottom-0 left-0 z-40 w-full border-t border-dasar-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="flex items-stretch justify-around px-2 py-1.5">
          {TAUTAN.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={aktif(t.href) ? "page" : undefined}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all active:scale-95 ${
                aktif(t.href)
                  ? "bg-brand-50 text-brand-700"
                  : "text-dasar-600 hover:text-brand-700"
              }`}
            >
              <t.Ikon className="h-6 w-6" />
              <span className="text-xs font-semibold">{t.ringkas}</span>
            </Link>
          ))}
        </div>
      </nav>

    </>
  );
}
