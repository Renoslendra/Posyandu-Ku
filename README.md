<div align="center">
  <img src="./src/app/icon.svg" width="120" alt="PosyanduKu Icon" />

# 👶🏻 PosyanduKu

**Mengubah catatan buku tulis kader posyandu menjadi sistem deteksi dini risiko gizi anak.**

[![Coba Langsung](https://img.shields.io/badge/Coba_Langsung-posyandu--ku.vercel.app-16a34a?style=for-the-badge)](https://posyandu-ku.vercel.app)
[![Pengujian](https://img.shields.io/badge/pengujian-355_lulus-15803d?style=for-the-badge)](#pengujian)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-RLS_aktif-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)

**10th IndonesiaNEXT 2026 Hackathon** &nbsp;·&nbsp; role **Hacker** (full-stack MVP)

</div>

---

Kader mencatat berat dan tinggi anak seperti biasa, atau **memfoto halaman buku tulis lamanya**. Sistem menghitung Z-score menurut standar WHO, menandai anak yang berisiko, dan menyusun daftar prioritas untuk bidan desa.

> [!NOTE]
> Ini alat bantu kader posyandu, **bukan alat diagnosis**. Seluruh data pada lingkungan demo bersifat **sintetis**, bukan data anak sungguhan.

### Mencoba dalam 30 detik

Buka **[posyandu-ku.vercel.app](https://posyandu-ku.vercel.app)**, lalu tekan salah satu tombol pengisi cepat di halaman masuk. Ketiganya memperlihatkan cakupan data yang berbeda:

| Akun | Melihat apa | Boleh mencatat |
| :-- | :-- | :-: |
| **Kader** — Bu Ani | Anak di satu posyandunya | Ya |
| **Bidan** — Bu Ratna | Seluruh posyandu di wilayahnya | Tidak |
| **Orang tua** — Ibu Wati | Hanya anaknya sendiri | Tidak |

Isolasi ini ditegakkan Row Level Security di basis data, bukan hanya disembunyikan di antarmuka.

---

## Daftar isi

- [Masalah yang dikerjakan](#masalah-yang-dikerjakan)
- [Yang membedakan](#yang-membedakan)
- [Arsitektur](#arsitektur)
- [Standar WHO yang dipakai](#standar-who-yang-dipakai)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Pengujian](#pengujian)
- [Struktur proyek](#struktur-proyek)
- [Keamanan dan privasi](#keamanan-dan-privasi)
- [Cakupan](#cakupan)
- [Dokumen terkait](#dokumen-terkait)

---

## Masalah yang dikerjakan

Kader posyandu mencatat data pertumbuhan anak di buku tulis selama bertahun-tahun. Catatan itu menumpuk tetapi tidak pernah diolah, sehingga anak yang gizinya memburuk baru diketahui setelah jatuh sakit.

Dua celah yang belum dijawab solusi mana pun:

**1. Data lama tidak dapat dimasukkan.**
Aplikasi pemerintah maupun spreadsheet hanya menerima data baru. Catatan bertahun-tahun tetap terkubur di buku tulis.

**2. Anak yang berhenti datang tidak terlihat.**
Pencatatan buku tulis secara struktural tidak dapat menunjukkannya: yang tidak hadir tidak ditulis. Padahal keluarga yang berhenti hadir sering justru yang paling berisiko.

Keduanya menjadi alasan utama produk ini dibangun.

---

## Yang membedakan

| Pembeda | Mengapa penting |
| :-- | :-- |
| **Import foto buku tulis** | Catatan lama masuk sistem, bukan hanya data baru |
| **Deteksi anak berhenti menimbang** | Menangkap risiko yang tidak pernah tercatat |
| **Perhitungan deterministik, LLM hanya untuk bahasa** | Angka dihitung kode yang teruji; model tidak pernah menghitung |
| **Jejak asal data** | Hasil pembacaan AI wajib dikonfirmasi kader sebelum dihitung |
| **Berfungsi tanpa sinyal** | Posyandu di desa sering tanpa koneksi |
| **Penjaga kualitas data** | Menolak nilai mustahil, menandai yang patut diperiksa |

Setiap keputusan di atas dicatat beserta alasannya, termasuk fitur yang **sengaja tidak** dibangun. Catatannya berjumlah 35 butir dan disimpan sebagai dokumen kerja, tidak disertakan di repositori ini.

---

## Arsitektur

```
        Peramban  ·  kader / bidan / orang tua
                          │
                          │  Next.js 15 App Router
                          ▼
        Server Component  +  Route Handler
                 │                    │
                 │                    └──▶  LLM API  (narasi + baca foto)
                 │                          batas waktu 25 s
                 │                          fallback deterministik
                 ▼
        Supabase PostgreSQL
        Row Level Security aktif  ·  isolasi 3 peran
```

Perhitungan Z-score berjalan di server **dan** di perangkat (untuk mode offline), memakai modul yang sama. Nilai dari klien tidak pernah dipercaya sebagai sumber kebenaran.

### Pembagian peran kode dan LLM

| Tugas | Dikerjakan oleh |
| :-- | :-- |
| Hitung Z-score, klasifikasi status | kode deterministik |
| Deteksi berat stagnan, jeda kunjungan | kode deterministik |
| Validasi kewajaran nilai | kode deterministik |
| Penyaringan bahan alergen pada saran menu | kode deterministik |
| Menyusun narasi ringkasan | LLM |
| Membaca angka dari foto | LLM vision, wajib dikonfirmasi kader |

**LLM tidak pernah menghitung angka.** Saat penyedia model gagal atau lambat, ringkasan tetap tersusun dari template dengan angka yang sama.

### Teknologi

| Lapisan | Pilihan |
| :-- | :-- |
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Basis data | Supabase (PostgreSQL + Auth + RLS) |
| LLM | API kompatibel OpenAI (teks + vision) |
| Validasi | Zod, skema dipakai klien dan server |
| Pengujian | Vitest |
| Deploy | Vercel |

---

## Standar WHO yang dipakai

Rujukan: **WHO Child Growth Standards (0–5 tahun)**, dari paket resmi [`WorldHealthOrganization/anthro`](https://github.com/WorldHealthOrganization/anthro). Tabelnya diunduh skrip, tidak ditulis ulang dengan tangan.

| Indikator | Rentang |
| :-- | :-- |
| **BB/U** — berat menurut umur | 0–60 bulan |
| **PB/U** — panjang badan menurut umur | 0–24 bulan, diukur telentang |
| **TB/U** — tinggi badan menurut umur | 24–60 bulan, diukur berdiri |
| **BB/PB** — berat menurut panjang badan | telentang |
| **BB/TB** — berat menurut tinggi badan | berdiri |

Z-score dihitung dengan metode LMS:

```
L ≠ 0  →  Z = ((nilai / M)^L − 1) / (L × S)
L = 0  →  Z = ln(nilai / M) / S
```

Di luar rentang |Z| > 3, WHO tidak lagi memakai rumus di atas secara langsung. Perhitungan beralih ke ekstrapolasi linear berbasis jarak antar-SD, sehingga anak yang sangat kurus tidak memperoleh angka yang meledak tak masuk akal.

**Klasifikasi kedua sisi distribusi:**

| Z-score | Status | Berlaku pada |
| :-- | :-- | :-- |
| `Z < −3` | perlu segera diperiksa | semua indikator |
| `−3 ≤ Z < −2` | perlu perhatian | semua indikator |
| `−2 ≤ Z ≤ +2` | normal | semua indikator |
| `+2 < Z ≤ +3` | gizi lebih | hanya BB/PB dan BB/TB |
| `Z > +3` | obesitas | hanya BB/PB dan BB/TB |

Sisi atas dibatasi pada berat menurut ukuran tubuh dengan sengaja. Berat menurut umur tidak dapat membedakan anak gemuk dari anak yang sekadar tinggi untuk usianya.

Panjang badan dan tinggi badan adalah **dua tabel berbeda** dengan selisih sekitar 0,7 cm pada anak yang sama, sehingga cara pengukuran ditanyakan pada formulir, tidak diasumsikan dari usia.

> [!IMPORTANT]
> **Batasan yang diakui.** Penapisan gizi di lapangan juga mempertimbangkan LILA/MUAC dan edema bilateral, yang tidak dicakup MVP ini. Keluaran sistem bukan penilaian gizi yang lengkap.

---

## Menjalankan secara lokal

### 1 · Pasang dependensi

```bash
npm install
```

### 2 · Siapkan Supabase

Buat proyek di [supabase.com](https://supabase.com), lalu jalankan migrasi lewat SQL Editor **secara berurutan**:

| # | Berkas | Isi |
| :-: | :-- | :-- |
| 0001 | `0001_skema_awal.sql` | Tabel inti |
| 0002 | `0002_rls.sql` | Kebijakan Row Level Security |
| 0003 | `0003_grant.sql` | Hak akses tabel |
| 0004 | `0004_telepon_anak.sql` | Nomor telepon untuk tindak lanjut |
| 0005 | `0005_batas_panggilan.sql` | Pembatasan laju di basis data |
| 0006 | `0006_pengukuran_unik.sql` | Cegah pengukuran ganda per tanggal |
| 0007 | `0007_grant_batas_panggilan.sql` | Hak akses tabel batas laju |
| 0008 | `0008_tanggal_zona_waktu.sql` | Batas tanggal mengikuti WIB |
| 0009 | `0009_status_gizi_lebih.sql` | Enum status gizi lebih dan obesitas |
| 0010 | `0010_alergi_anak.sql` | Kolom alergi untuk penyaringan menu |

Empat di antaranya sering terlewat dan akibatnya tidak kelihatan langsung:

- **`0003`** wajib bila setelan **Automatically expose new tables** dimatikan pada proyek Anda, karena hak akses tabel diberikan eksplisit di sana.
- **`0008`** memperbaiki batas tanggal yang semula dievaluasi memakai tanggal basis data (UTC), sehingga penimbangan yang dicatat sebelum pukul tujuh pagi ditolak dan catatannya dapat hilang dari antrean luring.
- **`0009`** dan **`0010`**: tanpa keduanya, status kelebihan gizi gagal disimpan dan saran menu berhenti menyaring bahan yang perlu dihindari.

`npm run cek` memeriksa penerapan ketiga migrasi terakhir dan menyebutkan berkas yang perlu dijalankan bila ada yang terlewat.

### 3 · Isi environment variable

```bash
cp .env.example .env.local
```

| Variabel | Keterangan |
| :-- | :-- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci publik, tunduk pada RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Hanya untuk seed dan uji RLS. **Melewati RLS** |
| `LLM_API_KEY` | Kunci penyedia model, hanya dipakai di server |
| `DEMO_SAFE_MODE` | `true` membuat fitur LLM memakai fallback tanpa memanggil API |

### 4 · Isi data contoh

```bash
npm run demo:reset
```

Satu perintah untuk dua hal: mengisi data contoh, lalu membuat tiga akun demo. Keduanya juga dapat dijalankan terpisah dengan `npm run seed` dan `npm run akun`.

Yang dibuat adalah satu posyandu dan enam anak, masing-masing mewakili satu keadaan yang perlu dapat ditangani:

| Anak | Keadaan |
| :-- | :-- |
| Aisyah Putri | Sehat, tumbuh konsisten |
| Bagas Pratama | Pendek berat. Ditautkan ke akun orang tua |
| Citra Dewi | Status gizi normal, tetapi berat berhenti naik tiga bulan |
| Dimas Saputra | Berhenti menimbang 150 hari |
| Elsa Maharani | Risiko, diukur telentang karena di bawah dua tahun |
| Fajar Nugroho | Belum pernah menimbang, untuk menguji tampilan kosong |

**Angkanya tidak diacak.** Setiap kunjungan menetapkan Z-score yang diinginkan, lalu rumus LMS WHO dibalik menjadi kilogram dan sentimeter. Dengan begitu status gizi pada demo dapat dipastikan, bukan kebetulan, dan skenario "berat stagnan" pada Citra benar-benar menghasilkan berat yang tidak bergerak selama tiga kunjungan.

<details>
<summary><b>Mengapa perintah ini aman dijalankan berulang</b></summary>

<br>

Anak demo yang ada dihapus lebih dahulu, sehingga tidak menghasilkan nama ganda pada dashboard.

Wilayah dan posyandu justru **dipakai ulang, bukan dihapus**. Penghapusannya akan mengosongkan `profil.posyandu_id` melalui `on delete set null`, dan nilai kosong itu melanggar check constraint `kader_wajib_punya_posyandu`. Akun kader yang sudah ada tetap sah setelahnya.

Cakupan penghapusan dibatasi pada anak di posyandu demo, bukan seluruh tabel, sehingga data di posyandu lain tidak pernah tersentuh.

</details>

Periksa hasilnya:

```bash
npm run cek     # menampilkan "Lingkungan siap" bila semuanya benar
```

### 5 · Jalankan

```bash
npm run dev
```

<details>
<summary><b>Bagaimana akun disediakan, dan mengapa tidak ada pendaftaran mandiri</b></summary>

<br>

Aplikasi ini **tidak memiliki halaman pendaftaran**, dan itu disengaja. Kader dan bidan adalah petugas dengan penugasan resmi; bila pendaftaran mandiri dibuka, siapa pun dapat mendaftar sebagai kader lalu melihat data kesehatan seluruh anak di satu posyandu.

Akun karena itu dibuat pengelola memakai service role key. Skrip `npm run akun` mengerjakan dua hal untuk setiap akun: membuat pengguna di Supabase Auth, lalu menuliskan barisnya di tabel `profil` beserta peran dan penugasannya.

**Keduanya wajib ada.** Membuat pengguna lewat dashboard Supabase Auth saja tidak cukup: belum ada trigger `handle_new_user` pada tabel ini, sehingga pengguna tersebut memperoleh akun tanpa baris `profil`. Ia dapat masuk, tetapi setiap kebijakan RLS akan menolaknya dan halaman tampak kosong tanpa penjelasan apa pun. Bila akun perlu dibuat manual, tambahkan barisnya di `profil` dengan `posyandu_id` untuk kader atau `wilayah_id` untuk bidan, memakai nilai yang dicetak skrip seed.

Peran menentukan cakupan data, dan penugasannya diwajibkan di tingkat basis data:

| Peran | Penugasan wajib | Cakupan |
| :-- | :-- | :-- |
| `kader` | `posyandu_id` | Anak di posyandunya. Satu-satunya peran yang dapat mencatat |
| `bidan` | `wilayah_id` | Anak di seluruh posyandu wilayahnya, hanya membaca |
| `orang_tua` | tidak ada | Hanya anak yang tertaut melalui `anak.orang_tua_id` |

</details>

---

## Pengujian

```bash
npm test
```

**355 pengujian pada 20 berkas**, seluruhnya lulus.

<details open>
<summary><b>Cakupan tiap berkas uji</b></summary>

<br>

| Berkas | Cakupan |
| :-- | :-- |
| `zscore.test.ts` | Rumus LMS, interpolasi tabel, klasifikasi ambang |
| `usia.test.ts` | Perhitungan usia, termasuk lahir akhir bulan pada bulan pendek |
| `koreksi-ekor.test.ts` | Ekstrapolasi di luar ±3 SD, kesinambungan tepat di Z = 3 |
| `gizi-lebih.test.ts` | Ambang sisi atas, pembatasan pada indikator yang sah |
| `tabel.test.ts` | Kesesuaian tabel terhadap angka terbitan WHO, pemilihan indikator |
| `kurva.test.ts` | Titik kurva pertumbuhan yang digambar pada grafik |
| `penjaga-data.test.ts` | Penolakan nilai mustahil, penandaan nilai yang patut diperiksa |
| `pola.test.ts` | Deteksi berat stagnan, anak berhenti menimbang |
| `perbaikan.test.ts` | Cacat yang pernah ditemukan, dikunci agar tidak kembali |
| `dashboard.test.ts` | Agregasi, urutan prioritas, penyaringan status, pencarian nama |
| `ringkasan.test.ts` | Jalur fallback saat LLM gagal |
| `menu.test.ts` | Kelayakan usia, penyesuaian menurut status, biaya tidak berlipat |
| `alergi.test.ts` | Penggantian bahan alergen, termasuk pada nama hidangan dan catatan |
| `laporan.test.ts` | Pengutipan CSV, penafian di dalam berkas, penamaan berkas |
| `batas-laju.test.ts` | Penolakan setelah ambang, perilaku gagal-terbuka |
| `cocok-nama.test.ts` | Sebutan di depan nama, nama identik ganda, penolakan menebak |
| `validasi.test.ts` | Skema masukan, termasuk tanggal yang tidak ada di kalender |
| `proses-pengukuran.test.ts` | Alur lengkap dari masukan sampai status gizi |
| `peran.test.ts` | Pemetaan peran ke halaman dan hak aksesnya |
| `ambil-semua.test.ts` | Pengambilan bertahap, penandaan hasil yang terpotong |

</details>

### Pengujian terhadap basis data sungguhan

Lima skrip menguji terhadap Supabase sungguhan, bukan mock. Dijalankan sekaligus dengan `npm run uji:db`, atau satu per satu:

```bash
node scripts/uji-rls.mjs          # isolasi data antar peran
node scripts/uji-alur.mjs         # apa yang terlihat tiap peran setelah masuk
node scripts/uji-fitur-baru.mjs   # pendaftaran dan perbaikan data anak
node scripts/uji-import.mjs       # penyimpanan hasil import foto dan jejak asal data
node scripts/uji-batas-laju.mjs   # pembatasan laju bertahan dan tidak dapat dikosongkan
```

### Pengujian sesi terhadap server berjalan

Satu skrip lagi memakai permintaan HTTP dan cookie sungguhan, sebab yang diuji justru penanganan cookie sesi:

```bash
npm run start      # di jendela terminal lain
npm run uji:sesi
```

Ke-32 pemeriksaannya menegakkan hal yang tidak terlihat pada pengujian unit: pengguna yang sudah masuk tidak lagi ditawari tombol masuk, peran yang membuka halaman bukan haknya dialihkan ke halamannya sendiri, tombol keluar benar-benar mengakhiri sesi, dan `/api/keluar` menolak permintaan GET.

### Cacat nyata yang ditemukan pengujian

Pengujian di sini bukan formalitas. Yang berikut ditemukan olehnya, bukan oleh dugaan:

| Temuan | Akibat bila lolos |
| :-- | :-- |
| Panjang badan tercampur dengan tinggi badan | Selisih 0,7 cm menggeser status gizi pada kasus batas |
| Tanggal `2024-02-31` lolos validasi karena JavaScript menggulirkannya jadi 2 Maret | Usia salah, seluruh Z-score ikut salah |
| Pengukuran ganda pada tanggal sama lolos saat `klien_ref` bernilai `null` | Satu penimbangan tercatat dua kali |
| Stunting tidak dihitung untuk anak ≥ 24 bulan yang diukur telentang | Anak pendek dilaporkan normal |
| Angka hasil import foto tertulis 10× lebih kecil | Berat 12,5 kg tersimpan sebagai 125 kg |
| Pencocokan nama membandingkan potongan huruf | Berat seorang anak masuk ke rekam anak lain |
| Usia salah untuk anak yang lahir di akhir bulan | Z-score bergeser sampai 2,2 SD |
| Anak pada +4 SD berat menurut tinggi dilaporkan normal | Kelebihan gizi tidak pernah terdeteksi |

Pola yang sama muncul pada hampir semuanya: sistem melaporkan keadaan **lebih baik** daripada kenyataannya. Untuk alat penapisan, itu arah kesalahan yang paling berbahaya. Tiap temuan dikunci dengan pengujian agar tidak kembali.

---

## Struktur proyek

```
src/
├── app/
│   ├── page.tsx                     beranda
│   ├── layout.tsx                   kerangka halaman, navbar, footer
│   ├── masuk/                       halaman masuk + formulir
│   ├── kader/                       catat penimbangan, import foto, daftar anak
│   ├── bidan/                       dashboard pemantauan wilayah
│   ├── orangtua/                    tampilan orang tua
│   ├── anak/[id]/                   riwayat, grafik, saran menu
│   └── api/
│       ├── pengukuran/              simpan pengukuran + hitung Z-score
│       ├── import-foto/             baca halaman buku tulis
│       ├── import-simpan/           simpan hasil yang sudah dikonfirmasi
│       ├── anak/                    daftar dan perbaikan data anak
│       ├── ringkasan/               narasi bulanan
│       ├── menu/                    saran menu
│       ├── laporan/                 ekspor CSV
│       └── keluar/                  akhiri sesi
├── components/                      17 komponen, ikon SVG inline
├── lib/
│   ├── gizi/
│   │   ├── ambang.ts                seluruh ambang batas, satu sumber
│   │   ├── zscore.ts                rumus LMS, interpolasi, usia, klasifikasi
│   │   ├── tabel.ts                 tabel WHO dan penilaian pengukuran
│   │   ├── tabel-who.json           parameter LMS resmi WHO
│   │   ├── kurva.ts                 titik kurva untuk grafik
│   │   ├── penjaga-data.ts          validasi kewajaran nilai
│   │   └── pola.ts                  deteksi stagnan dan berhenti menimbang
│   ├── supabase.ts                  klien server (termasuk service role)
│   ├── supabase-browser.ts          klien peramban, anon key saja
│   ├── sesi.ts                      pembacaan sesi dan peran
│   ├── llm.ts                       pemanggilan LLM dengan batas waktu
│   ├── ringkasan.ts                 narasi bulanan dengan fallback
│   ├── menu.ts                      saran menu + penyaringan alergen
│   ├── dashboard.ts                 agregasi dan urutan prioritas
│   ├── laporan.ts                   penyusunan CSV
│   ├── cocok-nama.ts                pencocokan nama hasil pembacaan foto
│   ├── antrean-offline.ts           antrean penimbangan tanpa sinyal
│   ├── ambil-semua.ts               pengambilan bertahap tanpa batas 1000 baris
│   ├── batas-laju.ts                pembatasan laju panggilan LLM
│   ├── tanggal.ts                   tanggal lokal WIB
│   └── validasi.ts                  skema Zod
└── middleware.ts                    penjagaan rute menurut peran

supabase/migrations/                 0001–0010, skema dan RLS
scripts/
├── seed.mjs                         data contoh sintetis
├── buat-akun-demo.mjs               tiga akun demo
├── cek-kesiapan.mjs                 periksa lingkungan dan migrasi
├── unduh-tabel-who.mjs              unduh tabel referensi WHO
├── diagnosa-supabase.mjs            penelusuran masalah sambungan
└── uji-*.mjs                        enam skrip uji integrasi
```

---

## Keamanan dan privasi

| Aspek | Penerapan |
| :-- | :-- |
| **Isolasi data** | RLS aktif di semua tabel; kader terbatas pada posyandunya, bidan pada wilayahnya, orang tua pada anaknya |
| **Kunci API** | LLM dan service role hanya dipakai di server, tidak pernah masuk bundel klien |
| **Validasi** | Skema Zod dijalankan di server, bukan hanya di klien |
| **Foto buku tulis** | Diproses lalu dibuang, tidak disimpan permanen |
| **Minimalisasi data** | Tidak menyimpan NIK maupun foto anak |
| **Pembatasan laju** | Ditegakkan di basis data, tidak dapat dikosongkan dengan memuat ulang |
| **Data demo** | Seluruhnya sintetis, dinyatakan pada antarmuka |

Kredensial dikelola Supabase Auth; aplikasi tidak menyimpan maupun menangani kata sandi secara langsung.

---

## Cakupan

**Tujuh fitur inti**
Input pengukuran dengan penjaga kualitas data · mesin Z-score WHO · dashboard bidan · autentikasi dan RLS tiga peran · import foto buku tulis dengan jejak asal data · deteksi anak berhenti menimbang · kemampuan offline.

**Pendukung**
Ringkasan bulanan dengan fallback · saran menu berbahan pasar desa dengan penyaringan alergen · pendaftaran dan perbaikan data anak · penyaringan status dan pencarian nama · laporan bulanan CSV · tindak lanjut lewat nomor telepon.

**Sengaja ditunda**
Chatbot · tombol darurat GPS · cerita komunitas · prediksi ML · integrasi WhatsApp/SMS · ekspor e-PPGBM. Masing-masing ditunda dengan alasan yang dicatat, bukan karena kehabisan waktu.

Cakupan dipersempit dari 14 fitur berlabel Must Have menjadi tujuh fitur inti secara sadar: fitur yang berfungsi setengah menurunkan kegunaan produk lebih besar daripada fitur yang ditunda dengan alasan tertulis.

---

## Dokumen terkait

| Berkas | Isi |
| :-- | :-- |
| [`PRD.md`](./PRD.md) | Kebutuhan produk, kriteria penerimaan, rencana pengujian |

---

<div align="center">

Dibangun untuk **10th IndonesiaNEXT 2026 Hackathon by Telkomsel**

**[posyandu-ku.vercel.app](https://posyandu-ku.vercel.app)**

</div>
