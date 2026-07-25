# Product Requirements Document (PRD)
# PosyanduKu — Asisten Digital Kader Posyandu

**Versi**: 3.1
**Event**: 10th IndonesiaNEXT 2026 Hackathon by Telkomsel
**Role**: Hacker (Full-stack MVP)
**Format**: Hackathon Individu — 24 jam, satu karya per peserta
**Deadline pengumpulan**: 26 Juli 2026
**Tema yang dipilih**: Kesehatan Mental & Wellbeing

---

## 0. Ringkasan Solusi

### Apa ini?

PosyanduKu adalah aplikasi web yang mengubah catatan buku tulis kader posyandu menjadi sistem deteksi dini risiko gizi anak.

Kader memasukkan berat dan tinggi anak (atau memfoto halaman buku tulis lamanya). Sistem menghitung Z-score menurut standar WHO secara otomatis, menandai anak yang berisiko, dan menyusun daftar prioritas untuk bidan desa.

### Alur inti

```
Kader                        Sistem                       Bidan
  |                            |                            |
  |-- input berat & tinggi --->|                            |
  |    ATAU foto buku tulis    |                            |
  |                            |-- validasi kewajaran data  |
  |                            |-- hitung Z-score (WHO LMS) |
  |                            |-- klasifikasi status gizi  |
  |<-- status hijau/kuning/merah                            |
  |                            |                            |
  |                            |-- daftar prioritas ------->|
  |                            |-- anak absen 3 bulan+ ---->|
  |                            |-- ringkasan bulanan (LLM)->|
  |                            |                            |
  |                            |<------- rujuk ke puskesmas |
```

### Pembeda utama

| No | Pembeda | Mengapa penting |
|----|---------|-----------------|
| 1 | **Import foto buku tulis** | Data lama bertahun-tahun bisa masuk sistem, bukan hanya data baru |
| 2 | **Deteksi anak yang berhenti datang** | Anak paling berisiko justru yang tidak tercatat karena tidak hadir |
| 3 | **Skoring deterministik, LLM hanya untuk bahasa** | Angka dihitung kode yang bisa diuji, LLM tidak pernah menghitung |
| 4 | **Jejak asal data (provenance)** | Hasil ekstraksi AI wajib dikonfirmasi kader sebelum dihitung |
| 5 | **Offline-first** | Posyandu di desa sering tanpa sinyal |

---

## 0.1 Relevansi terhadap Tema Hackathon

### Tema yang dipilih: Kesehatan Mental & Wellbeing

Panduan hackathon menyebutkan cakupan tema ini sebagai:

> "Pengelolaan stres, dukungan sosial, literasi, kebiasaan sehat, **akses bantuan**, dan **pencegahan risiko**."

Panduan juga menegaskan bahwa peserta bebas menentukan target pengguna dan konteks masalah:

> "Tema bersifat terbuka. Peserta bebas menentukan target pengguna, konteks masalah, dan bentuk solusi yang paling relevan."

### Posisi PosyanduKu

| Cakupan tema | Bagaimana PosyanduKu memenuhinya |
|--------------|----------------------------------|
| **Pencegahan risiko** | Inti produk: mendeteksi risiko gizi anak sebelum menjadi gizi buruk. Deteksi anak yang berhenti hadir menangkap risiko yang selama ini tidak terlihat sama sekali. |
| **Akses bantuan** | Menghubungkan keluarga ke bidan dan puskesmas melalui daftar prioritas dan alur rujukan. Tanpa sistem ini, keluarga baru mendapat bantuan setelah anak sakit. |
| **Kebiasaan sehat** | Saran menu berbahan lokal murah mengubah pola makan harian keluarga menjadi kebiasaan yang bisa dijalankan. |
| **Dukungan sosial** | Kader posyandu adalah jaring dukungan sosial pertama di desa. Produk ini memperkuat kapasitas mereka, bukan menggantikannya. |
| **Literasi** | Orang tua yang sebelumnya tidak tahu status gizi anaknya kini memahaminya melalui indikator warna dan penjelasan berbahasa sederhana. |

### Kaitan dengan kesehatan mental

Wellbeing keluarga tidak terpisah dari kesehatan anak. Orang tua yang tidak tahu kondisi anaknya hidup dengan kecemasan yang tidak bernama; orang tua yang anaknya jatuh ke gizi buruk secara tiba-tiba menghadapi tekanan psikologis dan beban ekonomi yang berat.

Dengan memberi kepastian ("anak Anda dalam kondisi baik") atau peringatan yang dapat ditindaklanjuti ("anak Anda perlu diperiksa bidan, ini langkahnya"), produk ini mengurangi ketidakpastian yang menjadi sumber stres keluarga.

**Batasan yang diakui**: produk ini tidak melakukan skrining kesehatan mental secara klinis. Kontribusinya pada tema berada pada jalur pencegahan risiko dan akses bantuan, bukan pada asesmen psikologis.

---

## 0.2 Pemenuhan Deliverable Role Hacker

Panduan menetapkan enam keluaran untuk role Hacker. Berikut pemenuhannya:

| No | Tuntutan panduan | Pemenuhan | Bukti yang bisa diperiksa |
|----|------------------|-----------|---------------------------|
| 1 | Full-stack MVP, deploy ke URL publik | Next.js App Router, deploy Vercel | URL produksi di README |
| 2 | Pipeline penuh + database (Supabase) | PostgreSQL + Auth + RLS 3 peran | Migrasi SQL di `supabase/migrations/` |
| 3 | LLM API | Vision untuk import foto; teks untuk ringkasan bulanan dan saran menu | `src/app/api/import-foto/`, `src/app/api/ringkasan/`, `src/app/api/menu/` |
| 4 | GitHub commit history | Commit bertahap per fitur, bukan satu dump | `git log` |
| 5 | No-hardcode | Kredensial di environment variable, data contoh lewat skrip seed | `.env.example`, `scripts/seed.mjs` |
| 6 | PRD.md | Dokumen ini | `PRD.md` |

Panduan juga menyatakan:

> "Penilaian tidak hanya melihat kerumitan teknis — yang utama adalah fungsi, relevansi terhadap masalah, dan logika di balik setiap keputusan."

Karena itu cakupan dipersempit secara sengaja dari 14 fitur menjadi 7 fitur inti yang berfungsi utuh, ditambah lima pendukung. Alasan setiap fitur yang ditunda dicatat di `DECISIONS.md`.

---

## 1. Problem Statement

### Masalah Utama

Indonesia masih menghadapi masalah stunting yang serius. Prevalensi stunting balita berada di kisaran **21%** — sekitar **1 dari 5 anak Indonesia** — dan menjadikan Indonesia salah satu negara dengan prevalensi tertinggi di Asia Tenggara.

> **Catatan sumber**: angka pada dokumen ini merujuk Survei Kesehatan Indonesia (SKI) 2023 sebesar 21,5% dan target RPJMN sebesar 14%. Angka perlu diverifikasi ulang terhadap publikasi resmi terbaru Kemenkes/BPS sebelum digunakan dalam presentasi. Versi 2.0 dokumen ini memuat dua angka yang tidak konsisten ("1 dari 3" dan "21,6%"); inkonsistensi tersebut sudah diperbaiki di versi ini.

### Akar Masalah

Kader posyandu — yang sebagian besar adalah ibu-ibu sukarelawan — sudah bertahun-tahun mencatat data berat dan tinggi anak di **buku tulis**. Data ini menumpuk bertahun-tahun tetapi **tidak pernah diolah** menjadi informasi yang berguna.

**Dampaknya**:
- Anak yang gizinya memburuk **baru ketahuan setelah sakit parah**
- Bidan tidak punya data untuk mengambil keputusan intervensi
- Orang tua tidak tahu apakah anaknya dalam kondisi baik atau tidak
- Data bertahun-tahun menjadi **"harta karun yang terkubur"** — ada tapi tidak berguna

### Contoh Kasus Nyata

> Bu Ani, kader posyandu di Desa Sukamakmur, sudah 5 tahun mencatat data 200 anak di buku tulis. Bulan lalu, Budi (3 tahun) baru diketahui mengalami gizi buruk setelah sakit dan dibawa ke puskesmas. Padahal, data di buku Bu Ani menunjukkan berat badan Budi sudah tidak naik selama 6 bulan. Jika data tersebut diolah, Budi bisa ditolong lebih awal.

### Mengapa Masalah Ini Penting?

| Aspek | Data | Status verifikasi |
|-------|------|-------------------|
| Prevalensi stunting balita | 21,5% (SKI 2023) | perlu verifikasi publikasi terbaru |
| Target nasional | 14% | RPJMN |
| Jumlah posyandu di Indonesia | 300.000+ | perkiraan, perlu verifikasi |
| Jumlah kader posyandu | 1,2 juta+ | perkiraan, perlu verifikasi |
| Data yang tidak terolah | Bertahun-tahun, jutaan catatan | observasi kualitatif |

Angka yang belum terverifikasi tidak digunakan sebagai klaim utama dalam demo.

