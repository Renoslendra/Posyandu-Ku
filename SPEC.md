# PosyanduKu — Technical Specification

> **Dokumen ini adalah spesifikasi teknis lengkap proyek PosyanduKu**, disusun
> mengikuti pendekatan **Spec Driven Development**: spesifikasi ditulis dan
> di-commit terlebih dahulu, menjadi kontrak yang mengikat implementasi.
>
> Disusun oleh **Reno Syaelendra** (Role: Hacker) untuk sesi Top 33 Hackathon
> IndonesiaNEXT 2026.
>
> Live: [posyandu-ku.vercel.app](https://posyandu-ku.vercel.app)

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Masalah yang Diselesaikan](#2-masalah-yang-diselesaikan)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Tech Stack](#4-tech-stack)
5. [Konfigurasi Lingkungan](#5-konfigurasi-lingkungan)
6. [Skema Database](#6-skema-database)
7. [Keamanan & Otorisasi (RLS)](#7-keamanan--otorisasi-rls)
8. [Kontrak API (API Contracts)](#8-kontrak-api-api-contracts)
9. [Skema Validasi (Zod)](#9-skema-validasi-zod)
10. [Strategi Penanganan Galat](#10-strategi-penanganan-galat)
11. [Pembatasan Laju (Rate Limiting)](#11-pembatasan-laju-rate-limiting)
12. [Fitur Lengkap](#12-fitur-lengkap)
13. [Peran AI & Pembatasannya](#13-peran-ai--pembatasannya)
14. [Alur Data (Data Flow)](#14-alur-data-data-flow)
15. [Offline-First Architecture](#15-offline-first-architecture)
16. [Strategi Pengujian](#16-strategi-pengujian)
17. [Analisis Performa](#17-analisis-performa)
18. [Keputusan Teknis Kunci](#18-keputusan-teknis-kunci)
19. [Struktur Direktori](#19-struktur-direktori)
20. [Cara Menjalankan Proyek](#20-cara-menjalankan-proyek)

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
│  │  POST /api/pengukuran  → Z-Score (kode)     │    │
│  │  POST /api/anak        → CRUD + QG          │    │
│  │  PATCH /api/anak       → Update data anak   │    │
│  │  POST /api/import-foto → Gemini Vision OCR  │    │
│  │  POST /api/import-simpan → Simpan hasil OCR │    │
│  │  POST /api/ringkasan   → LLM + fallback     │    │
│  │  POST /api/menu        → LLM + kode harga   │    │
│  │  GET  /api/laporan     → CSV export          │    │
│  │  POST /api/tindak-lanjut → Catat follow-up  │    │
│  │  POST /api/akun-orangtua → Buat akun ortu   │    │
│  │  POST /api/keluar      → Logout              │    │
│  └─────────────────────────────────────────────┘    │
│                       │                             │
│  ┌────────────────────┼────────────────────────┐    │
│  │           Middleware (middleware.ts)         │    │
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
- **Client:** Aplikasi web di browser kader/bidan. React 19 untuk UI, Service
  Worker untuk caching & sync, IndexedDB untuk antrean offline.
- **Server:** Next.js 15 App Router di Vercel. Semua logika bisnis berada di
  API Routes. Middleware menangani penyegaran token auth.
- **Database:** Supabase (PostgreSQL) di region Singapore. RLS aktif di semua
  tabel untuk isolasi data per posyandu.

---

## 4. Tech Stack

| Lapisan      | Teknologi                | Versi  | Alasan Pemilihan                                                     |
| :----------- | :----------------------- | :----- | :------------------------------------------------------------------- |
| Framework    | Next.js (App Router)     | 15.5   | Server Components untuk muat cepat; API Routes terintegrasi          |
| Bahasa       | TypeScript               | 5.7    | Type safety mencegah bug di kalkulasi medis                          |
| UI           | React                    | 19.0   | Komponen deklaratif, ekosistem luas                                  |
| Styling      | Tailwind CSS             | 3.4    | Utility-first, konsisten                                             |
| Database     | Supabase (PostgreSQL)    | —      | RLS bawaan; Auth terintegrasi; region Singapore                      |
| Auth         | Supabase Auth (GoTrue)   | —      | Cookie-based session; 3 peran tanpa library tambahan                 |
| Grafik       | Recharts                 | 2.15   | Grafik pertumbuhan anak dengan referensi WHO                         |
| Validasi     | Zod                      | 3.24   | Skema validasi dipakai bersama di klien dan server                   |
| Testing      | Vitest                   | 3.0    | Cepat, kompatibel ESM                                                |
| AI/LLM       | Google Gemini            | —      | Vision API untuk OCR; teks untuk ringkasan & menu                    |
| Hosting      | Vercel                   | —      | Deploy otomatis dari Git                                             |
| Offline      | Service Worker + IndexedDB | —   | Standar web tanpa dependency tambahan                                |

**Statistik Kode:** 83 file TypeScript/TSX (~577 KB source code)

---

## 5. Konfigurasi Lingkungan

Semua variabel lingkungan didefinisikan di `.env.local`. File `.env.example`
menjadi acuan.

| Variabel                          | Wajib   | Sisi    | Penjelasan                                                       |
| :-------------------------------- | :------ | :------ | :--------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | **Ya**  | Publik  | URL proyek Supabase (dari Project Settings > API)                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | **Ya**  | Publik  | Kunci anonim Supabase (dari Project Settings > API)              |
| `SUPABASE_SERVICE_ROLE_KEY`       | **Ya**  | Server  | Kunci service role. Untuk skrip seed, uji RLS, dan riwayat menu |
| `LLM_API_KEY`                     | Tidak   | Server  | API key penyedia LLM (Gemini/OpenAI)                            |
| `LLM_BASE_URL`                    | Tidak   | Server  | Base URL API LLM. Default: `https://api.openai.com/v1`          |
| `LLM_MODEL_TEXT`                  | Tidak   | Server  | Model untuk ringkasan & menu. Default: `gpt-4o-mini`            |
| `LLM_MODEL_VISION`               | Tidak   | Server  | Model untuk OCR foto. Default: `gpt-4o-mini`                    |
| `DEMO_SAFE_MODE`                  | Tidak   | Server  | Jika `true`, ringkasan memakai fallback tanpa memanggil LLM     |

**Perilaku tanpa konfigurasi LLM:** Aplikasi tetap berfungsi penuh. Fitur yang
memerlukan LLM (OCR, ringkasan, menu) menggunakan mode fallback/manual.
Aplikasi tidak pernah crash karena variabel LLM kosong.

**Perilaku tanpa konfigurasi Supabase:** Middleware meneruskan request tanpa
error. Halaman menampilkan panduan pengisian variabel lingkungan. API Routes
mengembalikan `503 Service Unavailable` dengan pesan jelas.

---

## 6. Skema Database

### 6.1 Entity Relationship

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

### 6.2 Tabel & Kolom

#### `wilayah`
| Kolom        | Tipe           | Constraint       | Penjelasan                      |
| :----------- | :------------- | :--------------- | :------------------------------ |
| `id`         | `uuid`         | PK, auto         | Identifier unik                 |
| `nama`       | `text`         | NOT NULL         | Nama wilayah                    |
| `kecamatan`  | `text`         | NOT NULL         | Nama kecamatan                  |
| `kabupaten`  | `text`         | NOT NULL         | Nama kabupaten                  |
| `created_at` | `timestamptz`  | NOT NULL, default| Waktu pembuatan                 |

#### `posyandu`
| Kolom        | Tipe           | Constraint         | Penjelasan                    |
| :----------- | :------------- | :----------------- | :---------------------------- |
| `id`         | `uuid`         | PK, auto           | Identifier unik               |
| `wilayah_id` | `uuid`         | FK → wilayah, NOT NULL | Wilayah induk             |
| `nama`       | `text`         | NOT NULL           | Nama posyandu                 |
| `alamat`     | `text`         | nullable           | Alamat posyandu               |
| `created_at` | `timestamptz`  | NOT NULL, default  | Waktu pembuatan               |

#### `profil`
| Kolom          | Tipe          | Constraint                             | Penjelasan                     |
| :------------- | :------------ | :------------------------------------- | :----------------------------- |
| `id`           | `uuid`        | PK, FK → auth.users                   | Terikat ke Supabase Auth       |
| `peran`        | `user_role`   | NOT NULL                               | `kader` / `bidan` / `orang_tua`|
| `nama`         | `text`        | NOT NULL                               | Nama lengkap                   |
| `telepon`      | `text`        | nullable                               | Nomor telepon                  |
| `posyandu_id`  | `uuid`        | FK → posyandu, CHECK kader wajib isi   | Posyandu tugas kader           |
| `wilayah_id`   | `uuid`        | FK → wilayah, CHECK bidan wajib isi    | Wilayah tugas bidan            |
| `created_at`   | `timestamptz` | NOT NULL, default                      | Waktu pembuatan                |

#### `anak`
| Kolom            | Tipe          | Constraint                            | Penjelasan                    |
| :--------------- | :------------ | :------------------------------------ | :---------------------------- |
| `id`             | `uuid`        | PK, auto                             | Identifier unik               |
| `posyandu_id`    | `uuid`        | FK → posyandu, NOT NULL              | Terdaftar di posyandu mana    |
| `nama`           | `text`        | NOT NULL                             | Nama anak                     |
| `tanggal_lahir`  | `date`        | NOT NULL, CHECK ≤ hari ini           | Tanggal lahir                 |
| `jenis_kelamin`  | `sex`         | NOT NULL                             | `L` atau `P`                  |
| `nama_orang_tua` | `text`        | NOT NULL                             | Nama orang tua/wali           |
| `orang_tua_id`   | `uuid`        | FK → profil, nullable                | Link ke akun orang tua        |
| `telepon`        | `text`        | nullable                             | Nomor telepon orang tua       |
| `alamat`         | `text`        | nullable                             | Alamat rumah                  |
| `alergi`         | `text[]`      | nullable                             | Daftar alergen makanan        |
| `created_at`     | `timestamptz` | NOT NULL, default                    | Waktu pembuatan               |

#### `pengukuran`
| Kolom              | Tipe           | Constraint                            | Penjelasan                                    |
| :----------------- | :------------- | :------------------------------------ | :-------------------------------------------- |
| `id`               | `uuid`         | PK, auto                             | Identifier unik                               |
| `anak_id`          | `uuid`         | FK → anak, NOT NULL                  | Anak yang diukur                               |
| `tanggal`          | `date`         | NOT NULL, CHECK ≤ hari ini           | Tanggal pengukuran                             |
| `berat_kg`         | `numeric(5,2)` | NOT NULL, CHECK 0.5–30               | Berat badan dalam kilogram                     |
| `tinggi_cm`        | `numeric(5,1)` | NOT NULL, CHECK 30–130               | Tinggi/panjang badan dalam centimeter          |
| `diukur_telentang` | `boolean`      | NOT NULL, default false              | True jika diukur dengan panjang badan          |
| `usia_bulan`       | `integer`      | NOT NULL, CHECK 0–60                 | Usia saat diukur (dihitung server)             |
| `z_bb_u`           | `numeric(5,2)` | nullable                             | Z-score berat menurut usia                     |
| `z_tb_u`           | `numeric(5,2)` | nullable                             | Z-score tinggi menurut usia                    |
| `z_bb_tb`          | `numeric(5,2)` | nullable                             | Z-score berat menurut tinggi                   |
| `status`           | `status_gizi`  | nullable                             | Hasil klasifikasi akhir                        |
| `sumber`           | `sumber_data`  | NOT NULL, default `manual`           | `manual` atau `ocr_ai`                         |
| `dikonfirmasi`     | `boolean`      | NOT NULL, default true               | False sampai kader mengonfirmasi data OCR      |
| `penanda`          | `text[]`       | NOT NULL, default `{}`               | Kode peringatan dari Quality Guard             |
| `dicatat_oleh`     | `uuid`         | FK → profil, nullable               | Kader yang mencatat                            |
| `klien_ref`        | `text`         | UNIQUE per anak, nullable            | Idempotency key untuk sync offline             |
| `created_at`       | `timestamptz`  | NOT NULL, default                    | Waktu pembuatan                                |

#### `ringkasan_bulanan`
| Kolom          | Tipe           | Constraint                    | Penjelasan                            |
| :------------- | :------------- | :---------------------------- | :------------------------------------ |
| `id`           | `uuid`         | PK, auto                     | Identifier unik                       |
| `posyandu_id`  | `uuid`         | FK → posyandu, NOT NULL      | Posyandu yang diringkas               |
| `periode`      | `date`         | NOT NULL, UNIQUE per posyandu | Bulan laporan                         |
| `isi`          | `text`         | NOT NULL                     | Teks ringkasan                        |
| `dari_fallback`| `boolean`      | NOT NULL, default false      | True jika disusun template            |
| `created_at`   | `timestamptz`  | NOT NULL, default            | Waktu pembuatan                       |

### 6.3 Enum Types

| Enum          | Nilai                                              |
| :------------ | :------------------------------------------------- |
| `user_role`   | `kader`, `bidan`, `orang_tua`                      |
| `sex`         | `L`, `P`                                           |
| `status_gizi` | `normal`, `risiko`, `berat`, `lebih`, `obesitas`   |
| `sumber_data` | `manual`, `ocr_ai`                                 |

### 6.4 Migrasi

12 file migrasi SQL di `supabase/migrations/`, dijalankan berurutan:

| No | File                             | Isi                                    |
| :- | :------------------------------- | :------------------------------------- |
| 1  | `0001_skema_awal.sql`            | 4 enum, 6 tabel, 6 indeks             |
| 2  | `0002_rls.sql`                   | 4 fungsi RLS, 10 policy               |
| 3  | `0003_grant.sql`                 | Hak akses anon/authenticated           |
| 4  | `0004_telepon_anak.sql`          | Kolom telepon di tabel anak            |
| 5  | `0005_batas_panggilan.sql`       | Tabel & fungsi rate limiting           |
| 6  | `0006_pengukuran_unik.sql`       | Idempotency key untuk sync offline     |
| 7  | `0007_grant_batas_panggilan.sql` | Hak akses tabel batas panggilan        |
| 8  | `0008_tanggal_zona_waktu.sql`    | Perbaikan zona waktu ke WIB            |
| 9  | `0009_status_gizi_lebih.sql`     | Enum gizi lebih & obesitas             |
| 10 | `0010_alergi_anak.sql`           | Kolom alergi untuk saran menu          |
| 11 | `0011_riwayat_saran_menu.sql`    | Tabel riwayat saran menu               |
| 12 | `0012_tindak_lanjut.sql`         | Tabel tindak lanjut anak hilang        |

---

## 7. Keamanan & Otorisasi (RLS)

### 7.1 Model 3 Peran

| Peran        | Cakupan Data                         | Hak Akses                              |
| :----------- | :----------------------------------- | :------------------------------------- |
| `kader`      | Hanya posyandu tempat ia bertugas    | Baca + tulis anak & pengukuran         |
| `bidan`      | Semua posyandu di wilayahnya         | Baca semua + unduh laporan CSV         |
| `orang_tua`  | Hanya anak yang tertaut padanya      | Baca data anaknya sendiri saja         |

### 7.2 Fungsi RLS

Empat fungsi SQL `security definer` (search_path dikunci ke `public`):

```sql
auth_peran()           → user_role    -- Peran pengguna saat ini
auth_posyandu_id()     → uuid         -- Posyandu kader saat ini
auth_wilayah_id()      → uuid         -- Wilayah bidan saat ini
posyandu_terjangkau()  → setof uuid   -- Semua posyandu yang boleh diakses
```

### 7.3 Prinsip Keamanan

- **RLS di level database**, bukan di level frontend. Sekalipun request API
  dimanipulasi langsung, PostgreSQL menolak akses ke data yang bukan haknya.
- **Tidak ada pendaftaran mandiri.** Akun dibuat pengelola untuk mencegah
  akses tidak sah ke data kesehatan anak.
- **`posyandu_id` tidak diambil dari request body.** Diturunkan dari profil
  kader yang login, agar kader tidak bisa mendaftarkan anak ke posyandu lain.

---

## 8. Kontrak API (API Contracts)

Seluruh endpoint mengikuti konvensi:
- Request body: JSON
- Response body: JSON (kecuali `/api/laporan` yang mengembalikan CSV)
- Autentikasi: Cookie-based Supabase session
- Otorisasi: RLS + pemeriksaan peran di handler

### 8.1 `POST /api/pengukuran`

Mencatat satu pengukuran anak. Z-score dihitung di server (nilai klien tidak
dipercaya).

**Request Body:**
```json
{
  "anakId": "uuid",
  "tanggal": "YYYY-MM-DD",
  "beratKg": 8.5,
  "tinggiCm": 72.0,
  "diukurTelentang": false,
  "klienRef": "opsional-idempotency-key",
  "abaikanPenanda": false
}
```

**Response Sukses (200):**
```json
{
  "ok": true,
  "id": "uuid",
  "usiaBulan": 9,
  "status": "normal",
  "penentuStatus": "bb_u",
  "zBeratUsia": -0.45,
  "zTinggiUsia": 0.12,
  "zBeratTinggi": -0.67,
  "penanda": []
}
```

**Response: Perlu Konfirmasi Kader (409):**
```json
{
  "perluKonfirmasi": true,
  "temuan": [{"pesan": "Tinggi menurun dari pengukuran sebelumnya", "tingkat": "tandai"}],
  "pratinjau": {"usiaBulan": 9, "status": "normal"}
}
```

**Status Codes:**
| Code | Kondisi                                                    |
| :--- | :--------------------------------------------------------- |
| 200  | Berhasil disimpan (termasuk duplikat idempoten)             |
| 400  | Validasi Zod gagal atau constraint database dilanggar       |
| 401  | Belum login                                                |
| 403  | Bukan kader                                                |
| 404  | Anak tidak ditemukan atau di luar wewenang (RLS)            |
| 409  | Data ditandai Quality Guard, perlu konfirmasi kader         |
| 422  | Data ditolak Quality Guard (nilai mustahil secara medis)    |
| 500  | Galat server                                               |
| 503  | Supabase belum terkonfigurasi                              |

---

### 8.2 `POST /api/anak`

Mendaftarkan anak baru. `posyandu_id` diambil dari profil kader, bukan request.

**Request Body:**
```json
{
  "nama": "Ahmad Faiz",
  "tanggalLahir": "2024-03-15",
  "jenisKelamin": "L",
  "namaOrangTua": "Siti Aminah",
  "telepon": "081234567890",
  "alamat": "Jl. Mawar No.5",
  "alergi": "susu sapi, kacang"
}
```

**Response Sukses (200):**
```json
{
  "ok": true,
  "id": "uuid",
  "nama": "Ahmad Faiz",
  "peringatanNamaSerupa": null
}
```

**Status Codes:** 200, 400, 401, 403, 500, 503

---

### 8.3 `PATCH /api/anak`

Memperbaiki data anak yang sudah terdaftar. Tidak bisa memindahkan anak ke
posyandu lain (`posyandu_id` tidak ikut diperbarui).

**Request Body:** Sama seperti POST, ditambah `"id": "uuid"`.

**Response Sukses (200):**
```json
{
  "ok": true,
  "id": "uuid",
  "nama": "Ahmad Faiz",
  "catatan": "Bila tanggal lahir diubah, usia pada riwayat penimbangan lama tidak dihitung ulang."
}
```

**Status Codes:** 200, 400, 401, 403, 404, 500, 503

---

### 8.4 `POST /api/import-foto`

Membaca satu halaman buku tulis posyandu menggunakan AI Vision. **Tidak
menyimpan apa pun** — mengembalikan hasil bacaan sebagai usulan untuk kader.

**Request Body:**
```json
{
  "gambar": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Batasan gambar:**
- Format: JPEG, PNG, WebP, HEIC, HEIF
- Maks ukuran data URL: 3 MiB (~2.2 MB file asli)
- `maxDuration`: 60 detik

**Response Sukses (200):**
```json
{
  "ok": true,
  "baris": [
    {
      "nama": "Ahmad",
      "beratKg": 8.5,
      "tinggiCm": 72.0,
      "tanggal": "2024-06-15",
      "catatan": [],
      "dikonfirmasi": false,
      "sumber": "ocr_ai"
    }
  ],
  "perluKonfirmasiKader": true,
  "catatan": "Hasil pembacaan otomatis. Mohon periksa dan perbaiki sebelum disimpan."
}
```

**Status Codes:** 200, 400, 401, 413, 429, 502, 503

---

### 8.5 `POST /api/import-simpan`

Menyimpan baris yang sudah diperiksa kader dari hasil OCR. Z-score dihitung
ulang di server menggunakan fungsi deterministik yang sama.

**Request Body:**
```json
{
  "baris": [
    {
      "nama": "Ahmad",
      "beratKg": 8.5,
      "tinggiCm": 72.0,
      "tanggal": "2024-06-15",
      "diukurTelentang": false,
      "anakId": "uuid (opsional, jika dipilih manual)"
    }
  ]
}
```

**Response (200):**
```json
{
  "ok": true,
  "berhasil": 3,
  "gagal": 1,
  "hasil": [
    {"indeks": 0, "nama": "Ahmad", "ok": true, "namaAnakTujuan": "Ahmad Faiz", "status": "normal", "usiaBulan": 9},
    {"indeks": 1, "nama": "Ani", "ok": false, "galat": "Ada beberapa anak dengan nama serupa.", "saranAnakId": "uuid"}
  ]
}
```

---

### 8.6 `POST /api/menu`

Menyusun saran menu harian untuk satu anak. Status gizi diambil dari database,
bukan dari request.

**Request Body:** `{"anakId": "uuid"}`

**Response (200):**
```json
{
  "ok": true,
  "namaAnak": "Ahmad",
  "status": "risiko",
  "usiaBulan": 18,
  "menu": [...],
  "belanja": [...],
  "totalBiayaRp": 15000,
  "catatanGizi": "...",
  "narasi": "...",
  "dariFallback": false
}
```

**Status Codes:** 200, 400, 401, 404, 409 (belum ada pengukuran / bayi <6 bulan), 429, 503

---

### 8.7 `POST /api/ringkasan`

Menyusun ringkasan bulanan. Angka dihitung kode, AI menyusun kalimat. Jika AI
gagal, template deterministik tetap tampil.

**Request Body:** _(kosong)_

**Response (200):**
```json
{
  "ok": true,
  "teks": "Bulan ini terdapat 6 anak terdaftar...",
  "dariFallback": false
}
```

**Status Codes:** 200, 401, 429, 503

---

### 8.8 `GET /api/laporan`

Mengunduh laporan bulanan sebagai file CSV. Hanya bidan yang berhak.

**Response (200):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="Laporan_Posyandu_....csv"`
- Cache-Control: `no-store`
- Body: CSV file dengan BOM UTF-8

**Status Codes:** 200, 401, 403 (bukan bidan), 503

---

### 8.9 `POST /api/tindak-lanjut`

Mencatat tindakan atas anak yang hilang dari pemantauan.

**Request Body:**
```json
{
  "anakId": "uuid",
  "jenis": "ditelepon",
  "catatan": "Ibu menjawab, anak sehat. Akan datang bulan depan."
}
```

**Jenis yang valid:** `ditelepon`, `dikunjungi`, `hadir`, `tidak_terjangkau`

**Status Codes:** 200, 400, 401, 403, 500, 503

---

## 9. Skema Validasi (Zod)

Skema validasi didefinisikan di `src/lib/validasi.ts` dan **dipakai bersama
di klien dan server**. Satu definisi mencegah aturan terduplikasi.

### 9.1 `anakBaruSchema`

| Field          | Tipe                | Aturan                                             |
| :------------- | :------------------ | :------------------------------------------------- |
| `nama`         | `string`            | trim, min 2 huruf, max 100, harus memuat ≥2 huruf |
| `tanggalLahir` | `string`            | format YYYY-MM-DD, tanggal valid, ≤ hari ini       |
| `jenisKelamin` | `enum`              | `"L"` atau `"P"`                                   |
| `namaOrangTua` | `string`            | trim, min 2, max 100                               |
| `telepon`      | `string` (opsional) | regex: `^(\+62|62|0)8\d{7,12}$`                   |
| `alamat`       | `string` (opsional) | trim, max 200                                      |
| `alergi`       | `string` (opsional) | trim, max 200, dipecah dengan koma menjadi array    |

### 9.2 `pengukuranBaruSchema`

| Field             | Tipe                | Aturan                                           |
| :---------------- | :------------------ | :----------------------------------------------- |
| `anakId`          | `string`            | format UUID                                      |
| `tanggal`         | `string`            | format YYYY-MM-DD, tanggal valid, ≤ hari ini     |
| `beratKg`         | `number`            | min 0.5, max 30                                  |
| `tinggiCm`        | `number`            | min 30, max 130                                  |
| `diukurTelentang` | `boolean`           | default false                                    |
| `klienRef`        | `string` (opsional) | trim, max 80 — idempotency key offline           |
| `abaikanPenanda`  | `boolean`           | default false — kader menyetujui penanda         |

### 9.3 Validasi Tanggal Khusus

Tanggal divalidasi melampaui sekadar format regex:
1. Tanggal harus benar-benar ada di kalender (cegah "2024-02-31").
2. Tidak boleh melewati hari ini (dengan toleransi 1 hari untuk perbedaan zona
   waktu perangkat kader).

---

## 10. Strategi Penanganan Galat

### 10.1 Pola Konsisten di Seluruh API

Setiap API Route mengikuti urutan penanganan yang sama:

```
1. Parse JSON body          → 400 "Isi permintaan bukan JSON"
2. Validasi Zod             → 400 + pesan galat pertama
3. Cek konfigurasi Supabase → 503 "Basis data belum terhubung"
4. Cek autentikasi          → 401 "Silakan masuk terlebih dahulu"
5. Cek peran                → 403 "Hanya [peran] yang dapat..."
6. Logika bisnis            → 404/409/422 sesuai konteks
7. Simpan ke database       → 400/500 dengan pembedaan error code
```

### 10.2 Pembedaan Error Database

| PostgreSQL Code | HTTP Status | Penjelasan                                    |
| :-------------- | :---------- | :-------------------------------------------- |
| `23505`         | 200         | Duplikat idempoten (bukan error, data sudah ada) |
| `23514`         | 400         | Constraint violation (berat/tinggi/tanggal)    |
| `42501`         | 403         | Pelanggaran RLS (akses ditolak)                |
| `42P01`         | 503         | Tabel belum ada (migrasi belum jalan)          |
| Lainnya         | 500         | Galat server tak terduga                       |

### 10.3 Prinsip

- **Galat constraint dijawab 400, bukan 500.** Kader harus tahu datanya yang
  salah, bukan servernya yang rusak.
- **Duplikat idempoten dijawab 200.** Data sudah ada bukan kegagalan —
  mencegah antrean offline menghapus data yang sebetulnya sudah tersimpan.
- **Pelanggaran RLS dijawab 403 dengan pesan jelas**, bukan 500 misterius.

---

## 11. Pembatasan Laju (Rate Limiting)

Pembatasan laju melindungi biaya panggilan ke penyedia LLM. Penghitungnya
**di database** (bukan di memori proses) karena serverless memulai proses baru
per request.

| Endpoint       | Batas per Jendela | Jendela   | Alasan                                         |
| :------------- | :---------------- | :-------- | :--------------------------------------------- |
| `ringkasan`    | 5 panggilan       | 60 detik  | Prompt terbesar, hasil jarang berubah           |
| `menu`         | 8 panggilan       | 60 detik  | Cukup untuk melihat beberapa anak berurutan     |
| `import_foto`  | 12 panggilan      | 60 detik  | Kader memang memfoto beberapa halaman berurutan |

**Perilaku saat pengecekan gagal:** Request DIIZINKAN. Kegagalan pembatasan
laju tidak boleh mematikan fitur di lapangan. Risikonya terbatas pada biaya
API.

---

## 12. Fitur Lengkap

### 12.1 Fitur Inti (7 Fitur)

#### F1: Input Pengukuran + Penjaga Kualitas Data (Quality Guard)
- Kader memasukkan berat (kg) dan tinggi (cm) anak.
- Quality Guard memvalidasi input secara real-time:
  - **Tolak** nilai mustahil: berat < 0.5 kg atau > 30 kg, tinggi < 30 cm atau
    > 130 cm, usia > 60 bulan.
  - **Tandai** anomali: tinggi menurun, lonjakan berat > 2 kg/bulan, berat
    tidak naik ≥ 2 pengukuran berturut-turut.
- Penanda disimpan di kolom `penanda[]` pada tabel pengukuran.
- File: `src/lib/gizi/penjaga-data.ts`, `src/components/FormPengukuran.tsx`

#### F2: Mesin Z-Score WHO (Deterministik)
- **4 indikator**: BB/U, PB/U atau TB/U, BB/PB atau BB/TB.
- Metode **LMS (Lambda-Mu-Sigma)** dari WHO Child Growth Standards (0-5 tahun).
- Interpolasi linear antar titik referensi.
- Koreksi ekor distribusi untuk Z-score di luar ±3 SD.
- **AI tidak pernah dilibatkan** — seluruh angka deterministik.
- Ambang klasifikasi: normal (≥ -2 SD), risiko (-3 ≤ Z < -2), berat (< -3),
  lebih (+2 < Z ≤ +3, hanya BB/PB|TB), obesitas (> +3).
- Referensi data: `src/lib/gizi/tabel-who.json` (122 KB).
- File: `src/lib/gizi/zscore.ts` (496 baris)

#### F3: Dashboard Bidan & Grafik Pertumbuhan
- Distribusi status gizi seluruh anak.
- Daftar prioritas: anak dengan status kritis di atas.
- Grafik per anak (Recharts) dengan garis referensi WHO (-3, -2, median, +2, +3 SD).
- File: `src/lib/dashboard.ts`, `src/components/GrafikPertumbuhan.tsx`

#### F4: Autentikasi & Isolasi Data 3 Peran (RLS)
- Login berbasis cookie (Supabase Auth). 3 peran: kader, bidan, orang_tua.
- Middleware penyegaran sesi otomatis (mengecualikan API Routes agar tidak ada
  panggilan auth ganda).
- File: `src/middleware.ts`, `src/lib/sesi.ts`, `src/lib/peran.ts`

#### F5: Import Foto Buku Tulis + Provenance
- Kader memfoto halaman buku tulis lama.
- AI Vision mengekstrak nama, berat, tinggi, tanggal.
- Hasil **wajib dikonfirmasi kader** (human-in-the-loop).
- Setiap nilai menyimpan jejak asal (`sumber`: `manual`/`ocr_ai`) dan status
  konfirmasi. Data belum dikonfirmasi **tidak dihitung ke statistik**.
- File: `src/components/ImportFoto.tsx`, `src/app/api/import-foto/route.ts`,
  `src/app/api/import-simpan/route.ts`

#### F6: Deteksi Anak Hilang dari Pemantauan
- Anak dengan jeda kunjungan > 90 hari otomatis ditandai.
- Dashboard bidan: lama absensi + kontak orang tua.
- Tombol tindak lanjut: `ditelepon`, `dikunjungi`, `hadir`, `tidak_terjangkau`.
- File: `src/app/api/tindak-lanjut/route.ts`,
  `src/components/TombolTindakLanjut.tsx`

#### F7: Offline-First + Sinkronisasi
- Service Worker untuk caching halaman dan aset statis.
- IndexedDB menyimpan antrean pengukuran offline.
- `klien_ref` (idempotency key) mencegah data ganda saat kirim ulang.
- Status koneksi real-time di UI (🟢 Online / 🔴 Offline).
- File: `src/lib/antrean-offline.ts`, `src/components/StatusKoneksi.tsx`

### 12.2 Fitur Pendukung (5 Fitur)

#### F8: AI Saran Menu Lokal Murah
- Rekomendasi menu berbahan lokal (tempe, telur, ikan teri, kangkung).
- **Harga dihitung kode** dari daftar harga tetap, bukan ditebak AI.
- Bayi < 6 bulan otomatis dilewati (hanya ASI eksklusif).
- Alergi anak menyaring bahan berbahaya.
- File: `src/lib/menu.ts` (24 KB), `src/components/SaranMenu.tsx`

#### F9: Ringkasan Bulanan (AI + Fallback)
- Angka dihitung kode, AI hanya menyusun kalimat.
- Jika LLM gagal: template deterministik (flag `dari_fallback = true`).
- File: `src/lib/ringkasan.ts`

#### F10: Pendaftaran Anak Baru
- Form lengkap dengan validasi Zod. Memperingatkan jika nama serupa sudah ada.
- File: `src/components/FormAnakBaru.tsx`, `src/app/api/anak/route.ts`

#### F11: Perbaikan Data Anak
- Kader mengedit data anak (dijaga RLS). Catatan peringatan jika tanggal lahir
  diubah (Z-score riwayat lama tidak dihitung ulang).
- File: `src/components/FormEditAnak.tsx`

#### F12: Laporan Ekspor CSV
- Format CSV agar staf Dinas Kesehatan langsung olah di Excel.
- BOM UTF-8 agar Excel mengenali encoding.
- **Sengaja bukan PDF** — mencegah ketik ulang angka.
- File: `src/lib/laporan.ts`

---

## 13. Peran AI & Pembatasannya

### 13.1 Prinsip Utama

> **AI tidak pernah menghitung angka klinis. Kode deterministik tetap menjadi
> sumber kebenaran.**

### 13.2 Pembagian Tugas

| Tugas                         | Pelaksana   | Alasan                                             |
| :---------------------------- | :---------- | :------------------------------------------------- |
| Perhitungan Z-Score           | **Kode**    | Harus presisi & reprodusibel                       |
| Klasifikasi status gizi       | **Kode**    | Ambang batas tetap dari WHO                        |
| Deteksi tren pertumbuhan      | **Kode**    | Perbandingan angka sederhana                       |
| Perhitungan harga menu        | **Kode**    | Harga dari daftar tetap                            |
| Validasi input                | **Kode**    | Aturan bisnis pasti                                |
| Ekstraksi foto buku tulis     | **AI**      | Pengenalan tulisan tangan                          |
| Narasi ringkasan bulanan      | **AI**      | AI menyusun kalimat, angka dari kode               |
| Penyusunan cara memasak       | **AI**      | Kreativitas bahasa                                 |

### 13.3 Fail-Safe System

| Fitur             | Saat AI Mati                                           |
| :---------------- | :----------------------------------------------------- |
| Ringkasan bulanan | Template deterministik menggantikan narasi AI           |
| Saran menu        | Bahan & harga tetap tampil (cara memasak hilang)       |
| Import foto       | Form manual tetap bisa dipakai                         |
| Z-Score           | **Tidak terpengaruh** — tidak pernah pakai AI          |

---

## 14. Alur Data (Data Flow)

### 14.1 Alur Pencatatan Pengukuran Manual

```
Kader                    Server                       Database
  │                        │                            │
  ├──── POST /api/pengukuran ─────►│                    │
  │     {anakId, tanggal,  │       │                    │
  │      beratKg, tinggiCm}│       │                    │
  │                        ├─ 1. Validasi Zod           │
  │                        ├─ 2. Cek auth + peran       │
  │                        ├─ 3. SELECT anak ──────────►│ (RLS filter)
  │                        │◄──────────────────────────┤
  │                        ├─ 4. SELECT pengukuran sebelumnya ──►│
  │                        │◄──────────────────────────┤
  │                        ├─ 5. Quality Guard          │
  │                        │  ├─ Tolak? → 422           │
  │                        │  └─ Tandai? → 409 (minta konfirmasi)
  │                        ├─ 6. Hitung Z-Score (WHO LMS)│
  │                        ├─ 7. INSERT pengukuran ────►│
  │◄─── 200 {ok, status, zScores} ─┤                   │
```

### 14.2 Alur Import Foto (2 Tahap)

```
Tahap 1: Membaca                          Tahap 2: Menyimpan
Kader                                     Kader
  │                                         │
  ├── POST /api/import-foto ──►│            ├── POST /api/import-simpan ──►│
  │   {gambar: data:image/...} │            │   {baris: [{nama, berat,...}]}│
  │                            │            │                              │
  │   ┌── Gemini Vision ──┐    │            │   ┌── Per baris: ──────────┐ │
  │   │ Baca tulisan tangan│   │            │   │ 1. Cocokkan nama anak  │ │
  │   │ → JSON baris       │   │            │   │ 2. Quality Guard       │ │
  │   └────────────────────┘   │            │   │ 3. Hitung Z-Score      │ │
  │                            │            │   │ 4. INSERT pengukuran   │ │
  │◄── 200 {baris, perlu       │            │   │    sumber='ocr_ai'     │ │
  │     KonfirmasiKader}       │            │   └────────────────────────┘ │
  │                            │            │                              │
  │  *** TIDAK ADA DATA        │            │◄── 200 {berhasil, gagal,     │
  │      TERSIMPAN ***         │            │        hasil per baris}      │
```

---

## 15. Offline-First Architecture

### 15.1 Alur

1. Kader membuka aplikasi → Service Worker menyajikan halaman dari cache.
2. Kader menginput pengukuran → Data masuk ke IndexedDB (antrean lokal).
3. Z-Score **langsung dihitung di browser** (kode deterministik tanpa server).
4. Status gizi langsung ditampilkan ke kader.
5. Koneksi kembali → Service Worker mengirim antrean ke server secara batch.
6. `klien_ref` memastikan data yang dikirim ulang tidak menjadi duplikat.
7. Server menghitung ulang Z-score sendiri (nilai klien tidak dipercaya).

### 15.2 Idempotency

Kolom `klien_ref` pada tabel `pengukuran` memiliki constraint `UNIQUE(anak_id,
klien_ref)`. Jika klien mengirim ulang request dengan `klien_ref` yang sama:
- Database menolak dengan error code `23505`
- API mengembalikan `200 {ok: true, duplikat: true}` (bukan error)
- Klien menganggap pengiriman berhasil dan menghapus item dari antrean

---

## 16. Strategi Pengujian

### 16.1 Ringkasan

| Jenis                | Jumlah   | Tool         | Lokasi                         |
| :------------------- | :------- | :----------- | :----------------------------- |
| Unit test (Vitest)   | 371 test | Vitest 3.0   | `src/**/*.test.ts` (21 file)   |
| Integrasi (scripts)  | 8 skrip  | Node.js      | `scripts/uji-*.mjs` (8 file)  |

### 16.2 Cakupan Unit Test

| Modul                    | File Test                        | Yang Diuji                                     |
| :----------------------- | :------------------------------- | :--------------------------------------------- |
| Z-Score WHO              | `gizi/zscore.test.ts`            | Golden test terhadap referensi WHO              |
| Tabel WHO                | `gizi/tabel.test.ts`             | Parsing & interpolasi parameter LMS             |
| Koreksi ekor             | `gizi/koreksi-ekor.test.ts`      | Z di luar ±3 SD dikoreksi sesuai WHO           |
| Quality Guard            | `gizi/penjaga-data.test.ts`      | Input mustahil ditolak, anomali ditandai        |
| Gizi lebih               | `gizi/gizi-lebih.test.ts`        | Klasifikasi +2 SD dan +3 SD                    |
| Pola pertumbuhan         | `gizi/pola.test.ts`              | Deteksi stagnan, lonjakan berat                 |
| Usia                     | `gizi/usia.test.ts`              | Perhitungan usia bulan dari tanggal lahir       |
| Kurva                    | `gizi/kurva.test.ts`             | Kurva pertumbuhan dengan garis referensi        |
| Pencocokan nama          | `cocok-nama.test.ts`             | OCR tidak salah cocok ("Ani" ≠ "Handayani")    |
| Dashboard                | `dashboard.test.ts`              | Distribusi dan prioritas                        |
| Laporan CSV              | `laporan.test.ts`                | Format dan isi laporan                          |
| Ringkasan                | `ringkasan.test.ts`              | Template fallback muncul saat AI mati           |
| Menu                     | `menu.test.ts`                   | Alergen tersaring, harga valid                  |
| Validasi                 | `validasi.test.ts`               | Skema Zod menolak data tidak valid              |
| Peran                    | `peran.test.ts`                  | Penentuan peran dari profil                     |
| Tanggal                  | `tanggal.test.ts`                | Format, zona waktu, edge cases                  |
| Alergi                   | `alergi.test.ts`                 | Pecahan koma, batas panjang                     |
| Rate limiter             | `batas-laju.test.ts`             | Pembatasan laju berfungsi                       |
| Ambil semua              | `ambil-semua.test.ts`            | Paginasi otomatis PostgREST                     |
| Proses pengukuran        | `proses-pengukuran.test.ts`      | Integrasi QG + Z-score                          |

### 16.3 Cakupan Integrasi Test

| Skrip                  | Yang Diuji                                               |
| :--------------------- | :------------------------------------------------------- |
| `uji-rls.mjs`          | Kader desa A **gagal** akses data desa B                 |
| `uji-alur.mjs`         | Alur lengkap: daftar → ukur → lihat hasil                |
| `uji-fitur-baru.mjs`   | Gizi lebih, alergi, menu berfungsi                       |
| `uji-import.mjs`       | Upload → konfirmasi → masuk database                     |
| `uji-batas-laju.mjs`   | Rate limiting API                                        |
| `uji-riwayat.mjs`      | Riwayat pengukuran & tindak lanjut                       |
| `uji-sesi.mjs`         | Login & penyegaran token                                 |
| `uji-akun-orangtua.mjs`| Akun orang tua hanya lihat anaknya                       |

### 16.4 Bug Kritis dari Audit Mandiri

| # | Bug                          | Dampak                                                | Status        |
|---|------------------------------|-------------------------------------------------------|---------------|
| 1 | Stunting tidak terdeteksi    | Anak >2 tahun + diukur telentang → referensi salah    | ✅ Diperbaiki |
| 2 | Pembulatan umur fatal        | 27 hari → 0 bulan. Deviasi **2.2 SD**                | ✅ Diperbaiki |
| 3 | Pencocokan nama berbahaya    | "Ani" match "Handayani" → data masuk anak lain        | ✅ Diperbaiki |

**Pola berbahaya:** Semua bug melaporkan kondisi **lebih baik** dari kenyataan.

### 16.5 Cara Menjalankan

```bash
npm test          # 371 unit tests
npm run uji:db    # 8 skrip integrasi (perlu koneksi Supabase)
```

---

## 17. Analisis Performa

### 17.1 Waktu Tanggap (Terukur, 26 Juli 2026)

| Halaman      | Median     | Perlu Sesi |
| :----------- | ---------: | :--------: |
| `/masuk`     | 333 ms     | Tidak      |
| `/`          | 414 ms     | Tidak      |
| `/orangtua`  | 1.501 ms   | Ya         |
| `/anak/[id]` | 1.977 ms   | Ya         |
| `/kader`     | 1.981 ms   | Ya         |
| `/bidan`     | 2.148 ms   | Ya         |

### 17.2 Akar Masalah

Serverless function di Washington (`iad1`), database di Singapore (`sin1`).
Setiap kueri ~230 ms pulang pergi. Didokumentasikan lengkap di `PERFORMA.md`.

---

## 18. Keputusan Teknis Kunci

Seluruh 35 keputusan di `DECISIONS.md` (53 KB).

### 18.1 Fitur yang Sengaja TIDAK Dibangun

| Fitur                  | Alasan                                                                |
| :--------------------- | :-------------------------------------------------------------------- |
| Chatbot Medis AI       | Jawaban tak terbatas, tak bisa diuji, berisiko nasihat medis fatal    |
| Tombol Darurat GPS     | Tanpa penerima aktif, menciptakan rasa aman palsu                     |
| Notifikasi Push        | Infrastruktur di luar scope hackathon                                 |
| Self-Registration      | Siapa pun bisa akses data kesehatan anak                              |

### 18.2 Keputusan Arsitektur

| Keputusan                              | Alasan                                                  |
| :------------------------------------- | :------------------------------------------------------ |
| 14 → 7 fitur inti                      | Sedikit tapi utuh > banyak tapi setengah jadi            |
| AI dibatasi ke 3 tugas bahasa          | Mencegah halusinasi pada data medis                      |
| CSV bukan PDF                          | Dinas Kesehatan langsung olah di Excel                   |
| RLS di database bukan frontend         | Tidak bisa di-bypass meski API dimanipulasi              |
| Z-Score deterministik bukan ML         | Harus presisi, reprodusibel, dan auditable               |
| Constraint kualitas di level database  | Pertahanan terakhir meski ada bug di frontend/API        |
| Fallback template untuk semua fitur AI | Tidak ada halaman kosong saat API AI mati                |
| Provenance disimpan                    | Data OCR bisa dibedakan dari input manual                |

---

## 19. Struktur Direktori

```
posyandu-ku/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # 10 API Routes (lihat Bagian 8)
│   │   ├── anak/[id]/                # Halaman detail anak
│   │   ├── bidan/                    # Dashboard bidan
│   │   ├── kader/                    # Dashboard kader
│   │   ├── masuk/                    # Halaman login
│   │   ├── orangtua/                 # Dashboard orang tua
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing page
│   ├── components/                   # 21 Komponen React
│   ├── lib/                          # 29 Modul logika bisnis
│   │   ├── gizi/                     # Mesin Z-Score WHO (16 file)
│   │   └── *.ts + *.test.ts          # Modul + unit test
│   └── middleware.ts                 # Penyegaran sesi
├── supabase/migrations/              # 12 file migrasi SQL
├── scripts/                          # 13 skrip operasional
├── SPEC.md                           # ← Dokumen ini
├── PRD.md                            # Product Requirements (64 KB)
├── DECISIONS.md                      # 35 Keputusan Teknis (53 KB)
├── DEMO.md                           # Panduan demo
├── PERFORMA.md                       # Analisis performa
└── README.md                         # Panduan pengembang
```

---

## 20. Cara Menjalankan Proyek

### 20.1 Prasyarat
- Node.js 18+
- Akun Supabase (project + migrations dijalankan)
- API Key Google Gemini (opsional, untuk fitur AI)

### 20.2 Setup

```bash
git clone <repo-url> && cd posyandu-ku
npm install
cp .env.example .env.local          # Edit dengan kredensial
# Jalankan 12 file SQL di supabase/migrations/ secara berurutan
npm run demo:reset                   # Seed data demo
npm run cek                          # Health check
```

### 20.3 Development

```bash
npm run dev            # Development server
npm test               # 371 unit tests
npm run uji:db         # Integrasi tests
npm run build          # Production build
```

### 20.4 Produksi
- **Live:** [posyandu-ku.vercel.app](https://posyandu-ku.vercel.app)
- **Akun demo:** `npm run akun`

---

> **Dokumen ini ditulis mengikuti pendekatan Spec Driven Development.**
> Seluruh kontrak API, skema validasi, strategi penanganan galat, dan
> keputusan arsitektur yang disebutkan dapat diverifikasi langsung di
> repositori.
>
> — Reno Syaelendra, Hacker, IndonesiaNEXT 2026
