"use client";

import { useState } from "react";
import { StatusKoneksi } from "@/components/StatusKoneksi";
import {
  IkonBahaya,
  IkonCentang,
  IkonPanahBawah,
  IkonPeringatan,
} from "@/components/Ikon";
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
        className="flex flex-col gap-form-gap bg-surface rounded-xl shadow-kartu p-4 border border-outline-variant"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="anak" className="font-body-lg text-body-lg text-on-surface">
            Nama Balita
          </label>
          <div className="relative">
            <select
              id="anak"
              value={anakId}
              onChange={(e) => setAnakId(e.target.value)}
              required
              className="w-full h-touch-min appearance-none bg-surface border-2 border-[#d6d3d1] text-on-surface font-body-lg text-body-lg rounded-lg pl-4 pr-10 focus:outline-none focus:border-primary focus:ring-0"
            >
              <option value="" disabled>Pilih balita...</option>
              {daftarAnak.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
            </select>
            {/* pointer-events-none agar ketukan tetap sampai ke elemen select di bawahnya. */}
            <IkonPanahBawah className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-dasar-500" />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <label htmlFor="tanggal" className="font-body-lg text-body-lg text-on-surface">
            Tanggal Pengukuran
          </label>
          <input
            id="tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
            className="w-full h-touch-min bg-surface border-2 border-[#d6d3d1] text-on-surface font-body-lg text-body-lg rounded-lg px-4 focus:outline-none focus:border-primary focus:ring-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="berat" className="font-body-lg text-body-lg text-on-surface">
              Berat Badan
            </label>
            <div className="relative">
              <input
                id="berat"
                type="text"
                inputMode="decimal"
                value={berat}
                onChange={(e) => setBerat(e.target.value)}
                placeholder="0.0"
                required
                className="w-full h-touch-min bg-surface border-2 border-[#d6d3d1] text-on-surface font-display-xl text-[28px] font-bold rounded-lg pl-4 pr-12 focus:outline-none focus:border-primary focus:ring-0 text-right"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body-base text-body-base text-on-surface-variant">kg</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tinggi" className="font-body-lg text-body-lg text-on-surface">
              Tinggi/Panjang
            </label>
            <div className="relative">
              <input
                id="tinggi"
                type="text"
                inputMode="decimal"
                value={tinggi}
                onChange={(e) => setTinggi(e.target.value)}
                placeholder="0.0"
                required
                className="w-full h-touch-min bg-surface border-2 border-[#d6d3d1] text-on-surface font-display-xl text-[28px] font-bold rounded-lg pl-4 pr-12 focus:outline-none focus:border-primary focus:ring-0 text-right"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body-base text-body-base text-on-surface-variant">cm</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <label className="font-body-lg text-body-lg text-on-surface">Cara Ukur Tinggi</label>
          <div className="flex bg-surface-container-low rounded-lg p-1">
            <label className="flex-1 text-center cursor-pointer relative">
              <input 
                className="peer sr-only" 
                name="method" 
                type="radio" 
                checked={!telentang}
                onChange={() => setTelentang(false)}
              />
              <div className="h-touch-min flex items-center justify-center font-body-lg text-body-lg rounded-md peer-checked:bg-surface peer-checked:shadow-halus peer-checked:text-primary transition-all text-on-surface-variant">
                  Berdiri
              </div>
            </label>
            <label className="flex-1 text-center cursor-pointer relative">
              <input 
                className="peer sr-only" 
                name="method" 
                type="radio" 
                checked={telentang}
                onChange={() => setTelentang(true)}
              />
              <div className="h-touch-min flex items-center justify-center font-body-lg text-body-lg rounded-md peer-checked:bg-surface peer-checked:shadow-halus peer-checked:text-primary transition-all text-on-surface-variant">
                  Telentang
              </div>
            </label>
          </div>
        </div>

        {galat && (
          <p role="alert" className="pesan-galat mt-4">
            {galat}
          </p>
        )}

        <div className="pt-4 border-t border-outline-variant mt-2">
          <button
            type="submit"
            disabled={!siap || memuat}
            className="w-full h-[56px] rounded-lg text-on-primary font-body-lg text-body-lg font-bold flex items-center justify-center gap-2 shadow-merek active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
            style={{ background: "linear-gradient(135deg, #0f766e 0%, #083b37 100%)" }}
          >
            {memuat ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Menyimpan...
              </>
            ) : (
              "Simpan Pengukuran"
            )}
          </button>
        </div>
      </form>

      {perluKonfirmasi && (
        <div
          role="alert"
          className="animate-munculNaik space-y-4 rounded-2xl border-2 border-status-risiko-garis bg-status-risiko-lembut p-5"
        >
          <h2 className="text-lg font-bold text-amber-900">Mohon periksa kembali</h2>
          <ul className="space-y-2">
            {perluKonfirmasi.map((t) => (
              <li key={t.kode} className="flex gap-2.5 text-base text-amber-900">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"
                />
                {t.pesan}
              </li>
            ))}
          </ul>
          <p className="text-sm text-amber-800">
            Bila angka di atas sudah benar, lanjutkan menyimpan.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void kirim(true)}
              disabled={memuat}
              className="inline-flex min-h-touch items-center justify-center rounded-xl bg-status-risiko px-5 text-base font-semibold text-white shadow-halus transition-all hover:brightness-95 active:scale-[0.98] disabled:bg-dasar-300"
            >
              Angka sudah benar, simpan
            </button>
            <button
              onClick={() => setPerluKonfirmasi(null)}
              className="tombol-netral !px-5"
            >
              Perbaiki angka
            </button>
          </div>
        </div>
      )}

      {hasil && (
        <section className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-4 mt-6">
          <h3 className="font-section-title text-section-title text-on-surface">Hasil Analisis</h3>
          
          {hasil.tersimpanLuring && (
            <p className="pesan-peringatan mb-2">
              Tersimpan di perangkat ini. Data akan terkirim otomatis saat sinyal kembali.
            </p>
          )}

          <div className={`bg-surface border ${hasil.status === 'normal' ? 'border-status-normal/30' : hasil.status === 'risiko' ? 'border-status-risk/30' : 'border-status-severe/30'} rounded-xl p-5 shadow-kartu relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 w-2 h-full ${hasil.status === 'normal' ? 'bg-status-normal' : hasil.status === 'risiko' ? 'bg-status-risk' : 'bg-status-severe'}`}></div>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${hasil.status === 'normal' ? 'bg-status-normal/10 text-status-normal' : hasil.status === 'risiko' ? 'bg-status-risk/10 text-status-risk' : 'bg-status-severe/10 text-status-severe'}`}>
                {hasil.status === "normal" ? (
                  <IkonCentang className="h-7 w-7" />
                ) : hasil.status === "risiko" ? (
                  <IkonPeringatan className="h-7 w-7" />
                ) : (
                  <IkonBahaya className="h-7 w-7" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={`font-headline-lg-mobile text-headline-lg-mobile capitalize ${hasil.status === 'normal' ? 'text-status-normal' : hasil.status === 'risiko' ? 'text-status-risk' : 'text-status-severe'}`}>
                  {hasil.status === 'berat' ? 'Gizi Berat' : hasil.status}
                </h4>
                <p className="font-body-base text-body-base text-on-surface-variant">Usia {hasil.usiaBulan} Bulan</p>
              </div>
            </div>

            {hasil.status !== "normal" && hasil.penentuStatus && (
              <p className="mt-4 font-body-base text-body-base text-on-surface-variant font-medium">
                Perhatian utama pada {LABEL_INDIKATOR[hasil.penentuStatus].toLowerCase()}. Sampaikan hasil ini kepada bidan.
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-outline-variant/50 pt-4">
              <div>
                <span className="block font-caption-xs text-caption-xs text-on-surface-variant">BB/U Z-Score</span>
                <span className="block font-body-lg text-body-lg text-on-surface font-semibold">
                  {hasil.zBeratUsia !== null ? hasil.zBeratUsia.toFixed(2) : '-'}
                </span>
              </div>
              <div>
                <span className="block font-caption-xs text-caption-xs text-on-surface-variant">TB/U Z-Score</span>
                <span className="block font-body-lg text-body-lg text-on-surface font-semibold">
                  {hasil.zTinggiUsia !== null ? hasil.zTinggiUsia.toFixed(2) : '-'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="block font-caption-xs text-caption-xs text-on-surface-variant">BB/TB Z-Score</span>
                <span className="block font-body-lg text-body-lg text-on-surface font-semibold">
                  {hasil.zBeratTinggi !== null ? hasil.zBeratTinggi.toFixed(2) : '-'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