### Mengapa Solusi yang Ada Tidak Cukup?

| Solusi yang Ada | Masalahnya |
|-----------------|------------|
| **Buku tulis** | Data tidak bisa diolah, tidak ada analisis, tidak ada peringatan. Anak yang tidak hadir tidak tercatat sama sekali. |
| **e-PPGBM / SIGIZI Terpadu** (Kemenkes) | Dirancang untuk pelaporan ke atas, bukan untuk membantu kader di lapangan. Alur input panjang, butuh pelatihan, sering diisi belakangan secara borongan sehingga tidak dipakai saat menimbang. |
| **ASIK** (Aplikasi Sehat IndonesiaKu) | Fokus pada pencatatan kunjungan, umpan balik ke kader terbatas. Butuh koneksi saat input. |
| **Primaku / aplikasi konsumen** | Menyasar orang tua kelas menengah kota yang melek digital, bukan kader posyandu desa. |
| **Excel/spreadsheet** | Kader tidak bisa memakainya, tidak ada otomatisasi maupun peringatan. |
| **Pelatihan kader** | Tidak mengubah cara kerja. Data tetap menumpuk di buku tulis. |

**Kesenjangan yang belum terjawab:**

1. Tidak ada yang bisa **memasukkan data lama** yang sudah menumpuk di buku tulis
2. Tidak ada yang memberi **umpan balik seketika** kepada kader saat menimbang
3. Tidak ada yang mendeteksi **anak yang berhenti datang** ke posyandu
4. Tidak ada yang **berfungsi tanpa sinyal** di posyandu terpencil
5. Tidak ada yang menyarankan tindakan konkret bagi orang tua dengan **bahan pasar desa**

Kesenjangan nomor 1 dan 3 adalah alasan utama produk ini dibangun. Keduanya tidak bisa dijawab oleh digitalisasi biasa.

---

## 2. Goals

### Tujuan Utama

Membangun platform digital yang mengubah data posyandu dari "tumpukan buku tulis yang tidak berguna" menjadi "informasi yang menyelamatkan anak dari stunting".

### Tujuan Spesifik (SMART)

| No | Tujuan | Metrik | Target |
|----|--------|--------|--------|
| 1 | Kader bisa input data anak dengan mudah | Waktu input per anak | < 1 menit |
| 2 | Z-score dihitung benar sesuai standar WHO | Kesesuaian terhadap kasus uji referensi WHO | 100% kasus uji lolos (toleransi 0,01) |
| 3 | Bidan tahu anak mana yang perlu ditindaklanjuti | Waktu akses daftar prioritas | < 30 detik |
| 4 | Ringkasan bulanan tersusun otomatis | Waktu generate | < 15 detik, dengan fallback jika LLM gagal |
| 5 | Data lama di buku tulis bisa dimasukkan | Waktu per halaman buku tulis | < 2 menit termasuk konfirmasi kader |
| 6 | Anak yang berhenti hadir terdeteksi | Cakupan | 100% anak dengan jeda kunjungan > 90 hari |
| 7 | Aplikasi berfungsi tanpa sinyal | Input tersimpan saat offline | 100% tersinkron saat koneksi kembali |

Catatan pada tujuan 2: target menyatakan kesesuaian terhadap kasus uji, bukan akurasi diagnosis. Sistem ini tidak mendiagnosis.

### Pemetaan Tujuan ke Kriteria Penilaian

Kriteria penilaian resmi hackathon beserta cara dokumen dan produk ini memenuhinya:

| Bobot | Kriteria penilaian | Cara PosyanduKu memenuhinya |
|-------|--------------------|-----------------------------|
| **30%** | Penguasaan kompetensi role (Hacker) | Mesin Z-score deterministik dengan golden test; RLS diuji lintas pengguna; sinkronisasi offline; fallback saat LLM gagal; pemisahan tegas antara perhitungan (kode) dan penarasian (LLM) |
| **20%** | Pemahaman masalah | Analisis kompetitor bernama (e-PPGBM, ASIK, Primaku) beserta kelemahan spesifiknya; dua kesenjangan yang belum dijawab siapa pun (data lama, anak yang berhenti hadir) |
| **20%** | Kualitas & kegunaan output | 7 fitur inti dan 5 pendukung berfungsi utuh tanpa jalan buntu; 14 kriteria penerimaan yang dapat diuji; mode demo aman |
| **15%** | Orisinalitas pendekatan | Deteksi anak yang hilang dari pemantauan; jejak asal data dengan konfirmasi kader; import lewat foto buku tulis |
| **15%** | Kejelasan penyampaian | PRD ini, `DECISIONS.md` berisi alasan setiap keputusan, README, dan video demo 3 menit |

> Versi 2.0 dokumen ini mencantumkan bobot yang tidak sesuai panduan resmi ("Eksekusi 25%", "Craft 15%", "Demo 10%"). Bobot pada tabel di atas mengikuti panduan resmi hackathon.

### Tujuan untuk Telkomsel

| No | Tujuan | Alasan |
|----|--------|--------|
| 1 | Showcase program "Desa Digital" | Posyandu ada di setiap desa |
| 2 | Demonstrasi teknologi untuk kesehatan masyarakat | CSR/ESG report |
| 3 | Data kesehatan masyarakat yang berharga | Big data untuk kebijakan |

---

## 3. Target Users

### User 1: Kader Posyandu (Primary User)

**Profil**:
- Ibu-ibu sukarelawan, usia 25-55 tahun
- Pendidikan: SMP-SMA
- Literasi digital: Rendah-sedang
- Lokasi: Desa/kelurahan di seluruh Indonesia
- Motivasi: Ingin membantu anak-anak di lingkungannya

**Kebutuhan**:
- Cara input data yang SANGAT SEDERHANA (tidak perlu training)
- Langsung tahu anak mana yang bermasalah
- Tidak perlu hitung manual (Z-score, dll)

**Pain Points**:
- Data menumpuk di buku tulis, tidak tahu harus diapakan
- Tidak bisa menghitung status gizi anak
- Tidak tahu anak mana yang perlu perhatian lebih

**Persona**:
> **Bu Ani**, 42 tahun, kader posyandu 10 tahun. Setiap bulan mengukur 200 anak. Tulisan di buku tulis sudah setinggi 30 cm. Tapi dia tidak pernah tahu anak mana yang bermasalah karena datanya tidak pernah diolah.

---

### User 2: Bidan Desa (Secondary User)

**Profil**:
- Wanita, usia 25-45 tahun
- Pendidikan: D3/S1 Kebidanan
- Literasi digital: Sedang-tinggi
- Lokasi: Puskesmas/posyandu di desa
- Motivasi: Ingin menurunkan stunting di wilayahnya

**Kebutuhan**:
- Ringkasan cepat semua anak dalam satu layar
- Tahu anak mana yang perlu ditindaklanjuti SEGERA
- Laporan bulanan tanpa kerja manual
- Data untuk laporan ke dinas kesehatan

**Pain Points**:
- Tidak punya waktu untuk olah data manual
- Data dari kader tidak terstruktur (buku tulis)
- Sulit membuat laporan bulanan
- Tidak tahu tren gizi anak di wilayahnya

**Persona**:
> **Ibu Ratna**, 32 tahun, bidan desa. Bertanggung jawab atas 5 posyandu dengan 1.000 anak. Setiap bulan harus membuat laporan ke dinas kesehatan. Tapi dia tidak punya data yang terstruktur karena kader mencatat di buku tulis.

---

### User 3: Orang Tua Anak (Tertiary User)

**Profil**:
- Ibu/ayah, usia 20-45 tahun
- Pendidikan: bervariasi
- Literasi digital: bervariasi
- Lokasi: desa/kelurahan
- Motivasi: Ingin anaknya sehat dan tumbuh dengan baik

**Kebutuhan**:
- Tahu status gizi anaknya
- Tahu makanan apa yang harus diberikan
- Makanan yang MURAH dan MUDAH didapat di pasar desa

**Pain Points**:
- Tidak tahu apakah anaknya stunting atau tidak
- Bingung harus memberi makan apa
- Saran dari ahli gizi terlalu abstrak ("perbanyak protein hewani")
- Tidak punya uang banyak untuk makanan mahal

**Persona**:
> **Ibu Wati**, 28 tahun, ibu rumah tangga. Anaknya Budi (3 tahun) terlihat lebih kecil dari teman-temannya. Dia tidak tahu apakah Budi stunting atau tidak. Dia hanya tahu Budi susah makan. Dia tidak tahu harus masak apa yang murah tapi bergizi.

---

## 4. User Stories

### Epic 1: Input Data Anak (Kader)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-01 | Kader posyandu | Menginput data anak (nama, umur, berat, tinggi) dengan form sederhana | Data anak tercatat dengan cepat dan benar |
| US-02 | Kader posyandu | Melihat status gizi anak langsung setelah input (hijau/kuning/merah) | Saya langsung tahu anak mana yang bermasalah |
| US-03 | Kader posyandu | Melihat daftar semua anak yang sudah diukur bulan ini | Saya tahu siapa yang sudah dan belum diukur |
| US-04 | Kader posyandu | Mencari anak berdasarkan nama | Saya tidak perlu scroll daftar panjang |
| US-05 | Kader posyandu | Mengedit data anak jika ada kesalahan | Data tetap akurat |

