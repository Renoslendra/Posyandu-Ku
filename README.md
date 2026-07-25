# PosyanduKu

Mengubah catatan buku tulis kader posyandu menjadi sistem deteksi dini risiko gizi anak.

Kader mencatat berat dan tinggi anak seperti biasa, atau memfoto halaman buku tulis lamanya. Sistem menghitung Z-score menurut standar WHO, menandai anak yang berisiko, dan menyusun daftar prioritas untuk bidan desa.

**10th IndonesiaNEXT 2026 Hackathon** — role Hacker (full-stack MVP).

> Ini adalah alat bantu kader posyandu, bukan alat diagnosis. Seluruh data pada lingkungan demo bersifat **sintetis**, bukan data anak sungguhan.

---

## Masalah yang dikerjakan

Kader posyandu mencatat data pertumbuhan anak di buku tulis selama bertahun-tahun. Catatan itu menumpuk tetapi tidak pernah diolah, sehingga anak yang gizinya memburuk baru diketahui setelah jatuh sakit.

Dua celah yang belum dijawab solusi mana pun:

1. **Data lama tidak dapat dimasukkan.** Aplikasi pemerintah maupun spreadsheet hanya menerima data baru. Catatan bertahun-tahun tetap terkubur.
2. **Anak yang berhenti datang tidak terlihat.** Pencatatan buku tulis secara struktural tidak dapat menunjukkannya: yang tidak hadir tidak ditulis. Padahal keluarga yang berhenti hadir sering justru yang paling berisiko.

Keduanya menjadi alasan utama produk ini dibangun.

---

## Yang membedakan

| Pembeda | Mengapa penting |
|---------|-----------------|
| **Import foto buku tulis** | Catatan lama masuk sistem, bukan hanya data baru |
| **Deteksi anak berhenti menimbang** | Menangkap risiko yang tidak pernah tercatat |
| **Perhitungan deterministik, LLM hanya untuk bahasa** | Angka dihitung kode yang teruji; model tidak pernah menghitung |
| **Jejak asal data** | Hasil pembacaan AI wajib dikonfirmasi kader sebelum dihitung |
| **Berfungsi tanpa sinyal** | Posyandu di desa sering tanpa koneksi |
| **Penjaga kualitas data** | Menolak nilai mustahil, menandai yang patut diperiksa |

Alasan setiap keputusan, termasuk fitur yang **sengaja tidak** dibangun, ada di [`DECISIONS.md`](./DECISIONS.md).

---

## Arsitektur

```
Peramban (kader / bidan / orang tua)
    |
    |  Next.js App Router
    v
Server Component + Route Handler
    |                    |
    |                    +--> LLM API (narasi + baca foto)
    |                         timeout 20s, fallback deterministik
    v
Supabase PostgreSQL
    Row Level Security aktif, isolasi 3 peran
```

Perhitungan Z-score berjalan di server dan di perangkat (untuk mode offline), memakai modul yang sama. Nilai dari klien tidak pernah dipercaya sebagai sumber kebenaran.

### Pembagian peran kode dan LLM

| Tugas | Dikerjakan |
|-------|------------|
| Hitung Z-score, klasifikasi status | kode deterministik |
| Deteksi berat stagnan, jeda kunjungan | kode deterministik |
| Validasi kewajaran nilai | kode deterministik |
| Menyusun narasi ringkasan | LLM |
| Membaca angka dari foto | LLM vision, wajib dikonfirmasi kader |

LLM tidak pernah menghitung angka. Saat penyedia model gagal, ringkasan tetap tersusun dari template dengan angka yang sama.

---

## Teknologi

| Lapisan | Pilihan |
|---------|---------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Basis data | Supabase (PostgreSQL + Auth + RLS) |
| LLM | API kompatibel OpenAI (teks + vision) |
| Validasi | Zod, skema dipakai klien dan server |
| Pengujian | Vitest |
| Deploy | Vercel |

---

## Menjalankan secara lokal

### 1. Pasang dependensi

```bash
npm install
```

### 2. Siapkan Supabase

