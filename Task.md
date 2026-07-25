# Task Board — PosyanduKu Hackathon

**Event**: Indonesianext 2026 Hackathon by Telkomsel
**Tanggal**: 28-29 Juli 2026

---

## Overview

Task board ini memecah pembangunan PosyanduKu menjadi task-task yang bisa dieksekusi dalam waktu **3 jam hackathon**. Setiap task memiliki:
- **ID**: Nomor unik untuk referensi
- **Deskripsi**: Apa yang harus dilakukan
- **Estimasi**: Berapa lama waktu yang dibutuhkan
- **Depends On**: Task apa yang harus selesai dulu
- **Status**: Belum Dikerjakan / Sedang Dikerjakan / Selesai

---

## FASE 1: FRAME & SCAFFOLD (0 - 60 menit)

### T-01: Setup Project (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-01 |
| **Deskripsi** | Buat Next.js project baru dengan TypeScript dan Tailwind CSS. Setup Supabase project baru. |
| **Sub-tasks** | 1. `npx create-next-app@latest posyanduku --typescript --tailwind` |
| | 2. Buat project di Supabase (supabase.com) |
| | 3. Copy Supabase URL dan anon key ke `.env.local` |
| | 4. Install Supabase client: `npm install @supabase/supabase-js` |
| **Estimasi** | 10 menit |
| **Depends On** | - |
| **Output** | Project berjalan di localhost, Supabase terkoneksi |
| **Status** | [ ] Belum |

### T-02: Setup Database Schema (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-02 |
| **Deskripsi** | Buat semua tabel di Supabase menggunakan SQL Editor |
| **Sub-tasks** | 1. Buka Supabase SQL Editor |
| | 2. Jalankan SQL untuk tabel `posyandu` |
| | 3. Jalankan SQL untuk tabel `cadres` |
| | 4. Jalankan SQL untuk tabel `children` |
| | 5. Jalankan SQL untuk tabel `measurements` |
| | 6. Jalankan SQL untuk tabel `ai_summaries` |
| | 7. Jalankan SQL untuk tabel `menu_suggestions` |
| **Estimasi** | 10 menit |
| **Depends On** | T-01 |
| **Output** | Semua tabel ada di Supabase |
| **Status** | [ ] Belum |

### T-03: Setup RLS Policies (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-03 |
| **Deskripsi** | Aktifkan Row Level Security di semua tabel |
| **Sub-tasks** | 1. Enable RLS di tabel `children` |
| | 2. Enable RLS di tabel `measurements` |
| | 3. Enable RLS di tabel `ai_summaries` |
| | 4. Enable RLS di tabel `menu_suggestions` |
| | 5. Buat policy: kader hanya bisa akses data posyandunya |
| | 6. Buat policy: orang tua hanya bisa akses data anaknya |
| **Estimasi** | 10 menit |
| **Depends On** | T-02 |
| **Output** | RLS aktif, policy terkonfigurasi |
| **Status** | [ ] Belum |

### T-04: Generate UI dengan v0/Lovable (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-04 |
| **Deskripsi** | Generate halaman UI menggunakan v0.dev atau Lovable |
| **Sub-tasks** | 1. Generate halaman **Input Anak** (form sederhana, font besar) |
| | 2. Generate halaman **Dashboard Bidan** (ringkasan, chart, filter) |
| | 3. Generate halaman **Profil Anak** (grafik pertumbuhan, menu) |
| | 4. Copy kode yang dihasilkan ke project |
| **Estimasi** | 15 menit |
| **Depends On** | T-01 |
| **Output** | 3 halaman UI siap digunakan |
| **Status** | [ ] Belum |

### T-05: Deploy Skeleton ke Vercel (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-05 |
| **Deskripsi** | Deploy aplikasi awal ke Vercel |
| **Sub-tasks** | 1. Push kode ke GitHub |
| | 2. Connect GitHub repo ke Vercel |
| | 3. Tambahkan environment variables di Vercel |
| | 4. Deploy dan pastikan berjalan |
| **Estimasi** | 10 menit |
| **Depends On** | T-04 |
| **Output** | Aplikasi bisa diakses dari internet |
| **Status** | [ ] Belum |

