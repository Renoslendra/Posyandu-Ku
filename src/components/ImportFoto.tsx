"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Antarmuka import catatan buku tulis.
 *
 * Alur yang ditegakkan: baca, periksa, baru simpan. Hasil pembacaan mesin tidak
 * pernah masuk basis data tanpa melewati mata kader (FR-10.5).
 *
 * Dua jalan masuk disediakan: memotret langsung dengan kamera, atau memilih
 * berkas yang sudah ada. Keduanya dipisah menjadi dua tombol karena satu tombol
 * gabungan memunculkan menu pilihan di ponsel, dan menu tambahan adalah
 * hambatan bagi kader yang sedang berdiri di meja penimbangan.
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
  /** Pilihan anak dari kader, bila nama tidak dapat dicocokkan otomatis. */
  anakId?: string;
}

interface HasilSimpanBaris {
  indeks: number;
  nama: string;
  ok: boolean;
  galat?: string;
  status?: string;
}

interface RingkasanSimpan {
  berhasil: number;
  gagal: number;
  hasil: HasilSimpanBaris[];
}

export function ImportFoto({
  daftarAnak,
}: {
  daftarAnak: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [baris, setBaris] = useState<BarisHasil[] | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanSimpan | null>(null);

  async function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    setMemuat(true);
    setGalat(null);
    setBaris(null);
    setRingkasan(null);

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

      if (!isi.baris || isi.baris.length === 0) {
        setGalat(
          "Tidak ada baris yang terbaca dari foto ini. Coba foto ulang dengan cahaya lebih terang, atau masukkan data secara manual.",
        );
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

  function hapusBaris(indeks: number) {
    setBaris((lama) => (lama ? lama.filter((_, i) => i !== indeks) : lama));
  }

  /** Baris dianggap siap bila ketiga nilai wajibnya terisi. */
  function siapDisimpan(b: BarisHasil): boolean {
    return (
      b.nama.trim().length > 0 &&
      b.beratKg !== null &&
      Number.isFinite(b.beratKg) &&
      b.tinggiCm !== null &&
      Number.isFinite(b.tinggiCm) &&
      Boolean(b.tanggal)
    );
  }

  const jumlahSiap = baris?.filter(siapDisimpan).length ?? 0;
  const jumlahBercatatan = baris?.filter((b) => b.catatan.length > 0).length ?? 0;

  async function simpan() {
    if (!baris) return;

    setMenyimpan(true);
    setGalat(null);

    // Hanya baris yang lengkap dikirim. Baris yang angkanya tidak terbaca
    // dibiarkan di layar agar kader dapat melengkapinya kemudian.
    //
    // Urutan aslinya dicatat supaya balasan server, yang memakai indeks pada
    // muatan kiriman, dapat dipetakan kembali ke baris yang tampil di layar.
    const dikirim = baris
      .map((b, urutanAsli) => ({ b, urutanAsli }))
      .filter(({ b }) => siapDisimpan(b));

    const siap = dikirim.map(({ b }) => ({
      nama: b.nama.trim(),
      beratKg: b.beratKg as number,
      tinggiCm: b.tinggiCm as number,
      tanggal: b.tanggal as string,
      ...(b.anakId ? { anakId: b.anakId } : {}),
    }));

    try {
      const respons = await fetch("/api/import-simpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baris: siap }),
      });
      const isi = await respons.json();

      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal menyimpan data");
        return;
      }

      setRingkasan({ berhasil: isi.berhasil, gagal: isi.gagal, hasil: isi.hasil });

      // Baris yang berhasil dibuang dari layar; yang gagal ditinggalkan agar
      // kader dapat memperbaikinya tanpa memfoto ulang.
      //
      // Indeks pada balasan menunjuk posisi di muatan kiriman, sehingga perlu
      // diterjemahkan dulu ke posisi aslinya di layar.
      const urutanAsliBerhasil = new Set(
        (isi.hasil as HasilSimpanBaris[])
          .filter((h) => h.ok)
          .map((h) => dikirim[h.indeks]?.urutanAsli)
          .filter((u): u is number => u !== undefined),
      );

      const sisa = baris.filter((_, i) => !urutanAsliBerhasil.has(i));
      setBaris(sisa.length > 0 ? sisa : null);

      router.refresh();
    } catch {
      setGalat("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <section className="space-y-5 kartu p-5">
      <div>
        <h2 className="text-xl font-bold text-dasar-900">
          Masukkan catatan buku tulis
        </h2>
        <p className="mt-2 text-base text-dasar-700">
          Foto satu halaman buku catatan posyandu. Sistem membaca angkanya, lalu Anda
          memeriksa dan menyimpannya.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/*
          capture="environment" meminta peramban ponsel membuka kamera belakang
          secara langsung, bukan menampilkan pemilih berkas.
        */}
        <label className="inline-flex min-h-touch cursor-pointer items-center rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600">
          {memuat ? "Membaca foto..." : "Foto dengan kamera"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={pilihBerkas}
            disabled={memuat}
            className="sr-only"
          />
        </label>

        {/* Tanpa capture, peramban membuka galeri atau berkas tersimpan. */}
        <label className="inline-flex min-h-touch cursor-pointer items-center rounded-xl border-2 border-brand-500 px-6 text-base font-semibold text-brand-700 hover:bg-brand-50">
          Pilih foto tersimpan
          <input
            type="file"
            accept="image/*"
            onChange={pilihBerkas}
            disabled={memuat}
            className="sr-only"
          />
        </label>
      </div>

      <p className="text-sm text-dasar-600">
        Tidak punya foto? Anda tetap dapat mencatat penimbangan dengan mengetik pada
        formulir di atas.
      </p>

      {galat && (
        <p
          role="alert"
          className="rounded-xl border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900"
        >
          {galat}
        </p>
      )}

      {ringkasan && (
        <div
          role="status"
          className={`rounded-xl border-2 p-4 ${
            ringkasan.gagal === 0
              ? "border-status-normal bg-green-50"
              : "border-status-risiko bg-amber-50"
          }`}
        >
          <p className="text-base font-semibold text-dasar-900">
            {ringkasan.berhasil} baris tersimpan
            {ringkasan.gagal > 0 && `, ${ringkasan.gagal} baris perlu diperbaiki`}
          </p>
          {ringkasan.gagal > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {ringkasan.hasil
                .filter((h) => !h.ok)
                .map((h) => (
                  <li key={h.indeks}>
                    {h.nama || "(nama kosong)"}: {h.galat}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {baris && (
        <div className="space-y-4">
          <div className="rounded-lg bg-dasar-100 p-3 text-sm text-dasar-700">
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
                className={`rounded-xl border-2 p-4 ${
                  b.catatan.length > 0
                    ? "border-status-risiko bg-amber-50"
                    : "border-dasar-200"
                }`}
              >
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="block">
                    <span className="text-sm font-medium text-dasar-700">Nama</span>
                    <input
                      value={b.nama}
                      onChange={(e) => ubahBaris(i, { nama: e.target.value })}
                      className="mt-1 min-h-touch w-full rounded border-2 border-dasar-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-dasar-700">
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
                      className="mt-1 min-h-touch w-full rounded border-2 border-dasar-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-dasar-700">
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
                      className="mt-1 min-h-touch w-full rounded border-2 border-dasar-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-dasar-700">Tanggal</span>
                    <input
                      type="date"
                      value={b.tanggal ?? ""}
                      onChange={(e) =>
                        ubahBaris(i, { tanggal: e.target.value || null })
                      }
                      className="mt-1 min-h-touch w-full rounded border-2 border-dasar-300 px-2 text-base"
                    />
                  </label>
                </div>

                {/*
                  Pilihan anak disediakan untuk baris yang namanya tidak dapat
                  dicocokkan otomatis. Dibiarkan kosong berarti sistem yang
                  mencocokkan; kader dapat menimpanya kapan pun.
                */}
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-dasar-700">
                    Anak yang dimaksud{" "}
                    <span className="font-normal text-dasar-600">
                      (isi bila nama tidak cocok otomatis)
                    </span>
                  </span>
                  <select
                    value={b.anakId ?? ""}
                    onChange={(e) =>
                      ubahBaris(i, { anakId: e.target.value || undefined })
                    }
                    className="mt-1 min-h-touch w-full rounded border-2 border-dasar-300 px-2 text-base"
                  >
                    <option value="">Cocokkan otomatis dari nama</option>
                    {daftarAnak.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama}
                      </option>
                    ))}
                  </select>
                </label>

                {b.catatan.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                    {b.catatan.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}

                {!siapDisimpan(b) && (
                  <p className="mt-2 text-sm text-dasar-600">
                    Baris ini belum lengkap dan tidak akan disimpan. Lengkapi nama,
                    berat, tinggi, dan tanggal.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => hapusBaris(i)}
                  className="mt-3 text-sm font-medium text-dasar-600 underline"
                >
                  Buang baris ini
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={simpan}
              disabled={menyimpan || jumlahSiap === 0}
              className="min-h-touch rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600 disabled:bg-dasar-300 disabled:text-dasar-600"
            >
              {menyimpan
                ? "Menyimpan..."
                : `Simpan ${jumlahSiap} baris yang sudah lengkap`}
            </button>
            <button
              type="button"
              onClick={() => {
                setBaris(null);
                setGalat(null);
              }}
              className="min-h-touch rounded-xl border-2 border-dasar-400 px-6 text-base font-semibold text-dasar-700"
            >
              Batalkan
            </button>
          </div>

          <p className="text-sm text-dasar-600">
            Angka disimpan bersama jejak asalnya sebagai hasil pembacaan foto, dan
            dihitung ulang menurut standar WHO oleh sistem, bukan oleh AI.
          </p>
        </div>
      )}
    </section>
  );
}
