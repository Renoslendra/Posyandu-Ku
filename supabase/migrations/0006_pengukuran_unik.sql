-- Migrasi 0006 — mencegah pengukuran ganda pada tanggal yang sama
--
-- Bug yang diperbaiki, ditemukan oleh scripts/uji-import.mjs:
--
-- Batasan `klien_ref_unik unique (anak_id, klien_ref)` pada migrasi 0001 tidak
-- menghalangi data ganda ketika klien_ref bernilai null. PostgreSQL
-- memperlakukan setiap NULL sebagai nilai yang berbeda, sehingga dua baris
-- dengan klien_ref null selalu dianggap tidak sama.
--
-- Batasan itu memang bekerja untuk antrean luring, yang selalu mengirim
-- klien_ref. Namun jalur import foto tidak memilikinya, sehingga kader yang
-- memfoto halaman yang sama dua kali akan menyimpan pengukuran ganda.
--
-- Akibatnya bukan sekadar baris berlebih: dua pengukuran pada tanggal sama
-- membuat deteksi berat stagnan membandingkan nilai dengan dirinya sendiri,
-- dan grafik pertumbuhan menampilkan dua titik bertumpuk.
--
-- Aturan yang ditegakkan: satu anak hanya boleh memiliki satu pengukuran per
-- tanggal. Penimbangan ulang pada hari yang sama adalah koreksi, bukan
-- pengukuran baru, sehingga seharusnya mengubah baris yang ada.

-- Membersihkan data ganda yang mungkin sudah ada, menyisakan yang terbaru.
-- Dijalankan lebih dulu karena batasan unik tidak dapat dibuat bila
-- pelanggarannya masih ada.
delete from pengukuran p
using pengukuran lain
where p.anak_id = lain.anak_id
  and p.tanggal = lain.tanggal
  and p.created_at < lain.created_at;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pengukuran_satu_per_tanggal'
  ) then
    alter table pengukuran
      add constraint pengukuran_satu_per_tanggal unique (anak_id, tanggal);
  end if;
end $$;

comment on constraint pengukuran_satu_per_tanggal on pengukuran is
  'Satu anak hanya memiliki satu pengukuran per tanggal. Melindungi deteksi pola dan grafik pertumbuhan dari data ganda.';

-- Membetulkan batasan yang tidak menegakkan apa pun.
--
-- `ocr_awalnya_belum_dikonfirmasi` pada migrasi 0001 berbunyi:
--   check (sumber = 'manual' or dikonfirmasi is not null)
--
-- Kolom `dikonfirmasi` bertipe not null, sehingga bagian kanan selalu benar dan
-- batasannya tidak pernah menolak apa pun. Komentarnya menjanjikan sesuatu yang
-- tidak terjadi, dan batasan yang menjanjikan lebih dari yang ditegakkan lebih
-- berbahaya daripada tidak ada batasan, karena pembaca berikutnya akan
-- mengandalkannya.
--
-- Jaminan yang sesungguhnya berada di lapisan aplikasi: endpoint /api/import-foto
-- tidak menulis apa pun, dan /api/import-simpan hanya dapat dipanggil setelah
-- kader melihat tabel koreksi. Jejak asalnya tetap tersimpan pada kolom `sumber`
-- sehingga nilai hasil pembacaan mesin selalu dapat dibedakan (FR-10.4).
--
-- Batasan lama dihapus dan digantikan komentar yang menyatakan keadaan
-- sebenarnya, alih-alih dibiarkan memberi rasa aman yang keliru.
alter table pengukuran
  drop constraint if exists ocr_awalnya_belum_dikonfirmasi;

comment on column pengukuran.sumber is
  'Jejak asal nilai: manual bila dicatat langsung kader, ocr_ai bila berasal dari pembacaan foto. Nilai ocr_ai hanya tersimpan setelah kader memeriksanya lewat tabel koreksi; penegakannya di lapisan aplikasi, bukan basis data.';
