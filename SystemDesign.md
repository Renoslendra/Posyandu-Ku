# System Design — PosyanduKu

**Versi**: 2.0
**Tanggal**: 28-29 Juli 2026
**Event**: Indonesianext 2026 Hackathon by Telkomsel

---

## 1. Gambaran Umum Sistem

### 1.1 Apa itu PosyanduKu?

PosyanduKu adalah **aplikasi web** yang membantu kader posyandu mengubah data anak dari "tumpukan buku tulis" menjadi informasi yang berguna untuk menyelamatkan anak dari stunting.

### 1.2 Siapa yang Menggunakan?

```
┌─────────────────────────────────────────────────────────────┐
│                      PENGGUNA SISTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   KADER     │    │   BIDAN     │    │  ORANG TUA  │    │
│  │  POSYANDU   │    │    DESA     │    │   ANAK      │    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              APLIKASI POSYANDUKU                    │   │
│  │              (Website di Browser)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Apa yang Dilakukan Setiap Pengguna?

| Pengguna | Apa yang Dilakukan | Halaman yang Diakses |
|----------|-------------------|---------------------|
| **Kader** | Input data anak (nama, umur, berat, tinggi) | Halaman Input |
| **Kader** | Lihat status gizi anak (hijau/kuning/merah) | Halaman Input |
| **Bidan** | Lihat ringkasan semua anak | Dashboard |
| **Bidan** | Lihat anak yang perlu ditolong | Dashboard |
| **Bidan** | Minta AI buatkan laporan bulanan | Dashboard |
| **Orang Tua** | Lihat status gizi anak saya | Profil Anak |
| **Orang Tua** | Lihat menu makanan yang disarankan | Profil Anak |
| **Orang Tua** | Tanya jawab tentang gizi anak | Chatbot |
| **Bidan** | Tanya jawab tentang data anak | Chatbot |

---

## 2. Arsitektur Sistem (High-Level)

### 2.1 Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Kader   │  │  Bidan   │  │ Orang Tua│  │  Chatbot │       │
│  │  Input   │  │Dashboard │  │ Profil   │  │  Widget  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼──────────────┼──────────────┼──────────────┼─────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (Frontend + API)                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API ROUTES                           │   │
│  │  /api/children   - CRUD data anak                       │   │
│  │  /api/measurements - Input pengukuran + Z-score         │   │
│  │  /api/dashboard  - Data untuk dashboard                 │   │
│  │  /api/summary    - AI generate laporan                  │   │
│  │  /api/menu       - AI generate menu lokal               │   │
│  │  /api/chat       - Chatbot asisten gizi                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    SUPABASE     │ │   OPENAI API    │ │    VERCEL       │
│   (Database)    │ │   (AI/LLM)      │ │   (Hosting)     │
│                 │ │                 │ │                 │
│ • PostgreSQL    │ │ • GPT-4o        │ │ • Deploy        │
│ • Auth          │ │ • Generate Text │ │ • SSL/HTTPS     │
│ • RLS           │ │ • Chatbot       │ │ • CDN           │
│ • Realtime      │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.2 Penjelasan Sederhana

Bayangkan sistem ini seperti **restoran**:

| Komponen | Analogi Restoran | Fungsi |
|----------|------------------|--------|
| **Frontend** (Halaman Web) | Menu restoran | Yang dilihat dan dipilih oleh pengguna |
| **API Routes** | Pelayan | Menerima pesanan dari pengguna, menyampaikan ke dapur |
| **Database** (Supabase) | Dapur & Gudang | Menyimpan semua data (resep, bahan, pesanan) |
| **AI** (OpenAI) | Koki ahli | Membuat laporan, menu, dan menjawab pertanyaan |
| **Hosting** (Vercel) | Gedung restoran | Tempat aplikasi dijalankan |

---

## 3. Alur Data (Data Flow)

### 3.1 Alur Input Data Anak

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  KADER   │────▶│  FORM    │────▶│   API    │────▶│ DATABASE │
│  Input   │     │  INPUT   │     │ /children│     │ Supabase │
│  Data    │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ HITUNG   │
                 │ Z-SCORE  │
                 │ (Otomatis)│
                 └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ STATUS   │
                 │ GIZI     │
                 │ H/K/M    │
                 └──────────┘
```

