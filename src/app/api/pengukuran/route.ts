import { NextResponse } from "next/server";
import { klienServer } from "@/lib/supabase";
import { prosesPengukuran } from "@/lib/proses-pengukuran";
import { pengukuranBaruSchema, pesanGalatPertama } from "@/lib/validasi";

/**
 * POST /api/pengukuran — mencatat satu pengukuran.
 *
 * Alur:
 *   1. validasi bentuk data (Zod)
 *   2. ambil data anak; RLS memastikan kader hanya menjangkau posyandunya
 *   3. ambil pengukuran sebelumnya sebagai pembanding kewajaran
 *   4. jalankan penjaga kualitas data, lalu hitung Z-score
 *   5. simpan bila lolos
 *
 * Perhitungan dilakukan di server meskipun klien juga menghitung saat offline.
 * Nilai dari klien tidak pernah dipercaya sebagai sumber kebenaran.
 */
export async function POST(permintaan: Request) {
  let muatan: unknown;
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  const terurai = pengukuranBaruSchema.safeParse(muatan);
  if (!terurai.success) {
    return NextResponse.json(
      { galat: pesanGalatPertama(terurai.error) },
      { status: 400 },
    );
  }
  const data = terurai.data;

  const supabase = await klienServer();

  const { data: pengguna } = await supabase.auth.getUser();
  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  // RLS menyaring baris ini: kader di posyandu lain tidak akan menemukannya.
  const { data: anak, error: galatAnak } = await supabase
    .from("anak")
    .select("id, tanggal_lahir, jenis_kelamin")
    .eq("id", data.anakId)
    .maybeSingle();

  if (galatAnak) {
    return NextResponse.json({ galat: "Gagal mengambil data anak" }, { status: 500 });
  }
  if (!anak) {
    return NextResponse.json(
      { galat: "Data anak tidak ditemukan atau di luar wewenang Anda" },
      { status: 404 },
    );
  }

  const { data: sebelumnya } = await supabase
    .from("pengukuran")
    .select("berat_kg, tinggi_cm, tanggal")
    .eq("anak_id", data.anakId)
    .eq("dikonfirmasi", true)
    .lt("tanggal", data.tanggal)
    .order("tanggal", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasil = prosesPengukuran(
    {
      tanggalLahir: anak.tanggal_lahir,
      jenisKelamin: anak.jenis_kelamin,
      tanggal: data.tanggal,
      beratKg: data.beratKg,
      tinggiCm: data.tinggiCm,
      diukurTelentang: data.diukurTelentang,
    },
    sebelumnya
      ? {
          beratKg: Number(sebelumnya.berat_kg),
          tinggiCm: Number(sebelumnya.tinggi_cm),
          tanggal: sebelumnya.tanggal,
        }
      : undefined,
  );

  if (!hasil.ok) {
    return NextResponse.json(
      { galat: hasil.temuan[0]?.pesan ?? "Data tidak wajar", temuan: hasil.temuan },
      { status: 422 },
    );
  }

  // Nilai yang ditandai perlu persetujuan kader lebih dulu. Antarmuka
  // menampilkan temuannya, lalu mengirim ulang dengan abaikanPenanda.
  if (hasil.penanda.length > 0 && !data.abaikanPenanda) {
    return NextResponse.json(
      {
        perluKonfirmasi: true,
        temuan: hasil.temuan.filter((t) => t.tingkat === "tandai"),
        pratinjau: {
          usiaBulan: hasil.usiaBulan,
          status: hasil.penilaian.status,
        },
      },
      { status: 409 },
    );
  }

  const { data: tersimpan, error: galatSimpan } = await supabase
    .from("pengukuran")
    .insert({
      anak_id: data.anakId,
      tanggal: data.tanggal,
      berat_kg: data.beratKg,
      tinggi_cm: data.tinggiCm,
      diukur_telentang: data.diukurTelentang,
      usia_bulan: hasil.usiaBulan,
      z_bb_u: hasil.penilaian.zBeratUsia,
      z_tb_u: hasil.penilaian.zTinggiUsia,
      z_bb_tb: hasil.penilaian.zBeratTinggi,
      status: hasil.penilaian.status,
      sumber: "manual",
      dikonfirmasi: true,
      penanda: hasil.penanda,
      dicatat_oleh: pengguna.user.id,
      klien_ref: data.klienRef ?? null,
    })
    .select("id")
    .single();

  if (galatSimpan) {
    // Pengiriman ulang antrean offline dengan klien_ref yang sama akan
    // menabrak batasan unik. Itu bukan galat: data sudah tersimpan.
    if (galatSimpan.code === "23505") {
      return NextResponse.json({ ok: true, duplikat: true }, { status: 200 });
    }
    return NextResponse.json(
      { galat: "Gagal menyimpan pengukuran" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: tersimpan.id,
    usiaBulan: hasil.usiaBulan,
    status: hasil.penilaian.status,
    penentuStatus: hasil.penilaian.penentuStatus,
    zBeratUsia: hasil.penilaian.zBeratUsia,
    zTinggiUsia: hasil.penilaian.zTinggiUsia,
    zBeratTinggi: hasil.penilaian.zBeratTinggi,
    penanda: hasil.penanda,
  });
}