### Epic 2: Dashboard Monitoring (Bidan)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-06 | Bidan desa | Melihat ringkasan semua anak (total, normal, risiko, gizi buruk) | Saya tahu kondisi gizi anak di wilayah saya |
| US-07 | Bidan desa | Memfilter anak berdasarkan status gizi | Saya langsung tahu siapa yang perlu ditolong |
| US-08 | Bidan desa | Melihat grafik pertumbuhan per anak | Saya tahu tren pertumbuhan anak |
| US-09 | Bidan desa | Melihat daftar anak yang beratnya tidak naik 2+ bulan | Saya bisa intervensi lebih awal |
| US-10 | Bidan desa | Mengunduh laporan bulanan dalam format PDF | Saya bisa kirim ke dinas kesehatan |

### Epic 3: AI Summary untuk Bidan

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-11 | Bidan desa | Mendapatkan ringkasan bulanan yang dibuat AI | Saya tidak perlu buat laporan manual |
| US-12 | Bidan desa | Mendapatkan rekomendasi tindakan dari AI | Saya tahu anak mana yang perlu dirujuk |
| US-13 | Bidan desa | Mendapatkan analisis tren dari AI | Saya tahu apakah situasi membaik atau memburuk |

### Epic 4: Saran Menu Lokal (Orang Tua)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-14 | Orang tua | Melihat status gizi anak saya | Saya tahu apakah anak saya baik-baik saja |
| US-15 | Orang tua | Mendapatkan saran menu harian yang murah | Saya tahu harus masak apa untuk anak saya |
| US-16 | Orang tua | Melihat estimasi biaya menu yang disarankan | Saya tahu berapa uang yang dibutuhkan |
| US-17 | Orang tua | Melihat grafik pertumbuhan anak saya | Saya tahu anak saya berkembang atau tidak |

### Epic 5: Chatbot Asisten Gizi (Orang Tua & Bidan)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-18 | Orang tua | Bertanya tentang gizi anak saya melalui chat | Saya mendapat jawaban yang mudah dipahami |
| US-19 | Orang tua | Bertanya tentang makanan apa yang baik untuk anak saya | Saya tahu harus belanja apa di pasar |
| US-20 | Orang tua | Bertanya tentang tanda-tanda stunting pada anak | Saya bisa deteksi lebih awal |
| US-21 | Bidan desa | Bertanya tentang cara menggunakan fitur aplikasi | Saya tidak perlu baca manual yang panjang |
| US-22 | Bidan desa | Bertanya tentang interpretasi data gizi anak | Saya bisa mengambil keputusan yang tepat |
| US-23 | Orang tua/Bidan | Mendapat jawaban dalam Bahasa Indonesia yang sederhana | Saya mudah memahami penjelasannya |

### Epic 6: Jaringan Darurat Kesehatan (Orang Tua)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-24 | Orang tua | Menekan tombol darurat saat anak sakit mendadak | Saya langsung dapat bantuan |
| US-25 | Orang tua | Melihat puskesmas/rumah sakit terdekat dari lokasi saya | Saya tahu harus ke mana |
| US-26 | Orang tua | Menghubungi puskesmas/bidan dengan satu sentuhan | Saya tidak perlu cari nomor telepon |
| US-27 | Orang tua | Mendapat navigasi rute ke fasilitas kesehatan terdekat | Saya tidak tersesat |
| US-28 | Orang tua | Mengirim alert ke keluarga/kader saat darurat | Keluarga tahu kondisi anak saya |

### Epic 7: Deteksi Dini Berbasis Pola (AI Special)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-29 | Orang tua | Mendapat peringatan jika ada pola gizi yang berubah | Saya bisa antisipasi lebih awal |
| US-30 | Orang tua | Melihat analisis pola berat badan 6 bulan terakhir | Saya tahu tren pertumbuhan anak saya |
| US-31 | Bidan desa | Melihat peringatan dini untuk semua anak | Saya bisa intervensi sebelum masalah terjadi |
| US-32 | Bidan desa | Menerima rekomendasi tindakan dari AI berdasarkan pola | Saya tahu harus berbuat apa |

### Epic 8: Suara Komunitas (Cerita Sukses)

| ID | Sebagai | Saya ingin | Agar |
|----|---------|------------|------|
| US-33 | Orang tua | Membaca cerita sukses orang tua lain yang berhasil | Saya terinspirasi dan semangat |
| US-34 | Orang tua | Mencari cerita berdasarkan masalah yang sama dengan anak saya | Saya menemukan solusi yang relevan |
| US-35 | Orang tua | Memberikan rating dan komentar pada cerita yang membantu | Saya bisa membantu orang lain juga |
| US-36 | Orang tua | Menulis cerita sukses saya sendiri | Saya bisa berbagi pengalaman |
| US-37 | Bidan desa | Menampilkan cerita sukses yang relevan ke orang tua | Saya bisa memberikan motivasi |

---

## 5. Functional Requirements

### FR-01: Input Data Anak

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01.1 | Sistem menyediakan form input dengan field: nama anak, tanggal lahir, jenis kelamin, nama orang tua, nomor telepon, alamat | **Must Have** |
| FR-01.2 | Sistem menyediakan form input pengukuran dengan field: berat badan (kg), tinggi badan (cm), tanggal pengukuran | **Must Have** |
| FR-01.3 | Sistem otomatis menghitung Z-score berat badan menurut usia (W/A) berdasarkan standar WHO | **Must Have** |
| FR-01.4 | Sistem otomatis menghitung Z-score tinggi badan menurut usia (H/A) berdasarkan standar WHO | **Must Have** |
| FR-01.5 | Sistem otomatis menghitung Z-score berat badan menurut tinggi (W/H) berdasarkan standar WHO | **Must Have** |
| FR-01.6 | Sistem otomatis mengklasifikasikan status gizi: Normal (hijau), Risiko (kuning), Gizi Buruk (merah) berdasarkan Z-score | **Must Have** |
| FR-01.7 | Sistem menampilkan notifikasi/alert jika anak terdeteksi gizi buruk (Z-score < -3) | **Must Have** |
| FR-01.8 | Sistem menyimpan data pengukuran ke database | **Must Have** |
| FR-01.9 | Sistem menyediakan form input yang sederhana dan mudah dipahami (font besar, tombol jelas) | **Must Have** |

### FR-02: Dashboard Monitoring

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-02.1 | Dashboard menampilkan total anak yang sudah diukur bulan ini | **Must Have** |
| FR-02.2 | Dashboard menampilkan distribusi status gizi: Normal, Risiko, Gizi Buruk (dalam bentuk chart) | **Must Have** |
| FR-02.3 | Dashboard menampilkan daftar anak yang perlu ditindaklanjuti (gizi buruk / berat tidak naik) | **Must Have** |
| FR-02.4 | Dashboard menyediakan filter berdasarkan status gizi | **Must Have** |
| FR-02.5 | Dashboard menyediakan fitur pencarian anak berdasarkan nama | **Should Have** |
| FR-02.6 | Dashboard menampilkan grafik pertumbuhan per anak (berat & tinggi dari waktu ke waktu) | **Must Have** |
| FR-02.7 | Dashboard menampilkan garis standar WHO pada grafik pertumbuhan | **Must Have** |
| FR-02.8 | Dashboard menyediakan fitur ekspor laporan ke PDF | **Could Have** |

### FR-03: AI Summary & Rekomendasi

> **Status: dibangun, dengan satu penyimpangan yang disengaja.** FR-03.3 menyebut LLM yang menyusun saran menu, namun **harga dan bahan tidak diserahkan ke LLM**. Keduanya berasal dari daftar tetap di `src/lib/menu.ts`; LLM hanya menyusun cara memasak dan kalimatnya. Alasannya: model akan mengarang angka rupiah yang terdengar masuk akal namun tidak dapat dipertanggungjawabkan, dan menu yang biayanya salah membuat orang tua gagal berbelanja. FR-03.7 (deteksi pola) juga dikerjakan kode deterministik, bukan LLM.
>
> FR-03.6 (kandungan gizi) dipenuhi dalam bentuk sederhana: setiap bahan menyertakan alasan singkat mengapa dipilih ("protein dan zat besi"), bukan tabel gizi lengkap. Angka gram nutrien memerlukan basis data komposisi pangan yang belum diverifikasi.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-03.1 | Sistem menggunakan LLM untuk generate ringkasan bulanan (total anak, distribusi status gizi, yang perlu ditindaklanjuti) | **Must Have** |
| FR-03.2 | Sistem menggunakan LLM untuk generate rekomendasi tindakan (anak mana yang perlu dirujuk, dipantau, dll) | **Must Have** |
| FR-03.3 | Sistem menggunakan LLM untuk generate saran menu lokal murah berdasarkan status gizi anak | **Must Have** |
| FR-03.4 | Saran menu menggunakan bahan yang MURAH dan MUDAH didapat di pasar desa (tempe, telur, bayam, ikan teri, kangkung) | **Must Have** |
| FR-03.5 | Saran menu menyertakan estimasi biaya dalam Rupiah | **Must Have** |
| FR-03.6 | Saran menu menyertakan informasi kandungan gizi (protein, vitamin, dll) | **Should Have** |
| FR-03.7 | Sistem menggunakan LLM untuk mendeteksi pola pertumbuhan anak (stagnan, menurun, membaik) | **Should Have** |

