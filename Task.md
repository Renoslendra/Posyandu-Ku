# Papan Tugas — PosyanduKu

**Event**: 10th IndonesiaNEXT 2026 Hackathon by Telkomsel
**Role**: Hacker (full-stack MVP)
**Format**: Hackathon individu, 24 jam
**Deadline pengumpulan**: 26 Juli 2026

---

## Catatan Revisi

Versi sebelumnya dokumen ini menyusun 18 tugas untuk 14 fitur dalam asumsi waktu 3 jam, dan memuat dua blok T-12 yang saling bertentangan.

Dokumen ini disusun ulang sesuai keadaan sebenarnya:

| Aspek | Versi lama | Versi ini |
|-------|-----------|-----------|
| Durasi | 3 jam | 24 jam kalender, sekitar 10 jam produktif |
| Jumlah fitur | 14 "Must Have" | 7 fitur MVP |
| Antarmuka | digenerate v0/Lovable | ditulis langsung (lihat DECISIONS.md KP-13) |
| Analisis pola | oleh LLM | oleh kode deterministik (KP-05) |
| Blok duplikat | T-12 muncul dua kali | dihapus |

---

## Ringkasan Kemajuan

| Kelompok | Status |
|----------|--------|
| Dokumen (PRD, README, DECISIONS) | selesai |
| Fondasi (scaffold, skema, RLS) | selesai |
| Mesin perhitungan + pengujian | selesai, 147 pengujian lolos |
| Antarmuka kader dan bidan | selesai |
| Fitur pembeda (import foto, deteksi absen, offline) | selesai |
| Penerapan (Supabase, GitHub, Vercel) | menunggu kredensial |
| Video demo | belum |

---

## FASE 1 — Dokumen dan Fondasi

### T-01 Menyesuaikan PRD dengan panduan resmi — SELESAI

Memperbaiki bobot kriteria penilaian yang salah kutip, tanggal dan durasi, angka prevalensi yang tidak konsisten, serta rujukan standar WHO yang salah rentang usia. Menambahkan ringkasan solusi, penjelasan relevansi tema, pemetaan deliverable role, kriteria penerimaan, rencana pengujian, ambang batas algoritma, kebijakan privasi, risiko, dan glosarium.

Keluaran: `PRD.md` versi 3.0.

### T-02 Menyiapkan kerangka proyek — SELESAI

Next.js 15 App Router, TypeScript, Tailwind, Vitest. Dikerjakan manual karena `create-next-app` bentrok dengan npm 11 pada mesin ini.

Keluaran: konfigurasi proyek, `.env.example`, `.gitignore` (termasuk pengecualian materi hackathon yang bertanda confidential).

### T-03 Skema basis data — SELESAI

Enam tabel: `wilayah`, `posyandu`, `profil`, `anak`, `pengukuran`, `ringkasan_bulanan`. Termasuk kolom `sumber` dan `dikonfirmasi` untuk jejak asal data, `penanda` untuk temuan kualitas data, dan `klien_ref` sebagai kunci idempoten sinkronisasi offline.

Keluaran: `supabase/migrations/0001_skema_awal.sql`.

### T-04 Row Level Security — SELESAI

RLS aktif di seluruh tabel. Tiga peran dengan cakupan berbeda: kader terbatas pada posyandunya, bidan pada wilayahnya, orang tua pada anaknya. Fungsi bantu memakai `security definer` dengan `search_path` terkunci.

Keluaran: `supabase/migrations/0002_rls.sql`.

---

## FASE 2 — Mesin Perhitungan

### T-05 Mesin Z-score metode LMS — SELESAI

Rumus LMS WHO, interpolasi tabel, klasifikasi ambang, perhitungan usia bulan penuh. Dipisahkan dari data referensi agar dapat diuji tanpa bergantung pada tabel.

Keluaran: `src/lib/gizi/zscore.ts`, 27 pengujian.

### T-06 Tabel referensi WHO — SELESAI

