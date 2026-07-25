-- Menyelaraskan batasan tanggal dengan zona waktu pemakainya.
--
-- Masalahnya. Batasan `tanggal <= current_date` pada 0001 dievaluasi memakai
-- zona waktu sesi Postgres, dan Supabase menjalankannya pada UTC. Waktu
-- Indonesia Barat mendahului UTC tujuh jam, sehingga antara pukul 00.00 dan
-- 07.00 WIB `current_date` masih menunjuk hari sebelumnya menurut kalender
-- kader.
--
-- Akibatnya. Formulir mengisi tanggal hari ini menurut jam perangkat kader,
-- validasi di aplikasi meloloskannya karena memang memberi toleransi satu
-- hari, lalu basis data menolaknya. Kader yang mencatat penimbangan pukul
-- 06.30 menerima pesan "Gagal menyimpan pengukuran", dan tidak ada dalam pesan
-- itu yang menunjukkan penyebabnya. Penimbangan posyandu yang dimulai selepas
-- subuh bukan hal aneh, sehingga jendela rusaknya justru bertepatan dengan
-- jam kerja sesungguhnya.
--
-- Yang lebih buruk, catatan yang gagal itu dapat hilang. Galat 500 tidak
-- termasuk penolakan permanen pada antrean luring, sehingga entri dicoba
-- berulang sampai batas percobaan lalu dibuang.
--
-- Keputusannya. Memberi toleransi satu hari pada kedua batasan, sama dengan
-- toleransi yang sudah dipakai lapisan validasi. Batasan ini ada untuk
-- menangkal kekeliruan pengetikan tahun, misalnya 2027 alih-alih 2026, dan
-- kemampuan itu tidak berkurang sedikit pun oleh kelonggaran satu hari.
--
-- Alternatif yang tidak dipilih: menetapkan zona waktu Asia/Jakarta pada
-- basis data. Cara itu memperbaiki kasus Indonesia tetapi memindahkan
-- kerapuhannya, bukan menghilangkannya, dan akan salah kembali bila aplikasi
-- ini dipakai di zona waktu Indonesia tengah atau timur.

alter table pengukuran
  drop constraint if exists tanggal_tidak_di_masa_depan;

alter table pengukuran
  add constraint tanggal_tidak_di_masa_depan
  check (tanggal <= current_date + 1);

alter table anak
  drop constraint if exists tanggal_lahir_tidak_di_masa_depan;

alter table anak
  add constraint tanggal_lahir_tidak_di_masa_depan
  check (tanggal_lahir <= current_date + 1);

comment on constraint tanggal_tidak_di_masa_depan on pengukuran is
  'Toleransi satu hari untuk selisih zona waktu antara perangkat kader dan basis data. Lihat 0008.';

comment on constraint tanggal_lahir_tidak_di_masa_depan on anak is
  'Toleransi satu hari untuk selisih zona waktu antara perangkat kader dan basis data. Lihat 0008.';