### FR-04: Manajemen Data

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-04.1 | Sistem menyimpan data posyandu (nama, alamat, desa, kecamatan) | **Must Have** |
| FR-04.2 | Sistem menyimpan data kader (nama, nomor telepon, posyandu) | **Must Have** |
| FR-04.3 | Sistem menyimpan data anak (nama, tanggal lahir, jenis kelamin, orang tua, alamat) | **Must Have** |
| FR-04.4 | Sistem menyimpan riwayat pengukuran anak (berat, tinggi, Z-score, status, tanggal) | **Must Have** |
| FR-04.5 | Sistem menyimpan hasil AI summary dan menu saran | **Must Have** |
| FR-04.6 | Sistem memungkinkan edit data anak jika ada kesalahan input | **Should Have** |

### FR-05: Autentikasi & Otorisasi

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-05.1 | Sistem menyediakan login untuk kader, bidan, dan orang tua | **Must Have** |
| FR-05.2 | Kader hanya bisa melihat dan menginput data untuk posyandunya | **Must Have** |
| FR-05.3 | Bidan bisa melihat data semua posyandu di wilayahnya | **Must Have** |
| FR-05.4 | Orang tua hanya bisa melihat data anaknya sendiri | **Must Have** |

### FR-06: Chatbot Asisten Gizi — DITUNDA KE FASE 2

> **Status: tidak dibangun pada MVP.** Prioritas "Must Have" pada tabel di bawah berlaku bila fitur ini dibangun kelak, bukan untuk tahap ini. Alasan penundaan ada di bagian Scope dan `DECISIONS.md`.

| ID      | Requirement                                                                   | Priority        |
| ---------| -------------------------------------------------------------------------------| -----------------|
| FR-06.1 | Sistem menyediakan chatbot yang bisa diakses dari setiap halaman              | **Must Have**   |
| FR-06.2 | Chatbot bisa menjawab pertanyaan tentang gizi anak dalam Bahasa Indonesia     | **Must Have**   |
| FR-06.3 | Chatbot bisa menjawab pertanyaan tentang makanan lokal yang murah dan bergizi | **Must Have**   |
| FR-06.4 | Chatbot bisa menjawab pertanyaan tentang tanda-tanda stunting                 | **Must Have**   |
| FR-06.5 | Chatbot bisa menjawab pertanyaan tentang cara menggunakan fitur aplikasi      | **Should Have** |
| FR-06.6 | Chatbot menggunakan Bahasa Indonesia yang sederhana dan mudah dipahami        | **Must Have**   |
| FR-06.7 | Chatbot menyertakan disclaimer bahwa ini bukan pengganti konsultasi medis     | **Must Have**   |
| FR-06.8 | Chatbot menyimpan riwayat percakapan untuk konteks                            | **Should Have** |
| FR-06.9 | Chatbot bisa mengenali pertanyaan dalam bahasa informal/sehari-hari           | **Could Have**  |

### FR-07: Jaringan Darurat Kesehatan — DITUNDA KE FASE 2

> **Status: tidak dibangun pada MVP.** FR-07.6 (mengirim peringatan ke keluarga/kader) bertentangan dengan penundaan kanal WhatsApp dan SMS: tidak ada penerima di sisi lain. Tombol darurat tanpa penerima menciptakan harapan palsu pada saat paling kritis. Jika dibangun kelak, wajib disertai jalur eskalasi manusia yang jelas — siapa yang menerima, dalam berapa lama, dan apa yang tampil bila tidak ada respons — serta nomor fasilitas kesehatan yang sudah diverifikasi.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-07.1 | Sistem menyediakan tombol darurat yang bisa diakses dari setiap halaman | **Must Have** |
| FR-07.2 | Sistem mendeteksi lokasi pengguna melalui GPS | **Must Have** |
| FR-07.3 | Sistem menampilkan daftar fasilitas kesehatan terdekat (puskesmas, rumah sakit, posyandu) berdasarkan jarak | **Must Have** |
| FR-07.4 | Sistem menampilkan nomor telepon yang bisa langsung dihubungi | **Must Have** |
| FR-07.5 | Sistem menyediakan rute navigasi ke fasilitas kesehatan terdekat | **Should Have** |
| FR-07.6 | Sistem bisa mengirim alert ke keluarga/kader saat tombol darurat ditekan | **Must Have** |
| FR-07.7 | Sistem menyimpan riwayat penggunaan tombol darurat | **Should Have** |
| FR-07.8 | Database fasilitas kesehatan lengkap dengan nama, alamat, nomor telepon, koordinat | **Must Have** |

### FR-08: Deteksi Dini Berbasis Pola — DIREVISI

> **Status: dibangun, namun implementasinya berbeda dari tabel di bawah.** Analisis pola dikerjakan **kode deterministik**, bukan LLM (lihat bagian Pembagian Peran Kode dan LLM). FR-08.2 menyebut "frekuensi makan berkurang" dan "variasi makanan menurun" — dua sinyal itu **tidak dikumpulkan** oleh sistem, sehingga tidak dapat dideteksi dan dihapus dari cakupan. Yang dibangun: deteksi berat stagnan (ambang di bagian Ambang Batas Algoritma) dan deteksi anak yang berhenti hadir.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-08.1 | Sistem menganalisis pola berat badan dari data historis 6 bulan terakhir | **Must Have** |
| FR-08.2 | Sistem mendeteksi pola: berat badan stagnan, frekuensi makan berkurang, variasi makanan menurun | **Must Have** |
| FR-08.3 | Sistem menghasilkan peringatan dini jika pola abnormal terdeteksi | **Must Have** |
| FR-08.4 | Sistem memberikan rekomendasi tindakan preventif berdasarkan pola yang terdeteksi | **Must Have** |
| FR-08.5 | Dashboard bidan menampilkan semua peringatan dini untuk anak di wilayahnya | **Must Have** |
| FR-08.6 | Sistem menyimpan riwayat pola dan peringatan | **Should Have** |
| FR-08.7 | Sistem menggunakan AI/ML untuk prediksi risiko gizi 3 bulan ke depan | **Could Have** |

### FR-09: Suara Komunitas (Cerita Sukses) — DITUNDA KE FASE 2

> **Status: tidak dibangun pada MVP.** Membutuhkan pengguna nyata dan moderasi konten. Tanpa keduanya halaman hanya berisi cerita karangan, dan kolom komentar terbuka pada platform kesehatan anak berisiko menyebarkan saran pengobatan berbahaya.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-09.1 | Sistem menyediakan halaman untuk menampilkan cerita sukses orang tua | **Must Have** |
| FR-09.2 | Orang tua bisa submit cerita sukses mereka sendiri | **Must Have** |
| FR-09.3 | Sistem menyediakan filter berdasarkan masalah (gizi buruk, stunting, dll) | **Must Have** |
| FR-09.4 | Orang lain bisa memberikan rating (bintang 1-5) pada cerita | **Should Have** |
| FR-09.5 | Orang lain bisa memberikan komentar/dukungan pada cerita | **Should Have** |
| FR-09.6 | Sistem menampilkan cerita unggulan (rating tertinggi) | **Must Have** |
| FR-09.7 | Cerita dilengkapi tips praktis yang bisa ditiru | **Must Have** |
| FR-09.8 | Orang tua bisa berinteraksi langsung dengan penulis cerita | **Could Have** |

---

### FR-10: Import Foto Buku Tulis + Jejak Asal Data

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10.1 | Kader dapat mengunggah atau memfoto satu halaman buku tulis posyandu | **Must Have** |
| FR-10.2 | Sistem memakai LLM vision untuk mengekstrak baris data menjadi struktur: nama, berat, tinggi, tanggal | **Must Have** |
| FR-10.3 | Hasil ekstraksi ditampilkan dalam tabel yang dapat dikoreksi kader sebelum disimpan | **Must Have** |
| FR-10.4 | Setiap nilai menyimpan asal datanya: `manual` atau `ocr_ai` | **Must Have** |
| FR-10.5 | Nilai berasal dari AI berstatus `belum dikonfirmasi` dan **tidak dihitung** ke statistik maupun peringatan sampai dikonfirmasi kader | **Must Have** |
| FR-10.6 | Nilai yang belum dikonfirmasi ditandai jelas di antarmuka | **Must Have** |
| FR-10.7 | Nilai hasil ekstraksi yang melanggar batas kewajaran ditandai lebih dulu sebelum ditampilkan | **Must Have** |
| FR-10.8 | Berkas gambar tidak disimpan permanen setelah ekstraksi selesai | **Must Have** |
| FR-10.9 | Bila LLM vision gagal, kader tetap dapat memasukkan data secara manual | **Must Have** |

