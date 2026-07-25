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

**Konsekuensi.** Pemadatan tabelnya sendiri hampir tidak menimbulkan galat: titik bulan bulat diinterpolasi dari titik harian, dan selisihnya di bawah 0,01 SD.

**Koreksi atas catatan sebelumnya.** Catatan ini semula menyatakan galat di bawah 0,01 SD tanpa membedakan dua hal yang berbeda, dan pernyataan itu menyesatkan. Angka tersebut hanya berlaku untuk pemadatan tabel. Yang tidak disebut adalah akibat dari pembulatan usia anak ke bawah, dan galatnya jauh lebih besar.

Usia dihitung dalam bulan penuh, sehingga bayi berusia 27 hari dinilai terhadap referensi usia nol bulan. Pada bulan pertama, selisih Z-score antara dua titik bulan berdekatan mencapai 2,1 SD pada berat menurut umur dan 2,5 SD pada panjang menurut umur. Bias itu selalu searah: anak yang diukur menjelang akhir bulan usianya tampak lebih baik daripada keadaan sebenarnya, sehingga kasus di ambang batas dapat terlewat. Pengaruhnya menyusut setelah usia dua tahun, menjadi di bawah 0,25 SD.

Perbaikannya tidak menuntut penggantian tabel, sebab interpolasi sudah mendukung nilai antar titik: usia perlu dihitung sebagai bilangan desimal untuk keperluan perhitungan, sementara tampilan kepada kader tetap dalam bulan penuh. Belum dikerjakan, dan dinyatakan di sini agar tidak tersembunyi.

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

---

## KP-19: Harga menu tidak diserahkan ke LLM

**Keputusan.** Bahan pangan, takaran, dan harganya berasal dari daftar tetap di `src/lib/menu.ts`. LLM hanya menyusun cara memasak dan kalimatnya. Total biaya dihitung kode.

**Alasan.** Model akan mengarang angka rupiah yang terdengar masuk akal namun tidak dapat dipertanggungjawabkan. Ini bukan sekadar soal ketepatan: menu yang biayanya salah membuat orang tua datang ke pasar dengan uang yang tidak cukup, lalu berhenti mempercayai sarannya. Kegagalan seperti itu lebih merugikan daripada tidak ada saran sama sekali.

Konsekuensi yang diterima: menu tidak dapat menyesuaikan diri dengan bahan yang tidak ada di daftar. Ditukar dengan biaya yang selalu dapat dipertanggungjawabkan.

Turunan lain dari keputusan ini: bila LLM gagal, yang hilang hanya petunjuk memasaknya. Menu, bahan, dan biaya tetap tampil utuh.

---

## KP-20: Bayi di bawah 6 bulan tidak mendapat saran menu

**Keputusan.** `kerangkaMenu` mengembalikan nilai kosong untuk usia di bawah 6 bulan, dan antarmuka menampilkan arahan untuk berkonsultasi dengan bidan.

**Alasan.** Pada usia tersebut air susu ibu sudah mencukupi, dan pemberian makanan justru berisiko. Menampilkan saran menu di situ bukan fitur yang kurang berguna, melainkan anjuran yang berbahaya. Batas ini ditegakkan kode dan diuji, bukan diserahkan pada perintah kepada model.

---

## KP-21: Mengubah tanggal lahir tidak menghitung ulang riwayat

**Keputusan.** Kader dapat memperbaiki tanggal lahir, namun Z-score pada pengukuran lama tidak dihitung ulang. Yang dilakukan adalah memunculkan peringatan bahwa status gizi lama mungkin tidak lagi sesuai, dan menganjurkan penimbangan ulang.

**Alasan.** Perhitungan ulang seluruh riwayat memerlukan pekerjaan latar belakang dan penanganan kegagalan sebagian, dan itu tidak selesai dalam waktu tersedia dengan mutu yang dapat dipertanggungjawabkan.

Dua pilihan yang tersedia adalah menyembunyikan masalahnya atau menyatakannya. Menyembunyikannya berarti bidan membaca status gizi yang salah tanpa tahu bahwa itu salah. Menyatakannya membuat kader tahu apa yang perlu dilakukan. Data yang diketahui keliru lebih aman daripada data keliru yang tampak benar.

---

## KP-22: Anak yang belum pernah ditimbang mendapat saringannya sendiri

**Keputusan.** Penyaringan status pada dashboard menyertakan pilihan "Belum ditimbang", di samping tiga status gizi.

**Alasan.** Anak yang belum pernah ditimbang tidak muncul pada penyaringan status mana pun, sehingga justru paling mudah terlupakan. Ini pengulangan pola yang sama dengan anak yang berhenti hadir: yang tidak tercatat tidak terlihat. Memberinya pilihan tersendiri membuat kelompok tersebut dapat ditindaklanjuti.

---

## KP-23: Nomor telepon ditampilkan pada daftar anak yang berhenti hadir

