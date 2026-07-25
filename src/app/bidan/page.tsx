import Link from "next/link";
import { DaftarAnak } from "@/components/DaftarAnak";
import { BilahNavigasi } from "@/components/BilahNavigasi";
import { Footer } from "@/components/Footer";
import { PagarBelumMasuk, PagarBelumTerhubung } from "@/components/Pagar";
import { TombolRingkasan } from "@/components/TombolRingkasan";
import { wajibPeran } from "@/lib/sesi";
import {
  IkonBahaya,
  IkonCariOrang,
  IkonCentang,
  IkonJadwal,
  IkonKelompok,
  IkonPanahKanan,
  IkonPeringatan,
  IkonTelepon,
  IkonTimbangan,
  IkonTugasTerlambat,
  IkonUnduh,
} from "@/components/Ikon";
import {
  AMBANG_HILANG_HARI,
  susunRingkasan,
  type BarisAnak,
  type BarisPengukuran,
} from "@/lib/dashboard";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";

/**
 * Dashboard bidan.
 *
 * Tersusun menurut urutan keputusan bidan, bukan menurut kelengkapan data:
 * pertama siapa yang perlu ditindaklanjuti, baru gambaran keseluruhan. Bidan
 * membaca dari atas dan boleh berhenti kapan pun.
 */