Fitur ini adalah satu-satunya jalan agar data yang sudah menumpuk bertahun-tahun di buku tulis masuk ke sistem. Tanpanya, produk hanya mencatat data baru dan masalah utama pada Problem Statement tetap tidak terjawab.

### FR-11: Deteksi Anak Hilang dari Pemantauan

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-11.1 | Sistem menandai anak yang jeda kunjungan terakhirnya melebihi 90 hari | **Must Have** |
| FR-11.2 | Dashboard bidan menampilkan daftar anak tersebut beserta lama ketidakhadiran | **Must Have** |
| FR-11.3 | Daftar diurutkan dari ketidakhadiran terlama | **Must Have** |
| FR-11.4 | Status gizi terakhir yang diketahui ditampilkan bersama daftar | **Should Have** |
| FR-11.5 | Perhitungan dilakukan kueri basis data, tanpa LLM | **Must Have** |

Anak yang berhenti hadir tidak pernah terlihat pada pencatatan buku tulis, karena yang tidak datang tidak ditulis. Sinyal ini hanya muncul setelah data didigitalkan.

### FR-12: Penjaga Kualitas Data

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-12.1 | Sistem menolak nilai di luar batas kewajaran (berat 0,5-30 kg, tinggi 30-130 cm, usia 0-60 bulan) | **Must Have** |
| FR-12.2 | Sistem menandai tinggi badan yang menurun dibanding pengukuran sebelumnya sebagai kemungkinan salah catat | **Must Have** |
| FR-12.3 | Sistem menandai kenaikan berat lebih dari 2 kg dalam satu bulan untuk diperiksa | **Must Have** |
| FR-12.4 | Sistem menolak tanggal pengukuran di masa depan | **Must Have** |
| FR-12.5 | Nilai yang ditandai tetap dapat disimpan setelah kader mengonfirmasi bahwa nilai tersebut benar | **Should Have** |
| FR-12.6 | Pesan peringatan memakai bahasa sederhana, menjelaskan apa yang perlu diperiksa | **Must Have** |

Lapisan ini melindungi seluruh perhitungan di hilirnya. Satu angka salah baca dari foto dapat memicu peringatan gizi buruk palsu tanpa penjaga ini.

### FR-13: Offline-first dan Sinkronisasi

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-13.1 | Aplikasi dapat dibuka tanpa koneksi internet setelah kunjungan pertama | **Must Have** |
| FR-13.2 | Input pengukuran saat offline tersimpan di perangkat | **Must Have** |
| FR-13.3 | Data tersinkron otomatis ke server saat koneksi kembali | **Must Have** |
| FR-13.4 | Antarmuka menampilkan status koneksi dan jumlah data yang menunggu sinkronisasi | **Must Have** |
| FR-13.5 | Z-score dihitung di perangkat saat offline sehingga kader tetap mendapat status gizi seketika | **Should Have** |
| FR-13.6 | Konflik data diselesaikan dengan aturan yang ditetapkan, bukan menimpa secara acak | **Should Have** |

Fitur ini menjawab Asumsi nomor 3 yang mengakui banyak posyandu tanpa koneksi. Pada versi 2.0 asumsi itu diakui namun offline mode justru ditunda, sehingga menyisakan celah yang tidak terjawab.

---

## 5.1 Kriteria Penerimaan MVP

Setiap butir dapat diperiksa langsung pada aplikasi yang sudah dideploy.

| No | Fitur | Kriteria penerimaan |
|----|-------|---------------------|
| 1 | Input pengukuran | Kader menyimpan satu pengukuran dalam kurang dari 1 menit, dan status gizi muncul di layar yang sama |
| 2 | Mesin Z-score | `npm test` lolos untuk seluruh kasus uji referensi WHO dengan toleransi 0,01 |
| 3 | Penjaga kualitas data | Input berat 90 kg untuk balita ditolak dengan pesan yang jelas |
| 4 | Dashboard bidan | Distribusi status gizi tampil, filter status berfungsi, grafik pertumbuhan memuat data nyata dari basis data |
| 5 | RLS | Kader posyandu A yang mengakses data posyandu B menerima penolakan, dibuktikan lewat uji otomatis |
| 6 | Import foto | Satu halaman buku tulis menghasilkan tabel terkoreksi, dan nilai belum dikonfirmasi tidak muncul pada statistik |
| 7 | Anak hilang dari pemantauan | Anak dengan kunjungan terakhir lebih dari 90 hari muncul di daftar |
| 8 | Offline | Input saat mode pesawat tersimpan, lalu muncul di server setelah koneksi kembali |
| 9 | Ringkasan bulanan | Ringkasan tersusun kurang dari 15 detik; saat kunci LLM dinonaktifkan, versi fallback tetap tampil |
| 10 | Keamanan | Tidak ada kunci API pada bundel klien, diperiksa lewat pencarian pada hasil build |
| 11 | Pendaftaran anak | Kader mendaftarkan anak baru, dan anak tersebut langsung muncul pada pilihan formulir penimbangan |
| 12 | Perbaikan data anak | Kader memperbaiki nama yang salah catat; mengubah tanggal lahir memunculkan peringatan bahwa usia riwayat lama tidak dihitung ulang |
| 13 | Saring dan cari | Penyaringan status menampilkan jumlah per pilihan, termasuk anak yang belum pernah ditimbang; pencarian nama mengabaikan besar kecil huruf |
| 14 | Saran menu | Total biaya harian tampil dalam rupiah dan tidak berubah meski LLM gagal; anak di bawah 6 bulan tidak mendapat saran menu |

---

## 5.2 Rencana Pengujian

| Jenis | Cakupan | Cara menjalankan |
|-------|---------|------------------|
| **Golden test Z-score** | Kasus uji referensi WHO untuk BB/U, TB/U, BB/PB, BB/TB pada kedua jenis kelamin, termasuk batas usia 0 dan 60 bulan | `npm test` |
| **Unit test penjaga kualitas data** | Nilai di luar batas, tinggi menurun, lonjakan berat, tanggal masa depan | `npm test` |
| **Unit test deteksi pola** | Berat stagnan 2 kali, data kurang dari 3 titik, jeda kunjungan lebih dari 90 hari | `npm test` |
| **Uji RLS** | Akses lintas posyandu, lintas peran, dan orang tua terhadap anak orang lain | skrip uji terhadap Supabase |
| **Uji fallback LLM** | Perilaku saat kunci tidak tersedia, saat timeout, dan saat respons tidak sesuai format | `npm test` dengan mock |
| **Unit test saran menu** | Kelayakan usia di bawah 6 bulan, penyesuaian menurut status, bahan yang diizinkan, biaya tidak berlipat untuk bahan yang sama | `npm test` |
| **Unit test penyaringan** | Saring per status, anak yang belum dinilai, pencarian tanpa membedakan huruf, gabungan saring dan cari | `npm test` |
| **Uji manual alur** | Alur lengkap kader, bidan, orang tua pada lingkungan produksi | daftar periksa sebelum pengumpulan |

Keberadaan pengujian ini adalah bukti langsung bagi kriteria penguasaan kompetensi role yang berbobot 30%.

---

## 6. Non-Functional Requirements

### NFR-01: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01.1 | Waktu load halaman utama | < 3 detik |
| NFR-01.2 | Waktu input data anak (dari buka form sampai simpan) | < 1 menit |
| NFR-01.3 | Waktu menyusun ringkasan bulanan | < 15 detik, timeout 20 detik lalu fallback |
| NFR-01.4 | Waktu menyusun saran menu | < 15 detik, timeout 20 detik lalu fallback |
| NFR-01.5 | Waktu load dashboard dengan 200 anak | < 3 detik |
| NFR-01.6 | Waktu ekstraksi satu halaman buku tulis | < 30 detik |
| NFR-01.7 | Waktu hitung Z-score | < 50 ms, dihitung lokal tanpa panggilan jaringan |

### NFR-02: Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-02.1 | Kader bisa menggunakan aplikasi TANPA pelatihan | 100% kader bisa input data |
| NFR-02.2 | Form input menggunakan font minimal 16px | Mudah dibaca oleh semua usia |
| NFR-02.3 | Tombol aksi utama minimal 48x48px | Mudah ditekan di layar sentuh |
| NFR-02.4 | Warna status menggunakan kontras tinggi (hijau/kuning/merah) | Mudah dibedakan |
| NFR-02.5 | Tersedia dalam Bahasa Indonesia | 100% konten dalam Bahasa Indonesia |