**Keputusan.** Nomor telepon orang tua tampil sebagai tautan `tel:` pada daftar anak yang berhenti menimbang, bukan hanya tersimpan di basis data.

**Alasan.** Pemeriksaan mandiri menemukan ketidakkonsistenan: formulir meminta nomor telepon, basis data menyimpannya, lalu tidak ada satu pun tempat yang menampilkannya. Data yang dikumpulkan tanpa pernah dipakai adalah beban bagi kader yang mengetiknya, bukan manfaat.

Daftar anak yang berhenti hadir adalah tempat nomor itu paling bernilai. Tanpa nomor, bidan hanya dapat melihat siapa yang hilang tanpa cara menjangkaunya, dan deteksi yang tidak dapat ditindaklanjuti berhenti menjadi deteksi.

Memakai tautan `tel:` alih-alih teks yang harus disalin, karena bidan membuka dashboard dari ponsel.

---

## KP-24: Pembatasan laju dipindahkan ke basis data

**Keputusan.** Penghitung pembatasan laju disimpan di tabel `batas_panggilan` melalui fungsi `catat_panggilan`, menggantikan penghitung dalam memori proses.

**Alasan.** Penghitung dalam memori tidak berfungsi pada Vercel: setiap permintaan dapat dilayani proses berbeda, sehingga catatannya hilang dan batasnya tidak pernah tercapai. Batas yang tidak berfungsi lebih buruk daripada tidak ada batas, karena menciptakan keyakinan yang salah bahwa biaya API sudah terlindungi.

Memilih basis data alih-alih Redis agar tidak menambah layanan baru untuk kebutuhan sekecil ini. Volumenya satu baris per pengguna per endpoint.

Dua rincian yang disengaja:

Pemeriksaan dan penambahan terjadi dalam satu pernyataan SQL, sehingga dua permintaan yang datang bersamaan tidak dapat sama-sama lolos melewati batas.

Bila pemeriksaan batas gagal, permintaan **diizinkan**, bukan ditolak. Kegagalan pembatasan laju tidak boleh mematikan fitur yang sedang dipakai kader di lapangan. Risiko yang diterima terbatas pada biaya API, sedangkan menolak permintaan akan menghentikan pekerjaan yang sah. Kegagalannya tetap dicatat ke log agar tidak tertelan diam-diam.

Tabelnya tertutup sepenuhnya bagi pengguna, termasuk untuk membaca penghitungnya sendiri, karena akses baca membuka jalan menuju cara mengosongkannya.

---

## KP-25: Laporan diekspor sebagai CSV, bukan PDF

**Keputusan.** FR-02.8 dipenuhi dengan ekspor CSV. Pustaka pembuat PDF tidak ditambahkan.

**Alasan.** Laporan ini berakhir di tangan staf dinas kesehatan yang perlu menyalin angkanya ke rekapitulasi mereka sendiri. PDF terlihat lebih resmi, namun angka di dalamnya harus diketik ulang, dan pengetikan ulang adalah sumber kesalahan yang justru ingin dihapus produk ini. CSV langsung terbuka di Excel dan dapat diolah.

Pertimbangan kedua: pustaka PDF menambah beban bundel untuk keluaran yang lebih sulit dipakai.

Dua rincian yang muncul dari pengujian:

Tanda urutan byte disertakan di awal berkas agar Excel di Windows membacanya sebagai UTF-8. Tanpanya huruf beraksen pada nama anak tampil rusak, dan laporan yang tampak rusak akan diragukan isinya.

Penafian "bukan alat diagnosis" ditulis di dalam berkas, bukan hanya di halaman tempat berkas diunduh, karena berkas berpindah tangan terlepas dari antarmukanya.

---

## KP-26: Pencocokan nama menolak menebak

**Keputusan.** Nama hasil pembacaan foto dicocokkan ke anak terdaftar hanya bila kecocokannya tunggal. Bila ada dua calon atau lebih yang menyerupai, sistem menolak memilih dan kader menentukan lewat daftar pilihan.

**Alasan.** Mencocokkan ke anak yang salah berarti menuliskan berat badan seorang anak ke rekam anak lain. Kesalahan itu tidak terlihat setelah tersimpan, dan akibatnya berlapis: anak yang sehat dapat memicu peringatan gizi buruk palsu, sementara anak yang sungguh berisiko tersembunyi di balik angka yang bukan miliknya.

Meminta kader memilih memakan beberapa detik. Memperbaiki data yang tertukar memakan waktu jauh lebih lama, dan hanya mungkin bila kesalahannya disadari.

Normalisasi yang dilakukan terbatas pada hal yang pasti: huruf besar kecil, spasi berlebih, tanda baca, dan sebutan seperti "An." atau "Ananda" yang lazim ditulis kader di depan nama. Kemiripan fonetis dan jarak edit sengaja tidak dipakai, karena keduanya menghasilkan kecocokan yang tampak masuk akal namun tidak dapat dipertanggungjawabkan.

