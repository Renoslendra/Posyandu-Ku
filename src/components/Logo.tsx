/**
 * Keluarga logo PosyanduKu.
 *
 * Konsep bentuknya: naungan dan pertumbuhan. Lengkung luar adalah tangan kader
 * yang menaungi, garis di dalamnya adalah kurva pertumbuhan yang naik, dan titik
 * pada puncaknya adalah kunjungan penimbangan terakhir.
 *
 * Dibuat sebagai SVG inline, bukan berkas gambar, dengan tiga akibat yang
 * disengaja: warnanya mengikuti konteks, tidak ada permintaan jaringan tambahan
 * pada koneksi desa yang lambat, dan tidak ada pergeseran tata letak saat
 * gambar selesai dimuat.
 */

/**
 * Tanda saja, tanpa nama produk.
 *
 * Dipakai pada ruang sempit: favicon, ikon aplikasi, dan penanda daftar.
 *
 * `berbingkai` menempatkan tanda di dalam kotak bersudut membulat berwarna
 * merek, dipakai bila logo berdiri di atas latar terang dan perlu bobot visual
 * agar tidak tampak hilang.
 */
export function Logo({
  className = "",
  ukuran = 32,
  berbingkai = false,
}: {
  className?: string;
  ukuran?: number;
  berbingkai?: boolean;
}) {
  if (berbingkai) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-merek-pekat shadow-merek ${className}`}
        style={{ width: ukuran, height: ukuran }}
      >
        <TandaSvg ukuran={Math.round(ukuran * 0.62)} className="text-white" />
      </span>
    );
  }

  return <TandaSvg ukuran={ukuran} className={className} />;
}

function TandaSvg({
  ukuran,
  className = "",
}: {
  ukuran: number;
  className?: string;
}) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 48 48"
      fill="none"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Logo PosyanduKu"
    >
      {/* Naungan: lengkung terbuka yang memeluk bentuk di dalamnya. */}
      <path
        d="M7 31c0-10.5 7.6-18 17-18s17 7.5 17 18"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Kurva pertumbuhan yang naik, sekaligus menjadi lengan naungan. */}
      <path
        d="M11 37.5l7.5-7.5 6 5 12.5-13.5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Titik kunjungan terakhir pada puncak kurva. */}
      <circle cx="37" cy="21.5" r="4" fill="currentColor" />
    </svg>
  );
}

/**
 * Logo lengkap dengan nama produk.
 *
 * "Posyandu" memakai bobot sedang dan "Ku" memakai bobot paling tebal,
 * menegaskan bahwa aplikasi ini milik kader dan keluarga yang memakainya.
 *
 * Tiga ukuran disediakan karena kebutuhannya memang berbeda: `kecil` untuk
 * footer, `normal` untuk bilah navigasi, `besar` untuk halaman masuk yang
 * hanya memuat satu elemen identitas.
 */
export function LogoLengkap({
  className = "",
  ukuran = "normal",
  berbingkai = true,
}: {
  className?: string;
  ukuran?: "kecil" | "normal" | "besar";
  berbingkai?: boolean;
}) {
  const dimensi = { kecil: 30, normal: 38, besar: 52 }[ukuran];
  const kelasTeks = {
    kecil: "text-base",
    normal: "text-lg sm:text-xl",
    besar: "text-2xl sm:text-3xl",
  }[ukuran];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo
        ukuran={dimensi}
        berbingkai={berbingkai}
        className={berbingkai ? "" : "text-brand-500"}
      />
      <span className={`font-semibold tracking-tight text-brand-700 ${kelasTeks}`}>
        Posyandu<span className="font-extrabold text-brand-500">Ku</span>
      </span>
    </span>
  );
}

/**
 * Logo dengan keterangan peran di bawah nama.
 *
 * Dipakai pada bilah navigasi halaman yang khusus satu peran, sehingga pengguna
 * selalu tahu sedang berada di halaman siapa. Ini penting karena satu perangkat
 * di meja posyandu sering dipakai bergantian.
 */
export function LogoDenganPeran({
  peran,
  className = "",
}: {
  peran: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo ukuran={38} berbingkai />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight text-brand-700">
          Posyandu<span className="font-extrabold text-brand-500">Ku</span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-dasar-500">
          {peran}
        </span>
      </span>
    </span>
  );
}
