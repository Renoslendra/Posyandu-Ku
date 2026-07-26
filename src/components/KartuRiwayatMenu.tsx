"use client";

import { useState } from "react";
import { IkonPanahBawah } from "@/components/Ikon";

/**
 * Satu entri riwayat saran menu yang dapat dibuka.
 *
 * Versi pertama bagian ini hanya menampilkan potongan narasi tanpa cara
 * membukanya, dan itu keliru dalam dua hal sekaligus. Pertama, narasi memasak
 * dipotong di tengah kalimat sehingga petunjuknya berhenti pada langkah yang
 * belum selesai. Kedua, seluruh isi yang tersimpan justru tidak terpakai:
 * daftar hidangan, rincian belanja beserta harganya, dan catatan keselamatan
 * semuanya sudah ada di basis data tetapi tidak pernah ditampilkan.
 *
 * Menyimpan riwayat tanpa dapat membacanya kembali secara utuh membuat
 * penyimpanannya kehilangan seluruh alasan keberadaannya.
 *
 * Dipakai bentuk yang dapat dilipat, bukan halaman tersendiri. Riwayat menu
 * dibaca sambil membandingkan dengan menu terbaru di atasnya, dan perpindahan
 * halaman memaksa orang tua mengingat isi yang baru saja ditinggalkannya.
 */

interface Bahan {
  nama: string;
  takaran: string;
  hargaRp: number;
  manfaat: string;
}

interface Hidangan {
  waktu: string;
  hidangan: string;
  bahan?: Bahan[];
}

export interface EntriRiwayatMenu {
  id: string;
  usiaBulan: number;
  dibuatPada: string;
  dariFallback: boolean;
  narasi: string;
  totalBiayaRp: number | null;
  menu: Hidangan[];
  belanja: Bahan[];
  catatanGizi: string[];
}

function rupiah(nilai: number): string {
  return `Rp ${nilai.toLocaleString("id-ID")}`;
}

export function KartuRiwayatMenu({
  entri,
  tanggal,
}: {
  entri: EntriRiwayatMenu;
  /** Tanggal yang sudah diformat di server, agar tampilannya tidak bergantung zona waktu peramban. */
  tanggal: string;
}) {
  const [terbuka, setTerbuka] = useState(false);

  /*
   * Ringkasan satu baris saat tertutup.
   *
   * Dipotong pada batas kata, bukan pada jumlah huruf, dan diberi elipsis agar
   * jelas bahwa masih ada lanjutannya. Pemotongan di tengah kata membuat
   * pembaca menduga datanya rusak.
   */
  const cuplikan =
    entri.narasi.length > 120
      ? `${entri.narasi.slice(0, entri.narasi.lastIndexOf(" ", 120)).trim()}...`
      : entri.narasi;

  return (
    <li className="kartu overflow-hidden">
      <button
        type="button"
        onClick={() => setTerbuka((n) => !n)}
        aria-expanded={terbuka}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-dasar-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-dasar-900">{tanggal}</span>
            <span className="text-sm text-dasar-600">
              usia {entri.usiaBulan} bulan
              {entri.menu.length > 0 && ` · ${entri.menu.length} hidangan`}
              {entri.totalBiayaRp !== null && ` · ${rupiah(entri.totalBiayaRp)}`}
            </span>
          </div>

          {!terbuka && cuplikan && (
            <p className="mt-1.5 text-base leading-relaxed text-dasar-600">{cuplikan}</p>
          )}

          {!terbuka && (
            <span className="mt-1.5 inline-block text-sm font-semibold text-brand-600">
              Lihat selengkapnya
            </span>
          )}
        </div>

        <IkonPanahBawah
          className={`mt-1 h-5 w-5 shrink-0 text-dasar-500 transition-transform ${
            terbuka ? "rotate-180" : ""
          }`}
        />
      </button>

      {terbuka && (
        <div className="space-y-5 border-t border-dasar-200 p-4">
          {entri.totalBiayaRp !== null && (
            <div className="rounded-lg bg-brand-50 p-4">
              <p className="text-sm text-brand-700">Perkiraan belanja satu hari</p>
              <p className="text-2xl font-bold text-brand-700">
                {rupiah(entri.totalBiayaRp)}
              </p>
            </div>
          )}

          {entri.menu.length > 0 && (
            <div>
              <h4 className="font-semibold text-dasar-900">Menu sehari</h4>
              <ul className="mt-2 space-y-2">
                {entri.menu.map((m) => (
                  <li
                    key={`${entri.id}-${m.waktu}`}
                    className="rounded-lg border border-dasar-200 p-3"
                  >
                    <p className="text-sm font-medium text-dasar-600">{m.waktu}</p>
                    <p className="text-base font-semibold text-dasar-900">
                      {m.hidangan}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entri.belanja.length > 0 && (
            <div>
              <h4 className="font-semibold text-dasar-900">Yang perlu dibeli</h4>
              <ul className="mt-2 divide-y divide-dasar-200">
                {entri.belanja.map((b) => (
                  <li
                    key={`${entri.id}-${b.nama}`}
                    className="flex flex-wrap justify-between gap-2 py-2"
                  >
                    <span className="text-base text-dasar-800">
                      {b.nama}{" "}
                      <span className="text-sm text-dasar-600">({b.takaran})</span>
                      {b.manfaat && (
                        <span className="block text-sm text-dasar-600">
                          untuk {b.manfaat}
                        </span>
                      )}
                    </span>
                    <span className="text-base font-medium text-dasar-900">
                      {rupiah(b.hargaRp)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entri.narasi && (
            <div>
              <h4 className="font-semibold text-dasar-900">Cara memasak</h4>
              {/*
                whitespace-pre-wrap mempertahankan pergantian baris antar langkah
                seperti saat narasi disusun. Tanpanya seluruh petunjuk menyatu
                menjadi satu paragraf panjang dan tidak dapat diikuti sambil
                memasak.
              */}
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-dasar-50 p-4 text-base leading-relaxed text-dasar-800">
                {entri.narasi}
              </div>
            </div>
          )}

          {entri.catatanGizi.length > 0 && (
            <div>
              <h4 className="font-semibold text-dasar-900">Catatan</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-dasar-700">
                {entri.catatanGizi.map((c) => (
                  <li key={`${entri.id}-${c}`}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {entri.dariFallback && (
            <p className="rounded-lg bg-dasar-100 p-3 text-sm text-dasar-700">
              Petunjuk memasak disusun tanpa bantuan model bahasa. Menu, bahan, dan
              biaya tetap dihitung kode yang sama.
            </p>
          )}

          <p className="text-sm text-dasar-600">
            Anjuran ini disusun berdasarkan penimbangan pada saat itu. Bila usia atau
            keadaan gizi anak sudah berubah, susun saran baru di atas.
          </p>
        </div>
      )}
    </li>
  );
}