Satu perkecualian yang perlu dicatat: nama "Siti" tetap tercocok ke anak bernama "Siti" meski ada juga "Siti Aminah", karena kecocokan persis diperiksa sebelum kecocokan sebagian.

---

## KP-27: Batasan unik pengukuran per tanggal

**Keputusan.** Menambahkan batasan `unique (anak_id, tanggal)` pada tabel pengukuran, dan menghapus batasan `ocr_awalnya_belum_dikonfirmasi` yang tidak menegakkan apa pun.

**Alasan.** Uji `scripts/uji-import.mjs` menemukan bahwa memfoto halaman yang sama dua kali menghasilkan pengukuran ganda. Penyebabnya: batasan `unique (anak_id, klien_ref)` tidak berlaku ketika `klien_ref` bernilai null, karena PostgreSQL memperlakukan setiap NULL sebagai nilai yang berbeda. Batasan itu bekerja untuk antrean luring yang selalu mengirim `klien_ref`, namun jalur import foto tidak memilikinya.

Akibatnya bukan sekadar baris berlebih. Dua pengukuran pada tanggal sama membuat deteksi berat stagnan membandingkan nilai dengan dirinya sendiri, dan grafik pertumbuhan menampilkan dua titik bertumpuk.

Temuan kedua muncul saat memperbaikinya: batasan `ocr_awalnya_belum_dikonfirmasi` berbunyi `check (sumber = 'manual' or dikonfirmasi is not null)`, sedangkan kolom `dikonfirmasi` bertipe not null. Bagian kanannya selalu benar, sehingga batasan itu tidak pernah menolak apa pun meski komentarnya menjanjikan sebaliknya.

Batasan yang menjanjikan lebih dari yang ditegakkan lebih berbahaya daripada tidak ada batasan, karena pembaca berikutnya akan mengandalkannya. Batasan itu dihapus dan digantikan komentar yang menyatakan keadaan sebenarnya: jaminan bahwa nilai hasil pembacaan mesin melewati mata kader berada di lapisan aplikasi, bukan basis data.

---

## KP-28: Import foto wajib punya langkah simpan

**Keputusan.** Menambahkan endpoint `/api/import-simpan` beserta tombol simpan pada tabel koreksi.

**Alasan.** Pemeriksaan menemukan bahwa tabel hasil pembacaan foto tidak memiliki tombol simpan sama sekali. Kader dapat memfoto, sistem membaca, kader dapat mengoreksi setiap sel, lalu tidak ada cara menyimpannya. Keterangan "Data belum tersimpan" pada antarmuka benar secara permanen.

Ini membuat pembeda utama produk tidak berfungsi: klaim bahwa catatan bertahun-tahun dapat masuk sistem tidak benar tanpa langkah simpan. FR-10.3 dan FR-10.5 pada PRD juga tidak terpenuhi.

Dua pilihan rancangan yang menyertainya:

Setiap baris diproses sendiri-sendiri, bukan sebagai satu transaksi. Kader yang sudah memfoto dan memeriksa sepuluh baris tidak boleh kehilangan sembilan yang benar karena satu yang salah. Baris yang berhasil hilang dari layar, yang gagal ditinggalkan beserta alasannya agar dapat diperbaiki tanpa memfoto ulang.

Z-score dihitung ulang di server memakai fungsi yang sama dengan pencatatan manual. Angka apa pun dari klien tidak dipercaya sebagai hasil perhitungan, sejalan dengan KP-03.

## KP-29: Tidak ada pendaftaran mandiri, akun disediakan pengelola

**Keputusan.** Aplikasi tidak menyediakan halaman pendaftaran. Tidak ada `signUp` di seluruh kode aplikasi; satu-satunya jalur autentikasi adalah `signInWithPassword`. Akun dibuat pengelola posyandu memakai service role, lewat `scripts/buat-akun-demo.mjs` pada lingkungan demo.

**Alasan.** Kader dan bidan adalah petugas dengan penugasan resmi, bukan pengguna yang mendaftar atas kemauan sendiri. Bila pendaftaran mandiri dibuka, siapa pun dapat mendaftar sebagai kader lalu melihat data kesehatan seluruh anak di satu posyandu, sebab peran itulah yang menentukan cakupan bacanya pada RLS. Tidak ada cara memverifikasi penugasan seseorang dari dalam aplikasi.

Penolakannya ditegakkan berlapis, bukan hanya disembunyikan di antarmuka:

Tabel `profil` tidak memiliki policy INSERT sama sekali, dan GRANT-nya hanya `select, update` untuk peran `authenticated`. Pengguna tidak dapat membuat profilnya sendiri walaupun memanggil API secara langsung. Hanya service role yang dapat menulisnya.

Pembuatan anak baru diperiksa di tiga tempat: formulirnya hanya dirender di halaman kader, `/api/anak` menolak dengan 403 bila peran bukan kader, dan policy `anak_tulis_kader` mensyaratkan `auth_peran() = 'kader'`. Orang tua tidak dapat mendaftarkan anak, termasuk anaknya sendiri. Bidan juga tidak.

