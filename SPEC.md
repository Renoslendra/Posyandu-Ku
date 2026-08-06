# PosyanduKu — Technical Specification

> **Dokumen ini adalah spesifikasi teknis lengkap proyek PosyanduKu.**
> Disusun oleh **Reno Syaelendra** (Role: Hacker) untuk sesi Top 33 Hackathon
> IndonesiaNEXT 2026.
>
> Live: [posyandu-ku.vercel.app](https://posyandu-ku.vercel.app)
> Repositori: GitHub (private)

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Masalah yang Diselesaikan](#2-masalah-yang-diselesaikan)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Tech Stack](#4-tech-stack)
5. [Skema Database](#5-skema-database)
6. [Keamanan & Otorisasi (RLS)](#6-keamanan--otorisasi-rls)
7. [Fitur Lengkap](#7-fitur-lengkap)
8. [Peran AI & Pembatasannya](#8-peran-ai--pembatasannya)
9. [Strategi Pengujian](#9-strategi-pengujian)
10. [Offline-First Architecture](#10-offline-first-architecture)
11. [Analisis Performa](#11-analisis-performa)
12. [Keputusan Teknis Kunci](#12-keputusan-teknis-kunci)
13. [Struktur Direktori](#13-struktur-direktori)
14. [Cara Menjalankan Proyek](#14-cara-menjalankan-proyek)

---

## 1. Ringkasan Proyek

**PosyanduKu** adalah sistem asisten digital untuk kader Posyandu yang mengubah
tumpukan buku tulis bertahun-tahun menjadi sistem deteksi dini gizi anak.

Bukan sekadar aplikasi pencatatan, PosyanduKu memunculkan **wawasan yang
sebelumnya mustahil ada** di buku tulis:
- Mengekstrak data lama dari foto buku tulis menggunakan AI Vision (OCR).
- Mendeteksi anak yang hilang dari pemantauan secara otomatis.
- Beroperasi 100% tanpa sinyal internet (offline-first).

Sasaran pengguna utama adalah **kader posyandu** di desa-desa terpencil
Indonesia, tempat di mana koneksi internet tidak stabil dan keahlian teknologi
pengguna terbatas.

---

## 2. Masalah yang Diselesaikan

### 2.1 Buta Sejarah (Data Lama Terbuang)

Aplikasi kesehatan yang ada (e-PPGBM, ASIK, Primaku) hanya menerima input data
baru. Akibatnya, riwayat pertumbuhan anak bertahun-tahun yang sudah tercatat di
buku tulis kader menjadi terbuang percuma — tidak bisa diolah menjadi grafik
tren atau peringatan dini.

**Solusi PosyanduKu:** Fitur Import Foto (AI Vision OCR) memungkinkan kader
memfoto halaman buku tulis lama. Sistem mengekstrak nama, berat, tinggi, dan
tanggal secara otomatis. Data wajib dikonfirmasi oleh kader sebelum masuk
database (human-in-the-loop).

### 2.2 Kebutaan Terhadap Absensi (Anak Hilang)

Anak paling berisiko stunting adalah anak yang **berhenti datang** ke posyandu.
Karena mereka tidak hadir, nama mereka tidak tertulis di buku mana pun sehingga
luput dari pantauan medis.

**Solusi PosyanduKu:** Sistem secara otomatis menandai anak yang jeda
kunjungannya melebihi 90 hari. Daftar anak ditampilkan di dashboard bidan
beserta lama ketidakhadiran dan nomor telepon orang tua untuk tindak lanjut
langsung.

### 2.3 Tanpa Sinyal, Tanpa Akses

Banyak posyandu berada di desa terpencil yang sering kehilangan sinyal internet.
Aplikasi yang membutuhkan koneksi tidak bisa dipakai di sana, sehingga kader
kembali ke buku tulis.

**Solusi PosyanduKu:** Arsitektur offline-first menggunakan Service Worker dan
IndexedDB memastikan aplikasi tetap beroperasi dan menyimpan data 100% tanpa
koneksi internet. Data tersinkron otomatis saat koneksi kembali.

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ React 19 │  │ Service      │  │ IndexedDB     │  │
│  │ UI       │  │ Worker       │  │ (Offline      │  │
│  │ (TSX)    │  │ (Cache +     │  │  Queue)       │  │
│  │          │  │  Sync)       │  │               │  │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
│       │               │                  │          │
│       └───────────────┼──────────────────┘          │
│                       │                             │
└───────────────────────┼─────────────────────────────┘
                        │ HTTPS
┌───────────────────────┼─────────────────────────────┐
│              NEXT.JS 15 (App Router)                │
│                       │                             │
│  ┌────────────────────┼────────────────────────┐    │
│  │           API Routes (/api/*)               │    │
│  │                                             │    │
│  │  /api/pengukuran  → Z-Score Engine (kode)   │    │
│  │  /api/import-foto → Gemini AI Vision (OCR)  │    │
│  │  /api/ringkasan   → LLM narasi (fallback)   │    │
│  │  /api/menu        → LLM + kode harga        │    │
│  │  /api/laporan     → CSV export (kode)       │    │
│  │  /api/anak        → CRUD + Quality Guard    │    │
│  │  /api/tindak-lanjut → Deteksi anak hilang   │    │
│  └─────────────────────────────────────────────┘    │
│                       │                             │
│  ┌────────────────────┼────────────────────────┐    │
│  │           Middleware (sesi.ts)               │    │
│  │  → Penyegaran token Supabase Auth           │    │
│  │  → Routing berbasis peran                   │    │
│  └─────────────────────────────────────────────┘    │
│                       │                             │
└───────────────────────┼─────────────────────────────┘
                        │ PostgreSQL Wire Protocol
┌───────────────────────┼─────────────────────────────┐
│              SUPABASE (Cloud - Singapore)            │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ PostgreSQL  │  │ Auth (GoTrue)│  │ Storage    │  │
│  │ + RLS       │  │ JWT + Cookie │  │ (Foto)     │  │
│  │ 6 tabel     │  │ 3 peran      │  │            │  │
│  │ 12 migrasi  │  │              │  │            │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Penjelasan Arsitektur:**
- **Client:** Aplikasi web yang berjalan di browser kader/bidan. Menggunakan
  React 19 untuk antarmuka, Service Worker untuk caching & sync, dan IndexedDB
  untuk menyimpan antrean data saat offline.
- **Server:** Next.js 15 App Router yang berjalan di Vercel. Semua logika bisnis
  (perhitungan gizi, validasi, ekspor) berada di API Routes.
- **Database:** Supabase (PostgreSQL) di region Singapore. Row Level Security
  (RLS) aktif di semua tabel untuk isolasi data per posyandu.

---

## 4. Tech Stack

| Lapisan      | Teknologi                | Versi  | Alasan Pemilihan                                                                                          |
| :----------- | :----------------------- | :----- | :-------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js (App Router)     | 15.5   | Server Components untuk muat cepat di koneksi lambat; API Routes terintegrasi                             |
| Bahasa       | TypeScript               | 5.7    | Type safety mencegah bug di kalkulasi medis                                                               |
| UI           | React                    | 19.0   | Komponen deklaratif, ekosistem luas                                                                       |
| Styling      | Tailwind CSS             | 3.4    | Utility-first, konsisten, cepat di-iterate                                                                |
| Database     | Supabase (PostgreSQL)    | —      | RLS bawaan untuk isolasi data medis; Auth terintegrasi; region Singapore (dekat user Indonesia)            |
| Auth         | Supabase Auth (GoTrue)   | —      | Cookie-based session; mendukung 3 peran (kader, bidan, orang_tua) tanpa library tambahan                  |
| Grafik       | Recharts                 | 2.15   | Grafik pertumbuhan anak dengan garis referensi WHO                                                        |
| Validasi     | Zod                      | 3.24   | Validasi skema input di sisi server, mencegah data kotor masuk database                                   |
| Testing      | Vitest                   | 3.0    | Cepat, kompatibel ESM, cocok untuk unit test modul Z-Score                                                |
| AI/LLM       | Google Gemini            | —      | Vision API untuk OCR buku tulis; teks generatif untuk ringkasan & saran menu (dengan fallback)            |
| Hosting      | Vercel                   | —      | Deploy otomatis dari Git; edge network global                                                             |
| Offline      | Service Worker + IndexedDB | —   | Standar web untuk caching dan penyimpanan lokal tanpa dependency tambahan                                  |

**Total source files:** 83 file TypeScript/TSX (~577 KB kode sumber)

---

## 5. Skema Database

Database terdiri dari **6 tabel utama** yang dikelola melalui **12 file migrasi
SQL** yang terurut dan dapat direproduksi.

### 5.1 Entity Relationship

```
wilayah (1) ──── (*) posyandu (1) ──── (*) anak (1) ──── (*) pengukuran
   │                    │                    │
   │                    │                    └── orang_tua_id → profil
   │                    │
   │                    └──── (*) profil (kader)
   │
   └──── (*) profil (bidan)

posyandu (1) ──── (*) ringkasan_bulanan
anak (1) ──── (*) saran_menu
anak (1) ──── (*) tindak_lanjut
```

### 5.2 Tabel Utama

| Tabel                | Kolom Kunci                                                                                  | Penjelasan                                                                                 |
| :------------------- | :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `wilayah`            | `id`, `nama`, `kecamatan`, `kabupaten`                                                       | Unit administratif. Menentukan cakupan bidan                                               |
| `posyandu`           | `id`, `wilayah_id`, `nama`, `alamat`                                                         | Unit layanan. Menentukan cakupan kader                                                     |
| `profil`             | `id` (→ auth.users), `peran`, `nama`, `posyandu_id`, `wilayah_id`                            | Profil pengguna. Peran menentukan izin RLS                                                 |
| `anak`               | `id`, `posyandu_id`, `nama`, `tanggal_lahir`, `jenis_kelamin`, `orang_tua_id`, `alergi`      | Data anak. Terikat pada satu posyandu. Constraint: tanggal lahir tidak di masa depan        |
| `pengukuran`         | `id`, `anak_id`, `tanggal`, `berat_kg`, `tinggi_cm`, `diukur_telentang`, `usia_bulan`,       | Catatan pengukuran. Menyimpan Z-score hasil perhitungan dan provenance (sumber data)       |
|                      | `z_bb_u`, `z_tb_u`, `z_bb_tb`, `status`, `sumber`, `dikonfirmasi`, `penanda[]`, `klien_ref`  | `klien_ref` adalah idempotency key untuk sync offline                                      |
| `ringkasan_bulanan`  | `id`, `posyandu_id`, `periode`, `isi`, `dari_fallback`                                       | Narasi bulanan dari LLM. Flag `dari_fallback` jika disusun template deterministik          |

### 5.3 Constraint Penjaga Kualitas (Quality Guard)

Constraint langsung di level database mencegah data kotor:

```sql
constraint berat_wajar   check (berat_kg  between 0.5 and 30)
constraint tinggi_wajar  check (tinggi_cm between 30  and 130)
constraint usia_dilayani check (usia_bulan between 0   and 60)
constraint tanggal_tidak_di_masa_depan check (tanggal <= current_date)
constraint tanggal_lahir_tidak_di_masa_depan check (tanggal_lahir <= current_date)
```

**Penjelasan:** Constraint ini bukan sekadar validasi form — ini adalah
pertahanan terakhir di level database. Meskipun ada bug di frontend atau API,
data mustahil (bayi 90 kg, tinggi 200 cm) **tidak akan pernah masuk** ke
database.

### 5.4 Daftar Migrasi

| No   | File                            | Isi                                                  |
| :--- | :------------------------------ | :--------------------------------------------------- |
| 1    | `0001_skema_awal.sql`           | 4 enum, 6 tabel, 6 indeks                            |
| 2    | `0002_rls.sql`                  | 4 fungsi RLS, 10 policy                              |
| 3    | `0003_grant.sql`                | Hak akses anon/authenticated                         |
| 4    | `0004_telepon_anak.sql`         | Kolom telepon di tabel anak                          |
| 5    | `0005_batas_panggilan.sql`      | Rate limiting untuk API                              |
| 6    | `0006_pengukuran_unik.sql`      | Idempotency key untuk sync offline                   |
| 7    | `0007_grant_batas_panggilan.sql`| Hak akses untuk tabel batas panggilan                |
| 8    | `0008_tanggal_zona_waktu.sql`   | Perbaikan zona waktu ke WIB                          |
| 9    | `0009_status_gizi_lebih.sql`    | Enum gizi lebih & obesitas                           |
| 10   | `0010_alergi_anak.sql`          | Kolom alergi untuk saran menu                        |
| 11   | `0011_riwayat_saran_menu.sql`   | Tabel riwayat saran menu                             |
| 12   | `0012_tindak_lanjut.sql`        | Tabel tindak lanjut + deteksi anak hilang            |

---

## 6. Keamanan & Otorisasi (RLS)

### 6.1 Model 3 Peran

| Peran        | Cakupan Data                         | Hak Akses                                     |
| :----------- | :----------------------------------- | :--------------------------------------------- |
| `kader`      | Hanya posyandu tempat ia bertugas    | Baca + tulis anak & pengukuran                  |
| `bidan`      | Semua posyandu di wilayahnya         | Baca semua data anak & pengukuran               |
| `orang_tua`  | Hanya anak yang tertaut padanya      | Baca data anaknya sendiri saja                  |

### 6.2 Implementasi RLS

Row Level Security diaktifkan di **semua 6 tabel**. Empat fungsi SQL
`security definer` menentukan cakupan:

```sql
-- Mengembalikan peran pengguna saat ini
auth_peran()         → user_role

-- Mengembalikan posyandu_id kader saat ini
auth_posyandu_id()   → uuid

-- Mengembalikan wilayah_id bidan saat ini
auth_wilayah_id()    → uuid

-- Mengembalikan semua posyandu yang boleh diakses
posyandu_terjangkau() → setof uuid
```

**Penjelasan:** Keamanan di PosyanduKu **bukan di level frontend** (yang bisa
di-bypass), melainkan di **level database**. Sekalipun seseorang memanipulasi
request API secara langsung, PostgreSQL RLS akan menolak akses ke data yang
bukan haknya. Ini adalah standar keamanan tingkat enterprise untuk data medis
sensitif.

### 6.3 Tidak Ada Pendaftaran Mandiri

Akun dibuat oleh pengelola sistem (bukan self-registration). Ini mencegah orang
asing membuat akun dan mengakses data kesehatan anak.

---

## 7. Fitur Lengkap

### 7.1 Fitur Inti (7 Fitur)

#### F1: Input Pengukuran + Penjaga Kualitas Data
- Kader memasukkan berat (kg) dan tinggi (cm) anak.
- **Quality Guard** memvalidasi input secara real-time:
  - Menolak nilai mustahil (bayi 90 kg, tinggi 200 cm).
  - Menandai anomali: tinggi menurun, lonjakan berat >2 kg/bulan.
  - Penanda disimpan di kolom `penanda[]` pada tabel pengukuran.
- File: `src/lib/gizi/penjaga-data.ts`, `src/components/FormPengukuran.tsx`

#### F2: Mesin Z-Score WHO (Deterministik)
- Menghitung **4 indikator antropometri**: BB/U, PB/U atau TB/U, BB/PB atau
  BB/TB.
- Menggunakan metode **LMS (Lambda-Mu-Sigma)** dari WHO Child Growth Standards
  (0-5 tahun).
- Interpolasi linear antar titik referensi untuk presisi maksimal.
- Koreksi ekor distribusi untuk Z-score di luar ±3 SD.
- **AI tidak pernah dilibatkan** — seluruh angka dihitung kode deterministik.
- Referensi data: `src/lib/gizi/tabel-who.json` (122 KB parameter WHO).
- File: `src/lib/gizi/zscore.ts` (496 baris), `src/lib/gizi/tabel.ts`

#### F3: Dashboard Bidan & Grafik Pertumbuhan
- Distribusi status gizi seluruh anak (normal / risiko / berat / lebih /
  obesitas).
- Daftar prioritas: anak dengan status gizi kritis ditampilkan paling atas.
- Grafik pertumbuhan per anak menggunakan Recharts, dengan garis referensi WHO
  (-3 SD, -2 SD, median, +2 SD, +3 SD).
- File: `src/lib/dashboard.ts`, `src/components/GrafikPertumbuhan.tsx`

#### F4: Autentikasi & Isolasi Data 3 Peran (RLS)
- Login berbasis cookie (Supabase Auth).
- 3 peran: kader, bidan, orang_tua (lihat Bagian 6).
- Middleware Next.js untuk penyegaran sesi otomatis.
- File: `src/middleware.ts`, `src/lib/sesi.ts`, `src/lib/peran.ts`

#### F5: Import Foto Buku Tulis + Provenance
- Kader memfoto halaman buku tulis lama.
- AI Vision (Gemini) mengekstrak nama, berat, tinggi, tanggal dari tulisan
  tangan.
- Hasil bacaan **wajib dikonfirmasi kader** sebelum masuk database
  (human-in-the-loop).
- Setiap nilai menyimpan jejak asalnya (`sumber`: `manual` atau `ocr_ai`) dan
  status konfirmasi (`dikonfirmasi`: boolean).
- Data yang belum dikonfirmasi **tidak dihitung ke statistik**.
- File: `src/components/ImportFoto.tsx`, `src/app/api/import-foto/route.ts`

#### F6: Deteksi Anak Hilang dari Pemantauan
- Sistem menghitung jeda kunjungan terakhir setiap anak.
- Anak dengan jeda >90 hari otomatis ditandai.
- Dashboard bidan menampilkan lama absensi + kontak orang tua/bidan.
- Tombol tindak lanjut (telepon) langsung tersedia.
- File: `src/app/api/tindak-lanjut/route.ts`,
  `src/components/TombolTindakLanjut.tsx`

#### F7: Offline-First + Sinkronisasi
- Service Worker melakukan caching halaman dan aset statis.
- IndexedDB menyimpan antrean pengukuran yang diinput saat offline.
- Saat koneksi kembali, antrean dikirim secara batch ke server.
- `klien_ref` (idempotency key) mencegah data ganda saat kirim ulang.
- Status koneksi ditampilkan real-time di UI.
- File: `src/lib/antrean-offline.ts`, `src/components/StatusKoneksi.tsx`

### 7.2 Fitur Pendukung (5 Fitur)

#### F8: AI Saran Menu Lokal Murah
- AI menyusun rekomendasi menu harian berbahan lokal (tempe, telur, ikan teri,
  kangkung).
- **Harga dihitung oleh kode** dari daftar harga tetap, bukan ditebak oleh AI.
- Total biaya harian ditampilkan dalam rupiah.
- Bayi <6 bulan otomatis dilewati (hanya ASI eksklusif).
- Catatan alergi anak menyaring bahan yang berbahaya.
- File: `src/lib/menu.ts` (24 KB — modul terbesar), `src/components/SaranMenu.tsx`

#### F9: Ringkasan Bulanan (AI + Fallback)
- AI menyusun narasi ringkasan bulanan untuk bidan.
- **Angka dihitung kode, AI hanya menyusun kalimatnya.**
- Jika LLM gagal/mati, versi template deterministik tetap tampil (flag
  `dari_fallback = true`).
- File: `src/lib/ringkasan.ts`, `src/components/TombolRingkasan.tsx`

#### F10: Pendaftaran Anak Baru
- Form input data anak lengkap (nama, tanggal lahir, jenis kelamin, nama orang
  tua, alamat, telepon, alergi).
- Validasi Zod di sisi server.
- File: `src/components/FormAnakBaru.tsx`, `src/app/api/anak/route.ts`

#### F11: Perbaikan Data Anak
- Kader dapat mengedit data anak yang sudah terdaftar.
- Hanya kader di posyandu yang sama yang bisa mengedit (dijaga RLS).
- File: `src/components/FormEditAnak.tsx`

#### F12: Laporan Ekspor CSV
- Laporan diekspor ke format CSV agar staf Dinas Kesehatan bisa langsung
  mengolah di Excel/spreadsheet.
- **Sengaja bukan PDF** — karena angka di PDF harus diketik ulang, sedangkan CSV
  langsung bisa diolah.
- File: `src/lib/laporan.ts`, `src/app/api/laporan/route.ts`

---

## 8. Peran AI & Pembatasannya

### 8.1 Prinsip Utama

> **AI tidak pernah menghitung angka klinis. Kode deterministik tetap menjadi
> sumber kebenaran.**

Ini bukan keterbatasan — ini adalah **keputusan arsitektur yang disengaja** demi
keselamatan pasien.

### 8.2 Pembagian Tugas AI vs Kode

| Tugas                         | Dikerjakan Oleh | Alasan                                                     |
| :---------------------------- | :-------------- | :---------------------------------------------------------- |
| Perhitungan Z-Score           | **Kode**        | Harus presisi & reprodusibel. Halusinasi AI bisa fatal      |
| Klasifikasi status gizi       | **Kode**        | Berdasarkan ambang batas tetap dari WHO                      |
| Deteksi tren pertumbuhan      | **Kode**        | Perbandingan angka sederhana, tidak perlu AI                 |
| Perhitungan harga menu        | **Kode**        | Harga dari daftar tetap, bukan tebakan                       |
| Validasi input (Quality Guard)| **Kode**        | Aturan bisnis pasti, tidak boleh ambigu                      |
| Ekstraksi foto buku tulis     | **AI (Vision)** | Pengenalan tulisan tangan adalah kekuatan utama AI           |
| Penyusunan narasi ringkasan   | **AI (Teks)**   | AI menyusun kalimat, angka sudah dihitung kode               |
| Penyusunan cara memasak       | **AI (Teks)**   | Kreativitas bahasa, bukan keputusan medis                    |

### 8.3 Fail-Safe System (Mode Cadangan)

Jika API AI tidak tersedia (server mati, kuota habis, timeout):

| Fitur             | Fallback                                                  |
| :---------------- | :-------------------------------------------------------- |
| Ringkasan bulanan | Template deterministik menggantikan narasi AI              |
| Saran menu        | Bahan & harga tetap tampil utuh (hanya cara memasak hilang)|
| Import foto       | Form manual tetap bisa dipakai (ketik sendiri)             |
| Z-Score           | **Tidak terpengaruh** — tidak pernah pakai AI              |

**Penjelasan:** Aplikasi ini dirancang agar **tidak ada satu pun halaman yang
kosong atau error** hanya karena API AI mati. Ini krusial untuk posyandu desa
yang mungkin menggunakan koneksi tidak stabil.

---

## 9. Strategi Pengujian

### 9.1 Ringkasan

| Jenis                | Jumlah   | Tool         | Lokasi                         |
| :------------------- | :------- | :----------- | :----------------------------- |
| Unit test (Vitest)   | 371 test | Vitest 3.0   | `src/**/*.test.ts` (21 file)   |
| Integrasi (scripts)  | 8 skrip  | Node.js      | `scripts/uji-*.mjs` (8 file)  |
| **Total**            | **371+** |              |                                |

### 9.2 Apa yang Diuji

#### Unit Test (371 test cases)
- **Golden Test Z-Score:** Memastikan hasil perhitungan Z-Score 100% sama
  persis dengan tabel referensi WHO untuk setiap kombinasi usia, berat, tinggi,
  dan jenis kelamin.
- **Koreksi Ekor Distribusi:** Memastikan Z-score di luar ±3 SD dikoreksi
  sesuai prosedur WHO.
- **Interpolasi LMS:** Memastikan interpolasi linear antar titik referensi
  menghasilkan nilai yang akurat.
- **Quality Guard:** Memastikan input mustahil ditolak dan anomali ditandai.
- **Pencocokan Nama:** Memastikan OCR tidak salah mencocokkan nama anak
  (mencegah "Ani" tercocok dengan "Handayani").
- **Dashboard:** Memastikan distribusi dan prioritas dihitung benar.
- **Laporan CSV:** Memastikan format dan isi laporan valid.
- **Fallback LLM:** Memastikan template muncul saat AI tidak tersedia.
- **Validasi Input (Zod):** Memastikan skema validasi menolak data tidak valid.
- **Alergi & Menu:** Memastikan bahan alergen tersaring dari saran menu.
- **Rate Limiter:** Memastikan pembatasan laju API berfungsi.

#### Integrasi Test (8 skrip)
- `uji-rls.mjs` — Membuktikan kader desa A **gagal** mengakses data desa B.
- `uji-alur.mjs` — Alur lengkap: daftar anak → input pengukuran → lihat hasil.
- `uji-fitur-baru.mjs` — Fitur baru (gizi lebih, alergi, menu) berfungsi.
- `uji-import.mjs` — Alur import foto: upload → konfirmasi → masuk database.
- `uji-batas-laju.mjs` — Rate limiting mencegah penyalahgunaan API.
- `uji-riwayat.mjs` — Riwayat pengukuran dan tindak lanjut konsisten.
- `uji-sesi.mjs` — Sesi login dan penyegaran token berjalan benar.
- `uji-akun-orangtua.mjs` — Akun orang tua hanya melihat data anaknya.

### 9.3 Cara Menjalankan

```bash
# Unit test (371 test cases)
npm test

# Integrasi test (membutuhkan koneksi ke Supabase)
npm run uji:db
```

### 9.4 Bug Kritis yang Ditemukan dari Pengujian

Saat audit mandiri, ditemukan **12 cacat ekstrem**. Yang paling berbahaya:

| # | Bug                              | Dampak                                                          | Status      |
|---|----------------------------------|-----------------------------------------------------------------|-------------|
| 1 | Stunting tidak terdeteksi        | Anak >2 tahun diukur telentang memilih referensi 0-24 bulan     | ✅ Diperbaiki |
| 2 | Pembulatan umur fatal            | Bayi 27 hari → referensi 0 bulan. Deviasi **2.2 SD**           | ✅ Diperbaiki |
| 3 | Pencocokan nama berbahaya        | "Ani" tercocok dengan "Handayani" — data bisa masuk anak lain   | ✅ Diperbaiki |

**Pola yang mengkhawatirkan:** Semua bug melaporkan kondisi **LEBIH BAIK**
daripada kenyataan. Anak kurang gizi terlihat normal di sistem. Ini adalah jenis
bug paling berbahaya karena tidak ada yang mengeluh — masalahnya tersembunyi.

---

## 10. Offline-First Architecture

### 10.1 Komponen

```
┌─────────────────────────────────────────┐
│              BROWSER                     │
│                                         │
│  ┌─────────────┐    ┌────────────────┐  │
│  │ UI React    │◄──►│ antrean-       │  │
│  │             │    │ offline.ts     │  │
│  └─────┬───────┘    └───────┬────────┘  │
│        │                    │           │
│        │              ┌─────▼──────┐    │
│        │              │ IndexedDB  │    │
│        │              │ (antrean   │    │
│        │              │  lokal)    │    │
│        │              └─────┬──────┘    │
│        │                    │           │
│  ┌─────▼────────────────────▼────────┐  │
│  │         Service Worker            │  │
│  │  • Cache aset statis             │  │
│  │  • Intercept fetch               │  │
│  │  • Background sync               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
          ┌─────────▼─────────┐
          │  Koneksi kembali? │
          │  → Kirim batch    │
          │  → klien_ref      │
          │    mencegah ganda │
          └───────────────────┘
```

### 10.2 Alur Offline

1. Kader membuka aplikasi. Service Worker menyajikan halaman dari cache.
2. Kader menginput pengukuran. Data masuk ke IndexedDB (antrean lokal).
3. Z-Score **langsung dihitung di browser** (kode deterministik, tanpa server).
4. Status gizi langsung ditampilkan ke kader.
5. Saat koneksi internet kembali, Service Worker mengirim antrean ke server.
6. `klien_ref` (idempotency key) memastikan data yang dikirim ulang tidak
   menjadi duplikat di database.

### 10.3 Status Koneksi UI

Komponen `StatusKoneksi.tsx` menampilkan indikator real-time:
- 🟢 Online — data tersinkron
- 🟡 Sinkronisasi — mengirim data tertunda
- 🔴 Offline — data disimpan lokal, akan dikirim saat online

---

## 11. Analisis Performa

### 11.1 Waktu Tanggap Produksi (Terukur)

| Halaman      | Median     | Perlu Sesi |
| :----------- | ---------: | :--------: |
| `/masuk`     | 333 ms     | Tidak      |
| `/`          | 414 ms     | Tidak      |
| `/orangtua`  | 1.501 ms   | Ya         |
| `/anak/[id]` | 1.977 ms   | Ya         |
| `/kader`     | 1.981 ms   | Ya         |
| `/bidan`     | 2.148 ms   | Ya         |

### 11.2 Penyebab & Rencana Perbaikan

**Akar masalah:** Fungsi serverless berjalan di Washington (iad1), sementara
database Supabase di Singapore (sin1). Setiap kueri menempuh ~230 ms pulang
pergi.

**Solusi (sudah teridentifikasi, belum diterapkan):**
1. Tambahkan `vercel.json` dengan `regions: ["sin1"]` — estimasi penurunan dari
   ~2.000 ms ke ~500 ms.
2. Hilangkan pembacaan sesi ganda di middleware.
3. Paralelkan kueri yang saling bebas (`Promise.all`).

**Penjelasan:** Rencana perbaikan sudah didokumentasikan lengkap di
`PERFORMA.md`. Prioritas saat ini adalah kebenaran data (Z-Score dan RLS),
bukan kecepatan. Optimasi performa dijadwalkan sebagai tahap berikutnya.

---

## 12. Keputusan Teknis Kunci

Seluruh keputusan didokumentasikan di `DECISIONS.md` (35 entri, 53 KB).
Berikut ringkasan keputusan yang paling menentukan:

### 12.1 Fitur yang Sengaja TIDAK Dibangun

| Fitur                  | Alasan Pembatalan                                                                                              |
| :--------------------- | :------------------------------------------------------------------------------------------------------------- |
| Chatbot Medis AI       | Permukaan jawaban tidak terbatas, tidak bisa diuji, berisiko memberikan nasihat medis yang mengancam nyawa      |
| Tombol Darurat GPS     | Tanpa kanal penerima yang aktif 24 jam, tombol darurat menciptakan rasa aman palsu                              |
| Notifikasi Push        | Membutuhkan infrastruktur yang tidak tersedia di scope hackathon                                                |
| Self-Registration      | Siapa pun bisa mendaftar dan melihat data kesehatan anak orang lain                                            |

### 12.2 Keputusan Arsitektur Kunci

| Keputusan                                     | Alasan                                                                        |
| :-------------------------------------------- | :---------------------------------------------------------------------------- |
| 14 fitur dipangkas menjadi 7 inti             | Lebih baik sedikit fitur yang utuh daripada banyak fitur dengan jalan buntu    |
| AI dibatasi ke 3 tugas bahasa saja            | Mencegah halusinasi pada data medis                                            |
| Ekspor CSV, bukan PDF                         | Staf Dinas Kesehatan bisa langsung olah di Excel tanpa ketik ulang             |
| RLS di level database, bukan frontend         | Tidak bisa di-bypass meskipun API dimanipulasi langsung                        |
| Z-Score deterministik, bukan ML/AI            | Harus presisi, reprodusibel, dan dapat diaudit                                 |
| Constraint kualitas di level database         | Pertahanan terakhir meskipun ada bug di frontend atau API                      |
| Fallback template untuk semua fitur AI        | Tidak ada halaman kosong saat API AI mati                                      |
| Provenance (jejak asal data) disimpan         | Data dari OCR bisa dibedakan dari input manual untuk audit                      |

---

## 13. Struktur Direktori

```
posyandu-ku/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # 10 API Routes
│   │   │   ├── akun-orangtua/        # Manajemen akun orang tua
│   │   │   ├── anak/                 # CRUD data anak
│   │   │   ├── import-foto/          # AI Vision OCR
│   │   │   ├── import-simpan/        # Simpan hasil OCR
│   │   │   ├── keluar/               # Logout
│   │   │   ├── laporan/              # Ekspor CSV
│   │   │   ├── menu/                 # AI saran menu
│   │   │   ├── pengukuran/           # Input & hitung Z-Score
│   │   │   ├── ringkasan/            # AI ringkasan bulanan
│   │   │   └── tindak-lanjut/        # Deteksi anak hilang
│   │   ├── anak/                     # Halaman detail anak
│   │   ├── bidan/                    # Dashboard bidan
│   │   ├── kader/                    # Dashboard kader
│   │   ├── masuk/                    # Halaman login
│   │   ├── orangtua/                 # Dashboard orang tua
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing page
│   │
│   ├── components/                   # 21 Komponen React
│   │   ├── ImportFoto.tsx            # UI import foto (23 KB — terbesar)
│   │   ├── FormPengukuran.tsx        # Form input pengukuran (18 KB)
│   │   ├── FormAnakBaru.tsx          # Form pendaftaran anak
│   │   ├── FormEditAnak.tsx          # Form edit data anak
│   │   ├── GrafikPertumbuhan.tsx     # Grafik WHO + Recharts
│   │   ├── DaftarAnak.tsx            # Daftar anak di posyandu
│   │   ├── StatusKoneksi.tsx         # Indikator online/offline
│   │   ├── SaranMenu.tsx             # UI saran menu
│   │   ├── TombolTindakLanjut.tsx    # Tombol telepon darurat
│   │   └── ...                       # 12 komponen lainnya
│   │
│   ├── lib/                          # 29 Modul logika bisnis
│   │   ├── gizi/                     # Modul perhitungan gizi
│   │   │   ├── zscore.ts             # Mesin Z-Score (496 baris)
│   │   │   ├── tabel.ts              # Parser tabel WHO
│   │   │   ├── tabel-who.json        # Data referensi WHO (122 KB)
│   │   │   ├── penjaga-data.ts       # Quality Guard
│   │   │   ├── ambang.ts             # Ambang batas klasifikasi
│   │   │   ├── kurva.ts              # Kurva pertumbuhan
│   │   │   ├── pola.ts               # Deteksi pola pertumbuhan
│   │   │   └── *.test.ts             # 8 file test
│   │   ├── menu.ts                   # Logika saran menu (24 KB)
│   │   ├── laporan.ts                # Logika ekspor CSV
│   │   ├── dashboard.ts              # Logika dashboard
│   │   ├── antrean-offline.ts        # Offline queue (12 KB)
│   │   ├── cocok-nama.ts             # Pencocokan nama OCR
│   │   ├── validasi.ts               # Validasi Zod
│   │   ├── llm.ts                    # Wrapper Gemini API
│   │   ├── ringkasan.ts              # Ringkasan bulanan
│   │   ├── supabase.ts               # Supabase server client
│   │   ├── supabase-browser.ts       # Supabase browser client
│   │   └── *.test.ts                 # 13 file test
│   │
│   └── middleware.ts                 # Penyegaran sesi Supabase
│
├── supabase/
│   └── migrations/                   # 12 file migrasi SQL
│
├── scripts/                          # 13 skrip operasional
│   ├── seed.mjs                      # Seed data demo
│   ├── buat-akun-demo.mjs            # Buat akun demo
│   ├── cek-kesiapan.mjs              # Health check
│   ├── unduh-tabel-who.mjs           # Download tabel WHO
│   └── uji-*.mjs                     # 8 skrip integrasi test
│
├── SPEC.md                           # ← Dokumen ini
├── PRD.md                            # Product Requirements (64 KB)
├── DECISIONS.md                      # 35 Keputusan Teknis (53 KB)
├── DEMO.md                           # Panduan demo
├── PERFORMA.md                       # Analisis performa
└── README.md                         # Panduan pengembang
```

---

## 14. Cara Menjalankan Proyek

### 14.1 Prasyarat
- Node.js 18+
- Akun Supabase (dengan project yang sudah di-setup)
- API Key Google Gemini (untuk fitur AI)

### 14.2 Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd posyandu-ku

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan kredensial Supabase & Gemini

# 4. Jalankan migrasi database
# (Jalankan 12 file SQL di supabase/migrations/ secara berurutan)

# 5. Seed data demo
npm run demo:reset

# 6. Cek kesiapan sistem
npm run cek
```

### 14.3 Development

```bash
# Jalankan development server
npm run dev

# Jalankan unit test (371 test cases)
npm test

# Jalankan integrasi test
npm run uji:db

# Build untuk produksi
npm run build
```

### 14.4 URL Produksi
- **Live:** [posyandu-ku.vercel.app](https://posyandu-ku.vercel.app)
- **Akun Demo:** Tersedia melalui `npm run akun`

---

> **Dokumen ini ditulis sebagai bagian dari proses pitching Top 33 Hackathon
> IndonesiaNEXT 2026. Seluruh kode, keputusan, dan pengujian yang disebutkan
> dapat diverifikasi langsung di repositori.**
>
> — Reno Syaelendra, Hacker