**Penjelasan**:
1. Kader mengisi form: nama anak, umur, berat, tinggi
2. Form mengirim data ke API
3. API menghitung Z-score secara otomatis (menggunakan rumus WHO)
4. API menentukan status gizi: Hijau (Normal), Kuning (Risiko), Merah (Gizi Buruk)
5. Data disimpan ke database
6. Kader langsung melihat hasilnya di layar

### 3.2 Alur Dashboard Bidan

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  BIDAN   │────▶│DASHBOARD │────▶│   API    │────▶│ DATABASE │
│  Buka    │     │  PAGE    │     │/dashboard│     │ Supabase │
│  Halaman │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ RINGKASAN│
                 │ • Total  │
                 │ • Normal │
                 │ • Risiko │
                 │ • Buruk  │
                 └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  CHART   │
                 │  (Pie/   │
                 │  Bar)    │
                 └──────────┘
```

**Penjelasan**:
1. Bidan membuka halaman Dashboard
2. Dashboard meminta data dari API
3. API mengambil semua data anak dari database
4. API menghitung statistik: total, normal, risiko, gizi buruk
5. Data ditampilkan dalam bentuk ringkasan dan chart

### 3.3 Alur AI Summary

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  BIDAN   │────▶│  TOMBOL  │────▶│   API    │────▶│  OPENAI  │
│  Klik    │     │ GENERATE │     │/summary  │     │   API    │
│  Summary │     │ SUMMARY  │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │                                │
                       │                                ▼
                       │                          ┌──────────┐
                       │                          │ GENERATE │
                       │                          │ RINGKASAN│
                       │                          │ BULANAN  │
                       │                          └──────────┘
                       │                                │
                       ▼                                ▼
                 ┌──────────────────────────────────────────┐
                 │           TAMPILKAN HASIL                │
                 │  • Statistik anak bulan ini              │
                 │  • Anak yang perlu ditindaklanjuti       │
                 │  • Rekomendasi tindakan                  │
                 └──────────────────────────────────────────┘
```

**Penjelasan**:
1. Bidan klik tombol "Generate Summary"
2. API mengambil data semua anak bulan ini dari database
3. API mengirim data ke OpenAI dengan prompt yang sudah disiapkan
4. OpenAI membuat ringkasan dalam Bahasa Indonesia
5. Ringkasan ditampilkan ke Bidan

### 3.4 Alur Chatbot

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  USER    │────▶│  CHAT    │────▶│   API    │────▶│  OPENAI  │
│  Ketik   │     │  WIDGET  │     │  /chat   │     │   API    │
│  Pesan   │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │                                │
                       │                                ▼
                       │                          ┌──────────┐
                       │                          │ GENERATE │
                       │                          │ JAWABAN  │
                       │                          │ (Bahasa  │
                       │                          │ Indonesia)│
                       │                          └──────────┘
                       │                                │
                       ▼                                ▼
                 ┌──────────────────────────────────────────┐
                 │           TAMPILKAN JAWABAN              │
                 │  • Jawaban atas pertanyaan user          │
                 │  • Disclaimer: bukan pengganti medis     │
                 │  • Saran tindakan selanjutnya            │
                 └──────────────────────────────────────────┘
```

**Penjelasan**:
1. User (Orang Tua/Bidan) mengetik pertanyaan di chatbot
2. Pertanyaan dikirim ke API
3. API mengirim pertanyaan ke OpenAI dengan konteks (data anak, status gizi, dll)
4. OpenAI membuat jawaban dalam Bahasa Indonesia yang sederhana
5. Jawaban ditampilkan ke user dengan disclaimer

### 3.5 Alur Jaringan Darurat Kesehatan

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  USER    │────▶│  TOMBOL  │────▶│   API    │────▶│ DATABASE │
│  Tekan   │     │ DARURAT  │     │/emergency│     │ Fasilitas│
│  Darurat │     │          │     │          │     │ Kesehatan│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  DETEKSI │
                 │  LOKASI  │
                 │  GPS     │
                 └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  CARI    │
                 │  FASILITAS│
                 │  TERDEKAT│
                 └──────────┘
                       │
                       ▼
                 ┌──────────────────────────────────────────┐
                 │           TAMPILKAN HASIL                │
                 │  • Puskesmas terdekat (1.2 km)           │
                 │  • Nomor telepon                         │
                 │  • Rute navigasi                         │
                 │  • Tombol hubungi langsung               │
                 │  • Alert ke keluarga/kader               │
                 └──────────────────────────────────────────┘
```

