# DESIGN.md — PosyanduKu

> Sistem desain lengkap untuk rombak UI/UX PosyanduKu.
> Dokumen ini menjadi satu-satunya rujukan visual bagi setiap halaman, komponen, dan token desain.
> Setiap keputusan di bawah diuji terhadap satu pertanyaan utama:
> **apakah masih terbaca oleh kader berusia 50 tahun, di luar ruangan, dengan ponsel murah?**

---

## 1. Design Philosophy

### 1.1 Prinsip Utama

| # | Prinsip | Penerapan |
|---|---------|-----------|
| 1 | **Keterbacaan di atas segalanya** | Kontras minimum WCAG AA (4.5:1). Tidak ada teks abu-abu tipis, tidak ada font di bawah 14px untuk informasi penting |
| 2 | **Hangat, bukan klinis** | Warna dasar stone/warm-gray. Aplikasi kesehatan yang terasa ramah, bukan dingin seperti rumah sakit |
| 3 | **Mobile-first, desa-ready** | Target utama ponsel murah (layar 5-6", koneksi lambat). Touch target minimal 48px |
| 4 | **Hierarki visual yang jelas** | Informasi tersusun dari yang paling mendesak ke yang paling umum. Bidan membaca dari atas, boleh berhenti kapan pun |
| 5 | **Motion bermakna** | Animasi hanya untuk memunculkan konten baru dan menandai proses berjalan. Tidak pernah menunda pembacaan |
| 6 | **Aksesibel secara universal** | Warna bukan satu-satunya penanda. Setiap status memiliki ikon, teks, dan warna. Mendukung `prefers-reduced-motion` |

### 1.2 Target Pengguna & Konteks

```
Pengguna primer    : Kader posyandu (usia 30-60 tahun, literasi digital beragam)
Pengguna sekunder  : Bidan desa, orang tua
Perangkat utama    : Ponsel Android murah (RAM 2-3GB, layar 720p)
Lingkungan         : Posyandu desa, sering di luar ruangan/beranda
Koneksi            : 2G-4G tidak stabil, kadang offline total
```

### 1.3 Referensi Gaya

Mengambil inspirasi dari:
- **Halodoc / Alodokter** — Kesehatan Indonesia, hangat & terpercaya
- **Linear** — Hierarki informasi yang ketat, UI yang bersih
- **Vercel Dashboard** — Card layout modern, spacing yang rapi
- **Tokopedia** — Mobile-first Indonesia, warna hijau yang familiar

---

## 2. Color Palette

### 2.1 Brand Colors — Teal

Dipilih karena: (1) tidak bertabrakan dengan merah/kuning/hijau status gizi, (2) lazim di layanan kesehatan → terasa tepercaya, (3) tetap terbaca di layar murah yang menggeser warna ke biru.

```
brand-50   : #f0fdfa    ← latar hover ringan
brand-100  : #ccfbf1    ← latar section highlight
brand-200  : #99f6e4    ← garis dekoratif
brand-300  : #5eead4    ← aksen sekunder
brand-400  : #2dd4bf    ← ikon dekoratif
brand-500  : #0f766e    ← warna utama tombol, aksen
brand-600  : #0d5f59    ← hover tombol utama
brand-700  : #0a4a45    ← teks tautan, heading aksen
brand-800  : #083b37    ← teks di atas latar terang
brand-900  : #052e2b    ← teks paling gelap
```

### 2.2 Neutral Colors — Warm Stone

Sedikit kehangatan agar tidak terasa klinis.

```
dasar-50   : #fafaf9    ← latar utama body
dasar-100  : #f5f5f4    ← latar kartu sekunder, stripe tabel
dasar-200  : #e7e5e4    ← garis pemisah, border
dasar-300  : #d6d3d1    ← border input, divider
dasar-400  : #a8a29e    ← ikon nonaktif, placeholder
dasar-500  : #78716c    ← teks pendukung ringan
dasar-600  : #57534e    ← teks pendukung
dasar-700  : #44403c    ← teks sekunder
dasar-800  : #292524    ← teks utama (heading)
dasar-900  : #1c1917    ← teks terkuat (hero)
```

### 2.3 Status/Semantic Colors

Dipilih agar dapat dibedakan oleh penyandang buta warna merah-hijau. Perbedaannya bukan hanya rona, melainkan juga kecerahan: hijau paling gelap, kuning paling terang.

| Status | Solid | Latar Lembut | Garis | Dipakai untuk |
|--------|-------|--------------|-------|---------------|
| **Normal** | `#15803d` | `#f0fdf4` | `#bbf7d0` | Z ≥ -2, anak sehat |
| **Risiko** | `#b45309` | `#fffbeb` | `#fde68a` | -3 ≤ Z < -2, perlu perhatian |
| **Berat** | `#b91c1c` | `#fef2f2` | `#fecaca` | Z < -3, perlu segera diperiksa |

Warna tambahan:

```
info       : #1d4ed8  /  latar: #eff6ff  /  garis: #bfdbfe
```

### 2.4 Gradient

```css
merek-lembut : linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)   /* latar hero */
merek-pekat  : linear-gradient(135deg, #0f766e 0%, #083b37 100%)   /* tombol aksen, badge nomor */
hero-glow    : radial-gradient(ellipse at 50% 0%, rgba(15,118,110,0.08) 0%, transparent 70%)
```

### 2.5 Aturan Penggunaan Warna

- Warna status **tidak pernah menjadi satu-satunya penanda**. Selalu disertai ikon + teks.
- Teks pada latar putih **minimal dasar-600** untuk paragraf, **dasar-800** untuk heading.
- Warna brand-500 hanya untuk **satu CTA utama per layar**.
- Latar body selalu `dasar-50`, kartu selalu `white`.

---

## 3. Typography

### 3.1 Font Family

```
Primary    : Plus Jakarta Sans (Google Fonts, variable weight 400-800)
Fallback   : system-ui, -apple-system, sans-serif
Monospace  : ui-monospace, 'Cascadia Code', 'Fira Code', monospace
```

**Alasan pemilihan Plus Jakarta Sans:**
1. Huruf yang mudah dibedakan pada ukuran besar (angka 0 vs huruf O) — penting saat kader membaca berat badan
2. Dirancang di Indonesia untuk tipografi berbahasa Indonesia
3. Dimuat via `next/font` — tidak ada request ke domain pihak ketiga

### 3.2 Type Scale

| Token | Size | Line Height | Letter Spacing | Penggunaan |
|-------|------|-------------|----------------|------------|
| `xs` | 13px (0.8125rem) | 1.5 | — | Caption, metadata kecil |
| `sm` | 14px (0.875rem) | 1.6 | — | Keterangan pendukung, label sekunder |
| `base` | 16px (1rem) | 1.65 | — | Paragraf utama, isi kartu |
| `lg` | 18px (1.125rem) | 1.6 | — | Subheading kartu, nama anak |
| `xl` | 21px (1.3125rem) | 1.45 | -0.01em | Section heading |
| `2xl` | 26px (1.625rem) | 1.3 | -0.02em | Page heading |
| `3xl` | 32px (2rem) | 1.2 | -0.02em | Hero subheading |
| `4xl` | 40px (2.5rem) | 1.15 | -0.03em | Hero heading (desktop) |
| `5xl` | 52px (3.25rem) | 1.05 | -0.035em | Hero heading (large desktop) |

### 3.3 Font Weight

```
Regular    : 400   ← paragraf
Medium     : 500   ← label, metadata
Semibold   : 600   ← tombol, subheading, tautan
Bold       : 700   ← heading
Extrabold  : 800   ← hero heading, angka statistik
```

### 3.4 Aturan Tipografi

- **Minimum 14px** untuk teks apa pun. Teks informasi penting **minimum 16px**.
- Heading selalu memakai `font-bold` atau `font-extrabold`.
- Angka memakai `tabular-nums` agar kolom berat/tinggi sejajar.
- Tight letter-spacing hanya untuk heading ≥ `xl`.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (rem)

```
0.5   = 2px        4     = 16px
1     = 4px        5     = 20px
1.5   = 6px        6     = 24px
2     = 8px        8     = 32px
2.5   = 10px       10    = 40px
3     = 12px       12    = 48px
3.5   = 14px       14    = 56px
                   16    = 64px
                   20    = 80px
```

### 4.2 Layout Containers

```
max-w-5xl  : 1024px   ← halaman utama (beranda, dashboard bidan)
max-w-2xl  : 672px    ← halaman form (kader, pendaftaran)
max-w-md   : 448px    ← halaman masuk
```

### 4.3 Page Padding

```
Mobile     : px-4 (16px horizontal)
Tablet+    : px-6 (24px horizontal)
Desktop    : px-4 (container sudah terbatas max-w)
```

### 4.4 Section Spacing

```
Antar section utama          : mt-20 (80px) — BARU, sebelumnya terlalu rapat
Heading ke konten            : mt-8 (32px)
Antar kartu dalam grid       : gap-4 (16px) — mobile; gap-6 (24px) — desktop
Padding dalam kartu          : p-6 (24px) — standar; p-8 (32px) — kartu besar
```

### 4.5 Grid System

```
Dashboard stats    : grid-cols-2 → sm:grid-cols-4
Feature cards      : grid-cols-1 → md:grid-cols-2
Step cards         : grid-cols-1 → md:grid-cols-3
Role cards         : grid-cols-1 → sm:grid-cols-3
Priority list      : single column (full width)
```

---

## 5. Border, Radius & Shadow

### 5.1 Border Radius

```
sm     : 4px      ← inner elements, badge kecil
DEFAULT: 6px      ← tombol kecil
lg     : 10px     ← kartu kecil
xl     : 14px     ← tombol utama, input field
2xl    : 20px     ← kartu utama, section
3xl    : 28px     ← kartu hero, container besar
full   : 9999px   ← pill badge, avatar
```

### 5.2 Border

```
Default border     : 1px solid dasar-200   ← kartu, divider
Prominent border   : 2px solid dasar-300   ← input field, section penting
Status border      : 2px solid [status]    ← kartu status
Focus ring         : 3px solid brand-500   ← outline focus-visible
Left accent        : 4px solid [status]    ← priority list item
```

### 5.3 Box Shadow

```
halus   : 0 1px 2px 0 rgb(28 25 23 / 0.05)
         ← elemen ringan, tombol flat

kartu   : 0 1px 3px 0 rgb(28 25 23 / 0.07),
          0 1px 2px -1px rgb(28 25 23 / 0.06)
         ← kartu informasi

naik    : 0 4px 12px -2px rgb(28 25 23 / 0.08),
          0 2px 6px -2px rgb(28 25 23 / 0.05)
         ← kartu yang dapat ditindaklanjuti, hover state

tinggi  : 0 12px 28px -6px rgb(28 25 23 / 0.12),
          0 4px 10px -4px rgb(28 25 23 / 0.06)
         ← modal, dropdown, kartu hero hover

merek   : 0 8px 24px -6px rgb(15 118 110 / 0.35)
         ← tombol CTA utama
```

---

## 6. Animation & Motion

### 6.1 Keyframes

```css
munculNaik  : translateY(8px) + opacity:0 → translateY(0) + opacity:1
              Durasi: 320ms, easing: cubic-bezier(0.16, 1, 0.3, 1)
              Dipakai: kartu saat pertama muncul, section on scroll

muncul      : opacity:0 → opacity:1
              Durasi: 240ms, easing: ease-out
              Dipakai: toast notification, tooltip

denyut      : opacity:1 → opacity:0.55 → opacity:1
              Durasi: 1800ms, infinite
              Dipakai: indikator proses berjalan

kilau       : background-position -200% → 200%
              Durasi: 1600ms, linear, infinite
              Dipakai: skeleton loader
```

### 6.2 Transition

```
Hover warna         : 150ms ease
Shadow transisi     : 200ms ease
Transform (scale)   : 150ms ease
Layout shift        : 300ms cubic-bezier(0.16, 1, 0.3, 1)
```

### 6.3 Aturan Motion

- Semua durasi **di bawah 400ms**.
- Seluruh animasi **dimatikan** bila `prefers-reduced-motion: reduce`.
- Motion tidak boleh menunda pembacaan informasi.
- Tombol aktif memakai `active:scale-[0.98]` untuk umpan balik taktil.

---

## 7. Iconography

### 7.1 Ikon Status Gizi

Bentuknya **berbeda tegas**, bukan variasi lingkaran. Tiga lapis pembeda: rona, bentuk, teks.

| Status | Ikon | Arti Universal |
|--------|------|----------------|
| Normal | ✓ Centang | Kondisi baik |
| Risiko | △ Segitiga + tanda seru | Waspada |
| Berat | ⬡ Segi delapan + tanda seru | Rambu berhenti (harus bertindak) |

### 7.2 Ikon UI

- Memakai SVG inline, bukan icon font — mengurangi request jaringan.
- Ukuran standar: `w-4 h-4` (16px) untuk inline, `w-5 h-5` (20px) untuk tombol.
- Warna mengikuti `currentColor` agar mudah dikendalikan dari parent.

---

## 8. Component Specifications

### 8.1 Tombol (Buttons)

#### Tombol Utama (Primary)
```
Background   : brand-500
Text         : white
Font         : base (16px), semibold
Padding      : px-6, min-h-touch (48px)
Radius       : xl (14px)
Shadow       : merek (teal glow)
Hover        : brand-600
Active       : scale(0.98)
Disabled     : bg-dasar-300, text-dasar-500, no shadow
```

#### Tombol Kedua (Secondary)
```
Background   : white
Border       : 2px solid brand-500
Text         : brand-700, semibold
Hover        : bg-brand-50
Active       : scale(0.98)
Disabled     : border-dasar-300, text-dasar-400
```

#### Tombol Netral (Tertiary)
```
Background   : white
Border       : 2px solid dasar-300
Text         : dasar-700, semibold
Hover        : bg-dasar-100
```

#### Aturan Tombol
- **Satu tombol utama per layar**. Bila ada dua tindakan, satu utama + satu kedua.
- Touch target **minimum 48px** tinggi.
- Tombol selalu memakai teks, tidak pernah hanya ikon.
- State disabled harus jelas berbeda dari state normal.

### 8.2 Kartu (Cards)

#### Kartu Standar
```
Background   : white
Border       : 1px solid dasar-200
Radius       : 2xl (20px)
Shadow       : kartu
Padding      : p-6 (24px)
```

#### Kartu Interaktif (Hoverable)
```
... sama dengan kartu standar +
Shadow       : naik
Hover shadow : tinggi
Transition   : shadow 200ms ease
```

#### Kartu Status (dengan warna)
```
Background   : [status]-lembut
Border       : 2px solid [status]-garis
Radius       : 2xl (20px)
Padding      : p-5 (20px)
Text         : [status]-900
```

#### Kartu Prioritas (Priority List Item)
```
... sama dengan kartu interaktif +
Border-left  : 4px solid [status warna]
Padding      : p-5 (20px)
```

### 8.3 Input Field

```
Background   : white
Border       : 2px solid dasar-300 (2px, bukan 1px — agar terlihat di layar murah)
Radius       : xl (14px)
Min Height   : touch (48px)
Padding      : px-3.5
Font         : base (16px) — mencegah auto-zoom di iOS
Placeholder  : dasar-400

Hover        : border-dasar-400
Focus        : border-brand-500, ring-4 ring-brand-500/15
```

### 8.4 Badge / Lencana

#### Lencana Status (ukuran normal)
```
Background   : [status solid color]
Text         : white, sm (14px), semibold
Padding      : px-3 py-1
Radius       : full (pill)
Shadow       : halus
Content      : [ikon] + [teks]
```

#### Lencana Status (ukuran besar)
```
... sama +
Text         : lg (18px), bold
Padding      : px-5 py-2.5
Gap          : 8px
```

### 8.5 Pesan / Alert

| Varian | Border | Background | Text Color |
|--------|--------|------------|------------|
| Galat | 2px status-berat-garis | status-berat-lembut | red-900 |
| Peringatan | 2px status-risiko-garis | status-risiko-lembut | amber-900 |
| Berhasil | 2px status-normal-garis | status-normal-lembut | green-900 |
| Netral | 1px dasar-200 | dasar-100 | dasar-700 |

```
Radius       : xl (14px)
Padding      : p-3.5 (14px)
Font         : base (16px)
```

### 8.6 Skeleton Loader

```
Background   : dasar-200
Radius       : lg (10px)
Animation    : kilau (shimmer, 1600ms linear infinite)
Gradient     : 90deg, transparent → white/65% → transparent
```

### 8.7 Tautan (Link)

```
Color        : brand-700
Decoration   : underline, brand-300, 2px, offset 2px
Hover        : brand-800, decoration brand-500
Font weight  : medium (500)
```

### 8.8 Header / Navbar

```
Position     : sticky top-0 z-40
Background   : dasar-50/85 (85% opacity)
Backdrop     : blur(12px)
Border       : border-b dasar-200/80
Height       : ~60px (py-3.5)
Content      : Logo kiri — nav/action kanan
Max width    : 5xl (1024px), centered
```

### 8.9 Footer

```
Background   : white
Border       : border-t dasar-200
Padding      : py-10 px-4
Max width    : 5xl (1024px), centered
Text         : sm, dasar-600
```

---

## 9. Page-by-Page Design Specifications

### 9.1 Beranda (`/`)

**Tujuan:** Meyakinkan penguji/calon pengguna dalam urutan: masalah → untuk siapa → cara kerja → bukti.

#### Hero Section
```
Layout:
  ┌─────────────────────────────────────────────────────────┐
  │  [Pill Badge: "Untuk kader posyandu di desa"]           │
  │                                                         │
  │  Catatan buku tulis posyandu,                          │
  │  jadi peringatan dini gizi anak ← gradient text        │
  │                                                         │
  │  Paragraf deskripsi (max-w-2xl)                        │
  │                                                         │
  │  [Tombol Utama: Mulai sebagai kader]                   │
  │  [Tombol Kedua: Lihat dashboard bidan]                 │
  │                                                         │
  │  Caption: "Lingkungan demo..."                         │
  └─────────────────────────────────────────────────────────┘

PENINGKATAN BARU:
- Background hero: radial-gradient subtle teal glow di belakang heading
- Ilustrasi/dekorasi: abstract dots pattern atau subtle grid overlay (opacity 0.03-0.05)
- Pill badge: animasi munculNaik saat halaman dimuat
- Heading: animasi munculNaik dengan delay 100ms
- CTA buttons: animasi munculNaik dengan delay 200ms
- Spacing atas: pt-16 sm:pt-24 (lebih lega dari sebelumnya)
```

#### Bukti Section (Stats Grid)
```
Layout: grid-cols-2 → sm:grid-cols-4, gap-4
Setiap kartu:
  ┌─────────────┐
  │  241         │ ← text-3xl extrabold brand-600
  │  pengujian   │ ← text-sm medium dasar-600
  │  otomatis    │
  └─────────────┘

PENINGKATAN BARU:
- Kartu stats dengan hover: translate-y(-2px) + shadow-naik
- Angka memakai gradient teks brand-500 → brand-700
- Garis atas kartu: 3px solid brand-400 (aksen warna di tepi atas)
- Counter animation saat scroll ke view (opsional, hormati reduced-motion)
```

#### Cara Kerja Section (Steps)
```
Layout: grid-cols-1 → md:grid-cols-3, gap-6

Setiap langkah:
  ┌──────────────────┐
  │  ┌──┐            │
  │  │ 1│ ← gradient │
  │  └──┘   bg merek │
  │                  │
  │  Kader mencatat  │ ← lg bold
  │  Isi deskripsi   │ ← base dasar-700
  └──────────────────┘

PENINGKATAN BARU:
- Nomor badge: w-12 h-12, rounded-2xl, gradient background
- Garis penghubung horizontal antar kartu (hidden mobile, visible md+)
  Menggunakan pseudo-element ::after, border-dashed brand-300
- Stagger animation: tiap kartu muncul dengan delay 100ms
```

#### Pembeda Section (Features)
```
Layout: grid-cols-1 → md:grid-cols-2, gap-6

PENINGKATAN BARU:
- Setiap kartu memiliki ikon dekoratif di pojok kanan atas (SVG, opacity 0.08, ukuran 80px)
  Mapping ikon:
  - "Anak berhenti datang" → ikon radar/deteksi
  - "AI tidak menghitung" → ikon kalkulator/kode
  - "Hasil dikonfirmasi" → ikon centang ganda
  - "Tanpa sinyal" → ikon wifi-off
- Hover: border berubah ke brand-300
- Heading kartu: text-lg bold dasar-900 + small brand-500 underline decoration di bawahnya
```

#### Peran Section (Role Cards)
```
Layout: grid-cols-1 → sm:grid-cols-3, gap-4

Kartu peran utama (Kader):
  border-2 brand-500, bg-merek-lembut, shadow-naik

PENINGKATAN BARU:
- Ikon peran di atas judul:
  - Kader: ikon clipboard/pencatat
  - Bidan: ikon stethoscope/dashboard  
  - Orang tua: ikon family/child
- Ukuran ikon: w-10 h-10, warna brand-500 (kader) atau dasar-500 (lainnya)
- Arrow indicator: "Buka →" dengan hover translate-x animasi
```

#### Batasan Section
```
PENINGKATAN BARU:
- Ikon ⚠ di samping heading
- Background: dasar-100 alih-alih white, border-2 dasar-300
- Bullet points: menggunakan ikon info (i) dalam lingkaran kecil, bukan titik bulat
```

### 9.2 Halaman Masuk (`/masuk`)

```
Layout:
  max-w-md, centered, py-12
  
  ┌────────────────────────────┐
  │  [Logo PosyanduKu]        │
  │                            │
  │  Masuk                     │ ← text-2xl bold
  │                            │
  │  ┌──────────────────────┐  │
  │  │ Surel                │  │
  │  │ [input email]        │  │
  │  │                      │  │
  │  │ Kata sandi           │  │
  │  │ [input password]     │  │
  │  │                      │  │
  │  │ [== Masuk ==]        │  │ ← tombol full-width
  │  └──────────────────────┘  │
  │                            │
  │  Keterangan akun...        │
  └────────────────────────────┘

PENINGKATAN BARU:
- Kartu form dibungkus dalam container putih dengan shadow-naik dan rounded-2xl
- Background halaman: subtle gradient dari brand-50 ke dasar-50
- Logo: ukuran lebih besar (40px), centered
- Heading "Masuk": centered, dengan subtitle "Silakan masuk dengan akun Anda"
- Input field: gunakan kelas .kolom yang sudah ada (bukan inline styling)
- Error message: gunakan kelas .pesan-galat yang sudah ada
- Loading state: tombol menampilkan spinner (animasi denyut)
- Jarak antar field: space-y-5
```

### 9.3 Halaman Kader (`/kader`)

```
Layout:
  max-w-2xl, px-4, py-8

  ┌─ Header ─────────────────────────────────────────┐
  │  [Logo]                  [Link: dashboard bidan] │
  └──────────────────────────────────────────────────-┘
  
  Catat penimbangan                    ← text-2xl bold
  Deskripsi singkat...
  
  ┌─ Form Pengukuran Card ──────────────────────────┐
  │  Pilih anak: [dropdown]                          │
  │  Berat (kg): [input]    Tinggi (cm): [input]    │
  │  Cara ukur:  [radio telentang/berdiri]          │
  │  Tanggal:    [date picker]                       │
  │                                                  │
  │  [== Simpan pengukuran ==]                       │
  │                                                  │
  │  ┌─ Hasil ─────────────────────────────────────┐ │
  │  │  [KartuStatus besar]                        │ │
  │  │  Z-score: -1.2  Status: Normal              │ │
  │  └─────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────┘
  
  ┌─ Daftarkan Anak Baru ───────────────────────────┐
  │  [Collapsible form]                              │
  └──────────────────────────────────────────────────┘
  
  ┌─ Import Foto Buku Tulis ────────────────────────┐
  │  [Drag & drop / file picker]                     │
  │  [Preview + correction table]                    │
  └──────────────────────────────────────────────────┘

PENINGKATAN BARU:
- Form card dibungkus dalam kartu putih dengan shadow-naik
- Section divider: garis dashed brand-200 antar bagian
- Dropdown pilih anak: custom styled, bukan browser default
- Hasil pengukuran: muncul dengan animasi munculNaik setelah submit
- Import foto: area drop zone dengan border dashed, ikon kamera besar
- Spacing antar section: mt-8 (lebih lega)
- Header: gunakan komponen yang sama dengan beranda (sticky, blur)
- Konsistensi: ganti semua text-slate-* dengan text-dasar-*
```

### 9.4 Dashboard Bidan (`/bidan`)

```
Layout:
  max-w-5xl, px-4

  ┌─ Sticky Header ─────────────────────────────────┐
  │  [Logo]                     [Link: catat timbang]│
  └──────────────────────────────────────────────────┘
  
  DASHBOARD BIDAN                    ← sm uppercase tracking-wide brand-600
  Pemantauan gizi anak               ← text-2xl extrabold
  
  ┌─ Stats Grid (2×2 → 4×1) ────────────────────────┐
  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
  │ │ 24   │ │ 18   │ │  4   │ │  2   │             │
  │ │Total │ │Normal│ │Risiko│ │Berat │             │
  │ └──────┘ └──────┘ └──────┘ └──────┘             │
  └──────────────────────────────────────────────────┘
  
  ┌─ Perlu Ditindaklanjuti ──────────────────────────┐
  │  Heading + deskripsi                              │
  │                                                   │
  │  ┌─ Priority Card ─────────────────────────────┐  │
  │  ║ [Nama anak]  [Lencana status]               │  │
  │  ║ • Alasan 1                                  │  │
  │  ║ • Alasan 2                                  │  │
  │  └─────────────────────────────────────────────┘  │
  │  (repeat per anak...)                             │
  └───────────────────────────────────────────────────┘

PENINGKATAN BARU:
- Stats cards: setiap kartu memiliki subtle ikon di background (opacity 0.06)
  - Total: ikon users
  - Normal: ikon check-circle
  - Risiko: ikon alert-triangle
  - Berat: ikon alert-octagon
- Stats cards: animasi count-up saat pertama terlihat
- Priority list: numbered (#1, #2, #3...) di sebelah kiri kartu
- Section "Berhenti datang": ikon kalender/waktu di kartu
- Tombol telepon: lebih prominent dengan ikon telepon + warna hijau
- Laporan CSV section: ikon download yang lebih besar
- Daftar semua anak: tabel responsif dengan alternating row colors (stripe)
- Search/filter: tambah search bar di atas daftar anak
```

### 9.5 Halaman Orang Tua (`/orangtua`)

```
PENINGKATAN BARU:
- Hero mini: "Pantau pertumbuhan anak Anda" dengan ilustrasi grafik naik
- Kartu anak: foto placeholder → inisial nama dalam lingkaran berwarna
- Grafik pertumbuhan: lebih besar, dengan label sumbu yang jelas
- Riwayat pengukuran: timeline vertikal dengan dots berwarna status
```

### 9.6 Detail Anak (`/anak/[id]`)

```
PENINGKATAN BARU:
- Profile header: inisial besar dalam lingkaran + nama + usia + jenis kelamin
- Status badge besar di bawah nama
- Tab navigation: Ringkasan | Riwayat | Grafik
- Grafik pertumbuhan: full-width, interactive tooltip
- Riwayat: timeline cards dengan indikator warna status
```

---

## 10. Logo

### 10.1 Konsep

Dua bentuk yang saling melindungi:
- **Lengkung luar**: tangan/naungan kader yang memeluk
- **Bentuk dalam**: garis pertumbuhan yang naik
- **Titik di puncak**: titik pemantauan (setiap kunjungan posyandu)

### 10.2 Implementasi

```
Format           : SVG inline (currentColor)
Ukuran default   : 32px
Warna            : brand-500 (teal)
Viewbox          : 0 0 48 48
```

### 10.3 Logo Lengkap

```
[SVG 32px] + "Posyandu" (regular) + "Ku" (bold)
Font             : text-xl tracking-tight
Warna teks       : brand-700
Gap              : 8px antara ikon dan teks
```

---

## 11. Responsive Design

### 11.1 Breakpoints

```
sm    : 640px    ← ponsel landscape / tablet portrait
md    : 768px    ← tablet
lg    : 1024px   ← laptop
xl    : 1280px   ← desktop
2xl   : 1536px   ← desktop besar
```

### 11.2 Strategi Mobile-First

- Desain dimulai dari layar 360px (ponsel Android murah).
- Grid berubah dari 1 kolom → 2 kolom → 3-4 kolom.
- Navigasi: tetap top bar sederhana (bukan hamburger menu — kader tidak familiar).
- Font tidak berubah ukuran antar breakpoint (tetap readable di semua ukuran).
- Heading hero: 3xl (mobile) → 4xl (sm) → 5xl (lg).

### 11.3 Touch Target

```
Minimum touch target : 48px × 48px (3rem × 3rem)
Tombol besar         : 56px (3.5rem) tinggi
Gap antar target     : minimal 8px
```

---

## 12. Accessibility

### 12.1 Fokus

```css
:focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 2px;
  border-radius: 4px;
}
```
- Tidak pernah dihilangkan. Kader dengan layar sentuh rusak memakai navigasi keyboard.

### 12.2 Color Contrast

- Semua teks paragraf: minimal **4.5:1** contrast ratio.
- Teks besar (≥ 18px bold / ≥ 24px regular): minimal **3:1**.
- Status warna selalu didampingi ikon + teks.

### 12.3 Semantic HTML

- Satu `<h1>` per halaman.
- Heading hierarchy terstruktur: h1 → h2 → h3.
- Landmark regions: `<header>`, `<main>`, `<footer>`, `<section>`, `<nav>`.
- Form labels: selalu eksplisit via `htmlFor`.
- Tautan lewati: "Lewati ke isi utama" (visible on focus).

### 12.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

### 12.5 Zoom

- `maximum-scale: 5` — kader usia 50+ perlu zoom.
- Layout tidak rusak sampai zoom 200%.

---

## 13. Dark Mode

### 13.1 Status: Belum Diimplementasikan (Fase 2)

**Alasan ditunda:**
- Kader bekerja siang hari di luar ruangan → light mode lebih terbaca.
- Prioritas saat ini: keterbacaan di bawah sinar matahari, bukan estetika malam.
- Jika diimplementasikan nanti, gunakan skema berikut:

```
Background   : #0a0a0a → #121212
Surface      : #1a1a1a → #1e1e1e  
Border       : #2a2a2a
Text primary : #ededed
Text secondary: #a0a0a0
Brand        : tetap brand-400 (lebih terang agar kontras cukup)
```

---

## 14. Performance & Loading

### 14.1 Skeleton Loading

Setiap area yang menunggu data menampilkan skeleton, bukan layar kosong.
Skeleton berbentuk mirip konten yang akan datang → mengurangi kecemasan pengguna di koneksi lambat.

```
Warna         : dasar-200
Animasi       : shimmer (kilau) — gradient bergerak horizontal
Radius        : lg (10px)
```

### 14.2 Progressive Enhancement

- Status gizi dihitung di perangkat (mode offline).
- Font dimuat via `next/font` → no FOUT, no third-party request.
- SVG inline untuk ikon dan logo → zero network request.

---

## 15. Design Tokens Summary

Ringkasan token yang siap dipakai di Tailwind config:

```typescript
// tailwind.config.ts — token reference
{
  colors: {
    brand: { 50-900 },      // teal
    dasar: { 50-900 },      // warm stone  
    status: {
      normal, risiko, berat  // + lembut + garis variants
    }
  },
  fontFamily: {
    sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif']
  },
  fontSize: {
    xs: '0.8125rem',  sm: '0.875rem',   base: '1rem',
    lg: '1.125rem',   xl: '1.3125rem',  '2xl': '1.625rem',
    '3xl': '2rem',    '4xl': '2.5rem',  '5xl': '3.25rem'
  },
  borderRadius: {
    lg: '0.625rem', xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem'
  },
  boxShadow: {
    halus, kartu, naik, tinggi, merek
  },
  backgroundImage: {
    'merek-lembut', 'merek-pekat'
  },
  animation: {
    munculNaik, muncul, denyut, kilau
  }
}
```

---

## 16. Perubahan Utama dari Desain Saat Ini

### 16.1 Yang Dipertahankan ✓

| Aspek | Alasan |
|-------|--------|
| Palet warna brand teal | Sudah tepat untuk kesehatan |
| Plus Jakarta Sans | Font terbaik untuk konten Indonesia |
| Sistem status 3-lapis (warna + ikon + teks) | Aksesibilitas terjaga |
| Touch target 48px+ | Kritis untuk pengguna target |
| Skeleton loading | UX di koneksi lambat |
| Mode offline | Kebutuhan inti posyandu desa |

### 16.2 Yang Dirombak ✗ → ✓

| Sebelum | Sesudah | Alasan |
|---------|---------|--------|
| Hero section terlalu sederhana, tanpa visual | Hero dengan subtle glow background, stagger animation, ilustrasi abstrak | Kesan pertama harus meyakinkan penguji hackathon |
| Stats tanpa visual emphasis | Stats dengan gradient text, top accent bar, hover elevation | Angka harus langsung menarik perhatian |
| Steps tanpa penghubung visual | Steps dengan connecting line (dashed), stagger reveal | Alur kerja harus terasa mengalir |
| Feature cards polos | Feature cards dengan background icon decoration, hover border color | Setiap pembeda harus punya identitas visual |
| Role cards tanpa ikon | Role cards dengan ikon peran di atas judul | Navigasi harus intuitif secara visual |
| Halaman masuk tanpa card wrapper | Form dalam kartu putih + subtle gradient background | Terasa lebih profesional |
| Dashboard stats flat | Stats dengan background icon, count-up animation | Data harus terasa hidup |
| Priority list tanpa nomor urut | Priority list dengan numbered badges | Urgensi harus terasa |
| Inkonsistensi warna (mix slate + dasar) | Semua memakai token dasar-* yang sudah didefinisikan | Konsistensi visual |
| Section spacing terlalu rapat | Spacing mt-20 antar section utama | Ruang bernafas, hierarki jelas |

### 16.3 Yang Ditambahkan (Baru)

| Fitur Baru | Deskripsi |
|------------|-----------|
| **Hero glow effect** | Radial gradient teal di belakang heading |
| **Stagger animations** | Elemen muncul berurutan saat halaman dimuat |
| **Card top accent** | Garis warna 3px di tepi atas kartu stats |
| **Background decorative icons** | Ikon besar semi-transparan di dalam kartu |
| **Connecting lines** | Garis dashed penghubung antar step cards |
| **Profile initials** | Avatar inisial nama di halaman anak |
| **Tab navigation** | Tab untuk detail anak (Ringkasan/Riwayat/Grafik) |
| **Enhanced search** | Search bar di atas daftar anak pada dashboard |
| **Table stripe** | Alternating row colors pada tabel daftar anak |

---

## 17. File yang Akan Diubah

```
src/
  app/
    globals.css              ← tambah utility baru, perbaiki konsistensi
    layout.tsx               ← meta viewport, font loading (minor)
    page.tsx                 ← ROMBAK BESAR: hero, stats, steps, features, roles
    masuk/page.tsx           ← card wrapper, konsistensi token warna
    kader/page.tsx           ← konsistensi token, spacing, card wrapping
    bidan/page.tsx           ← stats enhancement, numbered priority, search
    orangtua/page.tsx        ← profile card, timeline riwayat
    anak/[id]/page.tsx       ← profile header, tab navigation
  components/
    Logo.tsx                 ← (tidak berubah)
    LencanaStatus.tsx        ← (tidak berubah)
    FormPengukuran.tsx       ← konsistensi token warna
    ImportFoto.tsx           ← enhanced drop zone
    DaftarAnak.tsx           ← table stripe, search integration
    FormAnakBaru.tsx         ← konsistensi token warna
    FormEditAnak.tsx         ← konsistensi token warna
    GrafikPertumbuhan.tsx    ← enhanced chart styling
    SaranMenu.tsx            ← minor styling
    StatusKoneksi.tsx        ← minor styling
    TombolRingkasan.tsx      ← minor styling
  tailwind.config.ts         ← token baru (shadow, gradient, keyframe)
```

---

## 18. Checklist Implementasi

- [ ] Perbaiki inkonsistensi token warna (slate → dasar) di semua file
- [ ] Tambah hero glow background di beranda
- [ ] Implementasi stagger animation untuk hero elements
- [ ] Redesign stats cards dengan accent bar dan gradient text
- [ ] Tambah connecting lines antar step cards
- [ ] Tambah decorative background icons di feature cards
- [ ] Tambah ikon peran di role cards
- [ ] Bungkus form masuk dalam card container
- [ ] Bungkus form kader dalam card container
- [ ] Enhance dashboard stats dengan background icons
- [ ] Tambah numbered badges di priority list
- [ ] Tambah search bar di dashboard bidan
- [ ] Perbaiki spacing antar section (mt-14 → mt-20)
- [ ] Tambah table stripe di daftar anak
- [ ] Implementasi profile initials avatar
- [ ] Test contrast ratio semua warna baru
- [ ] Test di layar 360px (minimum)
- [ ] Test dengan prefers-reduced-motion
- [ ] Pastikan semua touch target ≥ 48px

---

*Dokumen ini mengikuti format [DESIGN.md](https://getdesign.md/) dan disesuaikan khusus untuk konteks PosyanduKu: aplikasi kesehatan anak untuk kader posyandu di desa Indonesia.*
