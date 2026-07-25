"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tanggalHariIni } from "@/lib/tanggal";

/**
 * Perbaikan data anak oleh kader (FR-04.6).
 *
 * Hanya ditampilkan kepada kader. Bidan dan orang tua tidak melihat tombolnya,
 * sejalan dengan kebijakan RLS yang membatasi pengubahan pada kader posyandu
 * yang bersangkutan.
 *
 * Tanggal lahir diberi peringatan tersendiri karena mengubahnya membuat usia
 * pada pengukuran lama tidak lagi sesuai, sehingga Z-score tersimpan menjadi
 * keliru. Perhitungan ulang riwayat berada di luar cakupan MVP, jadi yang
 * dilakukan adalah memberi tahu kader alih-alih membiarkan data salah diam-diam.
 */

interface Props {
  anak: {
    id: string;
    nama: string;
    tanggal_lahir: string;
    jenis_kelamin: "L" | "P";
    nama_orang_tua: string;
    telepon?: string | null;
    alamat?: string | null;
  };
  adaRiwayat: boolean;
}

export function FormEditAnak({ anak, adaRiwayat }: Props) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);

  /*
   * Batas tanggal lahir diisi setelah pemasangan memakai waktu lokal, dengan
   * alasan yang sama seperti pada formulir pendaftaran anak: toISOString selalu
   * mengembalikan UTC, sehingga batasnya bergeser sehari bagi pengguna di
   * Indonesia sebelum jam tujuh pagi.
   */
  const [batasTanggal, setBatasTanggal] = useState("");

  useEffect(() => {
    setBatasTanggal(tanggalHariIni());
  }, []);

  const [nama, setNama] = useState(anak.nama);
  const [tanggalLahir, setTanggalLahir] = useState(anak.tanggal_lahir);
  const [jenisKelamin, setJenisKelamin] = useState<"L" | "P">(anak.jenis_kelamin);
  const [namaOrangTua, setNamaOrangTua] = useState(anak.nama_orang_tua);
  const [telepon, setTelepon] = useState(anak.telepon ?? "");
  const [alamat, setAlamat] = useState(anak.alamat ?? "");

  const tanggalBerubah = tanggalLahir !== anak.tanggal_lahir;

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setGalat(null);

    try {
      const respons = await fetch("/api/anak", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: anak.id,
          nama,
          tanggalLahir,
          jenisKelamin,
          namaOrangTua,
          telepon,
          alamat,
        }),
      });
      const isi = await respons.json();

      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal memperbarui data anak");
        return;
      }

      setBerhasil("Data anak berhasil diperbarui.");
      setTerbuka(false);
      router.refresh();
    } catch {
      setGalat("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setMemuat(false);
    }
  }

  if (!terbuka) {
    return (
      <div>
        <button
          onClick={() => {
            setTerbuka(true);
            setBerhasil(null);
          }}
          className="min-h-touch rounded-xl border-2 border-dasar-400 px-5 text-base font-semibold text-dasar-700 hover:bg-dasar-50"
        >
          Perbaiki data anak
        </button>
        {berhasil && (
          <p role="status" className="mt-3 text-base text-status-normal">
            {berhasil}
          </p>
        )}
      </div>
    );
  }

  const siap =
    nama.trim().length >= 2 && tanggalLahir !== "" && namaOrangTua.trim().length >= 2;

  return (
    <form
      onSubmit={kirim}
      className="space-y-5 rounded-xl border-2 border-brand-200 bg-white p-5"
    >
      <h2 className="text-xl font-bold text-dasar-900">Perbaiki data anak</h2>

      <div>
        <label htmlFor="e-nama" className="block text-base font-semibold text-dasar-900">
          Nama anak
        </label>
        <input
          id="e-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="e-tanggal"
            className="block text-base font-semibold text-dasar-900"
          >
            Tanggal lahir
          </label>
          <input
            id="e-tanggal"
            type="date"
            value={tanggalLahir}
            onChange={(e) => setTanggalLahir(e.target.value)}
                      max={batasTanggal}
            required
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          />
        </div>

        <div>
          <span className="block text-base font-semibold text-dasar-900">
            Jenis kelamin
          </span>
          <div className="mt-2 flex gap-3">
            {(
              [
                ["L", "Laki-laki"],
                ["P", "Perempuan"],
              ] as const
            ).map(([nilai, label]) => (
              <button
                key={nilai}
                type="button"
                onClick={() => setJenisKelamin(nilai)}
                aria-pressed={jenisKelamin === nilai}
                className={`min-h-touch flex-1 rounded-xl border-2 px-4 text-base font-medium ${
                  jenisKelamin === nilai
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-dasar-300 text-dasar-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Peringatan hanya muncul bila tanggal benar-benar diubah dan sudah ada
          riwayat penimbangan yang terpengaruh. */}
      {tanggalBerubah && adaRiwayat && (
        <p
          role="alert"
          className="rounded-xl border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900"
        >
          Tanggal lahir diubah. Usia pada riwayat penimbangan sebelumnya tidak
          dihitung ulang, sehingga status gizi lama mungkin tidak lagi sesuai. Mohon
          timbang ulang anak ini untuk mendapat status yang benar.
        </p>
      )}

      <div>
        <label
          htmlFor="e-orangtua"
          className="block text-base font-semibold text-dasar-900"
        >
          Nama orang tua
        </label>
        <input
          id="e-orangtua"
          value={namaOrangTua}
          onChange={(e) => setNamaOrangTua(e.target.value)}
          required
          className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="e-telepon"
            className="block text-base font-semibold text-dasar-900"
          >
            Nomor telepon{" "}
            <span className="font-normal text-dasar-600">(boleh dikosongkan)</span>
          </label>
          <input
            id="e-telepon"
            inputMode="tel"
            value={telepon}
            onChange={(e) => setTelepon(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          />
        </div>

        <div>
          <label
            htmlFor="e-alamat"
            className="block text-base font-semibold text-dasar-900"
          >
            Alamat{" "}
            <span className="font-normal text-dasar-600">(boleh dikosongkan)</span>
          </label>
          <input
            id="e-alamat"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          />
        </div>
      </div>

      {galat && (
        <p
          role="alert"
          className="rounded-xl border-2 border-status-berat bg-red-50 p-3 text-base text-red-900"
        >
          {galat}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!siap || memuat}
          className="min-h-touch rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600 disabled:bg-dasar-300 disabled:text-dasar-600"
        >
          {memuat ? "Menyimpan..." : "Simpan perubahan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTerbuka(false);
            setGalat(null);
          }}
          className="min-h-touch rounded-xl border-2 border-dasar-400 px-6 text-base font-semibold text-dasar-700"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
