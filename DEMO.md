# Skrip Demo — PosyanduKu

Durasi sasaran: 3 menit. Setiap bagian menjawab satu kriteria penilaian.

Rekam sebagai cadangan meskipun lingkungan produksi berjalan baik. Bila jaringan lokasi bermasalah saat karya diperiksa, video ini yang menyelamatkan.

---

## Persiapan Sebelum Merekam

- [ ] Migrasi Supabase sudah dijalankan
- [ ] Data demo disiapkan dengan satu perintah:

      ```bash
      npm run demo:reset
      ```

      Menyisipkan enam anak beserta 13 pengukurannya, lalu membuat tiga akun demo
      dan menautkan Bagas Pratama ke akun orang tua. Aman dijalankan berulang:
      data demo sebelumnya dihapus lebih dahulu, sehingga tidak menghasilkan nama
      ganda pada dashboard. Jalankan ulang bila tampilan sudah kotor karena
      percobaan sebelum rekaman.

- [ ] Kesiapan diperiksa: `npm run cek` menampilkan "Lingkungan siap"
- [ ] Rekam dari URL produksi, bukan localhost: **https://posyandu-ku.vercel.app**

      Merekam dari alamat produksi menjawab keraguan yang paling wajar muncul,
      yaitu apakah ini benar-benar berjalan atau hanya berjalan di komputer
      pembuatnya. Bilah alamat yang terlihat di rekaman menjawabnya tanpa perlu
      satu kata pun.

- [ ] Ketiga akun sudah dicoba masuk (tombol pengisi cepat ada di halaman masuk)
- [ ] Satu foto halaman buku tulis (boleh tulisan tangan sendiri, berisi nama dan angka)
- [ ] Terminal terbuka di direktori proyek, siap menjalankan `npm test`
- [ ] Jendela peramban dirapikan, bookmark disembunyikan
- [ ] Perbesar tampilan ke 125% agar teks terbaca di rekaman

Data demo yang tersedia, masing-masing mewakili satu keadaan yang perlu terlihat:

| Anak | Keadaan | Dipakai pada bagian |
| --- | --- | --- |
| Aisyah Putri | Sehat, tumbuh konsisten | 2 |
| Bagas Pratama | Pendek berat, tertaut ke akun orang tua | 2, 4 |
| Citra Dewi | Status normal, berat berhenti naik tiga bulan | 2, 4 |
| Dimas Saputra | Berhenti menimbang 150 hari | 4 |
| Elsa Maharani | Risiko, diukur telentang | — |
| Fajar Nugroho | Belum pernah menimbang | — |

Angkanya bukan hasil pengacakan. Setiap kunjungan menetapkan Z-score yang
diinginkan, lalu rumus LMS WHO dibalik menjadi kilogram dan sentimeter, sehingga
status gizi pada demo dapat dipastikan.

Contoh isi foto buku tulis untuk demo:

```
Aisyah    12,4 kg   89 cm    1 Juli
Bagas      9,8 kg   79 cm    1 Juli
Citra     11,0 kg   82 cm    1 Juli
```

---

## Bagian 1 — Masalah (20 detik)

**Yang terlihat:** beranda aplikasi.

> "Kader posyandu mencatat berat dan tinggi anak di buku tulis, setiap bulan, selama bertahun-tahun. Catatannya menumpuk tapi tidak pernah diolah, jadi anak yang gizinya memburuk baru diketahui setelah jatuh sakit.
>
> Ada dua hal yang tidak bisa dilihat dari buku tulis. Pertama, data lama tidak bisa dimasukkan ke aplikasi mana pun — aplikasi hanya menerima data baru. Kedua, anak yang berhenti datang tidak terlihat sama sekali, karena yang tidak hadir tidak ditulis. Padahal keluarga yang berhenti hadir sering justru yang paling berisiko.
>
> Dua hal itu yang PosyanduKu kerjakan."

**Menjawab:** pemahaman masalah (20%).

---

## Bagian 2 — Import foto buku tulis (40 detik)

**Yang terlihat:** halaman kader, bagian import foto.

Tekan "Foto dengan kamera" bila merekam dari ponsel, atau "Pilih foto tersimpan" bila dari komputer. Tunggu hasil pembacaan muncul.

> "Kader memfoto halaman buku tulisnya. Sistem membaca angkanya."

Tunjuk baris yang bertanda kuning.

> "Yang penting bukan pembacaannya, tapi apa yang terjadi setelahnya. Baris ini ditandai karena angkanya tidak terbaca jelas. Kader memeriksa dan memperbaikinya."

Perbaiki satu angka, lalu tekan tombol simpan.

> "Sekarang kader menyimpan. Yang tersimpan bukan angka dari AI — Z-score dihitung ulang di server pakai kode yang sama dengan pencatatan manual. Angka dari AI tidak pernah dipercaya sebagai hasil hitungan.
>
> Setiap nilai menyimpan asalnya: diketik manual, atau hasil pembacaan foto. Jadi kalau AI salah baca, yang terjadi bukan alarm gizi buruk palsu — cuma satu baris yang perlu dikoreksi."

Bila ada baris yang namanya tidak cocok, tunjuk pilihan anaknya.