Diunduh dari paket resmi WHO (`WorldHealthOrganization/anthro`), dipadatkan dari 433 KB menjadi 120 KB. Lima indikator: BB/U, PB/U, TB/U, BB/PB, BB/TB.

Pengujian menemukan bahwa berkas `lenanthro.txt` memuat dua tabel dalam satu berkas (panjang badan dan tinggi badan, dibedakan kolom `loh`). Konversi awal mencampurnya sehingga median pada usia 24 bulan salah. Diperbaiki dengan memisahkan keduanya.

Keluaran: `scripts/unduh-tabel-who.mjs`, `src/lib/gizi/tabel.ts`, 19 pengujian termasuk verifikasi terhadap angka terbitan WHO.

### T-07 Penjaga kualitas data — SELESAI

Dua tingkat temuan: `tolak` untuk nilai mustahil, `tandai` untuk nilai yang patut diperiksa. Ambang lonjakan berat diskalakan terhadap jarak kunjungan.

Keluaran: `src/lib/gizi/penjaga-data.ts`, 18 pengujian.

### T-08 Deteksi pola pertumbuhan — SELESAI

Berat stagnan dihitung dari kunjungan terbaru ke belakang. Anak berhenti menimbang dideteksi dari jeda lebih dari 90 hari. Nilai yang belum dikonfirmasi tidak ikut dihitung.

Keluaran: `src/lib/gizi/pola.ts`, 19 pengujian.

### T-09 Validasi masukan — SELESAI

Skema Zod dipakai bersama klien dan server. Pengujian menemukan tanggal seperti `2024-02-31` lolos karena JavaScript menggulirkannya menjadi 2 Maret; ditambahkan pemeriksaan keberadaan tanggal di kalender.

Keluaran: `src/lib/validasi.ts`, 18 pengujian.

### T-10 Pemroses pengukuran — SELESAI

Menyatukan alur: penjaga kualitas data, perhitungan Z-score, klasifikasi status. Perhitungan tidak dijalankan pada nilai yang mustahil.

Keluaran: `src/lib/proses-pengukuran.ts`, 14 pengujian.

---

## FASE 3 — Antarmuka dan API

### T-11 Logo dan identitas — SELESAI

SVG inline agar warnanya mengikuti konteks dan tidak menambah permintaan jaringan.

Keluaran: `src/components/Logo.tsx`, `src/app/icon.svg`, beranda.

### T-12 Autentikasi — SELESAI

Supabase Auth dengan surel dan kata sandi. Middleware menyegarkan sesi karena server component tidak dapat menulis cookie. Klien peramban dipisahkan dari klien server agar kunci istimewa tidak mungkin terbawa ke bundel klien.

Keluaran: `src/app/masuk/page.tsx`, `src/middleware.ts`, `src/lib/supabase-browser.ts`.

### T-13 Pencatatan pengukuran — SELESAI

Formulir dengan empat masukan, font dan tombol besar. Hasil muncul di layar yang sama. Nilai bertanda memicu permintaan konfirmasi, bukan penolakan.

Keluaran: `src/app/api/pengukuran/route.ts`, `src/components/FormPengukuran.tsx`, `src/app/kader/page.tsx`.

### T-14 Dashboard bidan — SELESAI

Tersusun menurut urutan keputusan bidan: daftar prioritas lebih dahulu, gambaran keseluruhan kemudian. Agregasi dilakukan di server agar halaman tetap ringan.

Keluaran: `src/lib/dashboard.ts` (17 pengujian), `src/app/bidan/page.tsx`.

---

## FASE 4 — Fitur Pembeda

### T-15 Import foto buku tulis — SELESAI

LLM vision membaca satu halaman, hasilnya dikembalikan sebagai usulan untuk dikoreksi kader. Endpoint tidak menulis apa pun ke basis data. Baris bercatatan ditandai menonjol. Gambar tidak disimpan permanen.

Keluaran: `src/app/api/import-foto/route.ts`, `src/components/ImportFoto.tsx`.

### T-16 Ringkasan bulanan dengan fallback — SELESAI

