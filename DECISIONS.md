# Catatan Keputusan Teknis

Dokumen ini mencatat keputusan yang diambil selama pembangunan PosyanduKu beserta alasannya. Yang dicatat bukan hanya apa yang dibangun, tetapi juga apa yang **sengaja tidak** dibangun.

Panduan hackathon menyatakan bahwa penilaian mengutamakan "fungsi, relevansi terhadap masalah, dan **logika di balik setiap keputusan**". Dokumen ini adalah jawaban untuk bagian terakhir.

Format tiap entri: konteks, keputusan, alasan, dan konsekuensi yang diterima.

---

## KP-01: Cakupan dipersempit dari 14 fitur menjadi 7

**Konteks.** Rencana awal (PRD v2.0) mencantumkan 14 fitur berlabel "Must Have": termasuk chatbot, tombol darurat GPS, dan cerita komunitas.

**Keputusan.** Membangun 7 fitur secara utuh, memindahkan 12 sisanya ke Fase 2 dengan alasan tertulis.

**Alasan.** Waktu produktif realistis bagi satu orang adalah sekitar 10 jam dari 24 jam kalender. 14 fitur berarti kurang dari satu jam per fitur termasuk skema, API, antarmuka, dan pengujian — yang menghasilkan 14 fitur setengah jalan, bukan 14 fitur.

Pertimbangan kedua lebih menentukan: panduan hackathon menilai "cara peserta memahami dan **membatasi** masalah". Daftar 14 fitur adalah bukti gagal membatasi masalah, sehingga justru menurunkan nilai. Setiap fitur tambahan juga memperluas permukaan yang dapat gagal saat karya diperiksa, sementara penguji hanya dapat menilai apa yang berhasil dibukanya.

**Konsekuensi.** Aplikasi tampak lebih sederhana daripada rencana awal. Ditukar dengan tidak adanya jalan buntu pada alur yang ada.

---

## KP-02: Chatbot tidak dibangun

**Konteks.** Chatbot asisten gizi tercantum sebagai Must Have pada PRD v2.0 (Epic 5, FR-06).

**Keputusan.** Tidak dibangun. Dipindahkan ke Fase 2 dengan bentuk yang dibatasi.

**Alasan.** Tiga hal, dari yang paling ringan:

1. Bertentangan dengan prinsip proyek sendiri. `Guideline.md` menetapkan "AI sebagai fungsi inti, **bukan chatbot**". Membangunnya berarti melanggar aturan yang ditulis sendiri.

2. Chatbot adalah penanda umum pekerjaan hackathon yang dangkal. Kekuatan produk ini ada pada skoring deterministik dan import buku tulis; menambahkan chatbot menggeser kesan ke arah "API model ditempelkan".

3. Alasan terberat: permukaan jawabannya tidak terbatas sehingga tidak dapat diuji maupun dijamin. Orang tua akan menanyakan hal seperti "anak saya demam tiga hari, beri obat apa?" dan model akan menjawab. Itu nasihat medis kepada keluarga di desa, dari aplikasi yang menyatakan dirinya bukan alat diagnosis. Disclaimer tidak menyelesaikan masalah ini. Setiap fitur lain pada MVP memiliki keluaran terbatas yang dapat diuji; chatbot tidak.

**Bila dibangun kelak.** Dibatasi sebagai penjelas hasil pada data anak yang sedang dibuka, dengan penolakan tegas atas pertanyaan medis dan pengalihan ke bidan.

---

## KP-03: Tombol darurat GPS tidak dibangun

**Konteks.** FR-07 menetapkan tombol darurat, deteksi lokasi, dan pengiriman peringatan ke keluarga sebagai Must Have.

**Keputusan.** Tidak dibangun.

**Alasan.** Terdapat kontradiksi internal yang tidak dapat diselesaikan dalam cakupan ini: FR-07.6 mewajibkan pengiriman peringatan ke keluarga atau kader, sementara kanal WhatsApp dan SMS berada di luar cakupan. Artinya peringatan hanya akan masuk ke tabel basis data yang tidak dilihat siapa pun.

Tombol darurat tanpa penerima di sisi lain lebih berbahaya daripada tidak ada tombol, karena menciptakan harapan palsu pada saat paling kritis: orang tua berhenti mencari bantuan karena merasa sudah meminta bantuan.

