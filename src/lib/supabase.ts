/**
 * Klien Supabase.
 *
 * Klien untuk sisi server saja. Berkas ini mengimpor `next/headers`, sehingga
 * tidak boleh diimpor dari komponen klien. Untuk peramban, pakai
 * `supabase-browser.ts`.
 *
 *   klienServer()  — anon key + sesi pengguna, tunduk pada RLS. Untuk route
 *                    handler dan server component.
 *   klienAdmin()   — service role, MELEWATI RLS. Hanya untuk skrip seed dan
 *                    pengujian RLS. Tidak boleh dipakai menangani permintaan
 *                    pengguna.
 *
 * Kunci service role hanya dibaca dari environment server dan tidak pernah
 * diekspor ke klien.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function wajib(nama: string): string {
  const nilai = process.env[nama];
  if (!nilai) {
    throw new Error(
      `Environment variable ${nama} belum diisi. Lihat .env.example.`,
    );
  }
  return nilai;
}

const URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/**
 * Klien untuk route handler dan server component.
 *
 * Membawa sesi pengguna melalui cookie sehingga RLS tetap berlaku. Ini yang
 * dipakai menangani permintaan pengguna.
 */
export async function klienServer() {
  const simpananCookie = await cookies();

  return createServerClient(wajib(URL_ENV), wajib(ANON_ENV), {
    cookies: {
      getAll() {
        return simpananCookie.getAll();
      },
      setAll(daftar) {
        try {
          daftar.forEach(({ name, value, options }) => {
            simpananCookie.set(name, value, options);
          });
        } catch {
          // Server component tidak boleh menulis cookie. Diabaikan karena
          // penyegaran sesi ditangani middleware.
        }
      },
    },
  });
}

/**
 * Klien dengan service role. MELEWATI RLS.
 *
 * Hanya untuk skrip seed dan pengujian RLS. Jangan dipakai di route handler
 * yang menangani permintaan pengguna, karena akan menghapus seluruh isolasi
 * data antar peran.
 */
export function klienAdmin() {
  return createClient(wajib(URL_ENV), wajib("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Memeriksa apakah konfigurasi Supabase sudah tersedia. */
export function supabaseTerkonfigurasi(): boolean {
  return Boolean(process.env[URL_ENV] && process.env[ANON_ENV]);
}
