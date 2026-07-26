import Link from "next/link";
import { notFound } from "next/navigation";
import { FormEditAnak } from "@/components/FormEditAnak";
import { GrafikPertumbuhan } from "@/components/GrafikPertumbuhan";
import { LencanaStatus } from "@/components/LencanaStatus";
import { BilahNavigasi } from "@/components/BilahNavigasi";
import { Footer } from "@/components/Footer";
import { PagarBelumMasuk, PagarBelumTerhubung } from "@/components/Pagar";
import { SaranMenu } from "@/components/SaranMenu";
import { wajibPeran } from "@/lib/sesi";
import { analisisPola, statusPemantauan } from "@/lib/gizi/pola";
import {
  pilihIndikatorPanjangUsia,
  setarakanPanjangTinggi,
  type JenisKelamin,
} from "@/lib/gizi/zscore";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";
import { tanggalIndonesiaSingkat } from "@/lib/tanggal";
import type { StatusGizi } from "@/lib/gizi/zscore";

/**
 * Profil satu anak: riwayat pengukuran dan grafik pertumbuhan.
 *
 * Halaman ini yang dibuka bidan setelah melihat daftar prioritas, dan yang
 * ditunjukkan kepada orang tua. Karena itu grafiknya diletakkan lebih dahulu
 * daripada tabel angka: garis lebih mudah dipahami daripada deretan Z-score.
 *
 * RLS menentukan siapa yang dapat membukanya. Anak di luar wewenang pengguna
 * tidak akan ditemukan, sehingga menghasilkan halaman tidak ditemukan.
 */
