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
