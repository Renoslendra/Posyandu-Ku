"use client";

import { useState } from "react";
import { LencanaStatus } from "@/components/LencanaStatus";
import { StatusKoneksi } from "@/components/StatusKoneksi";
import { buatKlienRef, tambahKeAntrean } from "@/lib/antrean-offline";
import type { Temuan } from "@/lib/gizi/penjaga-data";
import { nilaiPengukuran, LABEL_INDIKATOR } from "@/lib/gizi/tabel";
import { usiaBulan, type Indikator, type StatusGizi } from "@/lib/gizi/zscore";

/**
 * Formulir pencatatan pengukuran.
 *
 * Prinsip tampilan mengikuti kebutuhan kader di lapangan:
 *   - hanya empat masukan, tidak ada yang opsional di layar utama
 *   - font dan tombol besar, dapat ditekan sambil berdiri
 *   - hasil muncul di layar yang sama, tanpa pindah halaman
 *
 * Nilai yang ditandai penjaga kualitas data tidak langsung ditolak. Kader
 * diberi tahu apa yang mencurigakan, lalu memutuskan sendiri. Kader lebih tahu
 * kondisi sebenarnya daripada sistem.
 */

interface Anak {
  id: string;
  nama: string;
  tanggalLahir: string;
  /** Diperlukan untuk menghitung Z-score di perangkat saat tanpa sinyal. */
  jenisKelamin: "L" | "P";
}

interface HasilSimpan {
  status: StatusGizi | null;
  penentuStatus: Indikator | null;
  usiaBulan: number;
  zBeratUsia: number | null;
  zTinggiUsia: number | null;
  zBeratTinggi: number | null;
  penanda: string[];
  /** true bila baru tersimpan di perangkat dan menunggu dikirim. */
  tersimpanLuring?: boolean;
}

