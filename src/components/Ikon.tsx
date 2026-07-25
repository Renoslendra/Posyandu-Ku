/**
 * Set ikon SVG inline.
 *
 * Menggantikan font Material Symbols yang sebelumnya dipakai lewat kelas
 * `material-symbols-outlined`. Font itu tidak pernah dimuat pada proyek ini,
 * sehingga setiap ikon tampil sebagai teks mentah: kata "download" dan
 * "wifi_off" berdiri sendiri di tengah antarmuka.
 *
 * Memilih SVG inline alih-alih memuat fontnya, dengan tiga alasan:
 *
 * Pertama, font ikon menambah unduhan sekitar seratus kilobyte untuk dua puluh
 * tiga bentuk yang dipakai. Pada koneksi desa yang lambat, itu berarti antarmuka
 * tampil tanpa ikon selama beberapa detik pertama.
 *
 * Kedua, font ikon dimuat dari domain pihak ketiga. Aplikasi ini menangani data
 * kesehatan anak, dan setiap permintaan ke domain luar adalah kebocoran pola
 * kunjungan yang tidak perlu.
 *
 * Ketiga, kegagalan memuat font tidak menyisakan ruang kosong melainkan teks
 * yang membingungkan. SVG inline tidak dapat gagal dimuat.
 *
 * Semua ikon memakai `currentColor` sehingga mewarisi warna teks induknya, dan
 * ditandai `aria-hidden` karena maknanya selalu disampaikan teks di sebelahnya.
 */

type Props = {
  className?: string;
};

