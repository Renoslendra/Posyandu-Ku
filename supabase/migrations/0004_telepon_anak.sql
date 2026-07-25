-- Migrasi 0004 — kolom nomor telepon pada tabel anak
--
-- FR-01.1 mencantumkan nomor telepon sebagai field pendaftaran anak, namun
-- kolomnya tidak ada pada skema awal. Tanpa kolom ini, nomor yang dimasukkan
-- kader akan hilang tanpa pemberitahuan.
--
-- Nomor telepon bersifat opsional. Kader sering tidak memilikinya saat
-- penimbangan berlangsung, dan menjadikannya wajib akan menghambat pencatatan.
--
-- Kegunaannya pada penerapan nyata: menghubungi keluarga anak yang berhenti
-- hadir (FR-11). Tanpa nomor, daftar anak yang hilang dari pemantauan hanya
-- dapat ditindaklanjuti lewat kunjungan rumah.

alter table anak
  add column if not exists telepon text;

comment on column anak.telepon is
  'Nomor telepon orang tua, opsional. Dipakai untuk menjangkau kembali anak yang berhenti hadir.';

-- Batas panjang mencegah penyimpanan teks sembarang pada kolom ini.
-- Format nomor sendiri divalidasi Zod di sisi aplikasi; basis data hanya
-- menjaga kewajaran panjangnya.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'telepon_panjang_wajar'
  ) then
    alter table anak
      add constraint telepon_panjang_wajar
      check (telepon is null or char_length(telepon) between 8 and 20);
  end if;
end $$;
