-- Menambahkan status kelebihan gizi pada enum status_gizi.
--
-- Masalahnya. Enum semula hanya memuat sisi bawah distribusi: normal, risiko,
-- dan berat. Akibatnya anak dengan berat menurut tinggi badan pada +4 SD
-- tersimpan sebagai normal, sebab tidak ada nilai lain yang dapat dipakai.
--
-- Kelalaian itu cukup tampak dari antarmuka: grafik pertumbuhan sudah menggambar
-- garis +2 SD, sehingga bidan dapat melihat anak berada jauh di atasnya
-- sementara status yang tertulis di sebelahnya tetap normal.
--
-- Yang lebih merugikan ada di saran menu. Cabang terakhir penyusun menu adalah
-- menu berkalori tertinggi untuk anak kekurangan gizi berat, sehingga anak
-- kelebihan berat yang tercatat sebagai normal akan menerima anjuran yang
-- berlawanan dengan kebutuhannya.
--
-- Keputusannya. Menambahkan dua nilai, bukan satu. Kelebihan berat dan obesitas
-- ditangani berbeda: yang pertama diikuti perkembangannya, yang kedua menuntut
-- pemeriksaan. Menggabungkan keduanya akan menghilangkan pembedaan itu di
-- tingkat data, dan pembedaan yang hilang di data tidak dapat dipulihkan di
-- lapisan mana pun di atasnya.
--
-- Nilai lama tidak diubah dan tidak dihapus, sehingga seluruh baris yang sudah
-- ada tetap sah. Migrasi ini hanya menambah kemungkinan baru.
--
-- Catatan teknis. `alter type ... add value` tidak dapat dijalankan di dalam
-- blok transaksi pada Postgres versi tertentu. Bila SQL Editor menolaknya,
-- jalankan kedua pernyataan di bawah satu per satu.

alter type status_gizi add value if not exists 'lebih';
alter type status_gizi add value if not exists 'obesitas';

comment on type status_gizi is
  'Status gizi hasil penilaian Z-score. Sisi bawah: risiko, berat. Sisi atas: lebih, obesitas. Sisi atas hanya dinilai pada indikator berat menurut panjang atau tinggi badan, sebab berat menurut umur tidak dapat membedakan anak gemuk dari anak yang sekadar tinggi.';
