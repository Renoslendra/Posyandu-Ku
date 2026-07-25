/**
 * Logo PosyanduKu.
 *
 * Konsep: dua bentuk yang saling melindungi. Lengkung luar adalah tangan atau
 * naungan kader, bentuk di dalamnya adalah anak. Titik pada lengkung membentuk
 * garis pertumbuhan yang naik, menautkan gagasan pemantauan dengan gagasan
 * perlindungan.
 *
 * Dibuat sebagai SVG inline, bukan berkas gambar, agar warnanya mengikuti
 * konteks (currentColor) dan tidak menambah permintaan jaringan. Hal terakhir
 * penting karena aplikasi harus ringan di koneksi lambat.
 */

export function Logo({
  className = "",
  ukuran = 32,
}: {
  className?: string;
  ukuran?: number;
}) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Logo PosyanduKu"
    >
      {/* Naungan: lengkung terbuka yang memeluk bentuk di dalamnya. */}
      <path
        d="M6 30c0-11 8-19 18-19s18 8 18 19"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.28"
      />

      {/* Garis pertumbuhan yang naik, sekaligus menjadi lengan naungan. */}
      <path
        d="M11 37l7-7 6 5 13-14"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Titik pemantauan pada puncak garis: tiap titik adalah satu kunjungan. */}
      <circle cx="37" cy="21" r="4" fill="currentColor" />
    </svg>
  );
}

/**
 * Logo lengkap dengan nama produk.
 *
 * "Posyandu" memakai bobot normal dan "Ku" memakai bobot tebal, menegaskan
 * bahwa aplikasi ini milik kader dan keluarga yang memakainya.
 */
export function LogoLengkap({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo ukuran={32} className="text-brand-500" />
      <span className="text-xl tracking-tight text-brand-700">
        Posyandu<span className="font-bold">Ku</span>
      </span>
    </span>
  );
}