`posyandu_id` diambil dari profil kader yang sedang masuk, bukan dari badan permintaan, sehingga kader tidak dapat menyisipkan anak ke posyandu lain.

**Yang belum ada, dan diakui.** Tidak ada trigger `handle_new_user` pada `auth.users`. Akibatnya, pengguna yang dibuat lewat dashboard Supabase Auth memperoleh akun tetapi tidak memperoleh baris `profil`, sehingga dapat masuk namun setiap policy RLS menolaknya dan halaman tampak kosong tanpa penjelasan. Pada lingkungan demo ini tidak menjadi masalah karena akun selalu dibuat lewat skrip yang menuliskan kedua baris sekaligus. Untuk penerapan nyata, trigger tersebut perlu ditambahkan dengan peran bawaan paling sempit, yaitu `orang_tua`, agar salah konfigurasi tidak pernah menghasilkan akses yang lebih luas daripada yang dimaksud.

## KP-30: Pendaftaran anak dipisahkan dari penimbangan

**Keputusan.** Mendaftarkan anak dan mencatat pengukuran adalah dua alur terpisah dengan endpoint berbeda, `/api/anak` dan `/api/pengukuran`. Anak dapat didaftarkan tanpa satu pun catatan penimbangan.

**Alasan.** Meja posyandu adalah tempat yang sibuk dengan antrian yang tidak boleh bertambah panjang. Mengetik identitas lengkap anak baru, yaitu nama, tanggal lahir, jenis kelamin, nama orang tua, nomor telepon, dan alamat, sambil orang lain menunggu akan memperlambat seluruh proses penimbangan.

Pemisahan ini memungkinkan kader mendata anak lebih dahulu, misalnya saat kunjungan rumah atau sebelum hari posyandu, sehingga pada hari pelaksanaan cukup memilih nama dari daftar dan memasukkan dua angka. Halaman orang tua menangani keadaan "belum ada catatan penimbangan" secara eksplisit, bukan menganggapnya galat.

**Yang belum ada, dan diakui.** Cara orang tua ditautkan ke anaknya di lapangan belum dirancang. Penautan dilakukan lewat kolom `anak.orang_tua_id`, dan pada lingkungan demo diisi skrip. Siapa yang berwenang menautkan, serta bagaimana memastikan akun yang ditautkan benar-benar milik orang tua anak tersebut, belum dijawab. Ini bertalian dengan mekanisme persetujuan orang tua yang juga sudah diakui belum ada pada MVP.

Nama yang mirip diperingatkan tetapi tidak ditolak saat pendaftaran. Dua anak bernama sama di satu posyandu adalah kejadian wajar, sehingga penolakan otomatis akan menghalangi pencatatan yang sah. Keputusannya diserahkan kepada kader, yang mengenal warganya.

## KP-31: Antarmuka mengikuti peran, bukan hanya basis datanya

**Keputusan.** Menambahkan pembacaan sesi di sisi server, penyaringan tautan navigasi menurut peran, pengalihan bila peran membuka halaman yang bukan haknya, dan fitur keluar.

**Alasan.** Pemeriksaan menemukan bahwa pemisahan peran hanya ditegakkan di basis data. Setiap halaman memeriksa apakah ada pengguna yang masuk, tetapi tidak memeriksa perannya. Akibatnya terkumpul empat cacat yang saling memperburuk.

Pertama, tidak ada cara keluar. Folder `src/app/api/keluar` ada tetapi kosong, dan `signOut` tidak pernah dipanggil di mana pun. Pengguna yang sudah masuk tidak dapat mengakhiri sesinya dari dalam aplikasi. Satu-satunya cara berpindah peran adalah masuk kembali, yang hanya berhasil karena `signInWithPassword` menimpa sesi sebelumnya.

Kedua, bilah navigasi selalu menampilkan tombol "Masuk", termasuk kepada pengguna yang baru saja masuk. Aplikasi seolah melupakan siapa yang sedang memakainya.

Ketiga, tautan ke halaman semua peran ditampilkan kepada semua orang. Orang tua melihat tautan "Catat" dan "Pemantauan" yang bukan haknya.

Keempat, halaman peran dapat dibuka peran mana pun. Orang tua yang membuka halaman pemantauan bidan mendapat kerangka halaman lengkap dengan isi kosong, sebab RLS menyaring datanya tanpa memberi tahu bahwa ia salah halaman. Yang lebih janggal terjadi pada arah sebaliknya: kader yang membuka halaman orang tua melihat seluruh anak di posyandunya disajikan dengan nada bicara untuk orang tua, lengkap dengan anjuran "bawa anak Anda ke bidan". RLS tidak mencegahnya karena kader memang berhak membaca data itu; yang salah adalah halamannya.