Dua alasan pendukung: geolocation memerlukan izin peramban yang sering ditolak dan tidak akurat pada perangkat tanpa GPS, sehingga rawan gagal justru saat diperiksa. Selain itu data fasilitas kesehatan dan nomor teleponnya belum terverifikasi, dan nomor yang salah pada fitur darurat berbahaya.

**Bila dibangun kelak.** Wajib disertai jalur eskalasi manusia yang eksplisit: siapa yang menerima, dalam berapa lama, dan apa yang tampil bila tidak ada respons.

---

## KP-04: Cerita komunitas tidak dibangun

**Keputusan.** Tidak dibangun.

**Alasan.** Nilai teknisnya mendekati nol (CRUD, rating, komentar) sehingga tidak menunjukkan kedalaman kompetensi. Yang lebih menentukan: fitur ini memerlukan pengguna nyata dan moderasi konten. Tanpa keduanya, halaman hanya berisi cerita karangan tentang anak yang tidak ada, tampil di URL publik — dan bila penguji menyadarinya, kredibilitas seluruh produk menurun. Kolom komentar terbuka pada platform kesehatan anak tanpa moderasi juga berisiko menyebarkan saran pengobatan berbahaya.

---

## KP-05: Perhitungan deterministik, LLM hanya untuk bahasa

**Konteks.** PRD v2.0 menugaskan deteksi pola pertumbuhan kepada LLM (FR-03.7, FR-08).

**Keputusan.** Penugasan dibalik. Seluruh angka dihitung kode deterministik; LLM hanya menyusun kalimat dan membaca tulisan tangan.

**Alasan.** Z-score, klasifikasi status, deteksi tren, dan perhitungan jeda kunjungan adalah operasi numerik yang memiliki jawaban benar tunggal. Menyerahkannya ke model bahasa membuat hasilnya tidak dapat direproduksi, tidak dapat diuji, dan berpotensi salah tanpa terdeteksi.

Pemisahan ini juga memberi jawaban arsitektural atas pertanyaan "bagaimana memastikan AI tidak salah?": AI tidak pernah menghitung apa pun.

**Konsekuensi.** Perlu memuat tabel referensi WHO dan menulis mesin perhitungan sendiri, lebih lama daripada mengirim data ke model. Ditukar dengan 88 pengujian yang membuktikan kebenarannya.

---

## KP-06: Tabel WHO diunduh dari sumber resmi, bukan ditulis manual

**Konteks.** Perhitungan Z-score memerlukan parameter LMS WHO untuk lima indikator, dua jenis kelamin, dan rentang usia 0-60 bulan.

**Keputusan.** Mengunduh dari paket R resmi WHO (`WorldHealthOrganization/anthro`, direktori `data-raw/growthstandards`) melalui skrip, lalu men-commit hasil konversinya.

**Alasan.** Nilai LMS tidak boleh diperkirakan. Satu angka salah menggeser klasifikasi seluruh populasi pada usia tersebut, dan kesalahan seperti itu tidak terlihat dari tampilan aplikasi. Memakai sumber resmi membuat nilainya dapat diverifikasi terhadap tabel terbitan WHO.

Hasilnya di-commit alih-alih diunduh saat build karena dua hal: proses build tidak boleh bergantung pada jaringan, dan nilai yang dipakai dapat ditinjau melalui riwayat perubahan repositori.

**Verifikasi.** `src/lib/gizi/tabel.test.ts` membandingkan nilai tabel terhadap angka pada tabel terbitan WHO: median berat lahir 3,3464 kg (laki-laki), median tinggi 60 bulan 110,0 cm, ambang -2 SD pada beberapa titik usia.

---

## KP-07: Panjang badan dan tinggi badan dipisahkan

**Konteks.** Saat verifikasi pertama, pengujian menemukan Z-score bernilai -0,12 untuk anak yang seharusnya tepat di median.

**Keputusan.** Memisahkan PB/U (panjang badan, 0-24 bulan) dari TB/U (tinggi badan, 24-60 bulan) sebagai dua tabel berbeda, demikian pula BB/PB dan BB/TB.

