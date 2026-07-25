import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/*
 * Plus Jakarta Sans dipilih karena tiga alasan yang dapat dipertanggungjawabkan.
 *
 * Pertama, huruf yang mudah dibedakan pada ukuran besar, terutama angka nol dan
 * huruf O yang penting saat kader membaca berat badan.
 *
 * Kedua, dirancang di Indonesia untuk tipografi berbahasa Indonesia, sehingga
 * kata panjang seperti "pertumbuhan" dan "penimbangan" tidak terasa sesak.
 *
 * Ketiga, dimuat lewat next/font sehingga berkasnya ikut dilayani dari domain
 * sendiri. Tidak ada permintaan ke domain pihak ketiga, dan tidak ada pergeseran
 * tata letak saat font selesai dimuat.
 */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PosyanduKu — Asisten Digital Kader Posyandu",
  description:
    "Mengubah catatan buku tulis posyandu menjadi deteksi dini risiko gizi anak. Alat bantu kader, bukan alat diagnosis.",
  applicationName: "PosyanduKu",
  authors: [{ name: "Reno Syaelendra" }],
  keywords: ["posyandu", "stunting", "gizi anak", "kader", "WHO", "Z-score"],
  openGraph: {
    title: "PosyanduKu — Asisten Digital Kader Posyandu",
    description:
      "Catatan buku tulis kader menjadi deteksi dini risiko gizi anak. Perhitungan menurut standar WHO, bukan tebakan AI.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * Pembesaran tidak dibatasi.
   *
   * Sebagian kader berusia di atas 50 tahun dan perlu memperbesar layar untuk
   * membaca. Mengunci skala akan menutup satu-satunya cara mereka memakai
   * aplikasi ini.
   */
  maximumScale: 5,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={plusJakarta.variable}>
      <body className="min-h-screen bg-dasar-50 font-sans text-dasar-900 antialiased">
        {/*
          Tautan lewati ke isi utama. Tidak terlihat sampai difokuskan dengan
          papan tombol, sehingga tidak mengganggu tampilan namun tetap ada
          bagi yang membutuhkannya.
        */}
        <a
          href="#isi-utama"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                     focus:rounded-xl focus:bg-brand-500 focus:px-5 focus:py-3
                     focus:text-base focus:font-semibold focus:text-white focus:shadow-tinggi"
        >
          Lewati ke isi utama
        </a>
        {children}
      </body>
    </html>
  );
}