Buat proyek di [supabase.com](https://supabase.com), lalu jalankan migrasi lewat SQL Editor secara berurutan:

```
supabase/migrations/0001_skema_awal.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_grant.sql
supabase/migrations/0004_telepon_anak.sql
supabase/migrations/0005_batas_panggilan.sql
supabase/migrations/0006_pengukuran_unik.sql
```

Urutannya penting. Migrasi `0003` wajib dijalankan bila setelan **Automatically expose new tables** dimatikan pada proyek Anda, karena hak akses tabel diberikan secara eksplisit di sana.

### 3. Isi environment variable

Salin `.env.example` menjadi `.env.local`, lalu isi dari Supabase (Settings > API) dan penyedia LLM Anda.

```bash
cp .env.example .env.local
```

| Variabel | Keterangan |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci publik, tunduk pada RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Hanya untuk seed dan uji RLS. Melewati RLS |
| `LLM_API_KEY` | Kunci penyedia model, hanya dipakai di server |
| `DEMO_SAFE_MODE` | `true` membuat fitur LLM memakai fallback tanpa memanggil API |

### 4. Isi data contoh

```bash
npm run demo:reset
```

Satu perintah untuk dua hal: mengisi data contoh, lalu membuat tiga akun demo.
Keduanya juga dapat dijalankan terpisah dengan `npm run seed` dan `npm run akun`.

Yang dibuat adalah satu posyandu dan enam anak dengan keadaan berbeda:

| Anak | Keadaan |
| --- | --- |
| Aisyah Putri | Sehat, tumbuh konsisten |
| Bagas Pratama | Pendek berat. Ditautkan ke akun orang tua |
| Citra Dewi | Status gizi normal, tetapi berat berhenti naik tiga bulan |
| Dimas Saputra | Berhenti menimbang 150 hari |
| Elsa Maharani | Risiko, diukur telentang karena di bawah dua tahun |
| Fajar Nugroho | Belum pernah menimbang, untuk menguji tampilan kosong |

Seluruhnya data sintetis, bukan data anak sungguhan.

Angkanya tidak diacak. Setiap kunjungan menetapkan Z-score yang diinginkan, lalu
rumus LMS WHO dibalik menjadi kilogram dan sentimeter. Dengan begitu status gizi
pada demo dapat dipastikan, bukan kebetulan, dan skenario "berat stagnan" pada
Citra benar-benar menghasilkan berat yang tidak bergerak selama tiga kunjungan.

Perintah ini aman dijalankan berulang. Anak demo yang ada dihapus lebih dahulu,
sehingga tidak menghasilkan nama ganda. Wilayah dan posyandu justru dipakai ulang,
bukan dihapus, karena penghapusannya akan mengosongkan `profil.posyandu_id` melalui
`on delete set null` dan nilai kosong itu melanggar check constraint
`kader_wajib_punya_posyandu`. Akun kader yang sudah ada tetap sah setelahnya.

Cakupan penghapusan dibatasi pada anak di posyandu demo, bukan seluruh tabel,
sehingga data di posyandu lain tidak pernah tersentuh.

Periksa hasilnya:

```bash
npm run cek
```

### Bagaimana akun disediakan

Aplikasi ini **tidak memiliki halaman pendaftaran**, dan itu disengaja. Kader dan bidan
adalah petugas dengan penugasan resmi; bila pendaftaran mandiri dibuka, siapa pun dapat
mendaftar sebagai kader lalu melihat data kesehatan seluruh anak di satu posyandu.
Alasan lengkapnya ada pada KP-29 di [DECISIONS.md](DECISIONS.md).

Akun karena itu dibuat pengelola, memakai service role key. Skrip di atas mengerjakan dua
hal sekaligus untuk setiap akun: membuat pengguna di Supabase Auth, lalu menuliskan
barisnya di tabel `profil` beserta peran dan penugasannya.

Keduanya wajib ada. Membuat pengguna lewat dashboard Supabase Auth saja **tidak cukup**:
belum ada trigger `handle_new_user` pada tabel ini, sehingga pengguna tersebut memperoleh
akun tanpa baris `profil`. Ia dapat masuk, tetapi setiap kebijakan RLS akan menolaknya dan
halaman tampak kosong tanpa penjelasan. Bila akun perlu dibuat manual, tambahkan barisnya
di `profil` dengan `posyandu_id` untuk kader atau `wilayah_id` untuk bidan, memakai nilai
yang dicetak skrip seed.

Peran menentukan cakupan data, dan penugasannya diwajibkan di tingkat basis data:

| Peran | Penugasan wajib | Cakupan |
| --- | --- | --- |
| `kader` | `posyandu_id` | Anak di posyandunya. Satu-satunya peran yang dapat mencatat |
| `bidan` | `wilayah_id` | Anak di seluruh posyandu wilayahnya, hanya membaca |
| `orang_tua` | tidak ada | Hanya anak yang tertaut melalui `anak.orang_tua_id` |

### 5. Jalankan

```bash
npm run dev
```

---

## Pengujian

```bash
npm test
```

241 pengujian, mencakup:

| Berkas | Cakupan |
|--------|---------|
| `zscore.test.ts` | Rumus LMS, interpolasi tabel, klasifikasi ambang, perhitungan usia |
| `tabel.test.ts` | Kesesuaian tabel terhadap angka terbitan WHO, pemilihan indikator |
| `penjaga-data.test.ts` | Penolakan nilai mustahil, penandaan nilai yang patut diperiksa |
| `pola.test.ts` | Deteksi berat stagnan, anak berhenti menimbang |
| `dashboard.test.ts` | Agregasi, urutan prioritas, penyaringan status, pencarian nama |
| `ringkasan.test.ts` | Jalur fallback saat LLM gagal |
| `menu.test.ts` | Kelayakan usia, penyesuaian menurut status, biaya tidak berlipat |
| `laporan.test.ts` | Pengutipan CSV, penafian di dalam berkas, penamaan berkas |
| `batas-laju.test.ts` | Penolakan setelah ambang, perilaku gagal-terbuka |
| `cocok-nama.test.ts` | Sebutan di depan nama, nama identik ganda, penolakan menebak |
| `validasi.test.ts` | Skema masukan, termasuk tanggal yang tidak ada di kalender |
| `proses-pengukuran.test.ts` | Alur lengkap dari masukan sampai status gizi |

Selain itu, lima skrip menguji terhadap basis data sungguhan, bukan mock. Kelimanya
dijalankan sekaligus dengan `npm run uji:db`, atau satu per satu:

```bash
node scripts/uji-rls.mjs          # isolasi data antar peran
node scripts/uji-alur.mjs         # apa yang terlihat tiap peran setelah masuk
node scripts/uji-fitur-baru.mjs   # pendaftaran dan perbaikan data anak
node scripts/uji-batas-laju.mjs   # pembatasan laju bertahan dan tidak dapat dikosongkan
node scripts/uji-import.mjs       # penyimpanan hasil import foto dan jejak asal data
```

Uji terhadap basis data ini menemukan bug nyata: pengukuran ganda pada tanggal yang sama lolos karena batasan unik lama tidak berlaku ketika `klien_ref` bernilai null (KP-27).

Pengujian pada `tabel.test.ts` membandingkan nilai tabel terhadap tabel terbitan WHO: median berat lahir 3,3464 kg (laki-laki), median tinggi 60 bulan 110,0 cm, dan ambang -2 SD pada beberapa titik usia.

Pengujian ini menemukan dua kesalahan nyata selama pembangunan: pencampuran tabel panjang badan dengan tinggi badan (KP-07), dan tanggal seperti `2024-02-31` yang lolos validasi karena JavaScript menggulirkannya menjadi 2 Maret.

---

## Standar WHO yang dipakai

Rujukan: **WHO Child Growth Standards (0-5 tahun)**, dari paket resmi [`WorldHealthOrganization/anthro`](https://github.com/WorldHealthOrganization/anthro).

| Indikator | Rentang |
|-----------|---------|
| BB/U — berat menurut umur | 0-60 bulan |
| PB/U — panjang badan menurut umur | 0-24 bulan, diukur telentang |
| TB/U — tinggi badan menurut umur | 24-60 bulan, diukur berdiri |
| BB/PB — berat menurut panjang badan | telentang |
| BB/TB — berat menurut tinggi badan | berdiri |

Z-score dihitung dengan metode LMS:

```
L != 0 -> Z = ((nilai / M)^L - 1) / (L * S)
L  = 0 -> Z = ln(nilai / M) / S
```

Klasifikasi: `Z >= -2` normal, `-3 <= Z < -2` perlu perhatian, `Z < -3` perlu segera diperiksa.

Panjang badan dan tinggi badan adalah dua tabel berbeda dengan selisih sekitar 0,7 cm pada anak yang sama, sehingga cara pengukuran ditanyakan pada formulir, tidak diasumsikan dari usia.

**Batasan yang diakui.** Penapisan gizi di lapangan juga mempertimbangkan LILA/MUAC dan edema bilateral, yang tidak dicakup MVP ini. Keluaran sistem bukan penilaian gizi yang lengkap.

---

## Struktur proyek

```
src/
  app/
    page.tsx                  beranda
    masuk/                    halaman masuk
    kader/                    catat penimbangan + import foto
    bidan/                    dashboard pemantauan
    api/
      pengukuran/             simpan pengukuran + hitung Z-score
      import-foto/            baca halaman buku tulis
  components/
    Logo.tsx                  logo SVG inline
    LencanaStatus.tsx         lencana status gizi
    FormPengukuran.tsx        formulir kader
    ImportFoto.tsx            unggah dan koreksi hasil pembacaan
  lib/
    gizi/
      ambang.ts               seluruh ambang batas, satu sumber
      zscore.ts               rumus LMS dan interpolasi
      tabel.ts                tabel WHO dan penilaian pengukuran
      tabel-who.json          parameter LMS resmi WHO
      penjaga-data.ts         validasi kewajaran nilai
      pola.ts                 deteksi stagnan dan berhenti menimbang
    supabase.ts               klien server (termasuk service role)
    supabase-browser.ts       klien peramban, anon key saja
    llm.ts                    pemanggilan LLM dengan batas waktu
    ringkasan.ts              narasi bulanan dengan fallback
    dashboard.ts              agregasi dan urutan prioritas
    validasi.ts               skema Zod
supabase/migrations/          skema dan RLS
scripts/
  unduh-tabel-who.mjs         mengunduh tabel referensi WHO
  seed.mjs                    data contoh sintetis
```

---

## Keamanan dan privasi

| Aspek | Penerapan |
|-------|-----------|
| Isolasi data | RLS aktif di semua tabel; kader terbatas pada posyandunya, bidan pada wilayahnya, orang tua pada anaknya |
| Kunci API | LLM dan service role hanya dipakai di server, tidak pernah masuk bundel klien |
| Validasi | Skema Zod dijalankan di server, bukan hanya di klien |
| Foto buku tulis | Diproses lalu dibuang, tidak disimpan permanen |
| Minimalisasi data | Tidak menyimpan NIK maupun foto anak |
| Data demo | Seluruhnya sintetis, dinyatakan pada antarmuka |

Kredensial dikelola Supabase Auth; aplikasi tidak menyimpan maupun menangani kata sandi secara langsung.

---

## Cakupan

**Tujuh fitur inti:** input pengukuran dengan penjaga kualitas data, mesin Z-score WHO, dashboard bidan, autentikasi dan RLS tiga peran, import foto buku tulis dengan jejak asal data, deteksi anak berhenti menimbang, kemampuan offline.

**Pendukung:** ringkasan bulanan dengan fallback, saran menu berbahan pasar desa, pendaftaran dan perbaikan data anak, penyaringan status dan pencarian nama, laporan bulanan CSV, tindak lanjut lewat nomor telepon.

**Sengaja ditunda:** chatbot, tombol darurat GPS, cerita komunitas, prediksi ML, integrasi WhatsApp/SMS, ekspor e-PPGBM, dan lainnya. Alasan masing-masing ada di [`DECISIONS.md`](./DECISIONS.md).

Cakupan dipersempit dari 14 fitur berlabel Must Have menjadi tujuh fitur inti secara sadar: fitur yang berfungsi setengah menurunkan kegunaan produk lebih besar daripada fitur yang ditunda dengan alasan tertulis.

---

## Dokumen terkait

| Berkas | Isi |
|--------|-----|
| [`PRD.md`](./PRD.md) | Kebutuhan produk, kriteria penerimaan, rencana pengujian |
| [`DECISIONS.md`](./DECISIONS.md) | Catatan keputusan teknis beserta alasannya |
| [`SystemDesign.md`](./SystemDesign.md) | Rancangan sistem |
| [`Guideline.md`](./Guideline.md) | Panduan pengembangan |