**Batas yang perlu dinyatakan.** Pemeriksaan peran di aplikasi adalah lapisan kejelasan, bukan lapisan keamanan. Penjaga sesungguhnya tetap RLS di basis data, dan itu tidak berubah. Bila pemeriksaan di aplikasi dilewati, pengguna tetap tidak dapat membaca data di luar wewenangnya. Tugas lapisan ini hanya mengantar pengguna ke halaman yang tepat.

Karena itu peran yang salah dialihkan, bukan ditolak dengan pesan galat. Pengguna yang menekan tautan yang bukan haknya lebih tertolong bila diantar ke tempat yang benar daripada dihadapkan pada layar penolakan.

**Rincian rancangan yang menyertainya.**

Keluar dikerjakan lewat Route Handler dengan POST, bukan dari komponen klien. Cookie sesi ditandai httpOnly sehingga hanya server yang dapat menghapusnya; memanggil `signOut()` di peramban akan membersihkan penyimpanan lokal namun meninggalkan cookie, dan pengguna kembali masuk sendiri pada muat berikutnya. Permintaan GET sengaja tidak dilayani, sebab tautan yang dapat diambil peramban akan membuat pengguna keluar tanpa berbuat apa pun, misalnya karena pemuatan awal.

Galat dari `signOut` tidak diteruskan sebagai kegagalan. Bila token sudah kedaluwarsa, Supabase mengembalikan galat padahal hasil yang diinginkan pengguna justru sudah tercapai. Menampilkan pesan gagal pada keadaan itu membuat pengguna mengira dirinya masih masuk.

Pengguna yang memiliki sesi tetapi tidak memiliki baris `profil` tidak dialihkan ke mana pun. Tidak ada halaman peran yang dapat menerimanya, sehingga pengalihan hanya akan memantulkannya berulang kali. Keadaan ini nyata, sebagaimana dicatat pada KP-29.

Pembantu yang tidak membutuhkan konteks permintaan dipisahkan ke `lib/peran.ts`, terpisah dari `lib/sesi.ts` yang menarik `next/headers`. Pemisahan itu membuat aturan siapa boleh membuka apa dapat diuji langsung, dan 17 pengujian baru menegakkannya, termasuk satu yang menangkap keadaan mustahil berupa peran yang dialihkan ke halaman yang justru akan memantulkannya kembali.

## KP-32: Pemeriksaan menyeluruh dan cacat yang ditemukannya

**Keputusan.** Melakukan pemeriksaan menyeluruh atas seluruh proyek sebelum penerapan, lalu memperbaiki cacat yang ditemukan dan menyatakan terbuka yang belum diperbaiki.

**Alasan.** Menjelang tenggat, godaan terbesar adalah menganggap yang sudah berjalan berarti sudah benar. Pengujian yang ada lolos seluruhnya, namun pengujian hanya menegakkan hal yang terpikirkan saat menulisnya. Pemeriksaan ini mencari hal yang tidak terpikirkan.

**Empat cacat paling berbahaya, ketiganya menghasilkan kabar baik yang keliru.**

Stunting tidak dihitung sama sekali untuk anak berusia dua tahun atau lebih yang diukur telentang. Tabel panjang menurut umur dipilih berdasarkan cara ukur, padahal tabel itu hanya memuat usia nol sampai 24 bulan. Anak 30 bulan yang diukur telentang diarahkan ke tabel yang tidak memuat usianya, sehingga Z-score panjang badannya kosong. Anak pendek yang beratnya proporsional keluar sebagai normal, karena satu-satunya indikator yang dapat melihat stunting-nya tidak dihitung. Balita yang belum mau berdiri tegak rutin diukur telentang, dan formulir memang menyediakan pilihannya. Diperbaiki dengan memilih tabel menurut usia dan menyetarakan nilai 0,7 cm sesuai ketentuan WHO.

Nilai bukan angka dilaporkan sebagai normal. Perbandingan penolakan memakai bentuk 
ilai <= 0, yang bernilai salah untuk NaN, sehingga NaN lolos ke perhitungan. Pada klasifikasi, ketiga perbandingan juga bernilai salah untuk NaN, sehingga jatuh ke cabang terakhir yaitu normal. Jalurnya nyata: kader tanpa sinyal mengetik angka yang tidak terbaca, dan perhitungan dilakukan di perangkat tanpa melewati penjaga data di server.

Koreksi angka pada import foto menghasilkan nilai sepuluh kali lebih besar. Kolom menyimpan angka, bukan teks, sehingga koma yang baru diketik selalu hilang: mengetik 12, lalu koma, lalu 5 menghasilkan 125. Pada berat, 125 kg tertangkap sebagai tidak wajar. Pada tinggi, 125 cm adalah nilai yang sah bagi balita, sehingga angka keliru masuk basis data tanpa ada yang menolaknya, lalu menghasilkan status gizi yang salah.

Antrean tanpa sinyal kehilangan data secara diam-diam, di tiga tempat sekaligus. Kegagalan penyimpanan diabaikan sehingga keterangan "tersimpan di perangkat ini" tetap tampil padahal tidak ada yang tersimpan. Entri yang ditolak server dibuang permanen tanpa satu pun pemberitahuan. Entri yang gagal karena sebab yang tidak akan pernah berhasil, misalnya sesi kedaluwarsa, dicoba berulang tanpa batas sehingga antrean menetap selamanya.

