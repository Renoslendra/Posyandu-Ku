import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /*
         * Palet proyek.
         *
         * Dipertahankan bersama token bergaya Material di bawahnya karena
         * belasan komponen masih memakainya. Menghapusnya akan membuat kelas
         * seperti `text-dasar-700` berhenti menghasilkan gaya apa pun, dan
         * kegagalan seperti itu tidak memunculkan galat: teks hanya berubah
         * menjadi warna bawaan tanpa ada yang menyadarinya.
         *
         * Keduanya menunjuk warna yang sama, sehingga tampilannya tetap satu
         * kesatuan. Penyatuan penamaan menjadi satu sistem dicatat sebagai
         * pekerjaan lanjutan, bukan dikerjakan menjelang tenggat.
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
        /*
         * Warna status gizi beserta varian lembut untuk latar dan garis tepi.
         *
         * Perbedaannya tidak hanya rona melainkan juga kecerahan, sehingga
         * tetap dapat dibedakan oleh penyandang buta warna merah hijau. Warna
         * juga tidak pernah menjadi satu-satunya penanda: setiap lencana
         * menyertakan ikon berbentuk berbeda dan teks.
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

        "surface-dim": "#d7dbd9",
        "status-risk": "#b45309",
        "inverse-surface": "#2d3130",
        "tertiary-container": "#9c573a",
        "surface-container-high": "#e5e9e7",
        "on-primary": "#ffffff",
        "on-tertiary-container": "#ffe5db",
        "secondary": "#5d5f5e",
        "on-error": "#ffffff",
        "on-secondary-container": "#616362",
        "on-tertiary": "#ffffff",
        "on-secondary": "#ffffff",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "primary-container": "#0f766e",
        "secondary-container": "#dfe0df",
        "outline": "#6e7977",
        "on-background": "#181c1c",
        "on-primary-fixed": "#00201d",
        "on-primary-container": "#a3faef",
        "tertiary-fixed": "#ffdbce",
        "outline-variant": "#bdc9c6",
        "secondary-fixed-dim": "#c6c7c6",
        "surface-container": "#ebefed",
        "on-primary-fixed-variant": "#00504a",
        "secondary-fixed": "#e2e2e2",
        "inverse-primary": "#80d5cb",
        "primary": "#005c55",
        "background": "#f7faf8",
        "on-error-container": "#93000a",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed-variant": "#72361b",
        "tertiary-fixed-dim": "#ffb598",
        "tertiary": "#7f4025",
        "on-surface-variant": "#3e4947",
        "status-normal": "#15803d",
        "surface-tint": "#006a63",
        "primary-fixed-dim": "#80d5cb",
        "surface-bright": "#f7faf8",
        "surface-variant": "#e0e3e1",
        "on-secondary-fixed-variant": "#454747",
        "status-info": "#1d4ed8",
        "on-surface": "#181c1c",
        "primary-fixed": "#9cf2e8",
        "surface-container-low": "#f1f4f3",
        "surface": "#f7faf8",
        "inverse-on-surface": "#eef1f0",
        "on-tertiary-fixed": "#370e00",
        "surface-container-highest": "#e0e3e1",
        "on-secondary-fixed": "#1a1c1c",
        "status-severe": "#b91c1c",
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(ellipse at 50% 0%, rgba(15,118,110,0.08) 0%, transparent 70%)",
        "merek-pekat": "linear-gradient(135deg, #0f766e 0%, #083b37 100%)",
        "merek-lembut": "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        full: "9999px",
      },
      minHeight: {
        /* Tombol aksi utama minimal 48px sesuai NFR-02.3 */
        touch: "3rem",
        "touch-lg": "3.5rem",
      },
      minWidth: {
        touch: "3rem",
      },
      spacing: {
        "touch-min": "48px",
        "page-pad-desktop": "1.5rem",
        "gutter": "1rem",
        "section-gap": "5rem",
        "form-gap": "1.5rem",
        "page-pad-mobile": "1rem",
      },
      fontFamily: {
        "headline-lg": ["var(--font-plus-jakarta)", "sans-serif"],
        "label-sm": ["var(--font-plus-jakarta)", "sans-serif"],
        "headline-lg-mobile": ["var(--font-plus-jakarta)", "sans-serif"],
        "section-title": ["var(--font-plus-jakarta)", "sans-serif"],
        "body-lg": ["var(--font-plus-jakarta)", "sans-serif"],
        "body-base": ["var(--font-plus-jakarta)", "sans-serif"],
        "display-xl": ["var(--font-plus-jakarta)", "sans-serif"],
        "caption-xs": ["var(--font-plus-jakarta)", "sans-serif"],
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "label-sm": ["14px", { lineHeight: "1.6", fontWeight: "500" }],
        "headline-lg-mobile": ["26px", { lineHeight: "1.2", fontWeight: "700" }],
        "section-title": ["21px", { lineHeight: "1.45", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "500" }],
        "body-base": ["16px", { lineHeight: "1.65", fontWeight: "400" }],
        "display-xl": ["52px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "caption-xs": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      boxShadow: {
        halus: "0 1px 2px 0 rgba(41, 37, 36, 0.05)",
        kartu: "0 4px 6px -1px rgba(41, 37, 36, 0.1), 0 2px 4px -1px rgba(41, 37, 36, 0.06)",
        naik: "0 10px 15px -3px rgba(41, 37, 36, 0.1), 0 4px 6px -2px rgba(41, 37, 36, 0.05)",
        tinggi: "0 20px 25px -5px rgba(41, 37, 36, 0.15), 0 10px 10px -5px rgba(41, 37, 36, 0.04)",
        merek: "0 4px 14px 0 rgba(15, 118, 110, 0.35)",
      },
      keyframes: {
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
