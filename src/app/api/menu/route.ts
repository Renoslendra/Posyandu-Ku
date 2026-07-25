import { NextResponse } from "next/server";
import { BATAS, periksaBatas } from "@/lib/batas-laju";
import { daftarBelanja, susunSaranMenu } from "@/lib/menu";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";
import type { StatusGizi } from "@/lib/gizi/zscore";

/*
 * Batas durasi fungsi dinyatakan tegas, tidak dibiarkan memakai nilai bawaan.
 *
 * Penyusunan narasi memasak memanggil model, sehingga batas bawaan sepuluh detik
 * dapat terlampaui pada permintaan pertama setelah fungsi dingin.
 *
 * Nilai ini harus selalu lebih besar daripada batas waktu di dalam llm.ts,
 * supaya jalur cadangan aplikasi yang menghasilkan keluaran berguna selalu
 * mendahului pemutusan oleh platform yang hanya menghasilkan galat gerbang.
 */
export const maxDuration = 60;

/**
 * POST /api/menu — menyusun saran menu harian untuk satu anak.
 *
 * Status gizi dan usia diambil dari basis data, bukan dari badan permintaan.
 * Bila keduanya dikirim klien, siapa pun dapat memaksa munculnya menu untuk
 * status berat pada anak yang sehat, dan sebaliknya.
 *
 * RLS menentukan anak mana yang dapat diminta: orang tua hanya anaknya, kader
 * hanya posyandunya.
 */

export async function POST(permintaan: Request) {
  /*
   * Konfigurasi diperiksa lebih dahulu supaya kegagalan menyebut penyebabnya.
   *
   * Pembangun klien melempar pengecualian bila kredensial basis data belum
   * terisi, dan pengecualian itu keluar sebagai galat server tanpa keterangan.
   * Halaman biasa sudah memeriksanya, sehingga bila satu variabel lingkungan
   * terlewat, tampilan terlihat sehat sementara setiap penyimpanan gagal diam
   * dengan pesan yang menyesatkan.
   */
  if (!supabaseTerkonfigurasi()) {
    return NextResponse.json(
      { galat: "Basis data belum terhubung." },
      { status: 503 },
    );
  }
  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  const batas = await periksaBatas(supabase, BATAS.menu);
  if (batas.ditolak) {
    return NextResponse.json({ galat: batas.pesan }, { status: 429 });
  }

  let muatan: { anakId?: string };
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  if (typeof muatan.anakId !== "string" || muatan.anakId.length < 10) {
    return NextResponse.json({ galat: "ID anak tidak valid" }, { status: 400 });
  }

  // RLS menyaring baris ini. Anak di luar wewenang tidak akan ditemukan.
  const { data: anak } = await supabase
    .from("anak")
    .select("id, nama")
    .eq("id", muatan.anakId)
    .maybeSingle();

  if (!anak) {
    return NextResponse.json(
      { galat: "Data anak tidak ditemukan atau di luar wewenang Anda" },
      { status: 404 },
    );
  }

  // Status dan usia diambil dari pengukuran terakhir yang terkonfirmasi.
  const { data: terakhir } = await supabase
    .from("pengukuran")
    .select("status, usia_bulan")
    .eq("anak_id", muatan.anakId)
    .eq("dikonfirmasi", true)
    .order("tanggal", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!terakhir?.status) {
    return NextResponse.json(
      {
        galat:
          "Belum ada hasil penimbangan untuk anak ini. Saran menu disusun berdasarkan hasil penimbangan terakhir.",
      },
      { status: 409 },
    );
  }

  const saran = await susunSaranMenu(
    terakhir.status as StatusGizi,
    terakhir.usia_bulan,
  );

  if (!saran) {
    return NextResponse.json(
      {
        galat:
          "Anak berusia di bawah 6 bulan. Pada usia ini, air susu ibu sudah mencukupi. Silakan berkonsultasi dengan bidan mengenai pemberian makan.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    namaAnak: anak.nama,
    status: terakhir.status,
    usiaBulan: terakhir.usia_bulan,
    menu: saran.menu,
    belanja: daftarBelanja(saran.menu),
    totalBiayaRp: saran.totalBiayaRp,
    catatanGizi: saran.catatanGizi,
    narasi: saran.narasi,
    dariFallback: saran.dariFallback,
  });
}