export function FormPengukuran({ daftarAnak }: { daftarAnak: Anak[] }) {
  const [anakId, setAnakId] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [berat, setBerat] = useState("");
  const [tinggi, setTinggi] = useState("");
  const [telentang, setTelentang] = useState(false);

  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [perluKonfirmasi, setPerluKonfirmasi] = useState<Temuan[] | null>(null);
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);

  /**
   * Menyimpan ke antrean perangkat dan menghitung Z-score secara lokal.
   *
   * Dipakai saat tanpa sinyal. Kader tetap melihat status gizi seketika,
   * memakai modul perhitungan yang sama dengan server sehingga hasilnya
   * tidak akan berbeda setelah tersinkron.
   */
  function simpanLuring(beratKg: number, tinggiCm: number) {
    const anak = daftarAnak.find((a) => a.id === anakId);
    if (!anak) {
      setGalat("Data anak tidak ditemukan di perangkat ini.");
      return;
    }

    tambahKeAntrean({
      klienRef: buatKlienRef(),
      anakId,
      tanggal,
      beratKg,
      tinggiCm,
      diukurTelentang: telentang,
      abaikanPenanda: true,
    });

    const usia = usiaBulan(
      new Date(`${anak.tanggalLahir}T00:00:00Z`),
      new Date(`${tanggal}T00:00:00Z`),
    );
    const penilaian = nilaiPengukuran({
      jenisKelamin: anak.jenisKelamin,
      usiaBulan: usia,
      beratKg,
      tinggiCm,
      diukurTelentang: telentang,
    });

    setHasil({
      status: penilaian.status,
      penentuStatus: penilaian.penentuStatus,
      usiaBulan: usia,
      zBeratUsia: penilaian.zBeratUsia,
      zTinggiUsia: penilaian.zTinggiUsia,
      zBeratTinggi: penilaian.zBeratTinggi,
      penanda: [],
      tersimpanLuring: true,
    });
    setBerat("");
    setTinggi("");
  }

  async function kirim(abaikanPenanda: boolean) {
    setMemuat(true);
    setGalat(null);
    if (!abaikanPenanda) setPerluKonfirmasi(null);

    const beratAngka = Number(berat.replace(",", "."));
    const tinggiAngka = Number(tinggi.replace(",", "."));

    // Tanpa sinyal, tidak perlu mencoba jaringan lebih dahulu. Menyimpan
    // langsung ke antrean membuat pencatatan terasa seketika bagi kader.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      simpanLuring(beratAngka, tinggiAngka);
      setMemuat(false);
      return;
    }

    try {
      const respons = await fetch("/api/pengukuran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anakId,
          tanggal,
          // Masukan formulir selalu bertipe teks, sedangkan skema menuntut
          // angka. Konversi dilakukan di sini agar galat tipe tidak muncul
          // sebagai pesan teknis di hadapan kader.
          beratKg: beratAngka,
          tinggiCm: tinggiAngka,
          diukurTelentang: telentang,
          abaikanPenanda,
        }),
      });

      const isi = await respons.json();

      if (respons.status === 409 && isi.perluKonfirmasi) {
        setPerluKonfirmasi(isi.temuan);
        return;
      }
      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal menyimpan pengukuran");
        return;
      }

      setHasil(isi);
      setPerluKonfirmasi(null);
      setBerat("");
      setTinggi("");
    } catch {
      // Sinyal dapat hilang di tengah pengiriman. Data disimpan ke antrean
      // alih-alih meminta kader mengetik ulang.
      simpanLuring(beratAngka, tinggiAngka);
    } finally {
      setMemuat(false);
    }
  }

  const siap = anakId !== "" && berat !== "" && tinggi !== "";

  return (
    <div className="space-y-6">
      <StatusKoneksi />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void kirim(false);
        }}
        className="space-y-5 kartu p-5"
      >
        <div>
          <label htmlFor="anak" className="block text-base font-semibold text-dasar-900">
            Nama anak
          </label>
          <select
            id="anak"
            value={anakId}
            onChange={(e) => setAnakId(e.target.value)}
            required
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          >
            <option value="">Pilih anak</option>
            {daftarAnak.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="berat"
              className="block text-base font-semibold text-dasar-900"
            >
              Berat badan (kg)
            </label>
            <input
              id="berat"
              type="text"
              inputMode="decimal"
              value={berat}
              onChange={(e) => setBerat(e.target.value)}
              placeholder="contoh: 10,5"
              required
              className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-lg"
            />
          </div>

          <div>
            <label
              htmlFor="tinggi"
              className="block text-base font-semibold text-dasar-900"
            >
              Tinggi badan (cm)
            </label>
            <input
              id="tinggi"
              type="text"
              inputMode="decimal"
              value={tinggi}
              onChange={(e) => setTinggi(e.target.value)}
              placeholder="contoh: 80,5"
              required
              className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-lg"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="tanggal"
            className="block text-base font-semibold text-dasar-900"
          >
            Tanggal menimbang
          </label>
          <input
            id="tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base sm:w-auto"
          />
        </div>

        {/*
          Cara pengukuran menentukan tabel WHO yang dipakai, dan selisihnya
          sekitar 0,7 cm. Karena itu ditanyakan, bukan diasumsikan dari usia.
        */}
        <label className="flex items-start gap-3 rounded-lg bg-dasar-50 p-3">
          <input
            type="checkbox"
            checked={telentang}
            onChange={(e) => setTelentang(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-sm text-dasar-700">
            Diukur telentang (anak dibaringkan). Biasanya untuk anak di bawah 2
            tahun.
          </span>
        </label>

        {galat && (
          <p
            role="alert"
            className="rounded-xl border-2 border-status-berat bg-red-50 p-3 text-base text-red-900"
          >
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={!siap || memuat}
          className="min-h-touch w-full rounded-lg bg-brand-500 px-6 text-lg font-semibold text-white hover:bg-brand-600 disabled:bg-dasar-300 disabled:text-dasar-600"
        >
          {memuat ? "Menyimpan..." : "Simpan dan lihat hasil"}
        </button>
      </form>

      {perluKonfirmasi && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border-2 border-status-risiko bg-amber-50 p-5"
        >
          <h2 className="text-lg font-bold text-amber-900">Mohon periksa kembali</h2>
          <ul className="list-disc space-y-1 pl-5 text-base text-amber-900">
            {perluKonfirmasi.map((t) => (
              <li key={t.kode}>{t.pesan}</li>
            ))}
          </ul>
          <p className="text-sm text-amber-800">
            Bila angka di atas sudah benar, lanjutkan menyimpan.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void kirim(true)}
              disabled={memuat}
              className="min-h-touch rounded-lg bg-status-risiko px-5 font-semibold text-white"
            >
              Angka sudah benar, simpan
            </button>
            <button
              onClick={() => setPerluKonfirmasi(null)}
              className="min-h-touch rounded-xl border-2 border-dasar-400 px-5 font-semibold text-dasar-700"
            >
              Perbaiki angka
            </button>
          </div>
        </div>
      )}

      {hasil && (
        <div className="space-y-4 kartu p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-dasar-900">Hasil</h2>
            <LencanaStatus status={hasil.status} ukuran="besar" />
          </div>

          {hasil.tersimpanLuring && (
            <p className="rounded-xl border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900">
              Tersimpan di perangkat ini. Data akan terkirim otomatis saat sinyal
              kembali.
            </p>
          )}

          <p className="text-base text-dasar-700">Usia {hasil.usiaBulan} bulan.</p>

          {hasil.status !== "normal" && hasil.penentuStatus && (
            <p className="text-base text-dasar-700">
              Perhatian utama pada {LABEL_INDIKATOR[hasil.penentuStatus].toLowerCase()}.
            </p>
          )}

          <dl className="grid gap-2 text-sm text-dasar-600 sm:grid-cols-3">
            <div>
              <dt className="font-medium text-dasar-700">Berat menurut umur</dt>
              <dd>{hasil.zBeratUsia ?? "tidak terhitung"}</dd>
            </div>
            <div>
              <dt className="font-medium text-dasar-700">Tinggi menurut umur</dt>
              <dd>{hasil.zTinggiUsia ?? "tidak terhitung"}</dd>
            </div>
            <div>
              <dt className="font-medium text-dasar-700">Berat menurut tinggi</dt>
              <dd>{hasil.zBeratTinggi ?? "tidak terhitung"}</dd>
            </div>
          </dl>

          {hasil.status !== "normal" && (
            <p className="rounded-lg bg-dasar-50 p-3 text-base text-dasar-800">
              Sampaikan hasil ini kepada bidan agar anak dapat diperiksa lebih
              lanjut.
            </p>
          )}

          <p className="text-sm text-dasar-600">
            Angka di atas adalah Z-score menurut standar WHO. Ini alat bantu, bukan
            diagnosis.
          </p>
        </div>
      )}
    </div>
  );
}
