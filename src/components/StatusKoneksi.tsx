"use client";

import { useEffect, useState } from "react";
import { jumlahAntrean, sinkronkanAntrean } from "@/lib/antrean-offline";

/**
 * Indikator koneksi dan antrean.
 *
 * Kader perlu tahu dua hal saat bekerja di posyandu tanpa sinyal: apakah data
 * masuk, dan apakah sudah terkirim. Tanpa penanda ini, kader tidak dapat
 * memastikan pekerjaannya tersimpan dan akan kembali mencatat di buku tulis
 * sebagai jaminan.
 *
 * Sinkronisasi berjalan otomatis saat koneksi kembali, tanpa perlu ditekan.
 */
export function StatusKoneksi() {
  const [daring, setDaring] = useState(true);
  const [antrean, setAntrean] = useState(0);
  const [menyinkron, setMenyinkron] = useState(false);

  useEffect(() => {
    setDaring(navigator.onLine);
    setAntrean(jumlahAntrean());

    async function sinkron() {
      if (jumlahAntrean() === 0) return;
      setMenyinkron(true);
      try {
        await sinkronkanAntrean();
      } finally {
        setAntrean(jumlahAntrean());
        setMenyinkron(false);
      }
    }

    function keDaring() {
      setDaring(true);
      void sinkron();
    }
    function keLuring() {
      setDaring(false);
    }

    window.addEventListener("online", keDaring);
    window.addEventListener("offline", keLuring);

    // Mencoba mengirim antrean sisa sesi sebelumnya saat halaman dibuka.
    if (navigator.onLine) void sinkron();

    // Antrean dapat berubah dari komponen lain pada tab yang sama, sehingga
    // dipantau berkala. Selang 3 detik cukup responsif tanpa membebani.
    const pewaktu = window.setInterval(() => setAntrean(jumlahAntrean()), 3000);

    return () => {
      window.removeEventListener("online", keDaring);
      window.removeEventListener("offline", keLuring);
      window.clearInterval(pewaktu);
    };
  }, []);

  // Tidak menampilkan apa pun saat daring dan tidak ada antrean, agar layar
  // kader tetap bersih pada kondisi normal.
  if (daring && antrean === 0 && !menyinkron) return null;

  return (
    <div
      role="status"
      className={`rounded-lg border-2 p-3 text-base ${
        daring
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-status-risiko bg-amber-50 text-amber-900"
      }`}
    >
      {!daring && (
        <p className="font-semibold">
          Sedang tanpa sinyal. Data tetap tersimpan di perangkat ini.
        </p>
      )}

      {antrean > 0 && (
        <p className={daring ? "" : "mt-1"}>
          {menyinkron
            ? `Mengirim ${antrean} catatan...`
            : `${antrean} catatan menunggu dikirim. Akan terkirim otomatis saat sinyal kembali.`}
        </p>
      )}

      {daring && antrean === 0 && menyinkron && <p>Menyinkronkan data...</p>}
    </div>
  );
}