### T-06: Seed Data Dummy (5 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-06 |
| **Deskripsi** | Masukkan data dummy untuk demo |
| **Sub-tasks** | 1. Insert 1 posyandu dummy: "Posyandu Melati" |
| | 2. Insert 1 kader dummy: "Bu Ani" |
| | 3. Insert 5-10 anak dummy dengan data bervariasi |
| | 4. Insert beberapa pengukuran dummy |
| **Estimasi** | 5 menit |
| **Depends On** | T-02 |
| **Output** | Data dummy siap untuk demo |
| **Status** | [ ] Belum |

---

## FASE 2: INJECT (60 - 120 menit)

### T-07: Implement API - Input Anak (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-07 |
| **Deskripsi** | Buat API endpoint untuk menambah data anak |
| **Sub-tasks** | 1. Buat `/api/children/route.ts` |
| | 2. Implement POST: simpan data anak baru |
| | 3. Implement GET: ambil daftar anak per posyandu |
| | 4. Validasi input sebelum simpan |
| **Estimasi** | 10 menit |
| **Depends On** | T-02, T-03 |
| **Output** | API input anak berfungsi |
| **Status** | [ ] Belum |

### T-08: Implement API - Input Pengukuran + Z-score (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-08 |
| **Deskripsi** | Buat API endpoint untuk input pengukuran dan hitung Z-score |
| **Sub-tasks** | 1. Buat `/api/measurements/route.ts` |
| | 2. Implement POST: simpan pengukuran baru |
| | 3. Implement fungsi hitung Z-score berdasarkan standar WHO |
| | 4. Implement klasifikasi status gizi (Normal/Risiko/Gizi Buruk) |
| | 5. Return Z-score dan status gizi setelah input |
| **Estimasi** | 15 menit |
| **Depends On** | T-07 |
| **Output** | API pengukuran berfungsi, Z-score terhitung otomatis |
| **Status** | [ ] Belum |

### T-09: Implement API - Dashboard Data (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-09 |
| **Deskripsi** | Buat API endpoint untuk data dashboard |
| **Sub-tasks** | 1. Buat `/api/dashboard/route.ts` |
| | 2. Implement GET: total anak, distribusi status gizi |
| | 3. Implement GET: daftar anak yang perlu ditindaklanjuti |
| | 4. Implement GET: data untuk chart |
| **Estimasi** | 10 menit |
| **Depends On** | T-08 |
| **Output** | API dashboard berfungsi |
| **Status** | [ ] Belum |

### T-10: Implement API - AI Summary (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-10 |
| **Deskripsi** | Buat API endpoint untuk generate AI summary |
| **Sub-tasks** | 1. Buat `/api/summary/route.ts` |
| | 2. Setup OpenAI/Claude API client |
| | 3. Buat prompt untuk generate ringkasan bulanan |
| | 4. Buat prompt untuk generate rekomendasi tindakan |
| | 5. Simpan hasil ke tabel `ai_summaries` |
| **Estimasi** | 15 menit |
| **Depends On** | T-09 |
| **Output** | AI summary bisa di-generate |
| **Status** | [ ] Belum |

### T-11: Implement API - Menu Lokal (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-11 |
| **Deskripsi** | Buat API endpoint untuk generate saran menu lokal |
| **Sub-tasks** | 1. Buat `/api/menu/route.ts` |
| | 2. Buat prompt untuk generate menu berdasarkan status gizi |
| | 3. Pastikan menu menggunakan bahan lokal murah |
| | 4. Sertakan estimasi biaya |
| | 5. Simpan hasil ke tabel `menu_suggestions` |
| **Estimasi** | 10 menit |
| **Depends On** | T-10 |
| **Output** | Saran menu lokal bisa di-generate |
| **Status** | [ ] Belum |