export default async function HalamanAnak({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!supabaseTerkonfigurasi()) {
    return (
      <PagarBelumTerhubung
        pesan={
          <>
            Isi kredensial Supabase pada <code>.env.local</code> sesuai{" "}
            <code>.env.example</code>, lalu muat ulang halaman ini.
          </>
        }
      />
    );
  }

  /*
   * Ketiga peran boleh membuka halaman ini, tetapi melihat isi yang berbeda.
   *
   * Bidan memakainya untuk menelaah anak dari daftar prioritas, orang tua untuk
   * melihat grafik anaknya, kader untuk memperbaiki data. Anak mana yang dapat
   * dibuka ditentukan RLS: anak di luar wewenang pengguna tidak ditemukan,
   * sehingga menghasilkan halaman tidak ditemukan.
   */
  const sesi = await wajibPeran(["kader", "bidan", "orang_tua"]);

  if (!sesi) {
    return (
      <PagarBelumMasuk pesan="Masuk untuk melihat catatan pertumbuhan anak."
      />
    );
  }

  const supabase = await klienServer();

  const { data: anak } = await supabase
    .from("anak")
    .select(
      "id, nama, tanggal_lahir, jenis_kelamin, nama_orang_tua, telepon, alamat, alergi",
    )
    .eq("id", id)
    .maybeSingle();

  if (!anak) notFound();

  /*
   * Perbaikan data hanya untuk kader. Peran dibaca di server, bukan dikirim
   * dari klien, agar tombolnya tidak dapat dimunculkan dengan menyunting
   * permintaan. RLS tetap menjadi penjaga terakhirnya.
   */
  const bolehSunting = sesi.peran === "kader";

  /*
   * Tautan kembali mengikuti peran, sebab tidak semua peran datang dari
   * halaman pemantauan. Orang tua yang diberi tautan ke pemantauan bidan akan
   * dialihkan kembali ke halamannya sendiri, dan perjalanan bolak-balik itu
   * tampak seperti kerusakan.
   */
  const kembali =
    sesi.peran === "orang_tua"
      ? { href: "/orangtua", label: "Kembali ke daftar anak" }
      : sesi.peran === "kader"
        ? { href: "/kader", label: "Kembali ke pencatatan" }
        : { href: "/bidan", label: "Kembali ke pemantauan" };

  const { data: pengukuran } = await supabase
    .from("pengukuran")
    .select("tanggal, berat_kg, tinggi_cm, usia_bulan, status, diukur_telentang, dikonfirmasi")
    .eq("anak_id", id)
    .order("tanggal");

  const riwayat = pengukuran ?? [];
  // Hanya nilai terkonfirmasi yang digambarkan, sejalan dengan statistik.
  const terkonfirmasi = riwayat.filter((p) => p.dikonfirmasi);
  const terakhir = terkonfirmasi.at(-1);

  /*
   * Riwayat saran menu yang pernah disusun untuk anak ini.
   *
   * Dibatasi lima terakhir. Anjuran makan yang lebih lama dari itu sudah tidak
   * berlaku karena usia dan status gizi anaknya berubah, dan menampilkan
   * daftar panjang membuat yang terbaru justru sukar ditemukan.
   *
   * Kegagalan kueri diperlakukan sebagai daftar kosong, bukan galat halaman.
   * Tabelnya diperkenalkan pada migrasi 0011, sehingga pemasangan yang belum
   * menjalankannya akan mengembalikan galat di sini. Halaman ini masih berguna
   * seluruhnya tanpa bagian tersebut, dan menggagalkannya akan menghilangkan
   * grafik beserta riwayat penimbangan hanya karena satu migrasi terlewat.
   */
  const { data: menuTersimpan } = await supabase
    .from("saran_menu")
    .select("id, status, usia_bulan, isi, dari_fallback, dibuat_pada")
    .eq("anak_id", id)
    .order("dibuat_pada", { ascending: false })
    .limit(5);

  const riwayatMenu = (menuTersimpan ?? []).map((m) => {
    const isi = (m.isi ?? {}) as {
      narasi?: string;
      totalBiayaRp?: number;
      menu?: unknown[];
    };

    return {
      id: m.id,
      status: m.status as StatusGizi,
      usiaBulan: m.usia_bulan,
      dibuatPada: m.dibuat_pada as string,
      dariFallback: m.dari_fallback as boolean,
      narasi: typeof isi.narasi === "string" ? isi.narasi : "",
      totalBiayaRp: typeof isi.totalBiayaRp === "number" ? isi.totalBiayaRp : null,
      jumlahHidangan: Array.isArray(isi.menu) ? isi.menu.length : 0,
    };
  });

  const jk = anak.jenis_kelamin as JenisKelamin;
  const telentangTerakhir = Boolean(terakhir?.diukur_telentang);
  const usiaTerakhir = terakhir?.usia_bulan ?? 0;
  /*
   * Tabel yang digambar ditentukan usia, bukan cara ukur, sama seperti pada
   * perhitungan Z-score. Grafik dan angka wajib memakai referensi yang sama;
   * bila berbeda, titik anak akan tampak menyimpang dari garis rujukan tanpa
   * sebab yang dapat dijelaskan.
   */
  const indPanjang = pilihIndikatorPanjangUsia(usiaTerakhir);

  const pola = analisisPola(
    terkonfirmasi.map((p) => ({
      tanggal: new Date(`${p.tanggal}T00:00:00Z`),
      beratKg: Number(p.berat_kg),
    })),
  );

  const pemantauan = statusPemantauan(
    terakhir ? new Date(`${terakhir.tanggal}T00:00:00Z`) : null,
  );

  return (
    <>
      <BilahNavigasi />

      <main id="isi" className="mx-auto max-w-3xl px-4 pb-16">
        {/*
          Tautan kembali ditaruh di dalam isi, bukan di bilah navigasi, agar
          bilah tetap sama bentuknya di seluruh halaman. Halaman ini selalu
          dibuka dari pemantauan bidan, sehingga jalan pulangnya perlu jelas.
        */}
        <Link
          href={kembali.href}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <span aria-hidden="true">&larr;</span>
          {kembali.label}
        </Link>
        {/*
          Kepala halaman memakai latar bergradasi lembut agar identitas anak
          terpisah tegas dari data di bawahnya. Nama dan status adalah dua hal
          pertama yang dicari bidan saat membuka halaman ini.
        */}
        <div className="mt-6 rounded-2xl border border-brand-100 bg-merek-lembut p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-dasar-900 sm:text-3xl">
              {anak.nama}
            </h1>
            <LencanaStatus
              status={(terakhir?.status as StatusGizi) ?? null}
              ukuran="besar"
            />
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Usia", terakhir ? `${terakhir.usia_bulan} bulan` : "belum diukur"],
              ["Jenis kelamin", jk === "L" ? "Laki-laki" : "Perempuan"],
              ["Orang tua", anak.nama_orang_tua],
              ["Pemantauan", pemantauan.pesan],
            ].map(([label, nilai]) => (
              <div key={label}>
                <dt className="text-sm font-medium text-brand-700">{label}</dt>
                <dd className="mt-0.5 text-base font-semibold text-dasar-900">
                  {nilai}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {pola.perluPerhatian && (
          <p className="pesan-peringatan mt-5">{pola.pesan}</p>
        )}

      <section className="mt-8 space-y-5">
        <GrafikPertumbuhan
          indikator="bb_u"
          jenisKelamin={jk}
          judul="Berat badan menurut umur"
          satuan="kg"
          data={terkonfirmasi.map((p) => ({
            usiaBulan: p.usia_bulan,
            nilai: Number(p.berat_kg),
          }))}
        />

        <GrafikPertumbuhan
          indikator={indPanjang}
          jenisKelamin={jk}
          judul={
            indPanjang === "pb_u"
              ? "Panjang badan menurut umur"
              : "Tinggi badan menurut umur"
          }
          satuan="cm"
          data={terkonfirmasi.map((p) => ({
            usiaBulan: p.usia_bulan,
            /*
             * Nilai disetarakan per baris mengikuti ketentuan 0,7 cm WHO,
             * memakai cara ukur dan usia pada kunjungan itu sendiri.
             *
             * Perhitungannya harus sama dengan yang dipakai `nilaiPengukuran`.
             * Bila grafik menggambar nilai mentah sementara Z-score dihitung
             * dari nilai setara, titik anak akan tampak menyimpang dari garis
             * rujukan tanpa sebab yang dapat dijelaskan kepada bidan.
             */
            nilai: setarakanPanjangTinggi(
              Number(p.tinggi_cm),
              p.usia_bulan,
              Boolean(p.diukur_telentang),
            ),
          }))}
        />
      </section>

      {terakhir && (
        <div className="mt-10">
          <SaranMenu anakId={anak.id} />
        </div>
      )}

      {riwayatMenu.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-bold text-dasar-900">Saran menu sebelumnya</h2>
          <p className="mt-1 text-base text-dasar-600">
            Anjuran yang pernah disusun untuk anak ini. Tersimpan agar dapat dibaca
            kembali tanpa menyusun ulang.
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {riwayatMenu.map((m) => (
              <li key={m.id} className="kartu p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-semibold text-dasar-900">
                    {tanggalIndonesiaSingkat(m.dibuatPada.slice(0, 10))}
                  </span>

                  <span className="text-sm text-dasar-600">
                    usia {m.usiaBulan} bulan
                    {m.jumlahHidangan > 0 && ` · ${m.jumlahHidangan} hidangan`}
                    {m.totalBiayaRp !== null &&
                      ` · Rp${m.totalBiayaRp.toLocaleString("id-ID")}`}
                  </span>
                </div>

                {m.narasi && (
                  <p className="mt-2 text-base leading-relaxed text-dasar-700">
                    {m.narasi}
                  </p>
                )}

                {m.dariFallback && (
                  <p className="mt-2 text-sm text-dasar-500">
                    Disusun tanpa bantuan model bahasa. Isi anjurannya tetap dihitung
                    kode yang sama.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {bolehSunting && (
        <div className="mt-10">
          <FormEditAnak anak={anak} adaRiwayat={terkonfirmasi.length > 0} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold text-dasar-900">Riwayat penimbangan</h2>

        {riwayat.length === 0 ? (
          <p className="mt-3 kartu p-5 text-base text-dasar-700">
            Belum ada catatan penimbangan.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto kartu">
            <table className="w-full text-left text-base">
              <thead className="border-b border-dasar-200 text-sm text-dasar-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Usia</th>
                  <th className="px-4 py-3 font-medium">Berat</th>
                  <th className="px-4 py-3 font-medium">Tinggi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...riwayat].reverse().map((p, i) => (
                  <tr key={i} className="border-b border-dasar-200 last:border-0">
                    <td className="px-4 py-3">{p.tanggal}</td>
                    <td className="px-4 py-3">{p.usia_bulan} bln</td>
                    <td className="px-4 py-3">{Number(p.berat_kg)} kg</td>
                    <td className="px-4 py-3">{Number(p.tinggi_cm)} cm</td>
                    <td className="px-4 py-3">
                      {p.dikonfirmasi ? (
                        <LencanaStatus status={p.status as StatusGizi} />
                      ) : (
                        <span className="text-sm text-amber-800">
                          Belum dikonfirmasi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      </main>

      <Footer />
    </>
  );
}