**Penjelasan**:
1. User menekan tombol darurat
2. Sistem mendeteksi lokasi GPS pengguna
3. API mencari fasilitas kesehatan terdekat dari database
4. Menampilkan: nama, jarak, nomor telepon, rute
5. User bisa hubungi langsung atau kirim alert ke keluarga

### 3.6 Alur Deteksi Dini Berbasis Pola

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  SYSTEM  │────▶│  ANALISIS│────▶│   API    │────▶│ DATABASE │
│  Cron Job│     │  POLA    │     │/patterns │     │ Historis │
│  (Otomatis)    │  6 BULAN │     │          │     │ Pengukuran│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  DETEKSI │
                 │  POLA    │
                 │  ABNORMAL│
                 └──────────┘
                       │
                       ▼
                 ┌──────────────────────────────────────────┐
                 │           JIKA POLA ABNORMAL             │
                 │  • Berat badan stagnan 2-3 bulan         │
                 │  • Frekuensi makan berkurang             │
                 │  • Variasi makanan menurun               │
                 └──────────────────────────────────────────┘
                       │
                       ▼
                 ┌──────────────────────────────────────────┐
                 │           GENERATE PERINGATAN DINI       │
                 │  • "Budi berat badan stagnan 2 bulan!"   │
                 │  • Rekomendasi tindakan preventif        │
                 │  • Saran ke posyandu/puskesmas           │
                 └──────────────────────────────────────────┘
```

**Penjelasan**:
1. Sistem secara otomatis menganalisis data historis pengukuran
2. Mencari pola: berat badan stagnan, frekuensi makan berkurang, variasi menurun
3. Jika pola abnormal terdeteksi → generate peringatan dini
4. Peringatan ditampilkan ke orang tua dan bidan
5. Rekomendasi tindakan preventif diberikan

### 3.7 Alur Suara Komunitas

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  USER    │────▶│  INPUT   │────▶│   API    │────▶│ DATABASE │
│  Tulis   │     │  CERITA  │     │ /stories │     │ Cerita   │
│  Cerita  │     │  SUKES   │     │          │     │ Sukses   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  AI      │
                 │  GENERATE│
                 │  RINGKASAN│
                 └──────────┘
                       │
                       ▼
                 ┌──────────────────────────────────────────┐
                 │           TAMPILKAN DI HALAMAN           │
                 │  • Cerita sukses yang relevan            │
                 │  • Tips praktis dari cerita              │
                 │  • Rating dan komentar                   │
                 │  • Filter berdasarkan masalah            │
                 └──────────────────────────────────────────┘
```

**Penjelasan**:
1. Orang tua menulis cerita sukses mereka
2. AI generate ringkasan cerita
3. Cerita disimpan ke database
4. Orang lain bisa baca, filter berdasarkan masalah, rating, komentar
5. Membangun komunitas saling mendukung

---

## 4. Struktur Halaman (Page Structure)

### 4.1 Peta Halaman

