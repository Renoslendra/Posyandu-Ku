"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tanggalHariIni } from "@/lib/tanggal";

/**
 * Formulir pendaftaran anak baru.
 *
 * Disembunyikan di balik satu tombol karena kegiatan utama kader adalah
 * menimbang, bukan mendaftar. Anak baru hanya muncul sesekali, sehingga
 * formulirnya tidak perlu menempati layar utama.
 *
 * Nomor telepon dan alamat bersifat opsional: kader sering tidak memilikinya
 * saat penimbangan berlangsung, dan menuntutnya akan menghambat pencatatan.
 */
export function FormAnakBaru() {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [peringatan, setPeringatan] = useState<string | null>(null);

  /*
   * Batas tanggal lahir diisi setelah pemasangan memakai waktu lokal.
   *
   * Menghitungnya saat render dengan toISOString membuat batasnya bergeser
   * sehari bagi pengguna di Indonesia sebelum jam tujuh pagi, sebab toISOString
   * selalu mengembalikan UTC. Akibatnya bayi yang lahir hari itu tidak dapat
   * didaftarkan. Nilai kosong berarti tanpa batas, dan itu aman karena server
   * beserta check constraint basis data tetap menolak tanggal di masa depan.
   */
  const [batasTanggal, setBatasTanggal] = useState("");

  useEffect(() => {
    setBatasTanggal(tanggalHariIni());
  }, []);

  const [nama, setNama] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState<"L" | "P" | "">("");
  const [namaOrangTua, setNamaOrangTua] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [alergi, setAlergi] = useState("");

  function kosongkan() {
    setNama("");
    setTanggalLahir("");
    setJenisKelamin("");
    setNamaOrangTua("");
    setTelepon("");
    setAlamat("");
    setAlergi("");
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setGalat(null);
    setBerhasil(null);
    setPeringatan(null);

    try {
      const respons = await fetch("/api/anak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          tanggalLahir,
          jenisKelamin,
          namaOrangTua,
          telepon,
          alamat,
          alergi,
        }),
      });
      const isi = await respons.json();

      if (!respons.ok) {
        setGalat(isi.galat ?? "Gagal menyimpan data anak");
        return;
      }

      setBerhasil(`${isi.nama} berhasil didaftarkan.`);
      kosongkan();

      if (isi.peringatanNamaSerupa) {
        /*
         * Formulir dibiarkan terbuka bila ada nama serupa, agar peringatannya
         * terbaca. Kader perlu memastikan ini bukan anak yang sama sebelum
         * beralih ke pekerjaan berikutnya.
         */
        setPeringatan(
          `Sudah ada anak bernama ${isi.peringatanNamaSerupa} di posyandu ini. Mohon pastikan ini bukan anak yang sama.`,
        );
      } else {
        /*
         * Formulir ditutup supaya pesan keberhasilan terlihat.
         *
         * Sebelumnya pesan ini hanya dirender pada tampilan tertutup, sedangkan
         * formulir tetap terbuka setelah penyimpanan berhasil. Akibatnya kader
         * tidak pernah melihat konfirmasi apa pun: yang tampak hanyalah semua
         * kolom mengosong, dan itu tanda yang sama persis dengan formulir yang
         * terhapus karena kegagalan.
         */
        setTerbuka(false);
      }
      // Menyegarkan halaman agar anak baru muncul di daftar pilihan.
      router.refresh();
    } catch {
      setGalat("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setMemuat(false);
    }
  }

  if (!terbuka) {
    return (
      <div className="kartu p-5">
        <button
          onClick={() => setTerbuka(true)}
          className="min-h-touch rounded-xl border-2 border-brand-500 px-6 text-base font-semibold text-brand-700 hover:bg-brand-50"
        >
          Daftarkan anak baru
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
    nama.trim().length >= 2 &&
    tanggalLahir !== "" &&
    jenisKelamin !== "" &&
    namaOrangTua.trim().length >= 2;

  return (
    <form
      onSubmit={kirim}
      className="space-y-5 kartu p-5"
    >
      <h2 className="text-xl font-bold text-dasar-900">Daftarkan anak baru</h2>

      <div>
        <label htmlFor="nama" className="block text-base font-semibold text-dasar-900">
          Nama anak
        </label>
        <input
          id="nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tanggalLahir"
            className="block text-base font-semibold text-dasar-900"
          >
            Tanggal lahir
          </label>
          <input
            id="tanggalLahir"
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
          {/*
            Dibuat sebagai dua tombol besar, bukan menu pilihan, karena hanya
            ada dua kemungkinan dan tombol lebih mudah ditekan di lapangan.
          */}
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
                className={`min-h-touch flex-1 rounded-xl border-2 px-4 text-base font-medium ${jenisKelamin === nilai
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

      <div>
        <label
          htmlFor="namaOrangTua"
          className="block text-base font-semibold text-dasar-900"
        >
          Nama orang tua
        </label>
        <input
          id="namaOrangTua"
          value={namaOrangTua}
          onChange={(e) => setNamaOrangTua(e.target.value)}
          required
          className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="telepon"
            className="block text-base font-semibold text-dasar-900"
          >
            Nomor telepon <span className="font-normal text-dasar-600">(boleh dikosongkan)</span>
          </label>
          <input
            id="telepon"
            inputMode="tel"
            value={telepon}
            onChange={(e) => setTelepon(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          />
        </div>

        <div>
          <label
            htmlFor="alamat"
            className="block text-base font-semibold text-dasar-900"
          >
            Alamat <span className="font-normal text-dasar-600">(boleh dikosongkan)</span>
          </label>
          <input
            id="alamat"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          />
        </div>

        {/*
          Catatan alergi dipakai menyaring saran menu, bukan sekadar disimpan.

          Kolomnya teks bebas dengan pemisah koma, bukan daftar pilihan tertutup.
          Alergi yang mungkin dicatat kader tidak terbatas pada daftar yang dapat
          disusun sekarang, dan pilihan yang terlalu sempit akan membuat kader
          tidak menuliskannya sama sekali. Itu keadaan yang paling berbahaya,
          sebab menu tetap akan menganjurkan bahan yang perlu dihindari.
        */}
        <div>
          <label
            htmlFor="alergi"
            className="block text-base font-semibold text-dasar-900"
          >
            Alergi makanan{" "}
            <span className="font-normal text-dasar-600">(boleh dikosongkan)</span>
          </label>
          <input
            id="alergi"
            value={alergi}
            onChange={(e) => setAlergi(e.target.value)}
            placeholder="Contoh: telur, ikan teri"
            aria-describedby="bantuan-alergi"
            className="mt-2 min-h-touch w-full rounded-xl border-2 border-dasar-300 px-3 text-base"
          />
          <p id="bantuan-alergi" className="mt-1 text-sm text-dasar-700">
            Pisahkan dengan koma. Bahan ini tidak akan muncul pada saran menu anak.
          </p>
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

      {peringatan && (
        <p
          role="alert"
          className="rounded-xl border-2 border-status-risiko bg-amber-50 p-3 text-base text-amber-900"
        >
          {peringatan}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!siap || memuat}
          className="min-h-touch rounded-lg bg-brand-500 px-6 text-base font-semibold text-white hover:bg-brand-600 disabled:bg-dasar-300 disabled:text-dasar-600"
        >
          {memuat ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTerbuka(false);
            setGalat(null);
          }}
          className="min-h-touch rounded-xl border-2 border-dasar-400 px-6 text-base font-semibold text-dasar-700"
        >
          Tutup
        </button>
      </div>
    </form>
  );
}
