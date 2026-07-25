-- PosyanduKu — Row Level Security
-- Referensi: FR-05, NFR-03.2. Diuji lewat skrip uji lintas pengguna.
--
-- Aturan cakupan:
--   kader      -> hanya posyandu tempat ia bertugas
--   bidan      -> semua posyandu di wilayahnya
--   orang_tua  -> hanya anak yang tertaut padanya

-- ---------------------------------------------------------------------------
-- Fungsi bantu
-- ---------------------------------------------------------------------------
-- security definer agar policy dapat membaca tabel profil tanpa terjebak
-- rekursi policy. search_path dikunci untuk mencegah pembajakan resolusi nama.

create or replace function auth_peran()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select peran from profil where id = auth.uid();
$$;

create or replace function auth_posyandu_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select posyandu_id from profil where id = auth.uid();
$$;

create or replace function auth_wilayah_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select wilayah_id from profil where id = auth.uid();
$$;

-- Kumpulan posyandu yang boleh diakses pengguna saat ini.
create or replace function posyandu_terjangkau()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from posyandu p
  where
    case auth_peran()
      when 'kader' then p.id = auth_posyandu_id()
      when 'bidan' then p.wilayah_id = auth_wilayah_id()
      else false
    end;
$$;

-- ---------------------------------------------------------------------------
-- Aktifkan RLS
-- ---------------------------------------------------------------------------

alter table wilayah            enable row level security;
alter table posyandu           enable row level security;
alter table profil             enable row level security;
alter table anak               enable row level security;
alter table pengukuran         enable row level security;
alter table ringkasan_bulanan  enable row level security;

-- Tanpa policy, RLS menolak semua akses. Setiap policy di bawah bersifat
-- menambahkan izin, bukan mengurangi.

-- ---------------------------------------------------------------------------
-- profil
-- ---------------------------------------------------------------------------

create policy profil_baca_sendiri on profil
  for select using (id = auth.uid());

create policy profil_ubah_sendiri on profil
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- wilayah & posyandu (referensi, hanya baca)
-- ---------------------------------------------------------------------------

create policy posyandu_baca on posyandu
  for select using (id in (select posyandu_terjangkau()));

create policy wilayah_baca on wilayah
  for select using (
    case auth_peran()
      when 'bidan' then id = auth_wilayah_id()
      when 'kader' then id = (
        select wilayah_id from posyandu where id = auth_posyandu_id()
      )
      else false
    end
  );

-- ---------------------------------------------------------------------------
-- anak
-- ---------------------------------------------------------------------------

create policy anak_baca on anak
  for select using (
    posyandu_id in (select posyandu_terjangkau())
    -- Orang tua hanya melihat anaknya sendiri.
    or orang_tua_id = auth.uid()
  );

-- Hanya kader yang mencatat anak baru, dan hanya di posyandunya.
create policy anak_tulis_kader on anak
  for insert with check (
    auth_peran() = 'kader' and posyandu_id = auth_posyandu_id()
  );

create policy anak_ubah_kader on anak
  for update using (
    auth_peran() = 'kader' and posyandu_id = auth_posyandu_id()
  ) with check (
    auth_peran() = 'kader' and posyandu_id = auth_posyandu_id()
  );

-- ---------------------------------------------------------------------------
-- pengukuran
-- ---------------------------------------------------------------------------

create policy pengukuran_baca on pengukuran
  for select using (
    anak_id in (
      select id from anak
      where posyandu_id in (select posyandu_terjangkau())
         or orang_tua_id = auth.uid()
    )
  );

create policy pengukuran_tulis_kader on pengukuran
  for insert with check (
    auth_peran() = 'kader'
    and anak_id in (
      select id from anak where posyandu_id = auth_posyandu_id()
    )
  );

create policy pengukuran_ubah_kader on pengukuran
  for update using (
    auth_peran() = 'kader'
    and anak_id in (
      select id from anak where posyandu_id = auth_posyandu_id()
    )
  ) with check (
    auth_peran() = 'kader'
    and anak_id in (
      select id from anak where posyandu_id = auth_posyandu_id()
    )
  );

-- ---------------------------------------------------------------------------
-- ringkasan_bulanan
-- ---------------------------------------------------------------------------

create policy ringkasan_baca on ringkasan_bulanan
  for select using (posyandu_id in (select posyandu_terjangkau()));

-- Ringkasan disusun server route memakai service role, sehingga tidak
-- memerlukan policy insert untuk pengguna biasa.