Angka dihitung modul dashboard; LLM hanya menyusun kalimat. Bila LLM gagal, template mengambil alih dengan angka yang sama, dan hal itu dinyatakan terbuka kepada bidan. Timeout 20 detik, pembatasan laju per pengguna.

Keluaran: `src/lib/llm.ts`, `src/lib/ringkasan.ts` (10 pengujian), `src/app/api/ringkasan/route.ts`.

### T-17 Berfungsi tanpa koneksi — SELESAI

Antrean di localStorage dengan kunci idempoten. Z-score dihitung di perangkat memakai modul yang sama dengan server. Sinkronisasi berjalan otomatis saat koneksi kembali.

Keluaran: `src/lib/antrean-offline.ts`, `src/components/StatusKoneksi.tsx`.

---

## FASE 5 — Verifikasi dan Penerapan

### T-18 Data contoh sintetis — SELESAI

Enam anak dengan skenario berbeda: sehat, pendek berat, berat stagnan, berhenti menimbang, risiko, belum pernah menimbang. Nilai dibangkitkan dari Z-score target agar status pada demo dapat dipastikan.

Keluaran: `scripts/seed.mjs`.

### T-19 Pengujian RLS — SELESAI (skrip siap)

Tiga belas skenario akses lintas peran, termasuk percobaan menembus isolasi. Skrip menyiapkan datanya sendiri dan membersihkannya kembali.

Keluaran: `scripts/uji-rls.mjs`. Menunggu kredensial Supabase untuk dijalankan.

### T-20 Dokumentasi — SELESAI

Keluaran: `README.md`, `DECISIONS.md` (18 catatan keputusan).

### T-21 Menjalankan migrasi dan seed — MENUNGGU

Membutuhkan proyek Supabase. Langkah: jalankan kedua berkas migrasi, isi `.env.local`, jalankan `node scripts/seed.mjs`, lalu `node scripts/uji-rls.mjs`.

### T-22 Push ke GitHub — MENUNGGU

23 commit siap. Membutuhkan URL repositori.

### T-23 Deploy ke Vercel — MENUNGGU

Membutuhkan repositori GitHub dan environment variable.

### T-24 Video demo tiga menit — BELUM

Cadangan bila lingkungan produksi bermasalah saat karya diperiksa.

---

## Alur Demo yang Direncanakan

| Bagian | Yang ditunjukkan | Kriteria yang dijawab |
|--------|------------------|----------------------|
| Masalah | Buku tulis menumpuk, anak yang berhenti hadir tidak terlihat | Pemahaman masalah |
| Import foto | Halaman buku tulis dibaca, kader mengoreksi, data belum dihitung sebelum dikonfirmasi | Orisinalitas |
| Catat pengukuran | Status gizi muncul seketika; masukkan berat 90 kg, sistem menolak | Kualitas output |
| Dashboard bidan | Daftar prioritas, anak yang berhenti menimbang | Relevansi masalah |
| Mode pesawat | Input tetap tersimpan, tersinkron saat koneksi kembali | Kompetensi teknis |
| Terminal | `npm test` lolos 147 pengujian, `node scripts/uji-rls.mjs` membuktikan isolasi | Kompetensi teknis |
| Ringkasan | Nonaktifkan kunci LLM, fallback tetap tampil | Kompetensi teknis |

---

## Daftar Periksa Sebelum Mengumpulkan

- [x] 7 fitur MVP berfungsi
- [x] `npm run build` berhasil
- [x] `npm test` lolos seluruhnya (147)
- [x] Riwayat commit bertahap per fitur (23 commit)
- [x] Tidak ada kredensial di dalam kode
- [x] PRD, README, DECISIONS tersedia
- [x] Materi hackathon tidak ikut ter-commit
- [ ] Migrasi dijalankan di Supabase
- [ ] `node scripts/uji-rls.mjs` lolos
- [ ] Terunggah ke GitHub
- [ ] Terdeploy dan dapat diakses publik
- [ ] Video demo direkam
- [ ] Mode demo aman diuji