### T-11b: Implement API - Chatbot Asisten Gizi (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-11b |
| **Deskripsi** | Buat API endpoint untuk chatbot asisten gizi |
| **Sub-tasks** | 1. Buat `/api/chat/route.ts` |
| | 2. Setup OpenAI client |
| | 3. Buat prompt template untuk chatbot (konteks: data anak, status gizi) |
| | 4. Implementasi chat dengan konteks data anak |
| | 5. Tambahkan disclaimer di setiap jawaban |
| **Estimasi** | 10 menit |
| **Depends On** | T-09 |
| **Output** | Chatbot bisa menjawab pertanyaan tentang gizi anak |
| **Status** | [ ] Belum |

### T-12: Connect Frontend ke Backend (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-12 |
| **Deskripsi** | Hubungkan halaman UI dengan API endpoints |
| **Sub-tasks** | 1. Connect halaman Input Anak ke API `/api/children` |
| | 2. Connect halaman Input Pengukuran ke API `/api/measurements` |
| | 3. Connect Dashboard ke API `/api/dashboard` |
| | 4. Connect Profil Anak ke API `/api/measurements/:id` |
| | 5. Connect tombol AI Summary ke API `/api/summary` |
| | 6. Connect tombol Menu ke API `/api/menu` |
| | 7. Connect Chatbot Widget ke API `/api/chat` |
| **Estimasi** | 10 menit |
| **Depends On** | T-04, T-07, T-08, T-09, T-10, T-11, T-11b |
| **Output** | Frontend terhubung ke backend, data mengalir |
| **Status** | [ ] Belum |

### T-12c: Implement API - Jaringan Darurat Kesehatan (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-12c |
| **Deskripsi** | Buat API endpoint untuk jaringan darurat kesehatan |
| **Sub-tasks** | 1. Buat `/api/emergency/route.ts` |
| | 2. Buat tabel `health_facilities` di database |
| | 3. Insert data dummy puskesmas/RS dengan koordinat GPS |
| | 4. Implement fungsi hitung jarak berdasarkan koordinat |
| | 5. Implement API ambil fasilitas terdekat berdasarkan lokasi user |
| | 6. Implement API kirim alert ke kontak darurat |
| | 7. Buat UI tombol darurat + daftar fasilitas terdekat |
| **Estimasi** | 15 menit |
| **Depends On** | T-02, T-03 |
| **Output** | Jaringan darurat berfungsi, tombol darurat + lokasi + kontak |
| **Status** | [ ] Belum |

### T-12d: Implement API - Deteksi Dini Berbasis Pola (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-12d |
| **Deskripsi** | Buat API endpoint untuk deteksi dini berbasis pola |
| **Sub-tasks** | 1. Buat `/api/patterns/route.ts` |
| | 2. Buat tabel `early_warnings` di database |
| | 3. Implement fungsi analisis pola berat badan dari data historis |
| | 4. Implement deteksi pola: stagnan, frekuensi makan berkurang, variasi menurun |
| | 5. Implement generate peringatan dini |
| | 6. Implement rekomendasi tindakan preventif |
| | 7. Buat UI peringatan dini di dashboard bidan |
| **Estimasi** | 15 menit |
| **Depends On** | T-08, T-09 |
| **Output** | Deteksi dini berfungsi, peringatan dini muncul jika pola abnormal |
| **Status** | [ ] Belum |

### T-12e: Implement API - Suara Komunitas (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-12e |
| **Deskripsi** | Buat API endpoint untuk cerita sukses komunitas |
| **Sub-tasks** | 1. Buat `/api/stories/route.ts` |
| | 2. Buat tabel `success_stories` di database |
| | 3. Implement CRUD cerita sukses |
| | 4. Implement filter berdasarkan masalah |
| | 5. Implement rating dan komentar |
| | 6. Insert data dummy cerita sukses |
| | 7. Buat UI halaman cerita sukses |
| **Estimasi** | 10 menit |
| **Depends On** | T-02, T-03 |
| **Output** | Cerita sukses komunitas berfungsi |
| **Status** | [ ] Belum |