> "Nama di buku tulis sering beda tipis dari data. Kalau ada dua anak yang namanya mirip, sistem menolak menebak dan menyerahkannya ke kader. Salah mencocokkan berarti berat satu anak masuk ke rekam anak lain, dan itu tidak kelihatan setelah tersimpan."

**Menjawab:** orisinalitas (15%), relevansi terhadap masalah.

---

## Bagian 3 — Catat dan tolak data mustahil (20 detik)

**Yang terlihat:** formulir pencatatan.

Pilih anak, masukkan berat **90** kg. Simpan.

> "Sebelum apa pun dihitung, ada penjaga kualitas data. Berat 90 kilogram untuk balita ditolak, dengan alasan yang bisa dibaca kader."

Perbaiki menjadi angka wajar. Simpan.

> "Status gizi langsung muncul. Z-score dihitung menurut standar WHO, di layar yang sama, tanpa kader perlu membuka tabel."

**Menjawab:** kualitas dan kegunaan output (20%).

---

## Bagian 4 — Dashboard bidan (30 detik)

**Yang terlihat:** dashboard bidan.

> "Ini yang dilihat bidan. Daftar prioritas lebih dulu, bukan tabel data."

Tunjuk anak berstatus berat.

> "Bagas perlu segera diperiksa."

Tunjuk anak dengan alasan berat stagnan.

> "Citra statusnya masih normal, tapi beratnya berhenti naik tiga bulan. Ini yang tidak terlihat di buku tulis."

Gulirkan ke bagian anak berhenti menimbang.

> "Dan ini bagian yang buku tulis tidak mungkin punya: anak yang berhenti datang. Dimas tidak menimbang 150 hari. Tidak ada catatan yang bilang begitu — informasi ini muncul justru karena datanya sudah digital."

Tunjuk nomor telepon pada daftar anak yang berhenti menimbang.

> "Dan daftarnya bisa langsung ditindaklanjuti. Nomor orang tua ada di sini, satu ketukan dari ponsel bidan. Deteksi yang tidak bisa ditindaklanjuti berhenti jadi deteksi."

Klik nama anak untuk membuka grafik.

> "Grafik pertumbuhan dengan garis referensi WHO. Garis -2 SD ini batasnya."

**Menjawab:** relevansi masalah, kegunaan output.

---

## Bagian 4b — Laporan dan saran menu (20 detik, potong bila waktu mepet)

**Yang terlihat:** dashboard bidan, bagian laporan bulanan.

Klik unduh laporan.

> "Bidan harus lapor ke dinas kesehatan tiap bulan. Ini rekapitulasi plus rincian per anak, langsung terbuka di Excel. CSV, bukan PDF — karena staf dinas perlu menyalin angkanya, dan PDF memaksa mereka mengetik ulang."

Buka halaman anak, klik lihat saran menu.

> "Untuk orang tua, saran menu sehari. Yang muncul paling atas bukan gizinya, tapi harganya — karena pertanyaan pertama keluarga di desa bukan 'apakah bergizi', tapi 'apakah saya mampu'.
>
> Harganya dihitung kode, bukan AI. Model cuma menulis cara memasaknya. Kalau model mengarang angka rupiah, orang tua datang ke pasar dengan uang yang tidak cukup, lalu berhenti percaya."

**Menjawab:** kualitas dan kegunaan output (20%), orisinalitas (15%).

---

## Bagian 5 — Tanpa sinyal (20 detik)

**Yang terlihat:** halaman kader.

Aktifkan mode pesawat.

> "Posyandu di desa sering tanpa sinyal."

Masukkan satu pengukuran. Simpan.

> "Data tetap masuk, status gizi tetap muncul — dihitung di perangkat, pakai kode yang sama dengan server."

Matikan mode pesawat. Tunggu penanda sinkronisasi.

> "Sinyal kembali, data terkirim sendiri. Kader tidak perlu menekan apa pun."

**Menjawab:** penguasaan kompetensi role (30%).

---

## Bagian 6 — Bukti, bukan klaim (25 detik)

**Yang terlihat:** terminal.

```bash
npm test
```

> "355 pengujian. Yang paling penting bukan jumlahnya, melainkan bahwa sebagian besar ditulis setelah menemukan cacatnya.
>
> Menjelang akhir saya berhenti menambah fitur dan memeriksa seluruh proyek. Pengujian yang ada lolos semuanya, tapi pengujian hanya menegakkan hal yang terpikirkan saat menulisnya. Pemeriksaan itu menemukan dua belas cacat, dan yang paling berbahaya punya pola sama: semuanya melaporkan keadaan lebih baik daripada kenyataannya.
>
> Stunting tidak dihitung sama sekali untuk anak di atas dua tahun yang diukur telentang, sebab tabelnya dipilih menurut cara ukur padahal tabel itu hanya memuat nol sampai dua puluh empat bulan. Anak pendek yang beratnya proporsional keluar sebagai normal.
>
> Dan pencocokan nama membandingkan potongan huruf, bukan kata, sehingga anak terdaftar bernama Ani tercocok dengan bacaan Handayani. Berat seorang anak tertulis ke rekam anak lain, tanpa jejak apa pun di layar.
>
> Semuanya tercatat di DECISIONS.md, termasuk yang belum saya perbaiki."

