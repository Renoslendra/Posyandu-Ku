import type { Config } from "tailwindcss";

/**
 * Sistem desain PosyanduKu.
 *
 * Penggunanya kader posyandu di desa, sering bekerja di bawah sinar matahari
 * dengan ponsel murah. Karena itu setiap keputusan visual di sini diuji
 * terhadap satu pertanyaan: apakah masih terbaca oleh ibu berusia 50 tahun,
 * di luar ruangan, tanpa kacamata baca?
 *
 * Konsekuensinya: tidak ada teks abu-abu tipis, tidak ada kontras rendah, dan
 * tidak ada animasi yang menunda informasi. Yang dipakai untuk memberi kesan
 * rapi adalah ruang, hierarki, dan bayangan halus, bukan pengurangan kontras.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /*
         * Warna status gizi.
         *
         * Dipilih agar tetap dapat dibedakan oleh penyandang buta warna merah
         * hijau, karena itu bentuk perbedaannya bukan hanya rona melainkan juga
         * kecerahan: hijau paling gelap, kuning paling terang.
         *
         * Warna tidak pernah menjadi satu-satunya penanda status. Setiap
         * lencana selalu menyertakan teks.
         */
        status: {
          normal: "#15803d",
          "normal-lembut": "#f0fdf4",
          "normal-garis": "#bbf7d0",
          risiko: "#b45309",
          "risiko-lembut": "#fffbeb",
          "risiko-garis": "#fde68a",
          berat: "#b91c1c",
          "berat-lembut": "#fef2f2",
          "berat-garis": "#fecaca",
        },

        /*
         * Warna utama: teal.
         *
         * Dipilih karena tiga alasan. Pertama, tidak bertabrakan dengan merah,
         * kuning, dan hijau yang sudah dipakai status gizi. Kedua, lazim pada
         * layanan kesehatan sehingga terasa tepercaya. Ketiga, tetap terbaca
         * pada layar murah yang cenderung menggeser warna ke biru.
         */
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#0f766e",
          600: "#0d5f59",
          700: "#0a4a45",
          800: "#083b37",
          900: "#052e2b",
        },

        /* Warna dasar antarmuka. Sedikit kehangatan agar tidak terasa klinis. */
        dasar: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },

      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },

      fontSize: {
        /*
         * Skala tipografi.
         *
         * Ukuran terkecil adalah 0,875rem (14px) dan hanya untuk keterangan
         * pendukung. Teks yang membawa informasi penting tidak pernah di bawah
         * 1rem, sesuai NFR-02.2.
         */
        xs: ["0.8125rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
        base: ["1rem", { lineHeight: "1.65" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.3125rem", { lineHeight: "1.45", letterSpacing: "-0.01em" }],
        "2xl": ["1.625rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        "3xl": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "4xl": ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "5xl": ["3.25rem", { lineHeight: "1.05", letterSpacing: "-0.035em" }],
      },

      minHeight: {
        /* Tombol aksi utama minimal 48px sesuai NFR-02.3 */
        touch: "3rem",
        "touch-lg": "3.5rem",
      },
      minWidth: {
        touch: "3rem",
      },

      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },

      boxShadow: {
        /*
         * Bayangan bertingkat.
         *
         * Dipakai untuk menyatakan kedalaman, bukan sebagai hiasan. Kartu yang
         * dapat ditindaklanjuti berbayang lebih dalam daripada kartu informasi.
         */
        halus: "0 1px 2px 0 rgb(28 25 23 / 0.05)",
        kartu: "0 1px 3px 0 rgb(28 25 23 / 0.07), 0 1px 2px -1px rgb(28 25 23 / 0.06)",
        naik: "0 4px 12px -2px rgb(28 25 23 / 0.08), 0 2px 6px -2px rgb(28 25 23 / 0.05)",
        tinggi: "0 12px 28px -6px rgb(28 25 23 / 0.12), 0 4px 10px -4px rgb(28 25 23 / 0.06)",
        merek: "0 8px 24px -6px rgb(15 118 110 / 0.35)",
      },

      backgroundImage: {
        "merek-lembut": "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
        "merek-pekat": "linear-gradient(135deg, #0f766e 0%, #083b37 100%)",
      },

      keyframes: {
        /*
         * Gerak dibatasi pada dua hal: memunculkan isi yang baru datang, dan
         * menandai proses yang sedang berjalan.
         *
         * Tidak ada gerak yang menunda pembacaan informasi. Semua durasi di
         * bawah 400 ms, dan seluruhnya dimatikan bila pengguna meminta
         * pengurangan gerak lewat setelan sistem.
         */
        munculNaik: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        muncul: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        denyut: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        kilau: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },

      animation: {
        munculNaik: "munculNaik 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        muncul: "muncul 0.24s ease-out both",
        denyut: "denyut 1.8s ease-in-out infinite",
        kilau: "kilau 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