```
┌─────────────────────────────────────────────────────────────┐
│                      POSYANDUKU                             │
│                     (Website)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   HALAMAN   │  │   HALAMAN   │  │   HALAMAN   │        │
│  │    INPUT    │  │  DASHBOARD  │  │    PROFIL   │        │
│  │   (Kader)   │  │   (Bidan)   │  │   (Orang    │        │
│  │             │  │             │  │    Tua)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              CHATBOT WIDGET                         │   │
│  │         (Muncul di semua halaman)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Detail Setiap Halaman

#### Halaman Input (Kader)

```
┌─────────────────────────────────────────────────────┐
│  HEADER: PosyanduKu - Input Data Anak               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  FORM INPUT ANAK                            │   │
│  │                                             │   │
│  │  Nama Anak:    [________________]           │   │
│  │  Umur (bulan): [________________]           │   │
│  │  Berat (kg):   [________________]           │   │
│  │  Tinggi (cm):  [________________]           │   │
│  │                                             │   │
│  │  [SIMPAN DATA]                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  HASIL PENGUKURAN                           │   │
│  │                                             │   │
│  │  Z-score Berat: -3.2                        │   │
│  │  Z-score Tinggi: -1.8                       │   │
│  │  Status: GIZI BURUK (Merah)                 │   │
│  │                                             │   │
│  │  ⚠️ Segera rujuk ke puskesmas              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  DAFTAR ANAK BULAN INI                      │   │
│  │                                             │   │
│  │  1. Budi (3 tahun) - GIZI BURUK (Merah)    │   │
│  │  2. Siti (2 tahun) - Risiko (Kuning)       │   │
│  │  3. Andi (4 tahun) - Normal (Hijau)        │   │
│  │  ...                                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER: Disclaimer + Chatbot Widget               │
└─────────────────────────────────────────────────────┘
```

#### Dashboard (Bidan)

```
┌─────────────────────────────────────────────────────┐
│  HEADER: PosyanduKu - Dashboard Bidan               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  RINGKASAN BULAN INI                        │   │
│  │                                             │   │
│  │  Total Anak: 200                            │   │
│  │  ┌─────────┬─────────┬─────────┐           │   │
│  │  │ NORMAL  │ RISIKO  │ GIZI    │           │   │
│  │  │ 170     │ 20      │ BURUK   │           │   │
│  │  │ (85%)   │ (10%)   │ 10 (5%) │           │   │
│  │  │ Hijau   │ Kuning  │ Merah   │           │   │
│  │  └─────────┴─────────┴─────────┘           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  CHART DISTRIBUSI                           │   │
│  │                                             │   │
│  │  [PIE CHART: Normal vs Risiko vs Buruk]     │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  ANAK YANG PERLU DITINDAKLANJUTI            │   │
│  │                                             │   │
│  │  1. Budi (3 tahun) - Z-score: -3.2         │   │
│  │     → RUJUK PUSKESMAS                       │   │
│  │  2. Siti (2 tahun) - Z-score: -2.8         │   │
│  │     → PANTAU KETAT                          │   │
│  │  3. Andi (4 tahun) - Berat tidak naik 3 bln│   │
│  │     → KUNJUNGAN RUMAH                       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  [GENERATE AI SUMMARY]  [LIHAT SEMUA ANAK]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER: Disclaimer + Chatbot Widget               │
└─────────────────────────────────────────────────────┘
```

#### Profil Anak (Orang Tua)

```
┌─────────────────────────────────────────────────────┐
│  HEADER: PosyanduKu - Profil Anak                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  INFO ANAK                                  │   │
│  │                                             │   │
│  │  Nama: Budi                                 │   │
│  │  Umur: 3 tahun (36 bulan)                   │   │
│  │  Status: GIZI BURUK (Merah)                 │   │
│  │                                             │   │
│  │  ⚠️ Segera konsultasi ke bidan/puskesmas   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  GRAFIK PERTUMBUHAN                         │   │
│  │                                             │   │
│  │  [LINE CHART: Berat badan dari waktu ke     │   │
│  │   waktu dengan garis standar WHO]           │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  MENU HARI INI                              │   │
│  │                                             │   │
│  │  PAGI: Bubur tempe + telur orak-arik        │   │
│  │  SIANG: Nasi + ikan teri goreng + bayam     │   │
│  │  SNACK: Pisang rebus + susu kedelai         │   │
│  │  MALAM: Nasi + tumis kangkung + telur dadar │   │
│  │                                             │   │
│  │  Total Biaya: Rp 15.000                     │   │
│  │  [LIHAT MENU LENGKAP]                       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER: Disclaimer + Chatbot Widget               │
└─────────────────────────────────────────────────────┘
```

#### Chatbot Widget (Muncul di Semua Halaman)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  💬 Tanya Asisten Gizi                      │   │
│  │  ─────────────────────────────────────────  │   │
│  │  [Riwayat chat muncul di sini]              │   │
│  │                                             │   │
│  │  User: Anak saya berat badannya tidak naik  │   │
│  │                                             │   │
│  │  Bot: Jika berat badan anak tidak naik      │   │
│  │  selama 2 bulan, ini perlu perhatian...     │   │
│  │                                             │   │
│  │  [Ketik pertanyaan Anda...]    [KIRIM]      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Database Design

### 5.1 Diagram Entity-Relationship

```
┌─────────────────┐       ┌─────────────────┐
│    POSYANDU     │       │     CADRES      │
│                 │       │    (Kader)      │
│ id (PK)         │◄──────│ posyandu_id (FK)│
│ name            │       │ id (PK)         │
│ address         │       │ name            │
│ village         │       │ phone           │
│ district        │       │ role            │
└────────┬────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│    CHILDREN     │       │  MEASUREMENTS   │
│    (Anak)       │       │  (Pengukuran)   │
│                 │       │                 │
│ id (PK)         │◄──────│ child_id (FK)   │
│ posyandu_id (FK)│       │ id (PK)         │
│ name            │       │ cadre_id (FK)   │
│ date_of_birth   │       │ measurement_date│
│ gender          │       │ weight_kg       │
│ parent_name     │       │ height_cm       │
│ parent_phone    │       │ z_score_weight  │
│ address         │       │ z_score_height  │
└────────┬────────┘       │ status          │
         │                └─────────────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│  AI_SUMMARIES   │       │ MENU_SUGGESTIONS│