export default async function HalamanBidan() {
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
   * Hanya bidan. Kader yang menekan tautan ini dialihkan ke halaman
   * pencatatannya, bukan disuguhi halaman pemantauan yang kosong.
   */
  const sesi = await wajibPeran(["bidan"]);

  if (!sesi) {
    return (
      <PagarBelumMasuk pesan="Halaman pemantauan hanya dapat dibuka oleh bidan yang sudah masuk."
      />
    );
  }

  const supabase = await klienServer();

  // RLS membatasi kedua kueri ini pada wilayah bidan yang sedang masuk.
  const [{ data: anak }, { data: pengukuran }] = await Promise.all([
    supabase
      .from("anak")
      .select("id, nama, tanggal_lahir, jenis_kelamin, telepon")
      .order("nama"),
    supabase
      .from("pengukuran")
      .select("anak_id, tanggal, berat_kg, status, dikonfirmasi")
      .order("tanggal"),
  ]);

  const ringkasan = susunRingkasan(
    (anak ?? []) as BarisAnak[],
    (pengukuran ?? []) as BarisPengukuran[],
  );

  /*
   * Kartu ringkasan.
   *
   * Latar diberi warna lembut senada statusnya, bukan putih seragam, agar
   * bidan dapat menemukan angka yang dicarinya tanpa membaca labelnya lebih
   * dahulu. Garis tepi tetap pekat supaya kartunya tidak hilang di bawah
   * sinar matahari.
   */
  const kartu = [
    {
      label: "Total anak",
      nilai: ringkasan.totalAnak,
      warna: "text-dasar-900",
      gaya: "border-dasar-200 bg-white",
      Ikon: IkonKelompok,
    },
    {
      label: "Normal",
      nilai: ringkasan.distribusi.normal,
      warna: "text-status-normal",
      gaya: "border-status-normal-garis bg-status-normal-lembut",
      Ikon: IkonCentang,
    },
    {
      label: "Perlu perhatian",
      nilai: ringkasan.distribusi.risiko,
      warna: "text-status-risiko",
      gaya: "border-status-risiko-garis bg-status-risiko-lembut",
      Ikon: IkonPeringatan,
    },
    {
      label: "Perlu segera diperiksa",
      nilai: ringkasan.distribusi.berat,
      warna: "text-status-berat",
      gaya: "border-status-berat-garis bg-status-berat-lembut",
      Ikon: IkonBahaya,
    },
  ];

  return (
    <>
      <BilahNavigasi />

      {/*
        Tanpa pt besar: bilah navigasi memakai sticky, bukan fixed, sehingga
        sudah menempati ruangnya sendiri dalam aliran tata letak.
      */}
      <main
        id="isi"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8"
      >
        {/* Page Header */}
        <section className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 animate-muncul">
          <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Pemantauan Gizi Anak
            </h2>
            <p className="text-on-surface-variant mt-1 font-body-base text-body-base">
              Ringkasan kondisi balita di wilayah kerja Anda.
            </p>
          </div>
          <a
            href="/api/laporan"
            className="bg-merek-pekat text-on-primary shadow-merek rounded-lg flex items-center justify-center gap-2 px-6 h-[48px] font-label-sm text-label-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <IkonUnduh className="h-5 w-5" />
            Unduh laporan CSV
          </a>
        </section>

        {/*
          Kartu ringkasan.

          Digambar dari senarai `kartu` di atas, bukan dituliskan satu per satu,
          agar label dan warna status tidak dapat berbeda antara kartu yang satu
          dengan lainnya saat salah satunya diubah.
        */}
        <section
          aria-label="Ringkasan status gizi"
          className="grid animate-munculNaik grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
        >
          {kartu.map((k) => (
            <div key={k.label} className={`rounded-2xl border p-5 shadow-halus ${k.gaya}`}>
              <div className="flex items-center gap-2 text-dasar-600">
                <k.Ikon className={`h-5 w-5 ${k.warna}`} />
                <span className="text-sm font-semibold">{k.label}</span>
              </div>
              <p className={`mt-2 text-4xl font-extrabold tracking-tight ${k.warna}`}>
                {k.nilai}
              </p>
            </div>
          ))}
        </section>

        {ringkasan.belumDinilai > 0 && (
          <p className="pesan-netral text-sm mt-0 mb-4 animate-muncul">
            {ringkasan.belumDinilai} anak belum memiliki hasil penimbangan yang terkonfirmasi.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4 animate-munculNaik" style={{ animationDelay: '0.2s' }}>
          {/* Left Column: Priority */}
          <section className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-section-title text-section-title text-on-surface flex items-center gap-2">
                <IkonTugasTerlambat className="h-6 w-6 text-status-risiko" />
                Perlu tindak lanjut
              </h3>
            </div>
            
            {ringkasan.prioritas.length === 0 ? (
              <p className="pesan-berhasil mt-2">
                Tidak ada anak yang perlu ditindaklanjuti saat ini.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {ringkasan.prioritas.map((a) => (
                  <div key={a.id} className="bg-surface-container-lowest rounded-xl shadow-kartu flex items-stretch overflow-hidden border border-surface-container transition-all hover:shadow-naik group">
                    <div className={`w-1.5 flex-shrink-0 ${a.status === "berat" ? "bg-status-severe" : "bg-status-risk"}`}></div>
                    <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${a.status === "berat" ? "bg-status-severe/10 text-status-severe" : "bg-status-risk/10 text-status-risk"}`}>
                          <IkonTimbangan className="h-6 w-6" />
                        </div>
                        <div>
                          <Link href={`/anak/${a.id}`} className="font-body-lg text-body-lg text-on-surface hover:text-primary transition-colors font-bold">
                            {a.nama}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {a.alasan.map((alasan, index) => (
                              <span key={index} className={`px-2 py-0.5 rounded font-caption-xs text-caption-xs font-semibold flex items-center gap-1 ${a.status === "berat" ? "bg-status-severe/10 text-status-severe" : "bg-status-risk/10 text-status-risk"}`}>
                                {a.status === "berat" ? (
                                  <IkonBahaya className="h-3.5 w-3.5" />
                                ) : (
                                  <IkonPeringatan className="h-3.5 w-3.5" />
                                )}
                                {alasan}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Link href={`/anak/${a.id}`} className="border-2 border-outline-variant text-on-surface hover:border-primary hover:text-primary rounded-lg px-4 h-[48px] font-label-sm text-label-sm flex items-center justify-center gap-2 transition-colors w-full sm:w-auto shrink-0 group-hover:bg-primary/5">
                        Cek detail
                        <IkonPanahKanan className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right Column: Missing Children */}
          <section className="flex flex-col gap-4">
            <h3 className="font-section-title text-section-title text-on-surface flex items-center gap-2">
              <IkonCariOrang className="h-6 w-6 text-dasar-500" />
              Berhenti menimbang
            </h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-kartu border border-surface-container p-4 flex flex-col gap-4">
              <p className="font-caption-xs text-caption-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg">
                Anak yang tidak menimbang lebih dari {AMBANG_HILANG_HARI} hari.
              </p>
              
              {ringkasan.hilangDariPemantauan.length === 0 ? (
                <p className="pesan-berhasil text-sm">Semua anak rutin menimbang.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {ringkasan.hilangDariPemantauan.map((a) => (
                    <li key={a.id} className="flex items-center justify-between pb-3 border-b border-surface-container last:border-0 last:pb-0">
                      <div>
                        <Link href={`/anak/${a.id}`} className="font-body-base text-body-base font-semibold text-on-surface hover:text-primary transition-colors">
                          {a.nama}
                        </Link>
                        <div className="text-error font-caption-xs text-caption-xs mt-0.5 flex items-center gap-1">
                          <IkonJadwal className="h-3.5 w-3.5" />
                          {a.tanggalTerakhir
                            ? `${a.jedaHari} hari tidak menimbang`
                            : "Belum pernah tercatat"}
                        </div>
                      </div>
                      
                      {a.telepon && (
                        <a href={`tel:${a.telepon}`} className="w-10 h-10 rounded-full bg-primary-container/10 text-primary hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors shadow-sm shrink-0 ml-2" title={`Hubungi ${a.telepon}`}>
                          <IkonTelepon className="h-5 w-5" />
                          <span className="sr-only">Hubungi {a.telepon}</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="mt-4">
              <TombolRingkasan />
            </div>
          </section>
        </div>

        <section className="mt-8 animate-munculNaik" style={{ animationDelay: '0.3s' }}>
          <DaftarAnak daftar={ringkasan.semuaAnak} />
        </section>
      </main>

      <Footer />
    </>
  );
}
