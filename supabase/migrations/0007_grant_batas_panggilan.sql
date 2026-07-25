-- Migrasi 0007 — hak akses untuk tabel batas_panggilan
--
-- Kelalaian yang diperbaiki: migrasi 0005 membuat tabel `batas_panggilan`
-- tanpa menyertakan GRANT untuk role `service_role`.
--
-- Migrasi 0003 memberikan `all privileges on all tables`, namun perintah itu
-- hanya berlaku untuk tabel yang sudah ada saat dijalankan. Tabel yang dibuat
-- kemudian tidak menerima hak apa pun. Peringatan mengenai hal ini sudah
-- tertulis di akhir migrasi 0003, dan tetap terlewat.
--
-- Akibatnya: skrip terminal tidak dapat membaca maupun membersihkan tabel
-- penghitung, sehingga uji `scripts/uji-batas-laju.mjs` gagal pada pemeriksaan
-- terakhir.
--
-- Yang penting dicatat: pembatasan lajunya sendiri tetap bekerja selama ini.
-- Fungsi `catat_panggilan` berjalan sebagai security definer, sehingga ia
-- menulis dengan hak pemiliknya dan tidak terpengaruh GRANT. Yang terhalang
-- hanyalah akses dari skrip terminal.
--
-- Role `authenticated` sengaja TIDAK diberi hak apa pun atas tabel ini. Akses
-- baca membuka jalan untuk mengetahui, lalu mengosongkan, penghitung sendiri.

grant select, insert, update, delete on table batas_panggilan to service_role;

-- Pernyataan berikut mencegah kelalaian yang sama terulang: tabel yang dibuat
-- kemudian akan otomatis menerima hak untuk service_role.
--
-- Berlaku hanya untuk tabel yang dibuat oleh role yang menjalankan perintah
-- ini, dan itu memadai karena seluruh migrasi dijalankan lewat SQL Editor
-- dengan role yang sama.
alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant all on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;