│  (Ringkasan AI) │       │ (Saran Menu)    │
│                 │       │                 │
│ id (PK)         │       │ id (PK)         │
│ posyandu_id (FK)│       │ child_id (FK)   │
│ summary_type    │       │ status_gizi     │
│ content         │       │ menu_content    │
│ generated_at    │       │ estimated_cost  │
└─────────────────┘       └─────────────────┘
```

### 5.2 Penjelasan Tabel

| Tabel | Fungsi | Contoh Data |
|-------|--------|-------------|
| **posyandu** | Menyimpan data posyandu | "Posyandu Melati", Jl. Merdeka No. 15 |
| **cadres** | Menyimpan data kader | "Bu Ani", 08123456789 |
| **children** | Menyimpan data anak | "Budi", 2023-01-15, Laki-laki |
| **measurements** | Menyimpan data pengukuran | Berat: 11kg, Tinggi: 90cm, Z-score: -3.2 |
| **ai_summaries** | Menyimpan hasil AI summary | "Ringkasan bulan Juli 2026..." |
| **menu_suggestions** | Menyimpan saran menu | "Pagi: Bubur tempe...", Rp 15.000 |
| **health_facilities** | Menyimpan data fasilitas kesehatan | "Puskesmas Sukamakmur", -6.9, 107.6 |
| **emergency_contacts** | Menyimpan kontak darurat | "Ibu Ratna (Bidan)", 0812-3456-7890 |
| **emergency_logs** | Menyimpan riwayat penggunaan darurat | User X menekan tombol darurat, lokasi Y |
| **early_warnings** | Menyimpan peringatan dini | "Budi berat stagnan 2 bulan", pola X |
| **success_stories** | Menyimpan cerita sukses | "Ibu Rina berhasil atasi gizi buruk..." |
| **story_ratings** | Menyimpan rating cerita | User A rate cerita 5 bintang |
| **story_comments** | Menyimpan komentar cerita | "Terima kasih sudah berbagi!" |
| **menu_suggestions** | Menyimpan saran menu | "Pagi: Bubur tempe...", Rp 15.000 |

### 5.3 Relasi Antar Tabel

```
posyandu (1) ──< (N) children
posyandu (1) ──< (N) cadres
children (1) ──< (N) measurements
children (1) ──< (N) menu_suggestions
posyandu (1) ──< (N) ai_summaries
cadres (1) ──< (N) measurements
```

---

## 6. API Design

### 6.1 Daftar API Endpoints

| Endpoint | Method | Fungsi | Siapa yang Pakai |
|----------|--------|--------|------------------|
| `/api/children` | GET | Ambil daftar anak | Kader, Bidan |
| `/api/children` | POST | Tambah anak baru | Kader |
| `/api/children/:id` | GET | Ambil data 1 anak | Kader, Orang Tua |
| `/api/children/:id` | PUT | Update data anak | Kader |
| `/api/measurements` | GET | Ambil riwayat pengukuran | Kader, Bidan |
| `/api/measurements` | POST | Input pengukuran baru | Kader |
| `/api/dashboard` | GET | Data untuk dashboard | Bidan |
| `/api/summary` | POST | Generate AI summary | Bidan |
| `/api/menu` | POST | Generate menu lokal | Orang Tua |
| `/api/chat` | POST | Kirim pesan ke chatbot | Semua |
| `/api/emergency/facilities` | GET | Ambil fasilitas kesehatan terdekat | Orang Tua |
| `/api/emergency/alert` | POST | Kirim alert darurat | Orang Tua |
| `/api/emergency/logs` | GET | Riwayat penggunaan tombol darurat | Bidan |
| `/api/patterns/analyze` | POST | Analisis pola gizi anak | Sistem (otomatis) |
| `/api/patterns/warnings` | GET | Ambil peringatan dini | Bidan |
| `/api/patterns/history` | GET | Riwayat pola per anak | Bidan, Orang Tua |
| `/api/stories` | GET | Ambil cerita sukses | Semua |
| `/api/stories` | POST | Tambah cerita sukses | Orang Tua |
| `/api/stories/:id/rate` | POST | Rate cerita sukses | Semua |
| `/api/stories/:id/comments` | POST | Komentar cerita sukses | Semua |

### 6.2 Contoh Request & Response

#### POST /api/measurements (Input Pengukuran)

**Request:**
```json
{
  "child_id": "uuid-anak",
  "weight_kg": 11.0,
  "height_cm": 90.0,
  "measurement_date": "2026-07-28"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-pengukuran",
    "child_id": "uuid-anak",
    "weight_kg": 11.0,
    "height_cm": 90.0,
    "z_score_weight": -3.2,
    "z_score_height": -1.8,
    "status": "gizi_buruk",
    "measurement_date": "2026-07-28"
  }
}
```

#### POST /api/chat (Chatbot)

**Request:**
```json
{
  "message": "Anak saya berat badannya tidak naik 2 bulan, apa yang harus saya lakukan?",
  "child_id": "uuid-anak"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Jika berat badan anak tidak naik selama 2 bulan, ini perlu perhatian khusus. Beberapa hal yang bisa dilakukan:\n\n1. Pastikan anak makan 3 kali sehari + 2 kali snack\n2. Berikan makanan tinggi protein: tempe, telur, ikan\n3. Periksa ke posyandu terdekat untuk pengukuran ulang\n4. Jika sudah 3 bulan tidak naik, segera ke puskesmas\n\n⚠️ Ini adalah alat bantu, bukan diagnosis. Untuk diagnosis resmi, silakan konsultasi ke bidan/puskesmas.",
    "disclaimer": true
  }
}
```

---

## 7. AI Integration Design

### 7.1 Cara AI Bekerja

```
┌─────────────────────────────────────────────────────────────┐
│                    CARA AI BEKERJA                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   INPUT     │───▶│   PROMPT    │───▶│   OUTPUT    │    │
│  │   (Data)    │    │ (Template)  │    │ (Jawaban)   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│  Contoh:                                                    │
│  Input: Data 200 anak bulan Juli                            │
│  Prompt: "Buat ringkasan data posyandu bulan Juli..."       │
│  Output: "Ringkasan: 170 normal, 20 risiko, 10 gizi buruk" │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Fungsi AI yang Digunakan