```bash
node scripts/uji-rls.mjs
```

> "Dan ini membuktikan isolasi datanya bekerja: kader posyandu A mencoba membaca data posyandu B, ditolak. Bukan sekadar RLS diaktifkan, tapi dibuktikan dengan percobaan menembusnya.
>
> Ada lima skrip seperti ini yang menguji terhadap database sungguhan, bukan mock. Enam puluh satu pemeriksaan. Salah satunya menemukan bug yang tidak akan pernah ketemu dari membaca kode: pengukuran ganda lolos karena batasan unik lama tidak berlaku saat kolomnya bernilai null. Postgres menganggap tiap null berbeda."

> "Satu hal terakhir, dan ini saya ukur, bukan saya kira-kira. Usia dulu dibulatkan ke bawah, sehingga bayi dua puluh tujuh hari dinilai terhadap referensi usia nol bulan. Pada bayi 3,6 kilogram dan 52 sentimeter, panjang menurut umurnya berubah dari plus 1,12 menjadi minus 1,08 setelah diperbaiki. Selisih 2,2 simpangan baku, dan arahnya selalu membuat anak tampak lebih sehat daripada keadaannya. Untuk alat penapisan, itu arah yang paling merugikan."

**Menjawab:** penguasaan kompetensi role (30%), dan kejelasan (15%) lewat kejujuran atas cacat yang ditemukan sendiri.

---

## Bagian 7 — Saat AI mati (15 detik)

**Yang terlihat:** dashboard bidan, tombol ringkasan.

Dengan `DEMO_SAFE_MODE=true`, klik susun ringkasan.

> "Ringkasan bulanan disusun AI. Tapi angkanya tidak — angka dihitung kode yang teruji, AI hanya menyusun kalimatnya.
>
> Ini kondisi saat layanan AI mati. Ringkasannya tetap keluar, angkanya sama, dan aplikasi bilang terus terang bahwa ini versi template. Tidak ada halaman kosong."

**Menjawab:** penguasaan kompetensi role (30%).

---

## Penutup (10 detik)

> "Tujuh fitur inti, semuanya jalan. Bukan empat belas yang setengah jadi — dan alasan setiap fitur yang saya potong ada tertulis di DECISIONS.md, dua puluh delapan keputusan beserta pertimbangannya.
>
> PosyanduKu tidak menggantikan kader. Ia membuat catatan yang sudah mereka kerjakan bertahun-tahun akhirnya berguna."

---

## Hal yang Perlu Diucapkan Bila Ditanya

**"Bagaimana kalau AI salah?"**
> AI tidak menghitung apa pun. Z-score, klasifikasi status, deteksi tren, semuanya kode deterministik yang ada pengujiannya. AI cuma dua tugas: menyusun kalimat, dan membaca tulisan tangan — dan hasil pembacaan wajib dikonfirmasi kader sebelum dihitung.

**"Kenapa tidak ada chatbot?"**
> Karena permukaan jawabannya tidak terbatas, jadi tidak bisa diuji maupun dijamin. Orang tua akan tanya "anak saya demam, kasih obat apa" dan model akan menjawab. Itu nasihat medis dari aplikasi yang menyatakan dirinya bukan alat diagnosis. Disclaimer tidak menyelesaikan itu. Alasannya tertulis di DECISIONS.md.

**"Kenapa tidak ada tombol darurat?"**
> Karena tidak ada penerimanya. Kanal WhatsApp dan SMS di luar cakupan, jadi peringatannya hanya masuk ke tabel yang tidak dilihat siapa pun. Tombol darurat tanpa penerima lebih berbahaya daripada tidak ada tombol — orang tua berhenti mencari bantuan karena merasa sudah minta bantuan.

**"Datanya nyata?"**
> Tidak. Semua data demo sintetis, dibangkitkan skrip seed. Ini data kesehatan anak di URL publik, jadi tidak boleh ada data sungguhan.

**"Apa yang belum selesai?"**
> Ekspor ke format e-PPGBM, karena formatnya perlu diverifikasi dulu. Itu prioritas pertama Fase 2, karena kalau nyambung, kader berhenti mengerjakan pekerjaan dua kali. Juga LILA dan edema sebagai indikator tambahan — penapisan gizi di lapangan memakai keduanya, dan saya menyebutnya sebagai batasan di README.

---

## Kesalahan yang Perlu Dihindari

| Jangan | Sebabnya |
|--------|----------|
| Menyebut "pakai AI" sebagai keunggulan | Yang menjadi keunggulan justru AI dibatasi perannya |
| Membacakan angka Z-score satu per satu | Penguji butuh tahu maknanya, bukan angkanya |
| Meminta maaf atas fitur yang dipotong | Pemotongan adalah keputusan, bukan kekurangan |
| Menjanjikan hal yang belum dibangun | Batasan yang diakui lebih kuat daripada klaim |
| Membiarkan hening saat menunggu proses | Jelaskan yang sedang terjadi sambil menunggu |