/** Bungkus bersama: ukuran, ketebalan garis, dan sifat dekoratifnya. */
function Svg({
  children,
  className = "h-5 w-5",
  isi = false,
}: Props & { children: React.ReactNode; isi?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={isi ? "currentColor" : "none"}
      stroke={isi ? "none" : "currentColor"}
      strokeWidth={isi ? undefined : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ── Status dan peringatan ─────────────────────────────────────────────── */

export function IkonPeringatan({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M12 3.5L21.5 20H2.5L12 3.5z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IkonBahaya({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M8.5 3h7l5.5 5.5v7L15.5 21h-7L3 15.5v-7L8.5 3z" />
      <path d="M12 8v4.5" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IkonCentang({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.2l2.8 2.8L16.5 9.5" />
    </Svg>
  );
}

/* ── Kesehatan ────────────────────────────────────────────────────────── */

export function IkonStetoskop({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M5 3v5.5a4 4 0 008 0V3" />
      <path d="M9 12.5v3a4.5 4.5 0 009 0v-1.2" />
      <circle cx="18" cy="11" r="2.2" />
      <path d="M3.5 3H6M12 3h2.5" />
    </Svg>
  );
}

export function IkonLayananMedis({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M9 4h6v3h4v13H5V7h4V4z" />
      <path d="M12 11v5M9.5 13.5h5" />
    </Svg>
  );
}

export function IkonCatatanKlinis({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M6 3h9l4 4v14H6V3z" />
      <path d="M14.5 3v4.5H19" />
      <path d="M9 12h6M9 15.5h4" />
    </Svg>
  );
}

/* ── Pemantauan ───────────────────────────────────────────────────────── */

export function IkonPemantauan({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 20V4" />
      <path d="M3.5 20h17" />
      <path d="M7 16l4-4.5 3 2.5 5-6" />
      <circle cx="19" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IkonJadwal({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7v5.4l3.4 2" />
    </Svg>
  );
}

export function IkonTugasTerlambat({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M7 4h10v17H7V4z" />
      <path d="M10 4V2.6h4V4" />
      <path d="M12 8.5v4" />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/* ── Dokumen dan berkas ───────────────────────────────────────────────── */

export function IkonPindaiDokumen({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 8V5.5A2 2 0 015.5 3.5H8" />
      <path d="M16 3.5h2.5a2 2 0 012 2V8" />
      <path d="M20.5 16v2.5a2 2 0 01-2 2H16" />
      <path d="M8 20.5H5.5a2 2 0 01-2-2V16" />
      <path d="M7.5 12h9" />
    </Svg>
  );
}

export function IkonSuntingDokumen({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M18 12.5V21H6V3h7l5 5" />
      <path d="M12.5 3v5.5H18" />
      <path d="M20.6 9.4a1.6 1.6 0 00-2.3 0L14 13.7V16h2.3l4.3-4.3a1.6 1.6 0 000-2.3z" />
    </Svg>
  );
}

export function IkonUnduh({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 18.5h16" />
    </Svg>
  );
}

export function IkonGambar({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
    </Svg>
  );
}

export function IkonKamera({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 8.5h3l1.5-2.5h8l1.5 2.5h3v11h-17v-11z" />
      <circle cx="12" cy="14" r="3.4" />
    </Svg>
  );
}

/* ── Orang ────────────────────────────────────────────────────────────── */

export function IkonKeluarga({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="7.5" cy="7" r="2.8" />
      <circle cx="16.5" cy="7" r="2.8" />
      <path d="M3 20v-2.6a4 4 0 014-4h1" />
      <path d="M21 20v-2.6a4 4 0 00-4-4h-1" />
      <circle cx="12" cy="14.5" r="2.2" />
      <path d="M8.8 20.5v-1.2a3.2 3.2 0 016.4 0v1.2" />
    </Svg>
  );
}

export function IkonKelompok({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 20v-1.6A4.4 4.4 0 017.4 14h3.2A4.4 4.4 0 0115 18.4V20" />
      <path d="M16 5.4a3.2 3.2 0 010 6.2" />
      <path d="M17.5 14h.6A3.9 3.9 0 0122 17.9V20" />
    </Svg>
  );
}

export function IkonCariOrang({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 20v-1.6A4.9 4.9 0 018.4 13.5h2" />
      <circle cx="16.8" cy="16.8" r="3.2" />
      <path d="M19.2 19.2L21.5 21.5" />
    </Svg>
  );
}

export function IkonKepedulian({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M12 20.5s-7.5-4.8-7.5-9.6A4.2 4.2 0 0112 8.2a4.2 4.2 0 017.5 2.7c0 4.8-7.5 9.6-7.5 9.6z" />
    </Svg>
  );
}

/* ── Sistem ───────────────────────────────────────────────────────────── */

export function IkonTanpaSinyal({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M2.5 8.5a15 15 0 015-3.2" />
      <path d="M21.5 8.5a15 15 0 00-6-3.4" />
      <path d="M6 12.4a10 10 0 013.2-1.9" />
      <path d="M18 12.4a10 10 0 00-2.6-1.7" />
      <path d="M9.5 16a5 5 0 013-1" />
      <circle cx="12" cy="19.4" r="1" fill="currentColor" stroke="none" />
      <path d="M3.5 3.5l17 17" />
    </Svg>
  );
}

export function IkonMemori({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.6" />
      <path d="M10 3.5v3M14 3.5v3M10 17.5v3M14 17.5v3M3.5 10h3M3.5 14h3M17.5 10h3M17.5 14h3" />
    </Svg>
  );
}

export function IkonTelepon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M4 4.5h3.4l1.7 4.2-2.1 1.6a11.5 11.5 0 006.7 6.7l1.6-2.1 4.2 1.7V20a1.5 1.5 0 01-1.7 1.5C10.6 20.6 3.4 13.4 2.5 6.2A1.5 1.5 0 014 4.5z" />
    </Svg>
  );
}

/* ── Navigasi ─────────────────────────────────────────────────────────── */

export function IkonBeranda({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 10.5L12 3.5l8.5 7v9.5h-17V10.5z" />
      <path d="M9.5 20.5v-6h5v6" />
    </Svg>
  );
}

export function IkonPanahKanan({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M9 5.5l7 6.5-7 6.5" />
    </Svg>
  );
}

export function IkonPanahBawah({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M5.5 9l6.5 7 6.5-7" />
    </Svg>
  );
}

/* ── Pengukuran ───────────────────────────────────────────────────────── */

export function IkonTimbangan({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M5.5 7.5h13l2 13H3.5l2-13z" />
      <path d="M9 4.5h6" />
      <path d="M12 4.5v3" />
      <path d="M9.5 14.5l2.5-3 2.5 3" />
    </Svg>
  );
}
