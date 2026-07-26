"use client";

import { useState } from "react";
import { IkonCentang, IkonTelepon } from "@/components/Ikon";

/**
 * Tombol penanda tindak lanjut pada daftar anak yang berhenti menimbang.
 *
 * Persoalan yang diselesaikan bukan pencatatan, melainkan pengelolaan pekerjaan.
 * Bidan yang membuka daftar berisi dua belas nama perlu tahu mana yang sudah ia
 * kerjakan, dan tanpa penanda ia harus mengingatnya sendiri. Ingatan gagal, dan
 * kegagalannya berarti keluarga yang sama ditelepon dua kali sementara yang lain
 * tidak pernah.
 *
 * Rancangannya sengaja seringan mungkin: satu tekan untuk menandai, tanpa
 * formulir dan tanpa catatan wajib. Pencatatan yang menuntut pengisian akan
 * dilewati saat sedang sibuk, dan penanda yang tidak pernah diisi tidak lebih
 * berguna daripada tidak ada penanda.
 *
 * Menandai tidak menghapus anaknya dari daftar. Anak itu tetap berada di bawah
 * ambang jeda kunjungan sampai ia benar-benar datang menimbang, dan
 * menyembunyikannya akan menukar satu masalah dengan masalah yang lebih buruk:
 * daftar yang tampak bersih padahal tidak ada yang berubah pada anaknya.
 */

export function TombolTindakLanjut({
  anakId,
  sudah,
  telepon,
}: {
  anakId: string;
  /** Tanggal tindak lanjut terakhir, bila pernah ada. */
  sudah: string | null;
  telepon: string | null;
}) {
  const [status, setStatus] = useState<"diam" | "kirim" | "selesai" | "galat">(
    sudah ? "selesai" : "diam",
  );
  const [pesan, setPesan] = useState<string | null>(null);

  async function tandai(jenis: "ditelepon" | "tidak_terjangkau") {
    setStatus("kirim");
    setPesan(null);

    try {
      const tanggapan = await fetch("/api/tindak-lanjut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anakId, jenis }),
      });

      const isi = await tanggapan.json().catch(() => ({}));

      if (!tanggapan.ok) {
        setStatus("galat");
        setPesan(isi.galat ?? "Gagal menyimpan catatan.");
        return;
      }

      setStatus("selesai");
    } catch {
      /*
       * Kegagalan jaringan dibedakan dari penolakan peladen. Bidan yang sedang
       * di lapangan sering kehilangan sinyal, dan pesan yang menyebut sebabnya
       * mencegahnya menekan tombol berulang kali tanpa hasil.
       */
      setStatus("galat");
      setPesan("Tidak ada koneksi. Catatan belum tersimpan.");
    }
  }

  if (status === "selesai") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-normal-lembut px-3 py-1.5 text-sm font-semibold text-status-normal">
        <IkonCentang className="h-4 w-4" />
        Sudah dihubungi
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {telepon && (
          <a
            href={`tel:${telepon}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-500 hover:text-white"
            title={`Hubungi ${telepon}`}
          >
            <IkonTelepon className="h-5 w-5" />
            <span className="sr-only">Hubungi {telepon}</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => tandai("ditelepon")}
          disabled={status === "kirim"}
          className="rounded-full border border-dasar-300 px-3 py-1.5 text-sm font-semibold text-dasar-700 transition-colors hover:border-brand-500 hover:text-brand-600 disabled:opacity-50"
        >
          {status === "kirim" ? "Menyimpan..." : "Tandai sudah"}
        </button>
      </div>

      {status === "galat" && pesan && (
        <p className="max-w-52 text-right text-sm text-status-berat">{pesan}</p>
      )}
    </div>
  );
}