### NFR-03: Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-03.1 | Kredensial dikelola Supabase Auth; aplikasi tidak menyimpan maupun menangani kata sandi secara langsung | Tidak ada kata sandi tersimpan di tabel aplikasi |
| NFR-03.2 | Row Level Security aktif di semua tabel berisi data anak, dan diuji lintas pengguna | Uji akses lintas posyandu ditolak |
| NFR-03.3 | Kunci API LLM hanya dipakai di sisi server, disimpan di environment variable | Pencarian pada bundel klien tidak menemukan kunci |
| NFR-03.4 | Input divalidasi di server memakai skema, bukan hanya di klien | Nilai di luar skema ditolak sebelum menyentuh basis data |
| NFR-03.5 | Seluruh trafik memakai HTTPS | Otomatis pada Vercel |
| NFR-03.6 | Endpoint LLM dibatasi lajunya per pengguna | Mencegah penyalahgunaan biaya API |
| NFR-03.7 | Gambar buku tulis tidak disimpan permanen | Dihapus setelah ekstraksi |

### NFR-04: Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-04.1 | Aplikasi bisa diakses 24/7 | Uptime 99% |
| NFR-04.2 | Data tersimpan secara persisten di database | Tidak ada data hilang |
| NFR-04.3 | Error handling yang jelas untuk user | User tahu jika ada masalah |

### NFR-05: Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-05.1 | Skema dan indeks dirancang agar tidak menghambat pertumbuhan data lintas posyandu | Kueri dashboard tetap memakai indeks pada volume besar |
| NFR-05.2 | Endpoint bersifat stateless sehingga dapat diskalakan horizontal | Bawaan arsitektur serverless Vercel |
| NFR-05.3 | Ringkasan bulanan mengirim data teragregasi, bukan seluruh baris | Ukuran prompt tidak tumbuh linier terhadap jumlah anak |

> **Catatan kejujuran**: klaim skala pada versi 2.0 ("300.000+ posyandu", "100+ request per detik") tidak pernah diuji dan karena itu diturunkan menjadi pernyataan rancangan. Yang diuji pada MVP adalah kebenaran fungsi, bukan kapasitas beban.

### NFR-06: Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-06.1 | Aplikasi responsive, bisa diakses dari HP dan tablet | Mobile-first design |
| NFR-06.2 | Bisa diakses dari browser Chrome, Safari, Firefox | Cross-browser compatibility |
| NFR-06.3 | Bisa diakses dengan koneksi internet lambat (3G) | Optimized untuk desa |

---

## 7. Scope

### Prinsip Penentuan Cakupan

Panduan hackathon menilai "cara peserta memahami dan **membatasi** masalah", dan menegaskan bahwa "yang utama adalah fungsi, relevansi terhadap masalah, dan logika di balik setiap keputusan".

Karena itu cakupan dipersempit dari 14 fitur (versi 2.0) menjadi **7 fitur yang berfungsi utuh**. Pertimbangannya:

1. Waktu tersedia realistis bagi satu orang adalah sekitar 10 jam produktif dari 24 jam kalender
2. Setiap fitur tambahan memperluas permukaan yang dapat gagal saat karya diperiksa
3. Fitur yang berfungsi setengah menurunkan nilai kegunaan output lebih besar daripada fitur yang sengaja ditunda dengan alasan tertulis

Alasan setiap keputusan dicatat di `DECISIONS.md`.

### In Scope — MVP (dibangun dan live)

| No | Fitur | Deskripsi | Kriteria selesai |
|----|-------|-----------|------------------|
| 1 | **Input pengukuran + penjaga kualitas data** | Form input anak dan pengukuran, dengan validasi kewajaran nilai | Data tersimpan; nilai mustahil ditolak/ditandai |
| 2 | **Mesin Z-score WHO (deterministik)** | Perhitungan Z-score memakai parameter LMS WHO 0-59 bulan | Seluruh kasus uji referensi lolos via `npm test` |
| 3 | **Dashboard bidan** | Distribusi status gizi, daftar prioritas, grafik pertumbuhan per anak | Bidan menemukan anak berisiko < 30 detik |
| 4 | **Autentikasi + RLS 3 peran** | Login kader, bidan, orang tua dengan isolasi data | Uji lintas pengguna membuktikan akses ditolak |
| 5 | **Import foto buku tulis + provenance** | LLM vision membaca halaman buku tulis, kader mengonfirmasi sebelum data dihitung | Data hasil ekstraksi tidak masuk statistik sebelum dikonfirmasi |
| 6 | **Deteksi anak hilang dari pemantauan** | Menandai anak dengan jeda kunjungan lebih dari 90 hari | Daftar muncul di dashboard bidan |
| 7 | **Offline-first + sinkronisasi** | Input tetap tersimpan tanpa sinyal, tersinkron saat koneksi kembali | Input saat offline muncul di server setelah online |

Pendukung yang menyertai MVP:

| Pendukung | Deskripsi |
|-----------|-----------|
| **Ringkasan bulanan (LLM)** | Narasi ringkasan untuk bidan, dengan fallback deterministik bila LLM gagal |
| **Saran menu lokal** | Menu berbahan pasar desa beserta biaya. Bahan dan harga dari daftar tetap di kode; LLM hanya menyusun cara memasak |
| **Pendaftaran dan perbaikan data anak** | Kader mendaftarkan anak baru dan memperbaiki salah catat, dengan peringatan bila tanggal lahir diubah |
| **Saring status dan cari nama** | Dashboard dapat disaring menurut status gizi, termasuk anak yang belum pernah ditimbang, dan dicari menurut nama |
| **Mode demo aman** | Data sintetis dan respons LLM ter-cache agar demo tetap berjalan saat kuota/API bermasalah |
| **Deploy publik** | URL produksi di Vercel |

### Fase 2 — Dirancang, sengaja ditunda

Fitur berikut ada dalam rancangan namun tidak dibangun pada tahap ini. Alasannya bersifat substantif, bukan semata keterbatasan waktu.

| No | Fitur | Alasan penundaan |
|----|-------|------------------|
| 1 | **Chatbot asisten gizi** | Bertentangan dengan prinsip proyek sendiri ("AI sebagai fungsi inti, bukan chatbot"). Permukaan jawabannya tidak terbatas sehingga tidak dapat diuji maupun dijamin, dan berisiko memberi kesan nasihat medis kepada orang tua. Jika dibangun kelak, bentuknya dibatasi sebagai penjelas hasil pada data anak yang sedang dibuka, dengan penolakan tegas atas pertanyaan medis. |
| 2 | **Tombol darurat + GPS** | Tidak ada penerima peringatan di sisi lain karena kanal WhatsApp/SMS berada di luar cakupan. Tombol darurat tanpa penerima menciptakan harapan palsu pada saat paling kritis. Selain itu data fasilitas kesehatan dan nomor telepon belum terverifikasi; nomor yang salah pada fitur darurat berbahaya. |
| 3 | **Suara komunitas (cerita sukses)** | Membutuhkan pengguna nyata dan moderasi konten. Tanpa keduanya, halaman hanya berisi cerita karangan, dan kolom komentar terbuka pada platform kesehatan anak berisiko menyebarkan saran pengobatan berbahaya. |
| 4 | **Prediksi risiko dengan machine learning** | Membutuhkan dataset dan pelatihan model. Dalam waktu tersedia hasilnya hanya akan berupa regresi sederhana yang dilabeli ML. |
| 5 | **Integrasi WhatsApp / SMS** | Membutuhkan WhatsApp Business API atau SMS gateway berbayar dan proses verifikasi. |
| 6 | **Ekspor sesuai format e-PPGBM** | Format resmi perlu diverifikasi terlebih dahulu. Berpotensi tinggi nilainya karena menghapus kerja ganda kader, sehingga menjadi prioritas pertama Fase 2. |
| 7 | **Input suara untuk kader** | Akurasi pengenalan suara untuk nama Indonesia dan angka desimal belum memadai, dan gagal total bila mikrofon tidak tersedia. |
| 8 | **Ekspor laporan PDF** | Bernilai bagi bidan namun tidak menunjukkan kedalaman teknis. Ditunda demi fitur berpengaruh lebih besar. |
| 9 | **Dashboard dinas kesehatan** | Membutuhkan tingkat akses dan agregasi lintas wilayah. |
| 10 | **Multi-bahasa daerah** | Membutuhkan penerjemahan dan validasi penutur asli. |
| 11 | **Pelatihan video untuk kader** | Membutuhkan produksi konten, di luar lingkup rekayasa. |
| 12 | **Integrasi resmi sistem kesehatan** | Membutuhkan kerja sama kelembagaan dengan Kemenkes/Dinkes. |

### Batasan (Constraints)

| No | Batasan | Dampak |
|----|---------|--------|
| 1 | **Bukan alat diagnosis** | Semua output diframing sebagai alat bantu kader. Diagnosis resmi selalu diarahkan ke bidan/puskesmas. |
| 2 | **Data kesehatan anak bersifat sensitif** | RLS wajib aktif dan diuji. Seluruh data pada lingkungan demo publik adalah data sintetis. |
| 3 | **Hackathon individu, 24 jam** | Dikerjakan satu orang tanpa pembagian peran. Waktu produktif realistis sekitar 10 jam setelah memperhitungkan istirahat dan penyiapan pengumpulan. Karena itu cakupan dibatasi 7 fitur. |
| 4 | **Kader memiliki literasi digital rendah** | Antarmuka sangat sederhana, font besar, tombol besar, alur maksimal 3 langkah. |
| 5 | **Koneksi internet di desa lambat atau tidak ada** | Aplikasi ringan dan berfungsi offline dengan sinkronisasi tertunda. |
| 6 | **Ketergantungan pada LLM pihak ketiga** | Setiap fitur berbasis LLM wajib memiliki fallback deterministik agar aplikasi tetap berfungsi saat API gagal atau kuota habis. |

