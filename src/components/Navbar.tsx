"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { PenandaPengguna, TautanMasuk, TombolKeluar } from "./AksiPengguna";
import {
  IkonBeranda,
  IkonKeluarga,
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
 * Isinya bergantung pada siapa yang sedang masuk. Sebelumnya bilah ini selalu
 * menampilkan tombol "Masuk" beserta tautan ke semua halaman peran, sehingga
 * pengguna yang sudah masuk tetap diminta masuk lagi, dan orang tua melihat
 * tautan ke halaman pencatatan yang bukan haknya.
 */

interface Tautan {
  href: string;
  label: string;
  ringkas: string;
  Ikon: (p: { className?: string }) => React.JSX.Element;
}

const BERANDA: Tautan = {
  href: "/",
  label: "Beranda",
  ringkas: "Beranda",
  Ikon: IkonBeranda,
};

const CATAT: Tautan = {
  href: "/kader",
  label: "Catat",
  ringkas: "Catat",
  Ikon: IkonSuntingDokumen,
};

const PANTAU: Tautan = {
  href: "/bidan",
  label: "Pemantauan",
  ringkas: "Pantau",
  Ikon: IkonPemantauan,
};

const ANAK_SAYA: Tautan = {
  href: "/orangtua",
  label: "Anak saya",
  ringkas: "Anak",
  Ikon: IkonKeluarga,
};

/**
 * Tautan yang ditampilkan untuk setiap peran.
 *
 * Hanya memuat halaman yang benar-benar dapat dibuka peran tersebut. Menampilkan
 * tautan yang berujung pada pengalihan membuat pengguna mengira dirinya salah
 * menekan, padahal aplikasinya yang menawarkan tautan yang salah.
 */
function tautanUntuk(peran?: string | null): Tautan[] {
  switch (peran) {
    case "kader":
      return [BERANDA, CATAT];
    case "bidan":
      return [BERANDA, PANTAU];
    case "orang_tua":
      return [BERANDA, ANAK_SAYA];
    default:
      // Pengunjung yang belum masuk hanya melihat beranda.
      return [BERANDA];
  }
}

export function Navbar({
  peran,
  labelPeran,
  nama,
  inisial,
}: {
  /** Kunci peran dari basis data, dipakai untuk menyaring tautan. */
  peran?: string | null;
  /** Label peran yang dibaca manusia, dipakai pada penanda identitas. */
  labelPeran?: string;
  nama?: string;
  inisial?: string;
}) {
  const pathname = usePathname();
  const tautan = tautanUntuk(peran);
  const sudahMasuk = Boolean(peran || nama);

  /*
   * Beranda dicocokkan persis, halaman lain dicocokkan lewat awalannya, agar
   * halaman anak yang dibuka dari pemantauan tetap menandai "Pemantauan"
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
              {labelPeran && (
                <span className="text-xs font-semibold uppercase tracking-wide text-dasar-500 sm:hidden">
                  {labelPeran}
                </span>
              )}
            </span>
          </Link>

          {/* Tautan berjajar, hanya pada layar lebar. */}
          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-1 md:flex"
          >
            {tautan.map((t) => (
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

          {/*
            Sisi kanan: identitas dan tombol keluar bagi yang sudah masuk,
            tautan masuk bagi yang belum. Keduanya tidak pernah tampil bersamaan.
          */}
          {sudahMasuk ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <PenandaPengguna
                inisial={inisial ?? "?"}
                nama={nama ?? "Pengguna"}
                peran={labelPeran ?? "Pengguna"}
              />
              <TombolKeluar />
            </div>
          ) : (
            <TautanMasuk />
          )}
        </div>
      </header>

      {/*
        Bilah bawah untuk ponsel.

        Hanya muncul bila ada lebih dari satu tautan. Bagi pengunjung yang belum
        masuk, satu-satunya tautan adalah beranda, dan bilah berisi satu butir
        hanya memakan ruang tanpa memberi manfaat.

        pb-[env(safe-area-inset-bottom)] mencegah tautan tertutup batang gestur
        pada iPhone tanpa tombol beranda.
      */}
      {tautan.length > 1 && (
        <nav
          aria-label="Navigasi utama"
          className="fixed bottom-0 left-0 z-40 w-full border-t border-dasar-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
          <div className="flex items-stretch justify-around px-2 py-1.5">
            {tautan.map((t) => (
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
      )}
    </>
  );
}
