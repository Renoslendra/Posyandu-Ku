import type { StatusGizi } from "@/lib/gizi/zscore";
import { KELAS_STATUS, LABEL_STATUS } from "@/lib/proses-pengukuran";

/**
 * Lencana status gizi.
 *
 * Warna tidak menjadi satu-satunya pembeda: setiap lencana selalu memuat teks.
 * Ini penting bagi pengguna dengan keterbatasan membedakan warna, dan juga
 * saat layar terlihat di bawah sinar matahari langsung di halaman posyandu.
 */
export function LencanaStatus({
  status,
  ukuran = "normal",
}: {
  status: StatusGizi | null;
  ukuran?: "normal" | "besar";
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
        Belum dinilai
      </span>
    );
  }

  const kelasUkuran =
    ukuran === "besar" ? "px-5 py-2 text-lg font-bold" : "px-3 py-1 text-sm font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full ${KELAS_STATUS[status]} ${kelasUkuran}`}
    >
      {LABEL_STATUS[status]}
    </span>
  );
}
