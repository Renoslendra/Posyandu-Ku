"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LencanaStatus } from "./LencanaStatus";
import { saringAnak, type AnakPrioritas, type SaringStatus } from "@/lib/dashboard";

/**
 * Daftar seluruh anak dengan penyaringan status dan pencarian nama
 * (FR-02.4, FR-02.5).
 *
 * Penyaringan dijalankan di peramban karena daftar satu posyandu berjumlah
 * ratusan baris, dan perjalanan ke server untuk setiap ketikan akan terasa
 * lambat pada koneksi desa.
 */

/*
 * Urutan pilihan mengikuti urutan kepentingan bagi bidan, bukan urutan Z-score.
 *
 * Kekurangan gizi lebih dahulu karena itu yang paling banyak di posyandu desa
 * dan paling cepat memburuk. Kelebihan gizi diletakkan sesudah normal, sebagai
 * satu pilihan yang menggabungkan kedua tingkatnya: jumlahnya masih sedikit,
 * sehingga memisahkannya menjadi dua tombol hanya menambah tombol bernilai nol.
 */
const PILIHAN: { nilai: SaringStatus; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "berat", label: "Perlu segera" },
  { nilai: "risiko", label: "Perlu perhatian" },
  { nilai: "normal", label: "Normal" },
  { nilai: "lebih", label: "Berat berlebih" },
  { nilai: "obesitas", label: "Sangat berlebih" },
  { nilai: "belum", label: "Belum ditimbang" },
];

export function DaftarAnak({ daftar }: { daftar: AnakPrioritas[] }) {
  const [saring, setSaring] = useState<SaringStatus>("semua");
  const [cari, setCari] = useState("");

  const hasil = useMemo(() => saringAnak(daftar, saring, cari), [daftar, saring, cari]);

  // Jumlah per pilihan ditampilkan pada tombol agar bidan tahu ada berapa
  // sebelum menekannya.
  const jumlah = useMemo(() => {
    const peta = new Map<SaringStatus, number>();
    for (const p of PILIHAN) peta.set(p.nilai, saringAnak(daftar, p.nilai, "").length);
    return peta;
  }, [daftar]);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-dasar-900">Semua anak</h2>
      <p className="mt-1 text-sm text-dasar-600">
        Saring menurut status gizi atau cari nama anak.
      </p>

      <div className="mt-4">
        <label htmlFor="cari-anak" className="block text-base font-semibold text-dasar-900">
          Cari nama anak
        </label>
        <input
          id="cari-anak"
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Ketik nama anak"
          className="mt-2 min-h-touch w-full max-w-md rounded-xl border-2 border-dasar-300 px-3 text-base"
        />
      </div>

      {/* Penyaring berupa tombol, bukan menu pilihan, agar terlihat semua
          kemungkinan sekaligus beserta jumlahnya. */}
      <div role="group" aria-label="Saring menurut status gizi" className="mt-4 flex flex-wrap gap-2">
        {PILIHAN.map((p) => (
          <button
            key={p.nilai}
            onClick={() => setSaring(p.nilai)}
            aria-pressed={saring === p.nilai}
            className={`min-h-touch rounded-xl border-2 px-4 text-base font-medium ${saring === p.nilai
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-dasar-300 text-dasar-700 hover:bg-dasar-50"
              }`}
          >
            {p.label}{" "}
            <span className="text-sm text-dasar-600">({jumlah.get(p.nilai) ?? 0})</span>
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-dasar-600">
        Menampilkan {hasil.length} dari {daftar.length} anak
      </p>

      {hasil.length === 0 ? (
        <p className="mt-3 kartu p-5 text-base text-dasar-700">
          Tidak ada anak yang cocok dengan pilihan Anda.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-dasar-200 kartu">
          {hasil.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link
                  href={`/anak/${a.id}`}
                  className="text-base font-semibold text-brand-700 underline"
                >
                  {a.nama}
                </Link>
                <p className="text-sm text-dasar-600">
                  {a.tanggalTerakhir
                    ? `Terakhir ditimbang ${a.tanggalTerakhir}`
                    : "Belum pernah ditimbang"}
                </p>
              </div>
              {a.status ? (
                <LencanaStatus status={a.status} />
              ) : (
                <span className="rounded-full bg-dasar-100 px-3 py-1 text-sm text-dasar-600">
                  Belum dinilai
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