### Kebijakan Data & Privasi

| No | Kebijakan | Penerapan |
|----|-----------|-----------|
| 1 | **Data demo sepenuhnya sintetis** | Tidak ada data anak nyata pada lingkungan publik. Nama, tanggal lahir, dan pengukuran dihasilkan lewat skrip seed. Dinyatakan eksplisit di README dan pada antarmuka. |
| 2 | **Minimalisasi data** | Hanya menyimpan field yang diperlukan untuk perhitungan gizi dan tindak lanjut. Tidak menyimpan NIK maupun foto anak. |
| 3 | **Foto buku tulis tidak disimpan permanen** | Gambar diproses untuk ekstraksi lalu dihapus. Yang disimpan hanya nilai terstruktur beserta jejak asalnya. |
| 4 | **Persetujuan orang tua** | Pada penerapan nyata, pencatatan data anak memerlukan persetujuan orang tua. Mekanismenya dirancang untuk Fase 2 dan diakui belum ada pada MVP. |
| 5 | **Isolasi antar peran** | Kader hanya mengakses posyandunya, bidan wilayahnya, orang tua hanya anaknya. Dibuktikan melalui uji lintas pengguna. |

### Ketahanan Layanan LLM

| Aspek | Ketentuan |
|-------|-----------|
| Penempatan | Seluruh panggilan LLM berada di server. Kunci API tidak pernah sampai ke klien. |
| Batas waktu | Timeout 20 detik, satu kali percobaan ulang. |
| Fallback | Bila LLM gagal, ringkasan disusun dari template deterministik berbasis angka yang sama. Aplikasi tidak pernah menampilkan halaman kosong akibat kegagalan LLM. |
| Pembatasan laju | Batas per pengguna per menit untuk mencegah penyalahgunaan endpoint. |
| Mode demo | Respons ter-cache untuk skenario demo, aktif melalui environment variable. |
| Larangan | LLM tidak pernah menghitung Z-score, tren, maupun ambang batas. Seluruh angka dihitung kode deterministik. |

### Asumsi

| No | Asumsi | Risiko jika asumsi salah | Penanganan |
|----|--------|--------------------------|------------|
| 1 | Kader punya HP Android dengan browser | Tidak semua kader punya HP | Satu perangkat dapat dipakai bersama di meja posyandu |
| 2 | Kader bisa mengetik nama dan angka | Sebagian kader kesulitan mengetik | Import foto buku tulis mengurangi kebutuhan mengetik |
| 3 | Posyandu tidak selalu punya koneksi internet | Data gagal tersimpan di lapangan | Dijawab oleh FR-13 (offline-first), bukan lagi diabaikan |
| 4 | Bidan punya perangkat untuk akses dashboard | Bidan tidak dapat memantau | Dashboard tetap dapat dibuka dari ponsel |
| 5 | Orang tua bisa mengakses aplikasi | Orang tua tidak menerima informasi | Kader tetap dapat menyampaikan hasil secara langsung |

### Risiko dan Mitigasi

| No | Risiko | Dampak | Mitigasi |
|----|--------|--------|----------|
| 1 | Kuota atau kunci LLM bermasalah saat karya diperiksa | Fitur berbasis LLM mati | Fallback deterministik dan mode demo dengan respons ter-cache |
| 2 | Z-score salah karena tabel referensi keliru | Seluruh klasifikasi salah | Golden test terhadap kasus uji referensi WHO, dijalankan lewat `npm test` |
| 3 | LLM salah membaca angka dari foto | Peringatan gizi buruk palsu | Wajib konfirmasi kader, penjaga kualitas data, dan jejak asal data |
| 4 | RLS bocor sehingga data anak terekspos | Pelanggaran privasi data sensitif | Uji akses lintas pengguna sebelum deploy; data publik seluruhnya sintetis |
| 5 | Kegagalan deploy mendekati batas waktu | Karya tidak dapat diakses | Deploy dilakukan sejak awal, bukan di akhir; setiap fitur di-deploy bertahap |
| 6 | Cakupan melebar sehingga tidak ada fitur yang tuntas | Nilai kegunaan output jatuh | Cakupan dikunci 7 fitur; blok kerja yang melewati jadwal dipotong, bukan digeser |
| 7 | Demo langsung gagal karena jaringan lokasi | Karya tidak terlihat berfungsi | Video demo 3 menit sebagai cadangan |
| 8 | Angka statistik yang belum terverifikasi dibantah penguji | Kredibilitas menurun | Angka belum terverifikasi ditandai dan tidak dipakai sebagai klaim utama |

### Pertanyaan Terbuka

| No | Pertanyaan | Status |
|----|------------|--------|
| 1 | Angka prevalensi stunting terbaru yang resmi | Perlu verifikasi ke publikasi Kemenkes/BPS |
| 2 | Format ekspor resmi e-PPGBM | Belum diverifikasi, prioritas Fase 2 |
| 3 | Mekanisme persetujuan orang tua pada penerapan nyata | Belum dirancang detail |
| 4 | Apakah LILA/MUAC perlu masuk sebagai indikator tambahan | Ditinjau setelah uji lapangan |

### Metrik Kesuksesan

**Untuk tahap hackathon** (dapat diperiksa langsung):

| No | Metrik | Target |
|----|--------|--------|
| 1 | Aplikasi dapat diakses di URL publik | Ya |
| 2 | Alur kader lengkap tanpa jalan buntu | Ya |
| 3 | `npm test` lolos seluruhnya | Ya |
| 4 | Uji RLS membuktikan isolasi antar pengguna | Ya |
| 5 | Import foto buku tulis menghasilkan data terkonfirmasi | Ya |
| 6 | Aplikasi tetap berfungsi saat LLM dinonaktifkan | Ya |
| 7 | Input saat offline tersinkron setelah online | Ya |
| 8 | Riwayat commit menunjukkan pengerjaan bertahap | Ya |

**Untuk penerapan nyata** (tidak diukur pada tahap ini):

| No | Metrik | Target |
|----|--------|--------|
| 1 | Kader memakai aplikasi tanpa pelatihan formal | > 80% kader berhasil input mandiri |
| 2 | Data lama yang berhasil dimasukkan | > 70% halaman buku tulis terbaca |
| 3 | Anak berisiko yang ditindaklanjuti bidan | > 90% dalam 30 hari |
| 4 | Anak yang berhenti hadir berhasil dijangkau kembali | > 50% dalam 60 hari |

---

## Catatan untuk Implementasi

### Tech Stack

| Layer | Technology | Alasan |
|-------|-----------|--------|
| Framework | Next.js (App Router) + TypeScript | Server route untuk menjaga kunci API tetap di server, satu basis kode |
| Styling | Tailwind CSS | Cepat, dan memudahkan penegakan ukuran font serta tombol besar |
| Database | Supabase (PostgreSQL) | Auth, RLS, dan basis data relasional dalam satu layanan. Diminta panduan role Hacker |
| LLM | API penyedia model (teks + vision) | Narasi ringkasan, saran menu, dan ekstraksi foto buku tulis |
| Validasi | Zod | Satu skema dipakai klien dan server, mencegah duplikasi aturan |
| Pengujian | Vitest | Golden test Z-score dan unit test penjaga kualitas data |
| Grafik | Recharts | Grafik pertumbuhan, integrasi React langsung |
| Offline | Service worker + IndexedDB | Menyimpan input saat tanpa sinyal |
| Deploy | Vercel | Integrasi langsung dengan repositori, URL publik |

Keputusan yang perlu dicatat: **UI tidak digenerate lewat v0/Lovable** seperti rencana versi 2.0. Kode hasil generate cenderung membawa struktur yang tidak dipahami penulisnya, dan itu bertentangan dengan kriteria penguasaan kompetensi role. Antarmuka ditulis langsung dengan komponen sederhana.

### Standar WHO yang Digunakan

Rujukan yang benar untuk sasaran usia produk ini adalah **WHO Child Growth Standards (0-5 tahun)**.

> Versi 2.0 dokumen ini merujuk *Growth Reference Data for 5-19 years*, yang **tidak berlaku** untuk balita. Kesalahan tersebut diperbaiki di versi ini. Memakai tabel yang salah akan menghasilkan Z-score yang salah pada seluruh populasi sasaran.

Indikator yang dipakai:

