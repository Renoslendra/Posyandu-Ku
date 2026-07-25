"use client";

import { useState } from "react";

/**
 * Saran menu harian untuk orang tua.
 *
 * Yang ditampilkan lebih dahulu adalah total biaya, bukan daftar gizinya.
 * Bagi keluarga di desa, pertanyaan pertama bukan "apakah bergizi" melainkan
 * "apakah saya mampu membelinya". Menjawabnya lebih dahulu membuat sarannya
 * terasa mungkin dijalankan.
 */

interface Bahan {
  nama: string;
  takaran: string;
  hargaRp: number;
  manfaat: string;
}

interface Menu {
  waktu: string;
  hidangan: string;
  bahan: Bahan[];
}

interface Hasil {
  namaAnak: string;
  menu: Menu[];
  belanja: Bahan[];
  totalBiayaRp: number;
  catatanGizi: string[];
  narasi?: string;
  dariFallback: boolean;
}

function rupiah(nilai: number): string {
  return `Rp ${nilai.toLocaleString("id-ID")}`;
}

export function SaranMenu({ anakId }: { anakId: string }) {
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function susun() {
    setMemuat(true);
    setGalat(null);

    try {
      const respons = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anakId }),
      });
      const isi = await respons.json();

      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal menyusun saran menu");
        return;
      }
      setHasil(isi);
    } catch {
      setGalat("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-900">Saran menu harian</h2>
      <p className="mt-1 text-sm text-slate-600">
        Menu berbahan pasar desa, disesuaikan dengan hasil penimbangan terakhir.
      </p>

      <button
        onClick={susun}
        disabled={memuat}
        className="mt-4 min-h-touch rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600 disabled:bg-slate-300"
      >
        {memuat ? "Menyusun..." : hasil ? "Susun ulang" : "Lihat saran menu"}
      </button>

      {galat && (
        <p
          role="alert"
          className="mt-4 rounded-lg border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900"
        >
          {galat}
        </p>
      )}

      {hasil && (
        <div className="mt-5 space-y-5">
          {/* Biaya ditampilkan paling menonjol. */}
          <div className="rounded-lg bg-brand-50 p-4">
            <p className="text-sm text-brand-700">Perkiraan belanja satu hari</p>
            <p className="text-3xl font-bold text-brand-700">
              {rupiah(hasil.totalBiayaRp)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Harga perkiraan pasar desa. Dapat berbeda di tiap daerah.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">Menu sehari</h3>
            <ul className="mt-2 space-y-2">
              {hasil.menu.map((m) => (
                <li key={m.waktu} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-600">{m.waktu}</p>
                  <p className="text-base font-semibold text-slate-900">{m.hidangan}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">Yang perlu dibeli</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {hasil.belanja.map((b) => (
                <li key={b.nama} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-base text-slate-800">
                    {b.nama}{" "}
                    <span className="text-sm text-slate-500">({b.takaran})</span>
                    <span className="block text-sm text-slate-600">
                      untuk {b.manfaat}
                    </span>
                  </span>
                  <span className="text-base font-medium text-slate-900">
                    {rupiah(b.hargaRp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {hasil.narasi && (
            <div>
              <h3 className="font-semibold text-slate-900">Cara memasak</h3>
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-base leading-relaxed text-slate-800">
                {hasil.narasi}
              </div>
            </div>
          )}

          {hasil.dariFallback && (
            <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              Petunjuk memasak sedang tidak tersedia. Menu, bahan, dan biaya di atas
              tetap dapat dipakai.
            </p>
          )}

          <div>
            <h3 className="font-semibold text-slate-900">Catatan</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
              {hasil.catatanGizi.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-slate-500">
            Saran ini bersifat umum, bukan anjuran medis. Untuk kebutuhan khusus,
            silakan berkonsultasi dengan bidan atau puskesmas.
          </p>
        </div>
      )}
    </section>
  );
}
