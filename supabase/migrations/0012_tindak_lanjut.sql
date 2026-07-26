-- Migrasi 0012 — catatan tindak lanjut
--
-- Masalahnya. Daftar prioritas bidan dihitung ulang setiap halaman dimuat, dari
-- status gizi dan jeda kunjungan. Perhitungannya benar, tetapi ia tidak
-- mengetahui apa pun tentang apa yang sudah dikerjakan bidan.
--
-- Akibatnya, anak yang kemarin sudah ditelepon muncul hari ini dengan tampilan
-- yang sama persis dengan anak yang belum disentuh sama sekali. Tombol telepon
-- pada daftar "berhenti menimbang" tidak meninggalkan jejak apa pun setelah
-- ditekan.
--
-- Ini melemahkan justru fitur yang paling membedakan produk ini. Mendeteksi anak
-- yang berhenti hadir hanya berguna bila deteksinya berujung pada tindakan, dan
-- tindakan tidak dapat dikelola bila tidak ada yang mencatat sudah sampai mana.
-- Pada posyandu dengan puluhan anak, daftar tanpa penanda akan ditinggalkan
-- karena bidan tidak dapat membedakan sisa pekerjaan dari yang sudah selesai.
--
-- Keputusannya. Mencatat tindak lanjut sebagai kejadian bertanggal, bukan
-- sebagai kolom status pada tabel anak.
--
-- Alasannya: satu anak dapat dihubungi berulang kali sepanjang tahun, dan yang
-- perlu diketahui bukan hanya "sudah atau belum", melainkan kapan terakhir dan
-- apa hasilnya. Kolom boolean pada tabel anak akan menimpa riwayatnya setiap
-- kali diperbarui, sehingga pertanyaan "sudah berapa kali keluarga ini
-- dihubungi tanpa hasil" tidak dapat dijawab.
--
-- Yang sengaja TIDAK dibangun di sini: penjadwalan, pengingat, dan penugasan
-- antar petugas. Ketiganya memerlukan pemikiran tentang alur kerja posyandu
-- yang belum diuji terhadap pemakai sungguhan.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'jenis_tindak_lanjut') then
    create type jenis_tindak_lanjut as enum (
      -- Dihubungi lewat telepon.
      'ditelepon',
      -- Dikunjungi ke rumah oleh kader.
      'dikunjungi',
      -- Sudah datang dan diperiksa.
      'hadir',
      -- Tidak berhasil dihubungi: nomor tidak aktif, rumah kosong, pindah.
      'tidak_terjangkau'
    );
  end if;
end
$$;

create table if not exists tindak_lanjut (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references anak(id) on delete cascade,

  jenis jenis_tindak_lanjut not null,

  -- Catatan bebas dari petugas. Dibiarkan opsional karena mewajibkannya akan
  -- membuat pencatatan terasa membebani, dan pencatatan yang terasa membebani
  -- akan dilewati.
  catatan text,

  -- Siapa yang mencatat. Tidak memakai on delete cascade: menghapus akun
  -- petugas tidak boleh menghapus riwayat tindak lanjut yang pernah terjadi.
  dicatat_oleh uuid references profil(id) on delete set null,

  dibuat_pada timestamptz not null default now(),

  constraint catatan_tidak_kosong check (catatan is null or length(trim(catatan)) > 0)
);

comment on table tindak_lanjut is
  'Riwayat tindakan atas anak yang perlu perhatian. Dicatat sebagai kejadian bertanggal agar upaya berulang tetap terlihat.';

create index if not exists tindak_lanjut_anak_waktu_idx
  on tindak_lanjut (anak_id, dibuat_pada desc);

alter table tindak_lanjut enable row level security;

-- Kader dan bidan membaca menurut posyandu yang terjangkau.
--
-- Orang tua sengaja TIDAK diberi akses baca. Catatan di sini ditulis petugas
-- untuk petugas, dan dapat memuat penilaian mengenai keadaan keluarga yang
-- tidak semestinya terbaca keluarga itu sendiri tanpa perantara. Membukanya
-- akan mengubah cara petugas menulis, dan catatan yang ditulis dengan hati-hati
-- agar aman dibaca kehilangan gunanya sebagai catatan kerja.
create policy tindak_lanjut_baca on tindak_lanjut
  for select using (
    anak_id in (
      select id from anak where posyandu_id in (select posyandu_terjangkau())
    )
  );

-- Kader dan bidan sama-sama boleh mencatat. Berbeda dari tabel pengukuran yang
-- penulisannya dibatasi pada kader: menelepon keluarga dan mencatat hasilnya
-- adalah pekerjaan bidan, sedangkan mengukur berat badan bukan.
create policy tindak_lanjut_tulis on tindak_lanjut
  for insert with check (
    auth_peran() in ('kader', 'bidan')
    and dicatat_oleh = auth.uid()
    and anak_id in (
      select id from anak where posyandu_id in (select posyandu_terjangkau())
    )
  );

-- Penyuntingan dan penghapusan tidak diberikan kepada siapa pun. Catatan
-- tindak lanjut adalah rekaman atas apa yang terjadi; mengubahnya di belakang
-- hari akan menghapus perbedaan antara catatan dan cerita. Kekeliruan
-- diperbaiki dengan menambahkan catatan baru.

grant select, insert on table tindak_lanjut to authenticated;
grant select, insert, update, delete on table tindak_lanjut to service_role;