| Indikator | Keterangan | Rentang usia |
|-----------|------------|--------------|
| **BB/U** (weight-for-age) | Berat badan menurut umur | 0-60 bulan |
| **TB/U** (length/height-for-age) | Panjang badan (0-23 bulan) atau tinggi badan (24-60 bulan) menurut umur | 0-60 bulan |
| **BB/PB** (weight-for-length) | Berat badan menurut panjang badan | 0-23 bulan |
| **BB/TB** (weight-for-height) | Berat badan menurut tinggi badan | 24-60 bulan |

Pemilihan antara BB/PB dan BB/TB bergantung pada usia dan cara pengukuran (telentang atau berdiri). Keduanya adalah tabel berbeda, bukan satu indikator.

#### Metode perhitungan

Z-score dihitung dengan metode **LMS** WHO:

```
Untuk L != 0:  Z = ((nilai / M)^L - 1) / (L * S)
Untuk L  = 0:  Z = ln(nilai / M) / S
```

L, M, dan S diambil dari tabel referensi WHO menurut indikator, jenis kelamin, dan usia (atau panjang/tinggi badan). Nilai antar titik tabel diinterpolasi linier.

Perhitungan dilakukan sepenuhnya oleh kode deterministik dan diverifikasi melalui golden test terhadap kasus uji referensi WHO. LLM tidak pernah dilibatkan dalam perhitungan ini.

#### Klasifikasi status gizi

| Rentang Z-score | Status | Warna |
|-----------------|--------|-------|
| Z >= -2 | Normal | Hijau |
| -3 <= Z < -2 | Risiko / kurang | Kuning |
| Z < -3 | Berat (severe) | Merah |

Istilah klinis mengikuti indikator: TB/U rendah disebut *stunting*, BB/TB rendah disebut *wasting*, BB/U rendah disebut *underweight*. Antarmuka memakai bahasa sederhana, namun dokumen dan basis data menyimpan istilah yang tepat.

#### Batasan yang diakui

Deteksi gizi buruk di lapangan juga mempertimbangkan **LILA/MUAC** (lingkar lengan atas) dan keberadaan **edema bilateral**, yang tidak dicakup MVP ini. Karena itu output sistem tidak boleh dianggap sebagai penilaian gizi yang lengkap.

### Ambang Batas Algoritma

Ambang berikut ditetapkan eksplisit agar dapat diimplementasikan dan diuji:

| Nama | Definisi | Nilai |
|------|----------|-------|
| Berat tidak naik | Selisih berat terhadap pengukuran sebelumnya | <= 0 kg |
| Berat stagnan | Berat tidak naik pada pengukuran berurutan | 2 kali berturut-turut |
| Data minimum untuk analisis tren | Jumlah pengukuran yang diperlukan | 3 titik |
| Anak hilang dari pemantauan | Jeda sejak kunjungan terakhir | > 90 hari |
| Batas kewajaran berat | Rentang nilai yang diterima | 0,5-30 kg |
| Batas kewajaran tinggi | Rentang nilai yang diterima | 30-130 cm |
| Batas usia | Usia yang dilayani | 0-60 bulan |
| Tinggi menurun | Tinggi lebih kecil dari pengukuran sebelumnya | ditandai sebagai kemungkinan salah catat |
| Lonjakan berat tidak wajar | Kenaikan berat dalam satu bulan | > 2 kg ditandai untuk diperiksa |

Nilai-nilai ini berada pada satu modul konfigurasi, bukan disebar di dalam kode.

### Pembagian Peran Kode dan LLM

| Tugas | Dikerjakan oleh | Alasan |
|-------|-----------------|--------|
| Hitung Z-score | Kode deterministik | Harus dapat diuji dan direproduksi |
| Klasifikasi status gizi | Kode deterministik | Ambang batas bersifat pasti |
| Deteksi tren dan stagnasi | Kode deterministik | Perbandingan numerik, bukan tugas bahasa |
| Deteksi anak hilang dari pemantauan | Kueri basis data | Perhitungan tanggal |
| Validasi kewajaran data | Kode deterministik | Aturan tetap |
| Menyusun narasi ringkasan | LLM | Tugas bahasa |
| Menyusun saran menu lokal | LLM | Membutuhkan pengetahuan bahan pangan lokal |
| Membaca angka dari foto buku tulis | LLM vision | Tugas persepsi, hasilnya wajib dikonfirmasi kader |

> Versi 2.0 dokumen ini menugaskan deteksi pola pertumbuhan kepada LLM (FR-03.7 dan FR-08). Penugasan tersebut dibalik pada versi ini: LLM tidak menghitung apa pun, dan hanya menarasikan hasil yang sudah dihitung kode.

### Catatan Etika

Aplikasi ini adalah **alat bantu kader posyandu**, bukan alat diagnosis.

- Setiap halaman yang menampilkan data kesehatan menyertakan pernyataan: "Ini adalah alat bantu. Untuk diagnosis resmi, silakan konsultasi ke bidan atau puskesmas terdekat."
- Tidak ada klaim medis di dalam aplikasi
- Setiap temuan berisiko selalu diarahkan ke tenaga kesehatan, tidak pernah diselesaikan oleh sistem sendiri
- Seluruh data pada lingkungan demo publik adalah data sintetis, bukan data anak nyata
- Sistem tidak memberi saran pengobatan; saran yang diberikan terbatas pada pangan bergizi sehari-hari

---

## Glosarium

| Istilah | Penjelasan |
|---------|------------|
| **Posyandu** | Pos pelayanan terpadu di tingkat desa/kelurahan untuk pemantauan kesehatan ibu dan anak |
| **Kader** | Warga, umumnya ibu-ibu sukarelawan, yang menjalankan kegiatan posyandu |
| **Z-score** | Ukuran seberapa jauh nilai anak dari median populasi referensi WHO, dinyatakan dalam satuan simpangan baku |
| **LMS** | Tiga parameter (Lambda, Mu, Sigma) pada tabel WHO yang dipakai menghitung Z-score |
| **Stunting** | Tinggi badan menurut umur rendah (TB/U di bawah -2 SD), menandakan kekurangan gizi kronis |
| **Wasting** | Berat badan menurut tinggi rendah (BB/TB di bawah -2 SD), menandakan kekurangan gizi akut |
| **Underweight** | Berat badan menurut umur rendah (BB/U di bawah -2 SD) |
| **LILA / MUAC** | Lingkar lengan atas, indikator tambahan penapisan gizi buruk |
| **RLS** | Row Level Security, mekanisme PostgreSQL yang membatasi baris yang dapat diakses tiap pengguna |
| **e-PPGBM** | Sistem pencatatan dan pelaporan gizi berbasis masyarakat milik Kemenkes |
| **Provenance** | Jejak asal data: apakah nilai diketik manual atau hasil ekstraksi AI |

---

## Riwayat Versi

| Versi | Perubahan utama |
|-------|-----------------|
| 1.0 | Draf awal |
| 2.0 | 8 epic, 9 kelompok kebutuhan fungsional, 14 fitur berlabel Must Have |
| **3.0** | Menyesuaikan diri dengan panduan resmi hackathon: memperbaiki bobot kriteria penilaian, tanggal dan durasi, angka prevalensi yang tidak konsisten, serta rujukan standar WHO yang salah rentang usia. Menambahkan ringkasan solusi, penjelasan relevansi tema, pemetaan deliverable role Hacker, kriteria penerimaan, rencana pengujian, ambang batas algoritma, pembagian peran kode dan LLM, kebijakan privasi, ketahanan layanan LLM, risiko, pertanyaan terbuka, dan glosarium. Menambahkan FR-10 sampai FR-13. Mempersempit cakupan dari 14 fitur menjadi 7 fitur MVP, dengan alasan penundaan tertulis untuk sisanya. |

Alasan di balik setiap keputusan teknis dicatat terpisah di `DECISIONS.md`.

### Catatan versi 3.1

Versi ini menutup selisih antara dokumen dan kode yang ditemukan saat pemeriksaan mandiri. Tiga hal diperbaiki:

| No | Selisih pada versi 3.0 | Penanganan |
|----|------------------------|------------|
| 1 | Saran menu lokal dicantumkan sebagai pendukung MVP, namun belum ada di kode | Dibangun (`src/lib/menu.ts`, `src/app/api/menu/`), dengan harga dan bahan dari daftar tetap di kode alih-alih dari LLM |
| 2 | Path rujukan salah: `app/api/import/`, `app/api/summary/`, `supabase/seed.sql` | Dibetulkan menjadi `src/app/api/import-foto/`, `src/app/api/ringkasan/`, `scripts/seed.mjs` |
| 3 | Empat butir Must Have belum ada: pendaftaran anak (FR-01.1), saring status (FR-02.4), cari nama (FR-02.5), perbaikan data anak (FR-04.6) | Keempatnya dibangun |

Pilihan yang diambil adalah membangun yang kurang, bukan menurunkan klaim dokumen. Alasannya: penguji yang membaca PRD lalu membuka aplikasi akan menemukan selisihnya, dan dokumen yang menjanjikan lebih dari yang ada merugikan kriteria kejelasan penyampaian lebih besar daripada cakupan yang lebih sempit namun jujur.
