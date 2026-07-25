-- Migrasi 0005 — pembatasan laju yang bertahan lintas invocation
--
-- Masalah yang diperbaiki: pembatasan laju sebelumnya menyimpan catatan
-- panggilan di memori proses Node. Pada lingkungan serverless seperti Vercel,
-- setiap permintaan dapat dilayani proses yang berbeda, sehingga catatan itu
-- hilang dan batasnya tidak benar-benar ditegakkan.
--
-- Yang dilindungi adalah biaya API penyedia model, bukan data. Namun batas yang
-- tidak berfungsi lebih buruk daripada tidak ada batas, karena menciptakan
-- keyakinan yang salah.
--
-- Penyimpanan memakai basis data alih-alih Redis agar tidak menambah layanan
-- baru. Volumenya kecil: satu baris per pengguna per endpoint.

create table if not exists batas_panggilan (
  pengguna_id uuid not null references profil(id) on delete cascade,
  -- Nama endpoint, misalnya 'ringkasan' atau 'menu'. Batas dihitung per
  -- endpoint karena biaya tiap panggilan berbeda.
  endpoint text not null,
  -- Awal jendela penghitungan yang sedang berjalan.
  jendela_mulai timestamptz not null default now(),
  jumlah integer not null default 0,

  primary key (pengguna_id, endpoint),

  constraint jumlah_tidak_negatif check (jumlah >= 0)
);

comment on table batas_panggilan is
  'Penghitung pembatasan laju endpoint LLM. Bertahan lintas invocation serverless.';

alter table batas_panggilan enable row level security;

-- Tidak ada kebijakan untuk peran authenticated: tabel ini hanya diakses
-- melalui fungsi di bawah, yang berjalan dengan hak pemiliknya. Pengguna tidak
-- boleh membaca maupun mengubah penghitungnya sendiri, karena itu akan
-- membuka jalan untuk mengosongkannya.

/*
 * Mencatat satu panggilan dan mengembalikan apakah batas terlampaui.
 *
 * Dijalankan sebagai security definer agar dapat menulis ke tabel yang
 * tertutup bagi pengguna. Pemeriksaan dan penambahan terjadi dalam satu
 * pernyataan, sehingga dua permintaan yang datang bersamaan tidak dapat
 * sama-sama lolos melewati batas.
 *
 * Mengembalikan true bila panggilan DITOLAK.
 */
create or replace function catat_panggilan(
  nama_endpoint text,
  batas integer,
  jendela_detik integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  jumlah_kini integer;
begin
  if auth.uid() is null then
    -- Tanpa sesi, penghitungan tidak dapat dikaitkan ke siapa pun.
    -- Penolakan di sini bersifat pertahanan berlapis; endpoint sudah
    -- memeriksa sesi lebih dulu.
    return true;
  end if;

  insert into batas_panggilan (pengguna_id, endpoint, jendela_mulai, jumlah)
  values (auth.uid(), nama_endpoint, now(), 1)
  on conflict (pengguna_id, endpoint) do update
    set
      -- Jendela yang sudah kedaluwarsa dimulai ulang, bukan diakumulasi.
      jendela_mulai = case
        when batas_panggilan.jendela_mulai < now() - make_interval(secs => jendela_detik)
          then now()
        else batas_panggilan.jendela_mulai
      end,
      jumlah = case
        when batas_panggilan.jendela_mulai < now() - make_interval(secs => jendela_detik)
          then 1
        else batas_panggilan.jumlah + 1
      end
  returning jumlah into jumlah_kini;

  return jumlah_kini > batas;
end;
$$;

comment on function catat_panggilan is
  'Mencatat satu panggilan endpoint. Mengembalikan true bila batas terlampaui.';

revoke all on function catat_panggilan(text, integer, integer) from public;
grant execute on function catat_panggilan(text, integer, integer) to authenticated;