### T-12: Connect Frontend ke Backend (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-12 |
| **Deskripsi** | Hubungkan halaman UI dengan API endpoints |
| **Sub-tasks** | 1. Connect halaman Input Anak ke API `/api/children` |
| | 2. Connect halaman Input Pengukuran ke API `/api/measurements` |
| | 3. Connect Dashboard ke API `/api/dashboard` |
| | 4. Connect Profil Anak ke API `/api/measurements/:id` |
| | 5. Connect tombol AI Summary ke API `/api/summary` |
| | 6. Connect tombol Menu ke API `/api/menu` |
| | 7. Connect Chatbot Widget ke API `/api/chat` |
| | 8. Connect Tombol Darurat ke API `/api/emergency` |
| | 9. Connect Peringatan Dini ke API `/api/patterns` |
| | 10. Connect Halaman Cerita Sukses ke API `/api/stories` |
| **Estimasi** | 15 menit |
| **Depends On** | T-04, T-07, T-08, T-09, T-10, T-11, T-11b, T-12c, T-12d, T-12e |
| **Output** | Frontend terhubung ke backend, semua fitur berfungsi |
| **Status** | [ ] Belum |

---

## FASE 3: VERIFY, HARDEN, SHIP (120 - 180 menit)

### T-13: Testing End-to-End (15 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-13 |
| **Deskripsi** | Test seluruh alur dari input sampai output |
| **Sub-tasks** | 1. Test input anak baru → pastikan tersimpan |
| | 2. Test input pengukuran → pastikan Z-score terhitung |
| | 3. Test dashboard → pastikan data tampil benar |
| | 4. Test AI summary → pastikan ter-generate |
| | 5. Test menu lokal → pastikan ter-generate |
| | 6. Test grafik pertumbuhan → pastikan tampil benar |
| **Estimasi** | 15 menit |
| **Depends On** | T-12 |
| **Output** | Semua fitur berfungsi tanpa error |
| **Status** | [ ] Belum |

### T-14: Fix Bugs (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-14 |
| **Deskripsi** | Perbaiki bug yang ditemukan saat testing |
| **Sub-tasks** | 1. Catat semua bug yang ditemukan |
| | 2. Prioritaskan bug: Critical > Major > Minor |
| | 3. Fix bug critical dan major |
| | 4. Retest setelah fix |
| **Estimasi** | 10 menit |
| **Depends On** | T-13 |
| **Output** | Tidak ada bug critical/major |
| **Status** | [ ] Belum |

### T-15: Security Hardening (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-15 |
| **Deskripsi** | Pastikan aplikasi aman untuk di-deploy |
| **Sub-tasks** | 1. Pastikan API key di environment variable, bukan di kode |
| | 2. Pastikan RLS aktif di semua tabel |
| | 3. Pastikan input divalidasi |
| | 4. Pastikan HTTPS aktif |
| | 5. Pastikan tidak ada secret di client-side code |
| **Estimasi** | 10 menit |
| **Depends On** | T-14 |
| **Output** | Aplikasi aman untuk deploy |
| **Status** | [ ] Belum |

### T-16: Deploy Final (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-16 |
| **Deskripsi** | Deploy versi final ke Vercel |
| **Sub-tasks** | 1. Push semua perubahan ke GitHub |
| | 2. Vercel otomatis deploy |
| | 3. Test di production URL |
| | 4. Pastikan semua fitur berfungsi di production |
| **Estimasi** | 10 menit |
| **Depends On** | T-15 |
| **Output** | Aplikasi live di production URL |
| **Status** | [ ] Belum |

### T-17: Siapkan Demo Script (10 menit)
| Field | Detail |
|-------|--------|
| **ID** | T-17 |
| **Deskripsi** | Siapkan script dan data untuk demo |
| **Sub-tasks** | 1. Tulis script demo (apa yang dikatakan, apa yang diklik) |
| | 2. Siapkan data demo yang compelling (anak gizi buruk, dll) |
| | 3. Latihan demo sekali |
| | 4. Siapkan backup plan jika ada error saat demo |
| **Estimasi** | 10 menit |
| **Depends On** | T-16 |
| **Output** | Demo script siap, data demo siap |
| **Status** | [ ] Belum |

