-- PosyanduKu — pemberian hak akses eksplisit ke role Data API
--
-- Mengapa berkas ini ada:
--
-- Pengaturan proyek "Automatically expose new tables" dimatikan, sesuai prinsip
-- menutup akses secara bawaan pada data kesehatan anak. Konsekuensinya, tabel
-- baru tidak menerima hak akses apa pun untuk role `anon` dan `authenticated`,
-- sehingga tertutup total bahkan bagi pengguna yang sudah masuk.
--
-- Migrasi 0001 dan 0002 mengandalkan pemberian hak otomatis tersebut, dan itu
-- kelalaian: hak akses seharusnya dinyatakan eksplisit di dalam migrasi, bukan
-- bergantung pada pengaturan dashboard yang tidak terlihat di dalam kode.
--
-- Berkas ini memperbaikinya. Perlu dipahami perbedaan dua lapisan berikut:
--
--   GRANT  -> menentukan tabel dan operasi apa yang MUNGKIN diakses role
--   RLS    -> menentukan BARIS mana yang boleh diakses tiap pengguna
--
-- GRANT tanpa RLS berarti terbuka. RLS tanpa GRANT berarti tertutup total.
-- Keduanya diperlukan: GRANT membuka pintu, RLS memilih siapa yang lewat.
-- Kebijakan RLS pada 0002 tetap menjadi penentu akhir.

-- ---------------------------------------------------------------------------
-- Role anon: pengguna yang belum masuk
-- ---------------------------------------------------------------------------
--
-- Tidak diberi hak apa pun pada tabel berisi data anak. Pengguna tanpa sesi
-- tidak memiliki alasan membaca data kesehatan.
--
-- Hak `usage` pada skema tetap diperlukan agar proses masuk dapat berjalan.

grant usage on schema public to anon;

-- ---------------------------------------------------------------------------
-- Role authenticated: pengguna yang sudah masuk
-- ---------------------------------------------------------------------------
--
-- Diberi hak pada tabel yang relevan. Baris mana yang benar-benar terlihat
-- tetap ditentukan kebijakan RLS pada 0002, bukan oleh GRANT ini.

grant usage on schema public to authenticated;

-- Data referensi: cukup dibaca.
grant select on table wilayah to authenticated;
grant select on table posyandu to authenticated;

-- Profil: pengguna membaca dan memperbarui miliknya sendiri.
grant select, update on table profil to authenticated;

-- Anak: kader mencatat dan memperbarui; peran lain dibatasi RLS.
grant select, insert, update on table anak to authenticated;

-- Pengukuran: kader mencatat; penghapusan tidak diberikan karena riwayat
-- pertumbuhan tidak boleh hilang, dan koreksi dilakukan lewat update.
grant select, insert, update on table pengukuran to authenticated;

-- Ringkasan: dibaca bidan. Penulisan dilakukan server memakai service role.
grant select on table ringkasan_bulanan to authenticated;

-- ---------------------------------------------------------------------------
-- Fungsi bantu
-- ---------------------------------------------------------------------------
--
-- Dipanggil dari dalam kebijakan RLS, sehingga perlu dapat dieksekusi.

grant execute on function auth_peran() to authenticated;
grant execute on function auth_posyandu_id() to authenticated;
grant execute on function auth_wilayah_id() to authenticated;
grant execute on function posyandu_terjangkau() to authenticated;

-- ---------------------------------------------------------------------------
-- Role service_role: skrip terminal
-- ---------------------------------------------------------------------------
--
-- Role ini melewati RLS, tetapi tetap memerlukan hak akses tabel. Anggapan
-- bahwa service_role otomatis memiliki hak penuh hanya berlaku bila pengaturan
-- pemberian hak otomatis aktif; pada proyek ini pengaturan tersebut dimatikan,
-- sehingga haknya harus dinyatakan di sini juga.
--
-- Dipakai skrip seed dan uji RLS di terminal, tidak pernah dikirim ke peramban.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Catatan
-- ---------------------------------------------------------------------------
--
-- Tabel yang ditambahkan kemudian WAJIB menyertakan GRANT di migrasinya
-- sendiri. Bila tidak, tabel tersebut akan tertutup total dan galat yang muncul
-- ("permission denied for table") tidak menunjukkan penyebabnya secara langsung.
