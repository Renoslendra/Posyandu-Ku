-- PosyanduKu — skema awal
-- Referensi: FR-04 (manajemen data), FR-05 (autentikasi & otorisasi),
-- FR-10 (provenance), FR-12 (penjaga kualitas data), FR-13 (offline sync).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

-- Peran pengguna. Menentukan cakupan data yang boleh diakses (FR-05).
create type user_role as enum ('kader', 'bidan', 'orang_tua');

create type sex as enum ('L', 'P');

-- Status gizi hasil klasifikasi Z-score. Dihitung kode deterministik,
-- bukan LLM. Ambang batas ada di src/lib/gizi/ambang.ts.
create type status_gizi as enum ('normal', 'risiko', 'berat');

-- Asal data. Nilai dari ekstraksi AI wajib dikonfirmasi kader sebelum
-- dihitung ke statistik (FR-10.5).
create type sumber_data as enum ('manual', 'ocr_ai');

-- ---------------------------------------------------------------------------
-- Wilayah & unit layanan
-- ---------------------------------------------------------------------------

create table wilayah (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kecamatan text not null,
  kabupaten text not null,
  created_at timestamptz not null default now()
);

create table posyandu (
  id uuid primary key default gen_random_uuid(),
  wilayah_id uuid not null references wilayah(id) on delete restrict,
  nama text not null,
  alamat text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profil pengguna
-- ---------------------------------------------------------------------------

-- Satu baris per pengguna Supabase Auth. Kata sandi dikelola Supabase,
-- tidak pernah disimpan di tabel aplikasi (NFR-03.1).
create table profil (
  id uuid primary key references auth.users(id) on delete cascade,
  peran user_role not null,
  nama text not null,
  telepon text,
  -- Kader terikat pada satu posyandu, bidan pada satu wilayah.
  posyandu_id uuid references posyandu(id) on delete set null,
  wilayah_id uuid references wilayah(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint kader_wajib_punya_posyandu
    check (peran <> 'kader' or posyandu_id is not null),
  constraint bidan_wajib_punya_wilayah
    check (peran <> 'bidan' or wilayah_id is not null)
);

-- ---------------------------------------------------------------------------
-- Anak
-- ---------------------------------------------------------------------------

create table anak (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references posyandu(id) on delete restrict,
  nama text not null,
  tanggal_lahir date not null,
  jenis_kelamin sex not null,
  nama_orang_tua text not null,
  -- Ditautkan bila orang tua memiliki akun. Dasar isolasi data orang tua.
  orang_tua_id uuid references profil(id) on delete set null,
  alamat text,
  created_at timestamptz not null default now(),

  constraint tanggal_lahir_tidak_di_masa_depan
    check (tanggal_lahir <= current_date)
);

-- ---------------------------------------------------------------------------
-- Pengukuran
-- ---------------------------------------------------------------------------

create table pengukuran (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references anak(id) on delete cascade,
  tanggal date not null,
  berat_kg numeric(5, 2) not null,
  tinggi_cm numeric(5, 1) not null,
  -- true bila tinggi diukur telentang (panjang badan, umumnya usia < 24 bulan).
  -- Menentukan pemilihan tabel BB/PB atau BB/TB.
  diukur_telentang boolean not null default false,

  usia_bulan integer not null,

  -- Hasil perhitungan deterministik. Disimpan agar dashboard tidak perlu
  -- menghitung ulang, dan agar riwayat klasifikasi dapat diaudit.
  z_bb_u numeric(5, 2),
  z_tb_u numeric(5, 2),
  z_bb_tb numeric(5, 2),
  status status_gizi,

  -- Provenance (FR-10.4). Nilai ocr_ai tidak dihitung ke statistik
  -- selama dikonfirmasi masih false (FR-10.5).
  sumber sumber_data not null default 'manual',
  dikonfirmasi boolean not null default true,

  -- Penanda dari penjaga kualitas data (FR-12). Berisi kode peringatan
  -- seperti 'tinggi_menurun' atau 'lonjakan_berat'.
  penanda text[] not null default '{}',

  dicatat_oleh uuid references profil(id) on delete set null,
  -- Idempotency key untuk sinkronisasi offline (FR-13.3). Mencegah data
  -- ganda saat klien mengirim ulang antrean setelah koneksi kembali.
  klien_ref text,
  created_at timestamptz not null default now(),

  constraint tanggal_tidak_di_masa_depan check (tanggal <= current_date),
  constraint berat_wajar check (berat_kg between 0.5 and 30),
  constraint tinggi_wajar check (tinggi_cm between 30 and 130),
  constraint usia_dilayani check (usia_bulan between 0 and 60),
  -- Data hasil ekstraksi AI tidak boleh langsung dianggap terkonfirmasi.
  constraint ocr_awalnya_belum_dikonfirmasi
    check (sumber = 'manual' or dikonfirmasi is not null),
  constraint klien_ref_unik unique (anak_id, klien_ref)
);

-- ---------------------------------------------------------------------------
-- Ringkasan LLM
-- ---------------------------------------------------------------------------

create table ringkasan_bulanan (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references posyandu(id) on delete cascade,
  periode date not null,
  isi text not null,
  -- true bila disusun template deterministik karena LLM gagal.
  dari_fallback boolean not null default false,
  created_at timestamptz not null default now(),

  constraint periode_unik unique (posyandu_id, periode)
);

-- ---------------------------------------------------------------------------
-- Indeks
-- ---------------------------------------------------------------------------

create index idx_anak_posyandu on anak (posyandu_id);
create index idx_anak_orang_tua on anak (orang_tua_id);
create index idx_pengukuran_anak_tanggal on pengukuran (anak_id, tanggal desc);
create index idx_pengukuran_status on pengukuran (status)
  where dikonfirmasi = true;
create index idx_posyandu_wilayah on posyandu (wilayah_id);
create index idx_profil_posyandu on profil (posyandu_id);
