"use client";

import { useState } from "react";
import { IkonCentang, IkonKeluarga } from "@/components/Ikon";

/**
 * Pembuatan akun orang tua untuk satu anak.
 *
 * Diletakkan pada halaman anak, bukan disatukan ke formulir pendaftaran.
 * Alasannya, dua pekerjaan ini tidak selalu terjadi bersamaan: kader mendaftarkan
 * anak saat penimbangan berlangsung, sedangkan surel keluarga sering baru
 * diketahui sesudahnya. Mewajibkannya pada formulir pendaftaran akan menghambat
 * pencatatan, dan pencatatan yang terhambat akan dilewati.
 *
 * Sandi awal ditampilkan satu kali dan tidak dapat dibaca kembali. Itu dinyatakan
 * dengan tegas pada tampilannya, sebab kader yang menutup halaman tanpa mencatat
 * sandinya tidak punya jalan memulihkannya selain membuat akun baru.
 */

export function BuatAkunOrangTua({
  anakId,
  namaAnak,
  namaOrangTua,
  sudahTertaut,
}: {
  anakId: string;
  namaAnak: string;
  namaOrangTua: string;
  sudahTertaut: boolean;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [email, setEmail] = useState("");
  const [nama, setNama] = useState(namaOrangTua);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ email: string; sandiAwal: string } | null>(null);

  if (sudahTertaut) {
    return (
      <section className="kartu p-5">
        <h2 className="text-xl font-bold text-dasar-900">Akun orang tua</h2>
        <p className="mt-2 flex items-center gap-2 text-base text-status-normal">
          <IkonCentang className="h-5 w-5 shrink-0" />
          Keluarga sudah memiliki akun dan dapat memantau pertumbuhan {namaAnak}.
        </p>
      </section>
    );
  }

  if (hasil) {
    return (
      <section className="kartu border-2 border-status-normal p-5">
        <h2 className="text-xl font-bold text-dasar-900">Akun orang tua dibuat</h2>

        <p className="mt-2 text-base text-dasar-700">
          Sampaikan keterangan berikut kepada keluarga {namaAnak}.
        </p>

        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm font-medium text-dasar-600">Surel untuk masuk</dt>
            <dd className="break-all font-mono text-lg font-bold text-dasar-900">
              {hasil.email}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-dasar-600">Sandi awal</dt>
            <dd className="break-all font-mono text-2xl font-bold text-brand-700">
              {hasil.sandiAwal}
            </dd>
          </div>
        </dl>

        {/*
          Peringatan ini bukan hiasan. Sandinya tidak disimpan dalam bentuk yang
          dapat dibaca, sehingga tidak ada cara menampilkannya lagi setelah
          halaman ditutup.
        */}
        <p className="pesan-peringatan mt-4">
          Catat sandi ini sekarang. Sandi tidak dapat ditampilkan lagi setelah halaman
          ditutup. Mintalah keluarga menggantinya setelah berhasil masuk.
        </p>
      </section>
    );
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setGalat(null);

    try {
      const respons = await fetch("/api/akun-orangtua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anakId, email, nama }),
      });

      const isi = await respons.json().catch(() => ({}));

      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal membuat akun orang tua.");
        return;
      }

      setHasil({ email: isi.email, sandiAwal: isi.sandiAwal });
    } catch {
      setGalat("Tidak ada koneksi. Akun belum dibuat.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <section className="kartu p-5">
      <h2 className="text-xl font-bold text-dasar-900">Akun orang tua</h2>
      <p className="mt-1 text-base text-dasar-600">
        Belum ada akun untuk keluarga {namaAnak}. Dengan akun, keluarga dapat melihat
        grafik pertumbuhan dan saran menu sendiri, tanpa menunggu hari posyandu.
      </p>

      {!terbuka ? (
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="mt-4 inline-flex min-h-touch items-center gap-2 rounded-lg border-2 border-brand-500 px-5 text-base font-semibold text-brand-700 hover:bg-brand-50"
        >
          <IkonKeluarga className="h-5 w-5" />
          Buatkan akun orang tua
        </button>
      ) : (
        <form onSubmit={kirim} className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="ortu-nama"
              className="block text-base font-semibold text-dasar-900"
            >
              Nama orang tua
            </label>
            <input
              id="ortu-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              maxLength={100}
              className="mt-1 min-h-touch w-full rounded-lg border-2 border-dasar-300 px-3 text-base focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ortu-email"
              className="block text-base font-semibold text-dasar-900"
            >
              Surel keluarga
            </label>
            <input
              id="ortu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={200}
              placeholder="nama@contoh.com"
              className="mt-1 min-h-touch w-full rounded-lg border-2 border-dasar-300 px-3 text-base focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-sm text-dasar-600">
              Dipakai keluarga untuk masuk. Pastikan surelnya benar dan dapat diakses
              keluarga.
            </p>
          </div>

          {galat && (
            <p role="alert" className="pesan-galat">
              {galat}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={memuat}
              className="min-h-touch rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600 disabled:bg-dasar-300"
            >
              {memuat ? "Membuat..." : "Buat akun"}
            </button>
            <button
              type="button"
              onClick={() => setTerbuka(false)}
              disabled={memuat}
              className="min-h-touch rounded-lg px-4 text-base font-semibold text-dasar-700 hover:bg-dasar-100"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
