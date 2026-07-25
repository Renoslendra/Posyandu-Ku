"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Tombol keluar.
 *
 * Memanggil `/api/keluar` dengan POST, bukan `signOut()` dari peramban, sebab
 * cookie sesi ditandai httpOnly sehingga hanya server yang dapat menghapusnya.
 *
 * Setelah berhasil, pengguna dibawa ke beranda dan `router.refresh()` dipanggil
 * agar seluruh komponen server membaca ulang keadaan sesinya. Tanpa penyegaran
 * itu, bilah navigasi masih menampilkan identitas pengguna yang sudah keluar.
 */
export function TombolKeluar({ ringkas = false }: { ringkas?: boolean }) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [gagal, setGagal] = useState(false);

  async function keluar() {
    setMemuat(true);
    setGagal(false);

    try {
      const respons = await fetch("/api/keluar", { method: "POST" });

      /*
       * Kegagalan diberitahukan, tidak dibiarkan diam.
       *
       * Sebelumnya blok ini hanya memiliki `finally` tanpa `catch`, sehingga
       * kegagalan jaringan menghasilkan penolakan yang tidak tertangani dan
       * tombol sekadar berkedip lalu kembali normal. Pengguna menyimpulkan
       * dirinya sudah keluar padahal sesinya masih hidup.
       *
       * Pada perangkat yang dipakai bergantian antar kader di satu meja
       * posyandu, kekeliruan itu berarti kader berikutnya membuka data anak
       * dengan sesi orang sebelumnya.
       */
      if (!respons.ok) {
        setGagal(true);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setGagal(true);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={keluar}
        disabled={memuat}
        className={
          ringkas
            ? "min-h-touch w-full rounded-xl border-2 border-dasar-300 px-4 text-base font-semibold text-dasar-700 transition-colors hover:border-status-berat hover:text-status-berat disabled:opacity-60"
            : "inline-flex min-h-[2.75rem] items-center rounded-xl border-2 border-dasar-300 px-4 text-sm font-semibold text-dasar-700 transition-colors hover:border-status-berat hover:text-status-berat disabled:opacity-60"
        }
      >
        {memuat ? "Keluar..." : "Keluar"}
      </button>

      {/*
        Pesan kegagalan menegaskan bahwa pengguna masih masuk. Menyatakannya
        secara eksplisit lebih penting daripada sekadar mengatakan gagal, sebab
        kesimpulan keliru "saya sudah keluar" itulah yang berbahaya.
      */}
      {gagal && (
        <span
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border-2 border-status-berat-garis bg-status-berat-lembut p-3 text-sm text-dasar-800 shadow-naik"
        >
          Gagal keluar, Anda masih masuk. Periksa koneksi lalu coba lagi.
        </span>
      )}
    </span>
  );
}

/**
 * Penanda identitas pengguna yang sedang masuk.
 *
 * Menampilkan inisial dan nama, bukan foto, sehingga tidak ada permintaan
 * gambar yang dapat gagal dan tidak ada foto siapa pun yang perlu dipakai.
 */
export function PenandaPengguna({
  inisial,
  nama,
  peran,
}: {
  inisial: string;
  nama: string;
  peran: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-merek-pekat text-sm font-extrabold tracking-wide text-white"
      >
        {inisial}
      </span>
      {/* Nama disembunyikan pada layar sempit; inisial sudah cukup di sana. */}
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-sm font-bold text-dasar-900">{nama}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-dasar-500">
          {peran}
        </span>
      </span>
      <span className="sr-only">
        Masuk sebagai {nama}, peran {peran}
      </span>
    </span>
  );
}

/** Tautan masuk, hanya untuk pengunjung yang belum memiliki sesi. */
export function TautanMasuk() {
  return (
    <Link
      href="/masuk"
      className="tombol-kedua !min-h-[2.75rem] !px-4 !text-sm sm:!px-5 sm:!text-base"
    >
      Masuk
    </Link>
  );
}