**Alasan.** Berkas WHO `lenanthro.txt` memuat **dua** tabel dalam satu berkas, dibedakan kolom `loh` bernilai `L` (length) atau `H` (height). Konversi awal mencampur keduanya, sehingga median pada usia 24 bulan menjadi 87,5 cm — di antara nilai panjang badan (87,8) dan tinggi badan (87,1).

Perbedaan keduanya nyata: pengukuran berdiri selalu menghasilkan angka sekitar 0,7 cm lebih pendek daripada pengukuran telentang pada anak yang sama. Mencampurnya membuat klasifikasi pada usia peralihan bergeser.

**Konsekuensi.** Formulir kader harus menanyakan cara pengukuran, tidak boleh mengasumsikannya dari usia. Menambah satu masukan, tetapi menghasilkan angka yang benar.

**Catatan.** Kesalahan ini ditemukan oleh pengujian, bukan oleh pemeriksaan manual. Ini alasan konkret mengapa golden test dibuat lebih dahulu.

---

## KP-08: Rujukan standar WHO diperbaiki

**Konteks.** `Guideline.md` merujuk *WHO Growth Reference Data for 5-19 years*.

**Keputusan.** Menggantinya dengan *WHO Child Growth Standards (0-5 tahun)*.

**Alasan.** Sasaran pengguna adalah balita 0-59 bulan. Tabel 5-19 tahun tidak berlaku untuk rentang usia tersebut, dan memakainya akan menghasilkan Z-score yang salah pada **seluruh** populasi sasaran, bukan sebagian.

---

## KP-09: Data hasil ekstraksi AI tidak dihitung sebelum dikonfirmasi

**Keputusan.** Setiap nilai menyimpan asalnya (`manual` atau `ocr_ai`). Nilai dari ekstraksi berstatus belum dikonfirmasi dan **tidak** ikut dihitung ke statistik, distribusi status, maupun deteksi pola sampai kader menyetujuinya.

**Alasan.** Model penglihatan akan sesekali salah membaca tulisan tangan. Tanpa lapisan ini, satu angka salah baca dapat memicu peringatan gizi buruk palsu, dan bidan kehilangan kepercayaan pada seluruh daftar prioritas.

Rancangan ini juga memberi jawaban langsung atas pertanyaan "bagaimana bila AI salah membaca?": hasil pembacaan bukan data, melainkan usulan.

**Penerapan.** Kolom `sumber` dan `dikonfirmasi` pada tabel `pengukuran`; endpoint import tidak menulis ke basis data sama sekali; `analisisPola` dan `susunRingkasan` menyaring nilai yang belum dikonfirmasi.

---

## KP-10: Penjaga kualitas data memisahkan penolakan dari penandaan

**Keputusan.** Dua tingkat temuan. `tolak` untuk nilai mustahil secara fisik (balita 90 kg) yang tidak boleh disimpan. `tandai` untuk nilai yang patut diperiksa (tinggi badan menurun) yang boleh disimpan setelah kader mengonfirmasi.

**Alasan.** Menolak semua yang mencurigakan akan menghalangi kader mencatat kasus nyata yang memang ekstrem — dan kasus ekstrem justru yang paling perlu tercatat. Meloloskan semuanya akan mencemari statistik. Kader lebih mengetahui kondisi sebenarnya daripada sistem, sehingga keputusan akhir diserahkan kepadanya setelah diberi informasi.

---

## KP-11: Deteksi anak yang berhenti menimbang

**Keputusan.** Menambahkan deteksi anak dengan jeda kunjungan lebih dari 90 hari, sebagai bagian MVP.

**Alasan.** Anak paling berisiko sering bukan yang datang dengan berat menurun, melainkan yang **berhenti datang**. Pencatatan buku tulis secara struktural tidak dapat menunjukkan hal ini: yang tidak hadir tidak ditulis.

Ini menjadikan digitalisasi bukan sekadar memindahkan catatan, tetapi memunculkan informasi yang sebelumnya tidak mungkin ada. Implementasinya hanya berupa perhitungan tanggal, tanpa biaya LLM dan tanpa risiko kegagalan saat demo.

---

## KP-12: Berfungsi tanpa koneksi

**Konteks.** PRD v2.0 mengakui banyak posyandu tanpa koneksi internet (Asumsi nomor 3), namun menempatkan offline mode di luar cakupan.

