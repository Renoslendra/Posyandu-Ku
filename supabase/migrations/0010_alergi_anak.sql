-- Menambahkan catatan alergi pangan pada data anak.
--
-- Masalahnya. Setiap saran menu memuat telur, dan hampir semuanya memuat ikan.
-- Keduanya termasuk pemicu alergi pangan tersering pada anak. Aplikasi tidak
-- menyimpan riwayat alergi sama sekali, sehingga penyusun menu tidak mungkin
-- menyaringnya, dan orang tua yang anaknya pernah bereaksi terhadap telur tetap
-- menerima anjuran memberi telur setiap pagi.
--
-- Perbaikan sementara sudah dilakukan di lapisan tampilan berupa catatan umum
-- yang meminta orang tua menghentikan bahan itu bila anak pernah bereaksi.
-- Catatan itu perlu, tetapi tidak cukup: ia mengalihkan tanggung jawab kepada
-- orang tua atas hal yang sudah diketahui kader dan tercatat di buku posyandu.
--
-- Keputusannya. Menyimpannya sebagai daftar teks bebas, bukan enum.
--
-- Alasannya: alergi pangan yang mungkin dicatat kader tidak terbatas pada daftar
-- yang dapat kita susun sekarang, dan enum yang terlalu sempit akan memaksa
-- kader menuliskannya di kolom lain atau tidak menuliskannya sama sekali. Yang
-- kedua lebih berbahaya. Penyaringan menu tetap bekerja dengan mencocokkan nama
-- bahan terhadap daftar ini.
--
-- Kolom bersifat opsional. Mewajibkannya akan menghambat pendaftaran anak, dan
-- ketiadaan catatan alergi memang keadaan yang paling lazim.

alter table anak
  add column if not exists alergi text[] not null default '{}';

comment on column anak.alergi is
  'Daftar bahan pangan yang perlu dihindari, sebagaimana dicatat kader. Dipakai menyaring saran menu. Teks bebas karena kemungkinannya tidak terbatas pada daftar tertutup.';

-- Hak akses menyusul kolom, bukan tabel, sehingga tidak ada grant baru yang
-- diperlukan: kebijakan dan hak pada tabel anak sudah mencakup seluruh kolomnya.
