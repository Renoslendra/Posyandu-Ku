"use client";

import { useState } from "react";

/**
 * Tombol penyusun ringkasan bulanan.
 *
 * Bersifat atas permintaan, bukan otomatis saat halaman dibuka, karena setiap
 * pemanggilan menimbulkan biaya API dan bidan tidak selalu membutuhkannya.
 *
 * Bila ringkasan disusun template karena LLM gagal, hal itu dinyatakan terbuka.
 * Bidan berhak mengetahui asal teks yang dibacanya.
 */
export function TombolRingkasan() {
  const [memuat, setMemuat] = useState(false);
  const [teks, setTeks] = useState<string | null>(null);
  const [dariFallback, setDariFallback] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function susun() {
    setMemuat(true);
    setGalat(null);

    try {
      const respons = await fetch("/api/ringkasan", { method: "POST" });
      const isi = await respons.json();

      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal menyusun ringkasan");
        return;
      }

      setTeks(isi.teks);
      setDariFallback(Boolean(isi.dariFallback));
    } catch {
      setGalat("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <section className="kartu p-5">
      <h2 className="text-xl font-bold text-dasar-900">Ringkasan bulanan</h2>
      <p className="mt-1 text-sm text-dasar-600">
        Disusun dari angka pada dashboard ini. Dapat disalin untuk laporan.
      </p>

      <button
        onClick={susun}
        disabled={memuat}
        className="mt-4 min-h-touch rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600 disabled:bg-dasar-300"
      >
        {memuat ? "Menyusun..." : teks ? "Susun ulang" : "Susun ringkasan"}
      </button>

      {galat && (
        <p
          role="alert"
          className="mt-4 rounded-xl border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900"
        >
          {galat}
        </p>
      )}

      {teks && (
        <div className="mt-5 space-y-3">
          {dariFallback && (
            <p className="rounded-lg bg-dasar-100 p-3 text-sm text-dasar-700">
              Ringkasan disusun dari template karena layanan bahasa sedang tidak
              tersedia. Angkanya tetap berasal dari perhitungan yang sama.
            </p>
          )}

          <div className="whitespace-pre-wrap rounded-lg bg-dasar-50 p-4 text-base leading-relaxed text-dasar-800">
            {teks}
          </div>
        </div>
      )}
    </section>
  );
}
