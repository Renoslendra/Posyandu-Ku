import Link from "next/link";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { IkonPeringatan } from "./Ikon";

/**
 * Halaman pagar: keadaan ketika isi sesungguhnya tidak dapat ditampilkan.
 *
 * Ada dua sebab, dan keduanya perlu tampilan yang berbeda:
 * basis data belum terhubung, yang merupakan salah konfigurasi dan hanya
 * dialami pengembang, serta pengguna belum masuk, yang merupakan keadaan wajar
 * dan dialami pengguna sungguhan.
 *
 * Dijadikan komponen karena kedua keadaan ini sebelumnya dituliskan ulang di
 * empat halaman, delapan blok seluruhnya, dan tidak satu pun memiliki bilah
 * navigasi. Akibatnya pengguna yang membuka halaman terlindungi tanpa sesi
 * mendarat di halaman tanpa jalan keluar selain tombol kembali peramban.
 */

export function PagarBelumMasuk({
  peran,
  pesan,
}: {
  /** Ditampilkan pada bilah navigasi agar pengguna tahu halaman apa ini. */
  peran: string;
  /** Menjelaskan siapa yang berhak membuka halaman ini. */
  pesan: string;
}) {
  return (
    <>
      <Navbar peran={peran} />

      <main id="isi" className="mx-auto max-w-md px-4 py-16">
        <div className="kartu p-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-dasar-900">
            Silakan masuk
          </h1>
          <p className="mt-2.5 leading-relaxed text-dasar-700">{pesan}</p>
          <Link href="/masuk" className="tombol-utama mt-6 w-full">
            Masuk
          </Link>
          <p className="mt-4 text-sm text-dasar-600">
            Belum punya akun? Hubungi bidan desa atau pengelola posyandu Anda.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}

export function PagarBelumTerhubung({ pesan }: { pesan: React.ReactNode }) {
  return (
    <>
      <Navbar />

      <main id="isi" className="mx-auto max-w-xl px-4 py-16">
        <div className="kartu border-status-risiko-garis bg-status-risiko-lembut p-7">
          <IkonPeringatan className="h-8 w-8 text-status-risiko" />
          <h1 className="mt-3 text-xl font-extrabold tracking-tight text-dasar-900">
            Basis data belum terhubung
          </h1>
          <div className="mt-2.5 leading-relaxed text-dasar-700">{pesan}</div>
        </div>
      </main>

      <Footer />
    </>
  );
}
