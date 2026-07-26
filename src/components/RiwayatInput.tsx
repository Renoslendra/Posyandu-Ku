import Link from "next/link";
import { LencanaStatus } from "@/components/LencanaStatus";
import { IkonKamera } from "@/components/Ikon";
import type { StatusGizi } from "@/lib/gizi/zscore";

/**
 * Riwayat pengukuran yang dicatat kader ini.
 *
 * Sebelumnya kader tidak punya cara melihat apa yang sudah ia masukkan. Hasil
 * satu pengukuran terakhir memang muncul di bawah formulir, tetapi nilai itu
 * hidup di state peramban dan hilang begitu halaman dimuat ulang. Akibatnya,
 * kader yang mencatat sepuluh anak berturut-turut pada hari posyandu tidak dapat
 * memastikan siapa yang sudah masuk dan siapa yang terlewat, kecuali dengan
 * membuka halaman tiap anak satu per satu.
 *
 * Kekhawatiran yang sesungguhnya bukan kelupaan, melainkan pencatatan ganda:
 * kader yang tidak yakin apakah suatu anak sudah tercatat akan mencatatnya lagi.
 * Basis data memang menolak pengukuran ganda pada tanggal yang sama, tetapi
 * penolakan itu muncul sebagai galat setelah kader mengisi seluruh formulir, dan
 * itu pengalaman yang buruk untuk persoalan yang dapat dicegah dengan
 * memperlihatkan daftarnya lebih dahulu.
 *
 * Ditampilkan sebagai daftar hari ini, bukan seluruh riwayat. Yang dibutuhkan
 * kader saat sesi penimbangan berlangsung adalah sisa pekerjaan hari itu.
 * Riwayat panjang tersedia di halaman tiap anak.
 */

export interface BarisRiwayatInput {
  id: string;
  anakId: string;
  nama: string;
  tanggal: string;
  beratKg: number;
  tinggiCm: number;
  status: StatusGizi;
  dikonfirmasi: boolean;
  /** Foto berarti hasil pembacaan halaman buku tulis. */
  dariFoto: boolean;
}

export function RiwayatInput({ baris }: { baris: BarisRiwayatInput[] }) {
  if (baris.length === 0) {
    return (
      <section className="kartu p-5">
        <h2 className="font-semibold text-dasar-900">Catatan Anda hari ini</h2>
        <p className="mt-2 text-base text-dasar-700">
          Belum ada pengukuran yang dicatat hari ini. Setiap penimbangan yang Anda
          simpan akan muncul di sini.
        </p>
      </section>
    );
  }

  return (
    <section className="kartu p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-dasar-900">Catatan Anda hari ini</h2>
        <span className="shrink-0 text-sm font-semibold text-brand-600">
          {baris.length} anak
        </span>
      </div>

      <p className="mt-1 text-sm text-dasar-600">
        Daftar ini membantu memastikan tidak ada anak yang terlewat atau tercatat dua
        kali.
      </p>

      <ul className="mt-4 flex flex-col">
        {baris.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-dasar-200 py-3 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <Link
                href={`/anak/${b.anakId}`}
                className="font-semibold text-dasar-900 hover:text-brand-600"
              >
                {b.nama}
              </Link>

              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dasar-600">
                <span>
                  {b.beratKg} kg &middot; {b.tinggiCm} cm
                </span>

                {b.dariFoto && (
                  <span className="inline-flex items-center gap-1 text-dasar-500">
                    <IkonKamera className="h-3.5 w-3.5" />
                    dari foto
                  </span>
                )}

                {!b.dikonfirmasi && (
                  <span className="font-semibold text-status-risiko">
                    belum dikonfirmasi
                  </span>
                )}
              </div>
            </div>

            <LencanaStatus status={b.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
