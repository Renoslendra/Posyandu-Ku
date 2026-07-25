"use client";

import { useState } from "react";

/**
 * Antarmuka import foto buku tulis.
 *
 * Alur yang ditegakkan: baca, periksa, baru simpan. Tidak ada jalur yang
 * memungkinkan hasil pembacaan mesin langsung masuk basis data.
 *
 * Baris bercatatan ditampilkan menonjol supaya kader memusatkan perhatian pada
 * yang patut dicurigai, bukan memeriksa semua baris satu per satu.
 */

interface BarisHasil {
  nama: string;
  beratKg: number | null;
  tinggiCm: number | null;
  tanggal: string | null;
  catatan: string[];
}

export function ImportFoto() {
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [baris, setBaris] = useState<BarisHasil[] | null>(null);

  async function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    setMemuat(true);
    setGalat(null);
    setBaris(null);

    try {
      const dataUrl = await new Promise<string>((selesai, gagal) => {
        const pembaca = new FileReader();
        pembaca.onload = () => selesai(String(pembaca.result));
        pembaca.onerror = () => gagal(new Error("Gagal membaca berkas"));
        pembaca.readAsDataURL(berkas);
      });

      const respons = await fetch("/api/import-foto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gambar: dataUrl }),
      });

      const isi = await respons.json();

      if (!respons.ok) {
        setGalat(isi.galat ?? "Foto tidak dapat dibaca");
        return;
      }

      setBaris(isi.baris);
    } catch {
      setGalat("Tidak dapat mengirim foto. Periksa koneksi Anda.");
    } finally {
      setMemuat(false);
      // Direset agar memilih berkas yang sama dua kali tetap memicu unggahan.
      e.target.value = "";
    }
  }

  function ubahBaris(indeks: number, ubahan: Partial<BarisHasil>) {
    setBaris((lama) =>
      lama ? lama.map((b, i) => (i === indeks ? { ...b, ...ubahan } : b)) : lama,
    );
  }

  const jumlahBercatatan = baris?.filter((b) => b.catatan.length > 0).length ?? 0;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Masukkan catatan buku tulis
        </h2>
        <p className="mt-2 text-base text-slate-700">
          Foto satu halaman buku catatan posyandu. Sistem membaca angkanya, lalu Anda
          memeriksa sebelum disimpan.
        </p>
      </div>

      <label className="inline-flex min-h-touch cursor-pointer items-center rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600">
        {memuat ? "Membaca foto..." : "Pilih atau ambil foto"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={pilihBerkas}
          disabled={memuat}
          className="sr-only"
        />
      </label>

      {galat && (
        <p
          role="alert"
          className="rounded-lg border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900"
        >
          {galat}
        </p>
      )}

      {baris && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            Terbaca {baris.length} baris.
            {jumlahBercatatan > 0 && (
              <>
                {" "}
                <strong>{jumlahBercatatan} baris perlu diperiksa</strong> karena
                angkanya tidak terbaca jelas atau di luar batas wajar.
              </>
            )}{" "}
            Data belum tersimpan.
          </div>

          <ul className="space-y-3">
            {baris.map((b, i) => (
              <li
                key={i}
                className={`rounded-lg border-2 p-4 ${
                  b.catatan.length > 0
                    ? "border-status-risiko bg-amber-50"
                    : "border-slate-200"
                }`}
              >
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Nama</span>
                    <input
                      value={b.nama}
                      onChange={(e) => ubahBaris(i, { nama: e.target.value })}
                      className="mt-1 min-h-touch w-full rounded border-2 border-slate-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Berat (kg)
                    </span>
                    <input
                      inputMode="decimal"
                      value={b.beratKg ?? ""}
                      placeholder="belum terbaca"
                      onChange={(e) =>
                        ubahBaris(i, {
                          beratKg:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value.replace(",", ".")),
                        })
                      }
                      className="mt-1 min-h-touch w-full rounded border-2 border-slate-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Tinggi (cm)
                    </span>
                    <input
                      inputMode="decimal"
                      value={b.tinggiCm ?? ""}
                      placeholder="belum terbaca"
                      onChange={(e) =>
                        ubahBaris(i, {
                          tinggiCm:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value.replace(",", ".")),
                        })
                      }
                      className="mt-1 min-h-touch w-full rounded border-2 border-slate-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Tanggal</span>
                    <input
                      type="date"
                      value={b.tanggal ?? ""}
                      onChange={(e) =>
                        ubahBaris(i, { tanggal: e.target.value || null })
                      }
                      className="mt-1 min-h-touch w-full rounded border-2 border-slate-300 px-2 text-base"
                    />
                  </label>
                </div>

                {b.catatan.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                    {b.catatan.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <p className="text-sm text-slate-600">
            Hasil pembacaan otomatis ditandai sebagai belum dikonfirmasi dan tidak
            dihitung ke dalam statistik sampai Anda menyimpannya.
          </p>
        </div>
      )}
    </section>
  );
}