| Fungsi | Input | Output | Contoh |
|--------|-------|--------|--------|
| **Generate Summary** | Data semua anak | Ringkasan bulanan | "170 normal, 20 risiko, 10 gizi buruk" |
| **Generate Menu** | Status gizi anak | Menu harian | "Pagi: Bubur tempe..." |
| **Detect Pattern** | Riwayat pengukuran | Pola pertumbuhan | "Berat badan stagnan 6 bulan" |
| **Chatbot** | Pertanyaan user | Jawaban | "Jika berat badan tidak naik..." |

### 7.3 Prompt Template untuk Chatbot

```
Anda adalah asisten gizi yang membantu orang tua dan bidan 
di posyandu. Tugas Anda adalah menjawab pertanyaan tentang 
gizi anak dengan Bahasa Indonesia yang sederhana dan mudah 
dipahami.

Konteks:
- Nama anak: {nama_anak}
- Umur: {umur} bulan
- Status gizi: {status_gizi}
- Berat badan terakhir: {berat} kg
- Tinggi badan terakhir: {tinggi} cm

Pertanyaan user: {pertanyaan}

Jawab dengan:
1. Bahasa Indonesia yang sederhana
2. Saran yang praktis dan bisa dilakukan
3. Selalu akhiri dengan disclaimer bahwa ini bukan pengganti 
   konsultasi medis

PENTING: Jangan pernah memberikan diagnosis. Selalu arahkan 
ke bidan atau puskesmas untuk pemeriksaan lebih lanjut.
```

