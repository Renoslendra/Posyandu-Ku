"use client";

import { useEffect, useState } from "react";
import {
  bacaDitolak,
  bersihkanDitolak,
  jumlahAntrean,
  sinkronkanAntrean,
  type EntriDitolak,
} from "@/lib/antrean-offline";
import { IkonPeringatan, IkonTanpaSinyal } from "@/components/Ikon";

/**
 * Indikator koneksi dan antrean.
 *
 * Kader perlu tahu dua hal saat bekerja di posyandu tanpa sinyal: apakah data
 * masuk, dan apakah sudah terkirim. Tanpa penanda ini, kader tidak dapat
 * memastikan pekerjaannya tersimpan dan akan kembali mencatat di buku tulis
 * sebagai jaminan.
 *
 * Sinkronisasi berjalan otomatis saat koneksi kembali, tanpa perlu ditekan.
 *
 * Komponen ini juga menampilkan pengukuran yang **ditolak** server. Sebelumnya
 * nilai kembalian sinkronisasi dibuang begitu saja, sehingga catatan yang tidak
 * dapat diterima hilang tanpa satu pun pemberitahuan: kader melihat penanda
 * "3 catatan menunggu" berubah menjadi hilang, lalu menyimpulkan semuanya sudah
 * masuk. Bagi alat pencatat data kesehatan anak, itu kegagalan yang paling tidak
 * boleh terjadi.
 */
export function StatusKoneksi() {
  const [daring, setDaring] = useState(true);
  const [antrean, setAntrean] = useState(0);
  const [menyinkron, setMenyinkron] = useState(false);
  const [ditolak, setDitolak] = useState<EntriDitolak[]>([]);
  const [perluMasuk, setPerluMasuk] = useState(false);

  useEffect(() => {
    /*
     * Penanda pembatalan mencegah penulisan keadaan setelah komponen dilepas.
     * Sinkronisasi dapat berjalan puluhan detik pada koneksi lemah, dan kader
     * dapat berpindah halaman di tengahnya.
     */
    let dibatalkan = false;

    function segarkan() {
      if (dibatalkan) return;
      setAntrean(jumlahAntrean());
      setDitolak(bacaDitolak());
    }

    setDaring(navigator.onLine);
    segarkan();

    async function sinkron() {
      if (jumlahAntrean() === 0) return;
      if (dibatalkan) return;

      setMenyinkron(true);
      try {
        const hasil = await sinkronkanAntrean();
        if (dibatalkan) return;

        // Sesi kedaluwarsa perlu tindakan kader, bukan percobaan berulang.
        if (hasil.perluMasuk) setPerluMasuk(true);
      } finally {
        if (!dibatalkan) {
          segarkan();
          setMenyinkron(false);
        }
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
    const pewaktu = window.setInterval(segarkan, 3000);

    return () => {
      dibatalkan = true;
      window.removeEventListener("online", keDaring);
      window.removeEventListener("offline", keLuring);
      window.clearInterval(pewaktu);
    };
  }, []);

  const adaKabar = !daring || antrean > 0 || menyinkron || ditolak.length > 0;

  /*
   * Wadah pengumuman selalu dirender, meski kosong.
   *
   * Pembaca layar hanya mengumumkan perubahan pada region yang sudah ada di
   * dokumen. Sebelumnya seluruh elemen dimunculkan bersamaan dengan isinya,
   * sehingga pesan terpenting di aplikasi ini, yaitu "sedang tanpa sinyal",
   * justru tidak pernah terdengar.
   */
  return (
    <div role="status" aria-live="polite" className={adaKabar ? "space-y-3" : ""}>
      {!daring && (
        <div className="rounded-xl border-2 border-status-risiko bg-status-risiko-lembut p-3.5">
          <p className="flex items-start gap-2.5 font-semibold text-dasar-900">
            <IkonTanpaSinyal className="mt-0.5 h-5 w-5 shrink-0 text-status-risiko" />
            Sedang tanpa sinyal. Data tetap tersimpan di perangkat ini.
          </p>
        </div>
      )}

      {(antrean > 0 || (daring && menyinkron)) && (
        <div className="rounded-xl border-2 border-brand-300 bg-brand-50 p-3.5 text-base text-brand-800">
          {menyinkron
            ? `Mengirim ${antrean > 0 ? antrean : ""} catatan...`.replace("  ", " ")
            : `${antrean} catatan menunggu dikirim. Akan terkirim otomatis saat sinyal kembali.`}
        </div>
      )}

      {perluMasuk && (
        <div className="rounded-xl border-2 border-status-risiko bg-status-risiko-lembut p-3.5">
          <p className="font-semibold text-dasar-900">Sesi Anda sudah berakhir</p>
          <p className="mt-1 text-base text-dasar-700">
            Catatan masih tersimpan di perangkat ini dan belum terkirim. Mohon masuk
            kembali, lalu catatan akan dikirim otomatis.
          </p>
          <a href="/masuk" className="tombol-utama mt-3 !min-h-touch">
            Masuk kembali
          </a>
        </div>
      )}

      {/*
        Pengukuran yang ditolak server.

        Ditampilkan lengkap dengan angkanya supaya kader dapat menimbang ulang
        atau memperbaiki catatannya. Tanpa ini, satu-satunya jejak penolakan
        adalah penghitung yang tidak pernah terlihat siapa pun.
      */}
      {ditolak.length > 0 && (
        <div className="rounded-xl border-2 border-status-berat-garis bg-status-berat-lembut p-3.5">
          <p className="flex items-start gap-2.5 font-semibold text-dasar-900">
            <IkonPeringatan className="mt-0.5 h-5 w-5 shrink-0 text-status-berat" />
            {ditolak.length} catatan tidak dapat disimpan
          </p>

          <ul className="mt-2.5 space-y-2">
            {ditolak.map((d) => (
              <li key={d.klienRef} className="text-base text-dasar-800">
                <span className="font-semibold">
                  {d.tanggal}: {d.beratKg} kg, {d.tinggiCm} cm
                </span>
                <span className="mt-0.5 block text-sm text-dasar-700">{d.alasan}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              bersihkanDitolak();
              setDitolak([]);
            }}
            className="mt-3 min-h-touch rounded-xl border-2 border-dasar-300 px-4 text-base font-semibold text-dasar-700 transition-colors hover:border-dasar-500"
          >
            Sudah saya catat
          </button>
        </div>
      )}
    </div>
  );
}
