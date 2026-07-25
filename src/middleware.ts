import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Penyegaran sesi Supabase.
 *
 * Server component tidak dapat menulis cookie, sehingga token yang kedaluwarsa
 * harus disegarkan di sini. Tanpa ini, pengguna akan tampak keluar sendiri
 * setelah beberapa waktu.
 */
export async function middleware(permintaan: NextRequest) {
  let respons = NextResponse.next({ request: permintaan });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Tanpa konfigurasi, aplikasi tetap dapat dibuka dan menampilkan panduan
  // pengisian environment variable alih-alih gagal total.
  if (!url || !anon) return respons;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return permintaan.cookies.getAll();
      },
      setAll(daftar) {
        daftar.forEach(({ name, value }) => {
          permintaan.cookies.set(name, value);
        });
        respons = NextResponse.next({ request: permintaan });
        daftar.forEach(({ name, value, options }) => {
          respons.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return respons;
}

export const config = {
  matcher: [
    /*
     * Melewati berkas statis, gambar, dan rute API agar penyegaran sesi tidak
     * berjalan pada permintaan yang tidak membutuhkannya.
     *
     * Rute API dikecualikan karena setiap penanganannya sudah memanggil
     * `getUser()` sendiri. Tanpa pengecualian ini, satu permintaan API
     * menghasilkan dua panggilan ke layanan autentikasi, dan yang paling terasa
     * adalah pengiriman antrean tanpa sinyal: entri dikirim satu per satu
     * secara berurutan, sehingga tiga puluh catatan tertunda memicu enam puluh
     * panggilan berantai pada koneksi yang justru sedang lemah.
     *
     * Penyegaran cookie di sini juga tidak berguna bagi permintaan `fetch` dari
     * peramban, sebab jawabannya tidak menghasilkan navigasi yang menerapkan
     * cookie baru.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
