/**
 * Klien Supabase untuk peramban.
 *
 * Berkas ini terpisah dari `supabase.ts` dengan sengaja. Modul server mengimpor
 * `next/headers`, yang tidak boleh ikut terbawa ke bundel klien. Memisahkannya
 * membuat batas itu ditegakkan oleh struktur berkas, bukan oleh kedisiplinan.
 *
 * Hanya memakai anon key, sehingga tetap tunduk pada RLS.
 */

import { createBrowserClient } from "@supabase/ssr";

export function klienBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Kredensial Supabase belum diisi. Lihat .env.example untuk daftar environment variable yang dibutuhkan.",
    );
  }

  return createBrowserClient(url, anon);
}