**Yang juga diperbaiki.** Usia dihitung dengan getter waktu lokal atas tanggal yang dibentuk sebagai UTC, sehingga kebenarannya bergantung pada zona waktu proses. Tanggal hari ini diisi memakai UTC, sehingga kader yang membuka formulir sebelum jam tujuh pagi mendapat tanggal hari sebelumnya. Nama anak masuk perintah model tanpa pembatas, sehingga narasi ringkasan dapat digiring meski angkanya tidak. Nama anak masuk laporan CSV tanpa penetralan karakter rumus. Batas ukuran foto diperiksa setelah seluruh badan permintaan dibaca ke memori. Wewenang pada dua endpoint hanya ditegakkan basis data, sehingga penolakan muncul sebagai galat server. Tombol keluar tidak melaporkan kegagalan, sehingga pengguna dapat mengira dirinya sudah keluar padahal sesinya masih hidup.

**Yang diakui belum diperbaiki.**

Klasifikasi gizi lebih dan obesitas belum ada. Hanya sisi bawah distribusi yang dinilai, sehingga anak dengan berat menurut tinggi badan pada +4 SD dilaporkan normal. Grafik sudah menggambar garis +2 SD, sehingga bidan dapat melihat anak berada di atasnya sementara status yang tertulis tetap normal. Belum dikerjakan karena menambah indikator berarti mengubah ambang, label, urutan keparahan, dan seluruh pengujiannya, dan perubahan seluas itu menjelang tenggat lebih berisiko daripada kekurangan yang dinyatakan terbuka.

Usia masih dibulatkan ke bawah ke bulan penuh. Akibatnya dijelaskan pada koreksi KP-15.

Koreksi WHO untuk Z di luar rentang tiga simpangan baku belum diterapkan. Ini tidak menggeser ambang penapisan, sebab rumus koreksi dan rumus dasar berpotongan tepat di Z bernilai tiga. Yang menyimpang adalah angka yang dilaporkan untuk anak paling ekstrem, hingga sekitar 2,3 SD, sehingga tidak sebanding dengan keluaran perangkat resmi WHO.

**Cara menegakkannya.** Setiap cacat perhitungan yang diperbaiki disertai pengujian yang menangkapnya, terkumpul pada gizi/perbaikan.test.ts agar dapat dibaca sebagai catatan satu per satu cacat.

## KP-33: Pemeriksaan lanjutan atas pencocokan nama, keselamatan menu, dan kesiapan penerapan

**Keputusan.** Melanjutkan pemeriksaan ke tiga wilayah yang belum tersentuh pemeriksaan pertama, yaitu pencocokan nama, kelayakan saran menu, dan kesiapan berjalan di lingkungan penerapan.

**Alasan.** KP-32 memeriksa perhitungan gizi dan alur luring. Yang tidak diperiksa adalah bagaimana angka yang benar bisa sampai ke anak yang salah, apakah saran makan yang dihasilkan aman bagi bayi, dan apakah yang berjalan di komputer sendiri akan berjalan sama di peladen. Ketiganya menyimpan cacat.

**Data anak dapat tertukar, dan pertukarannya tidak meninggalkan jejak.** Ini temuan paling berbahaya pada seluruh proyek.

Pencocokan nama membandingkan potongan huruf, bukan kata. Anak terdaftar bernama Ani tercocok dengan bacaan Handayani, sebab huruf a-n-i memang bersarang di dalamnya. Bila hanya satu anak yang bersarang seperti itu, sistem memilihnya tanpa bertanya. Pembandingan kini dilakukan pada tingkat kata: seluruh kata pada nama yang lebih pendek harus muncul pada nama yang lebih panjang, dan nama sekata wajib berisi setidaknya empat huruf.

Nama yang seluruhnya tanda baca menjadi pencocok segala. Nama seperti dua titik lolos pendaftaran karena panjangnya memadai, namun menormalkan menjadi kosong, dan setiap nama mengandung string kosong. Satu anak semacam itu di satu posyandu menyerap seluruh baris yang tidak cocok persis. Calon semacam itu kini dibuang sebelum pembandingan, dan pendaftaran mewajibkan nama memuat huruf.

Kecocokan yang sekadar mirip disimpan tanpa persetujuan. Modul pencocokan sendiri menyertakan pesan "mohon pastikan benar" untuk keadaan ini, tetapi pesan itu tidak pernah tersambung ke layar. Balasan penyimpanan pun hanya memuat nama yang dibaca dari foto, bukan nama anak yang menerima angkanya, sehingga kader yang memeriksa dengan teliti pun tidak dapat melihat pertukaran. Kini hanya kecocokan persis yang disimpan otomatis; yang mirip dikembalikan sebagai baris yang perlu keputusan kader, dengan calon terdekat sudah terpilih. Setiap baris yang berhasil menampilkan nama anak tujuan berdampingan dengan nama yang terbaca.

