# Panduan Penerapan

Langkah menerapkan PosyanduKu ke URL publik. Deliverable role Hacker mensyaratkan aplikasi dapat diakses publik.

Prasyarat: Supabase sudah disiapkan dan repositori sudah terunggah ke GitHub. Keduanya sudah selesai.

---

## 1. Menghubungkan repositori ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new)
2. Masuk memakai akun GitHub
3. Pilih repositori **Renoslendra/Posyandu-Ku**
4. Klik **Import**

Vercel mengenali Next.js secara otomatis. Pengaturan build tidak perlu diubah.

---

## 2. Mengisi environment variable

Sebelum menekan Deploy, buka bagian **Environment Variables** dan isi kelima nilai berikut. Nilainya ada di berkas `.env.local` pada komputer Anda.

| Nama                            | Sumber nilai |
| ---------------------------------| --------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY`     | `.env.local` |
| `LLM_API_KEY`                   | `.env.local` |
| `LLM_BASE_URL`                  | `.env.local` |

Bila memakai model selain bawaan, sertakan juga `LLM_MODEL_TEXT` dan `LLM_MODEL_VISION`.

Jangan mengisi `DEMO_SAFE_MODE` pada tahap ini. Biarkan kosong agar fitur berbasis LLM berjalan penuh. Variabel tersebut hanya diisi `true` bila kuota API bermasalah menjelang penilaian.

Terapkan pada ketiga lingkungan: Production, Preview, dan Development.

---

## 3. Menerapkan

Klik **Deploy**. Proses berlangsung sekitar dua menit.

Setelah selesai, Vercel menampilkan URL produksi berbentuk `https://posyandu-ku-xxxx.vercel.app`. Catat URL tersebut untuk dicantumkan pada pengumpulan.

---

## 4. Memeriksa hasil penerapan

Buka URL produksi, lalu periksa berurutan:

- [ ] Beranda terbuka, logo tampil
- [ ] Halaman `/masuk` terbuka
- [ ] Masuk sebagai kader (`kader@posyanduku.demo`, kata sandi `Posyandu2026!`) mengarah ke halaman kader
- [ ] Daftar anak memuat enam nama
- [ ] Mencatat satu pengukuran, status gizi muncul
- [ ] Memasukkan berat 90 kg, sistem menolak dengan pesan yang jelas
- [ ] Masuk sebagai bidan, daftar prioritas terisi
- [ ] Bagas Pratama tampil sebagai perlu segera diperiksa
- [ ] Citra Dewi tampil karena beratnya tidak naik
- [ ] Dimas Saputra tampil pada bagian berhenti menimbang
- [ ] Membuka profil anak, grafik pertumbuhan tergambar dengan garis WHO
- [ ] Menekan susun ringkasan, teks muncul
- [ ] Masuk sebagai orang tua, hanya satu anak terlihat
- [ ] Membuka aplikasi dari ponsel, tata letak tetap terbaca

Bila ada langkah yang gagal, periksa Runtime Logs pada dashboard Vercel. Penyebab paling umum adalah environment variable yang belum terisi.

---

## 5. Menambahkan URL ke README

Setelah URL produksi diketahui, cantumkan pada bagian atas `README.md` agar penguji tidak perlu mencarinya.

---

## Akun Demo

| Peran | Surel | Kata sandi |
|-------|-------|------------|
| Kader | `kader@posyanduku.demo` | `Posyandu2026!` |
| Bidan | `bidan@posyanduku.demo` | `Posyandu2026!` |
| Orang tua | `ortu@posyanduku.demo` | `Posyandu2026!` |

Kata sandi ini sengaja diumumkan karena seluruh data pada lingkungan demo bersifat sintetis. Tidak ada data anak sungguhan yang dilindungi olehnya.

---

## Bila Kuota LLM Bermasalah Menjelang Penilaian

Ubah `DEMO_SAFE_MODE` menjadi `true` pada Environment Variables Vercel, lalu terapkan ulang.

Aplikasi akan berjalan penuh tanpa memanggil penyedia model: ringkasan bulanan disusun template dengan angka yang sama, dan hal itu dinyatakan terbuka pada antarmuka. Import foto tidak dapat dipakai dalam mode ini, sehingga bagian tersebut ditunjukkan melalui video demo.

---

## Menyiapkan Ulang Basis Data

Bila data demo perlu disegarkan:

```bash
node scripts/cek-kesiapan.mjs      # memastikan kredensial dan skema siap
node scripts/seed.mjs              # mengisi enam anak sintetis
node scripts/buat-akun-demo.mjs    # membuat tiga akun demo
node scripts/uji-rls.mjs           # membuktikan isolasi data antar peran
node scripts/uji-alur.mjs          # memeriksa alur tiap peran
```

Skrip seed menambahkan data, tidak menggantikannya. Menjalankannya dua kali menghasilkan dua posyandu.
