import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warna status gizi. Kontras tinggi agar mudah dibedakan kader.
        status: {
          normal: "#15803d",
          risiko: "#b45309",
          berat: "#b91c1c",
        },
        brand: {
          50: "#eef7f4",
          500: "#0f766e",
          600: "#0d5f59",
          700: "#0a4a45",
        },
      },
      fontSize: {
        // Minimal 16px sesuai NFR-02.2
        base: ["1rem", { lineHeight: "1.6" }],
      },
      minHeight: {
        // Tombol aksi utama minimal 48px sesuai NFR-02.3
        touch: "3rem",
      },
      minWidth: {
        touch: "3rem",
      },
    },
  },
  plugins: [],
};

export default config;