**Saran makan yang perlu diperbaiki.** Hati ayam dianjurkan setiap hari pada status risiko dan berat. Hati sangat padat vitamin A, dan asupan harian yang berulang jauh di atas batas atas tidak aman bagi balita; pedoman pemberian makan umumnya menempatkannya satu sampai dua kali sepekan. Frekuensinya kini dibatasi dua kali sepekan dan dinyatakan pada hidangannya.

Ikan teri kering dianjurkan sebagai lauk harian termasuk untuk bayi enam sampai sebelas bulan, padahal teri diawetkan dengan garam dan anjuran umum adalah tidak menambahkan garam pada makanan bayi di bawah satu tahun. Untuk kelompok itu kini disertai petunjuk merendam dan membuang airnya.

Tidak ada penyebutan air susu ibu sama sekali, padahal menu empat sampai lima kali makan sehari dapat dibaca sebagai penggantinya. Tidak ada pula peringatan alergi, sementara setiap menu memuat telur dan ikan, dua alergen tersering pada anak, dan aplikasi tidak menyimpan riwayat alergi sehingga tidak mungkin menyaringnya. Keduanya kini dinyatakan pada setiap saran.

Biaya menu lebih rendah daripada belanja sebenarnya. Bahan yang muncul di beberapa waktu makan hanya dihitung sekali. Itu benar untuk beras, yang satu takarannya melayani beberapa kali makan, tetapi salah untuk telur: satu butir pada menu pagi dan satu lagi pada menu malam berarti dua butir yang harus dibeli. Bahan kini dibedakan menurut sifatnya. Menu status berat berubah dari 22.800 menjadi 27.100 rupiah, sebab menu itu memuat telur dua kali dan santan dua kali; menu normal dan risiko tidak berubah karena tidak ada bahan per hidangan yang muncul lebih dari sekali. Angkanya naik bukan karena menu menjadi lebih mahal, melainkan karena angkanya menjadi jujur. Perbaikan ini sekaligus meluruskan urutan yang tidak masuk akal: sebelumnya menu untuk anak berstatus berat terhitung lebih murah daripada menu untuk anak berstatus risiko. Biaya yang salah membuat orang tua datang ke pasar dengan uang yang tidak cukup, dan itu kegagalan yang paling merugikan dari fitur ini.

**Yang akan rusak di peladen meski berjalan di komputer sendiri.**

Batasan tanggal pada basis data memakai tanggal peladen, yang berjalan pada UTC. Antara tengah malam dan pukul tujuh pagi Waktu Indonesia Barat, tanggal UTC masih menunjuk hari sebelumnya, sehingga tanggal hari ini yang diisi formulir ditolak basis data. Kader yang mencatat penimbangan pukul setengah tujuh menerima pesan galat server, dan catatannya dapat hilang karena galat semacam itu dianggap kegagalan sementara oleh antrean luring lalu dibuang setelah lima kali percobaan. Diperbaiki lewat migrasi 0008 dengan toleransi satu hari, sama dengan toleransi yang sudah dipakai lapisan validasi, dan pelanggaran batasan kini dijawab sebagai penolakan permanen dengan pesan yang menyebut tanggal.

Batas waktu pemanggilan model dua puluh detik, sedangkan batas durasi fungsi bawaan sepuluh detik. Urutannya keliru: platform mematikan fungsi lebih dahulu, sehingga jalur cadangan yang dibangun khusus untuk keadaan ini tidak pernah dijalankan dan bidan menerima galat gerbang alih-alih ringkasan berbasis templat. Batas waktu diturunkan ke delapan detik dan ketiga rute yang memanggil model menyatakan durasinya sendiri.

Batas ukuran foto enam mebibita berada di atas batas ukuran permintaan peladen, yaitu 4,5 megabita. Gambar di antara kedua angka itu ditolak sebelum kode pemeriksa dijalankan, sehingga kader menerima galat mentah, tepat keadaan yang hendak dihindari catatan di atas batas itu. Batas diturunkan ke tiga mebibita dan gambar diperkecil di peramban sebelum dikirim, yang sekaligus memotong waktu unggah pada koneksi desa.

Tujuh penangan permintaan tidak memeriksa kelengkapan konfigurasi, sedangkan halaman biasa memeriksanya. Bila satu variabel lingkungan terlewat, tampilan terlihat sehat sementara setiap penyimpanan gagal dengan galat tanpa keterangan.

