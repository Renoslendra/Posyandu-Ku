import type { StatusGizi } from "@/lib/gizi/zscore";
import { LABEL_STATUS } from "@/lib/proses-pengukuran";

/**
 * Lencana status gizi.
 *
 * Tiga lapis pembeda, bukan hanya warna:
 *   1. rona  — hijau, kuning, merah
 *   2. bentuk — ikon berbeda untuk tiap status
 *   3. teks  — selalu ada, tidak pernah hanya ikon
 *
 * Berlapisnya penting karena dua sebab. Pengguna yang sulit membedakan merah
 * dan hijau tetap dapat mengenali bentuknya. Dan di halaman posyandu, layar
 * murah di bawah sinar matahari sering membuat warna nyaris hilang, sementara
 * bentuk dan teks tetap terbaca.
 */

/** Ikon per status. Bentuknya berbeda tegas, bukan variasi lingkaran. */
function Ikon({ status }: { status: StatusGizi }) {
  const dasar = "h-4 w-4 shrink-0";

  // Centang: kondisi baik.
  if (status === "normal") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={dasar} aria-hidden="true">
        <path
          d="M4.5 10.5l3.5 3.5 7.5-8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Segitiga: perlu perhatian. Bentuk yang secara universal berarti waspada.
  if (status === "risiko") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={dasar} aria-hidden="true">
        <path
          d="M10 3l7 13H3l7-13z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 8.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="14" r="1" fill="currentColor" />
      </svg>
    );
  }

  /*
   * Panah ke atas di dalam lingkaran: berat berlebih.
   *
   * Arahnya sengaja dibuat berlawanan dengan penanda kekurangan. Kader yang
   * membaca cepat perlu langsung melihat bahwa persoalannya ke atas, bukan ke
   * bawah, sebab kedua keadaan itu menuntut tindakan yang berlawanan.
   */
  if (status === "lebih") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={dasar} aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10 13.5v-7M7 9l3-3 3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Panah ganda ke atas: berat sangat berlebih, setingkat lebih mendesak.
  if (status === "obesitas") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={dasar} aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7 13l3-3 3 3M7 9l3-3 3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Segi delapan: perlu segera. Bentuk rambu berhenti.
  return (
    <svg viewBox="0 0 20 20" fill="none" className={dasar} aria-hidden="true">
      <path
        d="M7 2.5h6l4.5 4.5v6L13 17.5H7L2.5 13V7L7 2.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 6.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

const KELAS: Record<StatusGizi, string> = {
  normal: "bg-status-normal text-white",
  risiko: "bg-status-risiko text-white",
  berat: "bg-status-berat text-white",
  lebih: "bg-status-lebih text-white",
  obesitas: "bg-status-obesitas text-white",
};

export function LencanaStatus({
  status,
  ukuran = "normal",
}: {
  status: StatusGizi | null;
  ukuran?: "normal" | "besar";
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dasar-300 bg-dasar-100 px-3 py-1 text-sm font-medium text-dasar-700">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-dasar-400" />
        Belum dinilai
      </span>
    );
  }

  const kelasUkuran =
    ukuran === "besar"
      ? "gap-2 px-5 py-2.5 text-lg font-bold"
      : "gap-1.5 px-3 py-1 text-sm font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full shadow-halus ${KELAS[status]} ${kelasUkuran}`}
    >
      <Ikon status={status} />
      {LABEL_STATUS[status]}
    </span>
  );
}

/**
 * Kartu status besar untuk halaman anak dan hasil pencatatan.
 *
 * Dipakai ketika status adalah informasi utama di layar, bukan penanda kecil
 * di samping nama. Memakai latar lembut dengan garis tepi pekat, bukan blok
 * warna penuh, karena blok warna sebesar ini melelahkan mata saat dibaca lama.
 */
export function KartuStatus({
  status,
  keterangan,
}: {
  status: StatusGizi | null;
  keterangan?: string;
}) {
  const gaya: Record<StatusGizi, string> = {
    normal: "border-status-normal-garis bg-status-normal-lembut text-green-900",
    risiko: "border-status-risiko-garis bg-status-risiko-lembut text-amber-900",
    berat: "border-status-berat-garis bg-status-berat-lembut text-red-900",
    lebih: "border-status-lebih-garis bg-status-lebih-lembut text-purple-900",
    obesitas: "border-status-obesitas-garis bg-status-obesitas-lembut text-violet-900",
  };

  if (!status) {
    return (
      <div className="rounded-2xl border-2 border-dasar-300 bg-dasar-100 p-5">
        <p className="text-lg font-bold text-dasar-800">Belum dinilai</p>
        {keterangan && <p className="mt-1 text-base text-dasar-700">{keterangan}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border-2 p-5 ${gaya[status]}`}>
      <LencanaStatus status={status} ukuran="besar" />
      {keterangan && <p className="mt-3 text-base">{keterangan}</p>}
    </div>
  );
}