**Keputusan.** Memasukkan kemampuan offline ke dalam MVP.

**Alasan.** Mengakui suatu masalah lalu menunda penanganannya meninggalkan celah yang tidak terjawab. Bila aplikasi tidak dapat dipakai di posyandu tanpa sinyal, kader akan kembali ke buku tulis, dan seluruh produk kehilangan gunanya di tempat yang paling membutuhkannya.

---

## KP-13: Antarmuka ditulis langsung, tidak digenerate

**Konteks.** PRD v2.0 merencanakan pembuatan antarmuka melalui v0 atau Lovable.

**Keputusan.** Menulis komponen secara langsung.

**Alasan.** Kode hasil generate membawa struktur yang tidak dipahami penulisnya, dan itu bertentangan dengan kriteria penguasaan kompetensi role yang berbobot 30%. Kebutuhan antarmuka produk ini juga sederhana: formulir, tabel, dan lencana status, dengan penekanan pada ukuran font dan tombol besar. Menulisnya langsung lebih cepat daripada menyunting hasil generate.

---

## KP-14: Klien Supabase dipisah menurut lingkungan eksekusi

**Konteks.** Build gagal karena modul yang mengimpor `next/headers` ikut terbawa ke bundel klien.

**Keputusan.** Memisahkan `supabase-browser.ts` (peramban, anon key) dari `supabase.ts` (server, termasuk service role).

**Alasan.** Bukan hanya memperbaiki galat build. Pemisahan berkas membuat batas antara kunci publik dan kunci istimewa ditegakkan oleh struktur proyek, bukan oleh kedisiplinan penulis. Kunci service role melewati RLS sepenuhnya, sehingga kebocorannya ke klien akan menghapus seluruh isolasi data antar peran.

---

## KP-15: Tabel usia dipadatkan ke titik bulan bulat

**Konteks.** Tabel WHO tersedia per hari, menghasilkan berkas 433 KB.

**Keputusan.** Memadatkan tabel berbasis usia menjadi titik bulan bulat, menghasilkan 120 KB.

**Alasan.** Usia di posyandu dicatat dalam bulan penuh, sehingga titik harian tidak pernah terpakai. Ukuran berkas penting karena aplikasi harus ringan pada koneksi lambat dan tabelnya perlu tersimpan di perangkat untuk mode offline.

**Konsekuensi.** Interpolasi antar bulan memakai nilai bulan terdekat, dengan galat di bawah 0,01 SD — tidak mengubah keputusan penapisan.

---

## KP-16: Klaim yang tidak terverifikasi diturunkan, bukan dihapus

**Konteks.** PRD v2.0 memuat klaim skala ("300.000+ posyandu", "100+ permintaan per detik") dan dua angka prevalensi stunting yang tidak konsisten ("1 dari 3 anak" dan "21,6%").

**Keputusan.** Menyatukan angka prevalensi dengan sebutan sumber, menandai angka yang belum terverifikasi, dan menurunkan klaim skala menjadi pernyataan rancangan.

**Alasan.** Angka yang tidak dapat dipertanggungjawabkan lebih merugikan daripada tidak menyebut angka. Klaim kapasitas yang tidak pernah diuji juga demikian: yang diuji pada tahap ini adalah kebenaran fungsi, bukan ketahanan beban, dan menyatakannya terus terang lebih kuat daripada mengklaim yang belum dibuktikan.

---

## KP-17: Mode demo aman

**Keputusan.** Menyediakan `DEMO_SAFE_MODE` yang membuat fitur berbasis LLM memakai jalur fallback deterministik tanpa memanggil penyedia model.

**Alasan.** Bila kuota API habis atau jaringan lokasi bermasalah saat karya diperiksa, aplikasi harus tetap berfungsi penuh. Ini bukan fitur, melainkan asuransi terhadap kegagalan yang berada di luar kendali.

---

## KP-18: Materi hackathon tidak di-commit

**Keputusan.** Menambahkan `*.pptx.pdf` ke `.gitignore`.

**Alasan.** Berkas panduan hackathon bertanda "confidential" dari penyelenggara. Repositori ini akan bersifat publik, sehingga materi tersebut tidak boleh ikut terunggah.
