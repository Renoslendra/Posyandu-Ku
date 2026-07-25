import { NextResponse } from "next/server";
import { daftarBelanja, susunSaranMenu } from "@/lib/menu";
import { klienServer } from "@/lib/supabase";
import type { StatusGizi } from "@/lib/gizi/zscore";

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

/** Pembatasan laju sederhana per pengguna, mencegah penekanan tombol berulang. */
const catatanPanggilan = new Map<string, number[]>();
const JENDELA_MS = 60_000;
const MAKS_PER_JENDELA = 8;

function melewatiBatas(idPengguna: string): boolean {
  const sekarang = Date.now();
  const riwayat = (catatanPanggilan.get(idPengguna) ?? []).filter(
    (t) => sekarang - t < JENDELA_MS,
  );

  if (riwayat.length >= MAKS_PER_JENDELA) {
    catatanPanggilan.set(idPengguna, riwayat);
    return true;
  }

  riwayat.push(sekarang);
  catatanPanggilan.set(idPengguna, riwayat);
  return false;
}

export async function POST(permintaan: Request) {
  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  if (melewatiBatas(pengguna.user.id)) {
    return NextResponse.json(
      { galat: "Terlalu banyak permintaan. Mohon tunggu sebentar." },
      { status: 429 },
    );
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
