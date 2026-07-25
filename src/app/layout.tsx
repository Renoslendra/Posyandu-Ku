import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PosyanduKu — Asisten Digital Kader Posyandu",
  description:
    "Mengubah catatan buku tulis posyandu menjadi deteksi dini risiko gizi anak. Alat bantu kader, bukan alat diagnosis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