**Yang juga diperbaiki.** Jumlah anak yang sudah ditimbang dihitung dari pengukuran, bukan dari daftar anak, sehingga pengukuran yang anaknya tidak ada di daftar dapat membuat angkanya melebihi jumlah anak terdaftar. Anak yang sudah ditimbang tetapi statusnya tidak dapat dihitung digabung dengan yang belum pernah ditimbang, sehingga satu anak dihitung dua kali dalam dua ember yang saling meniadakan dan laporan menyatakan tiga anak sudah ditimbang berdampingan dengan satu anak belum ditimbang pada total tiga anak. Keadaan itu kini menjadi angka tersendiri dan ditampilkan sebagai hal yang perlu diperiksa, sebab nilai di luar rentang tabel rujukan adalah petunjuk, bukan pertanda baik. Anak yang belum pernah hadir tersortir di dasar daftar berhenti menimbang, di bawah anak yang terakhir hadir tiga bulan lalu, padahal keluarga yang tidak pernah hadir justru sering yang paling berisiko. Tanggal cetak dan nama berkas laporan memakai kalender UTC sehingga laporan yang diunduh pagi bertanggal hari sebelumnya. Penyegaran sesi berjalan pada rute API sehingga setiap permintaan memanggil layanan autentikasi dua kali, dan pengiriman antrean tanpa sinyal yang berjalan satu per satu melipatgandakannya. Tombol keluar tidak melaporkan kegagalan. Pesan keberhasilan pendaftaran anak tidak pernah terlihat karena hanya dirender pada tampilan yang tertutup.

**Cara menegakkannya.** Pengujian pencocokan nama tumbuh dari sembilan belas menjadi dua puluh sembilan, termasuk pasangan nama tidak berkaitan yang sebelumnya tercocok. Pengujian dashboard menambah lima pemeriksaan, di antaranya penjagaan bahwa jumlah ketiga keadaan selalu sama dengan jumlah anak terdaftar. Pengujian menu menambah tiga, termasuk penjagaan bahwa total biaya sama dengan jumlah harga di daftar belanja, sebab dua angka yang dilihat orang tua di tempat berbeda tidak boleh berselisih.

## KP-34: Kueri rekapitulasi diambil bertahap

**Keputusan.** Mengambil daftar anak dan riwayat penimbangan halaman demi halaman, dan menolak menerbitkan angka bila pengambilannya tidak lengkap.

**Konteks.** Tiga tempat mengambil seluruh riwayat penimbangan satu wilayah dalam satu permintaan tanpa menyatakan jangkauan baris: dashboard bidan, laporan CSV, dan ringkasan naratif.

**Alasan.** PostgREST menerapkan batas jumlah baris pada setiap permintaan, umumnya seribu. Ketika batas itu terlampaui tidak ada galat sama sekali; klien hanya menerima lebih sedikit baris daripada yang ada.

Kegagalan yang tidak bersuara itu paling berbahaya di sini, sebab yang terpotong bukan tampilan melainkan angka. Ringkasan dihitung dari senarai yang diterima, sehingga bila riwayat terpotong: anak yang sudah ditimbang tampak belum dinilai, anak yang aktif tampak berhenti menimbang, dan laporan yang berpindah tangan ke dinas kesehatan memuat rekapitulasi yang salah tanpa satu pun tanda bahwa ada yang hilang.

Arah pemotongannya pun paling merugikan. Riwayat diurutkan menaik menurut tanggal, sehingga yang terbuang adalah pengukuran paling baru, yakni justru yang menentukan status terkini setiap anak.

Satu posyandu dengan dua ratus anak yang ditimbang setiap bulan melewati seribu baris dalam waktu kurang dari setahun. Jadi ini bukan persoalan yang menunggu skala besar; ia menunggu waktu berjalan. Pada enam anak data demo, tidak ada yang tampak salah.

**Konsekuensi.** Ketidaklengkapan kini selalu dinyatakan. Halaman bidan menampilkan peringatan di atas seluruh angka, sedangkan laporan dan ringkasan menolak diterbitkan. Menolak lebih baik daripada menerbitkan separuh: berkas laporan yang terunduh tampak sah dan akan disalin ke rekapitulasi dinas kesehatan, sehingga kekeliruannya berpindah ke tempat yang tidak dapat kita perbaiki.

Batas pengaman seratus halaman mencegah kekeliruan pada kueri berubah menjadi penjalanan tanpa henti yang menghabiskan waktu fungsi.

**Yang sengaja tidak diubah.** Halaman orang tua tetap satu permintaan. RLS membatasinya pada anak yang tertaut ke orang tua yang sedang masuk, biasanya satu sampai tiga anak, sedangkan seorang anak paling banyak memiliki enam puluh satu penimbangan sepanjang lima tahun layanan posyandu. Jumlahnya tidak akan mendekati batas.

**Alternatif yang tidak dipilih.** Memindahkan agregasi ke basis data lewat view atau fungsi. Cara itu lebih hemat, sebab yang berpindah ke Node hanya hasil akhirnya, bukan seluruh riwayat. Tidak dipilih sekarang karena berarti memindahkan logika penilaian gizi ke SQL, tempat ia tidak dapat diuji dengan perangkat uji yang sama, dan perhitungan itu bagian paling penting untuk dijaga kebenarannya. Pengambilan bertahap menutup cacatnya tanpa memindahkan apa pun yang berisiko.