---

## 8. Security Design

### 8.1 Row Level Security (RLS)

```
┌─────────────────────────────────────────────────────────────┐
│                    ROW LEVEL SECURITY                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KADER hanya bisa:                                          │
│  ├── Melihat anak di posyandunya                            │
│  ├── Menginput data anak di posyandunya                     │
│  └── Mengedit data anak di posyandunya                      │
│                                                             │
│  BIDAN bisa:                                                │
│  ├── Melihat semua anak di wilayahnya                       │
│  ├── Melihat ringkasan data                                 │
│  └── Generate AI summary                                    │
│                                                             │
│  ORANG TUA hanya bisa:                                      │
│  ├── Melihat data anaknya sendiri                           │
│  ├── Melihat menu untuk anaknya                             │
│  └── Menggunakan chatbot                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Environment Variables

```
┌─────────────────────────────────────────────────────────────┐
│                 ENVIRONMENT VARIABLES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  .env.local (RAHASIA - tidak boleh di-commit):              │
│  ├── NEXT_PUBLIC_SUPABASE_URL=...                           │
│  ├── NEXT_PUBLIC_SUPABASE_ANON_KEY=...                      │
│  └── OPENAI_API_KEY=...                                     │
│                                                             │
│  .env.example (BOLEH di-commit):                            │
│  ├── NEXT_PUBLIC_SUPABASE_URL=                              │
│  ├── NEXT_PUBLIC_SUPABASE_ANON_KEY=                         │
│  └── OPENAI_API_KEY=                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   GITHUB    │───▶│   VERCEL    │───▶│   USER      │    │
│  │   (Repo)    │    │  (Hosting)  │    │  (Browser)  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│  Flow:                                                      │
│  1. Push kode ke GitHub                                     │
│  2. Vercel otomatis deploy                                  │
│  3. User akses via browser                                  │
│                                                             │
│  URL: https://posyanduku.vercel.app                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Ringkasan System Design

### Komponen Utama

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| **Frontend** | Next.js + Tailwind | Halaman yang dilihat user |
| **API** | Next.js API Routes | Memproses data |
| **Database** | Supabase (PostgreSQL) | Menyimpan data |
| **AI** | OpenAI GPT-4o | Membuat laporan, menu, chatbot |
| **Hosting** | Vercel | Menjalankan aplikasi |

### Alur Data

1. **Input**: Kader → Form → API → Database
2. **Dashboard**: Bidan → Dashboard → API → Database → Statistik
3. **AI Summary**: Bidan → Tombol → API → OpenAI → Ringkasan
4. **Chatbot**: User → Chat → API → OpenAI → Jawaban

### Keamanan

- **RLS**: Setiap user hanya bisa akses data miliknya
- **HTTPS**: Data terenkripsi
- **Environment Variables**: API key tidak di kode

### Database Schema (Supabase)

```sql
-- Tabel Posyandu
CREATE TABLE posyandu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  village TEXT,
  district TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Kader
CREATE TABLE cadres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posyandu_id UUID REFERENCES posyandu(id),
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'kader',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Anak
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posyandu_id UUID REFERENCES posyandu(id),
  name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pengukuran (Data Pertumbuhan)
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id),
  cadre_id UUID REFERENCES cadres(id),
  measurement_date DATE DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  z_score_weight DECIMAL(5,2),  -- Auto-hitung
  z_score_height DECIMAL(5,2),  -- Auto-hitung
  status TEXT,  -- 'normal', 'risiko', 'gizi_buruk'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel AI Summary
CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posyandu_id UUID REFERENCES posyandu(id),
  summary_type TEXT,  -- 'monthly', 'child', 'alert'
  content TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Menu Saran
CREATE TABLE menu_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id),
  status_gizi TEXT,
  menu_content TEXT,
  estimated_cost DECIMAL(10,2),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Catatan Etika

**PENTING**: Aplikasi ini adalah **ALAT BANTU KADER**, bukan alat diagnosis.
- Semua output harus disertai disclaimer: "Ini adalah alat bantu. Untuk diagnosis resmi, silakan konsultasi ke bidan/puskesmas."
- Tidak ada klaim medis dalam aplikasi
- Selalu arahkan ke tenaga kesehatan profesional untuk tindak lanjut
