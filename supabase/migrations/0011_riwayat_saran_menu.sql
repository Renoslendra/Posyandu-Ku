-- Migrasi 0011 — riwayat saran menu
--
-- Masalahnya. Saran menu dipanggil ke penyedia model lalu dibuang. Endpoint
-- `/api/menu` menyusun anjuran, mengembalikannya sebagai JSON, dan tidak
-- menyimpan apa pun. Hasilnya hanya hidup di state React, sehingga memuat ulang
-- halaman menghapusnya.
--
-- Tiga akibat yang nyata bagi pemakai:
--
-- 1. Orang tua tidak dapat membuka kembali menu yang diterimanya pekan lalu.
--    Padahal justru itu bentuk pemakaian yang paling wajar: anjuran makan
--    dibaca berulang saat berbelanja atau memasak, bukan sekali lalu selesai.
-- 2. Menekan tombolnya lagi memanggil model lagi. Itu memakan kuota
--    pembatasan laju untuk memperoleh anjuran yang pada dasarnya sama.
-- 3. Tidak ada jejak anjuran apa yang pernah diberikan sistem. Bila kelak ada
--    keberatan atas suatu anjuran, tidak ada catatan yang dapat diperiksa.
--
-- Bandingkan dengan ringkasan bulanan bidan, yang sejak awal punya tabel
-- penyimpan `ringkasan_bulanan`. Saran menu tidak punya padanannya, dan itu
-- kelalaian, bukan keputusan.
--
-- Keputusannya. Menyimpan hasil utuh sebagai jsonb, bukan memecahnya ke
-- kolom-kolom.
--
-- Alasannya: bentuk keluaran menu masih berubah seiring penambahan penyaringan
-- alergen dan penyesuaian menurut status gizi. Skema kolom yang kaku akan
-- memaksa migrasi tiap kali bentuknya bergeser. Yang perlu dikueri hanyalah
-- anak dan tanggalnya, dan keduanya tetap menjadi kolom tersendiri.

create table if not exists saran_menu (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references anak(id) on delete cascade,

  -- Status gizi anak saat saran disusun. Disimpan terpisah agar riwayat tetap
  -- dapat dipahami setelah status anaknya berubah: anjuran untuk anak berstatus
  -- berat berbeda isinya dari anjuran untuk anak normal, dan tanpa kolom ini
  -- riwayat lama akan tampak tidak masuk akal.
  status status_gizi not null,

  -- Usia dalam bulan saat saran disusun, dengan alasan yang sama.
  usia_bulan integer not null,

  -- Keluaran lengkap: daftar hidangan, daftar belanja, perkiraan biaya,
  -- catatan keselamatan, dan narasi.
  isi jsonb not null,

  -- true bila narasi tersusun dari templat karena penyedia model gagal.
  -- Ditandai agar mutu riwayat dapat dinilai, bukan disamarkan.
  dari_fallback boolean not null default false,

  dibuat_pada timestamptz not null default now(),

  constraint usia_menu_wajar check (usia_bulan >= 0 and usia_bulan <= 60)
);

comment on table saran_menu is
  'Riwayat saran menu per anak. Disimpan agar orang tua dapat membukanya kembali tanpa memanggil model lagi.';

-- Kueri yang selalu dipakai: ambil riwayat satu anak, terbaru dahulu.
create index if not exists saran_menu_anak_waktu_idx
  on saran_menu (anak_id, dibuat_pada desc);

alter table saran_menu enable row level security;

-- Cakupan bacanya sengaja disamakan dengan tabel `pengukuran`: kader dan bidan
-- menurut posyandu yang terjangkau, orang tua hanya anaknya sendiri. Menu
-- memuat keadaan gizi anak, sehingga kerahasiaannya setara data penimbangan.
create policy saran_menu_baca on saran_menu
  for select using (
    anak_id in (
      select id from anak
      where
        posyandu_id in (select posyandu_terjangkau())
        or orang_tua_id = auth.uid()
    )
  );

-- Penulisannya tidak diberikan kepada peran authenticated mana pun. Baris hanya
-- ditulis endpoint `/api/menu` memakai service role, setelah endpoint itu
-- memverifikasi sesi dan hak akses anaknya.
--
-- Alasannya: bila pengguna dapat menulis sendiri ke tabel ini, riwayat anjuran
-- tidak lagi menjadi catatan atas apa yang sistem keluarkan. Isinya bisa
-- dikarang, dan jejaknya kehilangan seluruh gunanya.

grant select on table saran_menu to authenticated;
grant select, insert, update, delete on table saran_menu to service_role;