### T-18: Finalisasi Presentasi (5 menit)
| Field          | Detail                                                  |
| ----------------| ---------------------------------------------------------|
| **ID**         | T-18                                                    |
| **Deskripsi**  | Siapkan bahan presentasi jika diperlukan                |
| **Sub-tasks**  | 1. Buat slide pembuka (masalah, data stunting)          |
|                | 2. Siapkan slide penutup (impact, next steps)           |
|                | 3. Pastikan flow demo: masalah → solusi → demo → impact |
| **Estimasi**   | 5 menit                                                 |
| **Depends On** | T-17                                                    |
| **Output**     | Presentasi siap                                         |
| **Status**     | [ ] Belum                                               |

---

## Ringkasan Timeline

```
JAM 1 (0-60 menit): FRAME & SCAFFOLD
├── T-01: Setup Project (10 menit)
├── T-02: Setup Database (10 menit)
├── T-03: Setup RLS (10 menit)
├── T-04: Generate UI (15 menit)
├── T-05: Deploy Skeleton (10 menit)
└── T-06: Seed Data (5 menit)

JAM 2 (60-120 menit): INJECT
├── T-07: API Input Anak (10 menit)
├── T-08: API Pengukuran + Z-score (15 menit)
├── T-09: API Dashboard (10 menit)
├── T-10: API AI Summary (15 menit)
├── T-11: API Menu Lokal (10 menit)
├── T-11b: API Chatbot Asisten Gizi (10 menit)
├── T-12c: API Jaringan Darurat (15 menit)
├── T-12d: API Deteksi Dini (15 menit)
├── T-12e: API Suara Komunitas (10 menit)
└── T-12: Connect Frontend-Backend (15 menit)

JAM 3 (120-180 menit): VERIFY, HARDEN, SHIP
├── T-13: Testing E2E (15 menit)
├── T-14: Fix Bugs (10 menit)
├── T-15: Security Hardening (10 menit)
├── T-16: Deploy Final (10 menit)
├── T-17: Demo Script (10 menit)
└── T-18: Finalisasi Presentasi (5 menit)
```

---

## Dependencies Map

```
T-01 (Setup Project)
  ├── T-02 (Database Schema)
  │     ├── T-03 (RLS Policies)
  │     ├── T-06 (Seed Data)
  │     ├── T-12c (API Jaringan Darurat)
  │     ├── T-12e (API Suara Komunitas)
  │     └── T-07 (API Input Anak)
  │           └── T-08 (API Pengukuran)
  │                 └── T-09 (API Dashboard)
  │                       ├── T-10 (API AI Summary)
  │                       │     └── T-11 (API Menu)
  │                       ├── T-11b (API Chatbot)
  │                       ├── T-12d (API Deteksi Dini)
  │                       └── T-12 (Connect FE-BE)
  └── T-04 (Generate UI)
        ├── T-05 (Deploy Skeleton)
        └── T-12 (Connect FE-BE)

T-12 (Connect FE-BE)
  └── T-13 (Testing)
        └── T-14 (Fix Bugs)
              └── T-15 (Security)
                    └── T-16 (Deploy Final)
                          └── T-17 (Demo Script)
                                └── T-18 (Presentasi)
```

---

## Checklist Akhir

Sebelum presentasi, pastikan:

- [ ] Semua task selesai
- [ ] Aplikasi deployed dan bisa diakses
- [ ] Input anak berfungsi
- [ ] Z-score terhitung otomatis
- [ ] Status gizi tampil dengan warna (hijau/kuning/merah)
- [ ] Dashboard menampilkan ringkasan
- [ ] Grafik pertumbuhan tampil dengan garis WHO
- [ ] AI summary bisa di-generate
- [ ] Menu lokal bisa di-generate
- [ ] Chatbot bisa menjawab pertanyaan
- [ ] Jaringan Darurat berfungsi (tombol darurat + lokasi + kontak)
- [ ] Deteksi Dini berfungsi (peringatan dini muncul jika pola abnormal)
- [ ] Suara Komunitas berfungsi (cerita sukses bisa dibaca dan ditambah)
- [ ] RLS aktif
- [ ] Tidak ada secret di client-side
- [ ] Demo script siap
- [ ] Data demo sudah disiapkan
- [ ] Backup plan jika ada error saat demo
- [ ] Tidak ada secret di client-side
- [ ] Demo script siap
- [ ] Data demo sudah disiapkan
- [ ] Backup plan jika ada error saat demo
