"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IkonGambar, IkonKamera, IkonPindaiDokumen } from "@/components/Ikon";

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
  /*
   * Berat dan tinggi disimpan sebagai teks apa adanya, bukan sebagai angka.
   *
   * Sebelumnya keduanya bertipe number, dan setiap ketukan diubah dengan
   * `Number()`. Akibatnya koma yang baru diketik selalu hilang: mengetik "12",
   * lalu koma, menghasilkan `Number("12.")` yaitu 12, yang dirender kembali
   * sebagai "12" tanpa koma. Angka berikutnya menempel, sehingga kader yang
   * mengoreksi menjadi 12,5 justru menyimpan 125.
   *
   * Pada berat, nilai 125 tertangkap penjaga data sebagai tidak wajar. Pada
   * tinggi, 125 cm adalah nilai yang sah bagi balita, sehingga angka keliru
   * masuk basis data tanpa ada yang menolaknya, lalu menghasilkan Z-score dan
   * status gizi yang salah. Tidak ada apa pun pada alur ini yang dapat
   * mendeteksinya.
   *
   * Menyimpan teks mentah dan mengonversi hanya saat pengiriman menghapus
   * seluruh kelas kesalahan itu, dan mengikuti pola yang sudah dipakai
   * FormPengukuran.
   */
  beratKg: string;
  tinggiCm: string;
  tanggal: string | null;
  catatan: string[];
  /** Pilihan anak dari kader, bila nama tidak dapat dicocokkan otomatis. */
  anakId?: string;
}

/**
 * Mengubah masukan kader menjadi angka.
 *
 * Menerima koma sebagai pemisah desimal, sebagaimana lazim ditulis di Indonesia.
 * Seluruh koma diganti, bukan hanya yang pertama, agar salah ketik seperti
 * "12,5," tidak diam-diam menjadi bilangan yang tidak berhingga.
 *
 * Mengembalikan null bila hasilnya bukan bilangan berhingga, sehingga nilai yang
 * tidak dapat dibaca tidak pernah menjadi angka yang tampak meyakinkan.
 */
function keAngka(teks: string): number | null {
  const bersih = teks.trim().replace(/,/g, ".");
  if (bersih === "") return null;

  const angka = Number(bersih);
  return Number.isFinite(angka) ? angka : null;
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

      /*
       * Angka dari server diubah menjadi teks saat diterima.
       *
       * Server mengirim number atau null, sedangkan kolom masukan menyimpan
       * teks. Konversi dilakukan sekali di sini alih-alih di setiap tempat
       * pemakaian, sehingga tidak ada kolom yang menerima nilai bertipe salah.
       */
      type BarisDariServer = {
        nama?: unknown;
        beratKg?: unknown;
        tinggiCm?: unknown;
        tanggal?: unknown;
        catatan?: unknown;
      };

      const keTeks = (n: unknown): string =>
        typeof n === "number" && Number.isFinite(n) ? String(n) : "";

      setBaris(
        (isi.baris as BarisDariServer[]).map((b) => ({
          nama: typeof b.nama === "string" ? b.nama : "",
          beratKg: keTeks(b.beratKg),
          tinggiCm: keTeks(b.tinggiCm),
          tanggal: typeof b.tanggal === "string" ? b.tanggal : null,
          catatan: Array.isArray(b.catatan) ? (b.catatan as string[]) : [],
        })),
      );
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

  /**
   * Baris dianggap siap bila ketiga nilai wajibnya terisi dan terbaca sebagai
   * angka.
   *
   * Pemeriksaan angka dilakukan di sini, bukan hanya saat mengirim, agar baris
   * yang isinya tidak dapat dibaca tidak ikut terhitung pada "N baris siap
   * disimpan". Menampilkan hitungan yang lebih besar daripada yang benar-benar
   * terkirim membuat kader mengira ada data yang hilang.
   */
  function siapDisimpan(b: BarisHasil): boolean {
    return (
      b.nama.trim().length > 0 &&
      keAngka(b.beratKg) !== null &&
      keAngka(b.tinggiCm) !== null &&
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

    /*
     * Konversi ke angka terjadi di sini, satu kali, bukan pada setiap ketukan.
     *
     * Nilai non-null dijamin oleh `siapDisimpan` yang sudah memanggil `keAngka`
     * atas baris yang sama, sehingga penegasan tipe di bawah aman. Server tetap
     * memvalidasi ulang seluruhnya dan menghitung sendiri Z-score-nya.
     */
    const siap = dikirim.map(({ b }) => ({
      nama: b.nama.trim(),
      beratKg: keAngka(b.beratKg) as number,
      tinggiCm: keAngka(b.tinggiCm) as number,
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
    <section className="bg-merek-lembut rounded-xl p-4 border border-primary-container/20 flex flex-col gap-3 shadow-halus relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/10 rounded-full blur-xl"></div>
      
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <IkonPindaiDokumen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-section-title text-section-title text-primary-container mb-1">Pindai Buku Tulis</h2>
            <p className="font-body-base text-body-base text-primary-container/80 mb-3">
              Otomatis isi data dengan memfoto buku catatan Posyandu.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          {/*
            capture="environment" meminta peramban ponsel membuka kamera belakang
            secara langsung, bukan menampilkan pemilih berkas.
          */}
          <label className="flex-1 h-touch-min px-4 bg-surface rounded-lg border-2 border-primary-container text-primary-container font-body-lg text-body-lg flex items-center gap-2 active:scale-95 transition-transform w-full justify-center cursor-pointer">
            <IkonKamera className="h-5 w-5" />
            {memuat ? "Membaca foto..." : "Ambil Foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={pilihBerkas}
              disabled={memuat}
              className="sr-only"
            />
          </label>

          {/* Tanpa capture, peramban membuka galeri atau berkas tersimpan. */}
          <label className="flex-1 h-touch-min px-4 bg-transparent rounded-lg border border-primary-container/50 text-primary-container/80 font-body-base text-body-base flex items-center gap-2 active:scale-95 transition-transform w-full justify-center cursor-pointer hover:bg-primary-container/5">
            <IkonGambar className="h-5 w-5" />
            Pilih Galeri
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={pilihBerkas}
              disabled={memuat}
              className="sr-only"
            />
          </label>
        </div>
      </div>

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
          className={`rounded-xl border-2 p-4 ${ringkasan.gagal === 0
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
                className={`rounded-xl border-2 p-4 ${b.catatan.length > 0
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
                    {/*
                      Nilai disimpan sebagai teks apa adanya. Konversi hanya
                      terjadi saat pengiriman, sehingga koma yang sedang diketik
                      tidak pernah hilang di tengah jalan.
                    */}
                    <input
                      inputMode="decimal"
                      value={b.beratKg}
                      placeholder="belum terbaca"
                      onChange={(e) => ubahBaris(i, { beratKg: e.target.value })}
                      className="mt-1 min-h-touch w-full rounded border-2 border-dasar-300 px-2 text-base"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-dasar-700">
                      Tinggi (cm)
                    </span>
                    <input
                      inputMode="decimal"
                      value={b.tinggiCm}
                      placeholder="belum terbaca"
                      onChange={(e) => ubahBaris(i, { tinggiCm: e.target.value })}
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
