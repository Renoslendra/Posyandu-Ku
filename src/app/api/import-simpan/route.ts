import { NextResponse } from "next/server";
import { cocokkanNama, type CalonAnak } from "@/lib/cocok-nama";
import { prosesPengukuran } from "@/lib/proses-pengukuran";
import { klienServer } from "@/lib/supabase";
import { barisImportSchema, pesanGalatPertama } from "@/lib/validasi";
import type { StatusGizi } from "@/lib/gizi/zscore";

/**
 * POST /api/import-simpan — menyimpan baris hasil pembacaan foto yang sudah
 * diperiksa kader.
 *
 * Dipisahkan dari /api/import-foto secara sengaja. Endpoint pembacaan tidak
 * menyimpan apa pun, sehingga tidak ada jalur yang memungkinkan hasil mesin
 * masuk basis data tanpa melewati mata kader (FR-10.5).
 *
 * Yang penting dari rancangan ini: Z-score dihitung ulang di sini memakai
 * fungsi deterministik yang sama dengan pencatatan manual. Angka apa pun yang
 * dikirim klien tidak pernah dipercaya sebagai hasil perhitungan.
 *
 * Setiap baris diproses sendiri-sendiri. Satu baris yang gagal tidak
 * menggagalkan sisanya, karena kader yang sudah memfoto dan memeriksa sepuluh
 * baris tidak boleh kehilangan sembilan yang benar karena satu yang salah.
 */

export interface HasilBaris {
  indeks: number;
  nama: string;
  ok: boolean;
  /** Terisi bila baris gagal, memakai bahasa yang dipahami kader. */
  galat?: string;
  /**
   * Status gizi hasil perhitungan. Dapat bernilai null bila salah satu
   * indikator tidak dapat dinilai, misalnya tinggi di luar rentang tabel WHO.
   */
  status?: StatusGizi | null;
  usiaBulan?: number;
}

export async function POST(permintaan: Request) {
  let muatan: unknown;
  try {
    muatan = await permintaan.json();
  } catch {
    return NextResponse.json({ galat: "Isi permintaan bukan JSON" }, { status: 400 });
  }

  const terurai = barisImportSchema.safeParse(muatan);
  if (!terurai.success) {
    return NextResponse.json(
      { galat: pesanGalatPertama(terurai.error) },
      { status: 400 },
    );
  }
  const { baris } = terurai.data;

  const supabase = await klienServer();
  const { data: pengguna } = await supabase.auth.getUser();

  if (!pengguna.user) {
    return NextResponse.json({ galat: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("profil")
    .select("peran, posyandu_id")
    .eq("id", pengguna.user.id)
    .maybeSingle();

  if (profil?.peran !== "kader" || !profil.posyandu_id) {
    return NextResponse.json(
      { galat: "Hanya kader posyandu yang dapat menyimpan hasil pembacaan" },
      { status: 403 },
    );
  }

  // Daftar anak diambil sekali, lalu dipakai untuk seluruh baris. RLS
  // membatasinya pada posyandu kader yang sedang masuk.
  const { data: daftarAnak } = await supabase
    .from("anak")
    .select("id, nama, tanggal_lahir, jenis_kelamin")
    .eq("posyandu_id", profil.posyandu_id);

  const calon: CalonAnak[] = (daftarAnak ?? []).map((a) => ({
    id: a.id,
    nama: a.nama,
  }));
  const petaAnak = new Map((daftarAnak ?? []).map((a) => [a.id, a]));

  const hasil: HasilBaris[] = [];

  for (const [indeks, b] of baris.entries()) {
    // Kader dapat memilih anak secara langsung ketika pencocokan nama tidak
    // menghasilkan satu jawaban. Pilihan kader selalu diutamakan.
    let anakId = b.anakId ?? null;

    if (!anakId) {
      const cocok = cocokkanNama(b.nama, calon);
      if (cocok.jenis === "persis" || cocok.jenis === "sebagian") {
        anakId = cocok.anakId;
      } else {
        hasil.push({
          indeks,
          nama: b.nama,
          ok: false,
          galat:
            cocok.jenis === "ganda"
              ? "Ada beberapa anak dengan nama serupa. Mohon pilih yang benar."
              : "Nama tidak ditemukan di posyandu Anda. Pilih anak, atau daftarkan lebih dahulu.",
        });
        continue;
      }
    }

    const anak = petaAnak.get(anakId!);
    if (!anak) {
      hasil.push({
        indeks,
        nama: b.nama,
        ok: false,
        galat: "Anak yang dipilih tidak ada di posyandu Anda.",
      });
      continue;
    }

    const { data: sebelumnya } = await supabase
      .from("pengukuran")
      .select("berat_kg, tinggi_cm, tanggal")
      .eq("anak_id", anak.id)
      .eq("dikonfirmasi", true)
      .lt("tanggal", b.tanggal)
      .order("tanggal", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Perhitungan dan penjaga kualitas data sama persis dengan jalur manual.
    const proses = prosesPengukuran(
      {
        tanggalLahir: anak.tanggal_lahir,
        jenisKelamin: anak.jenis_kelamin,
        tanggal: b.tanggal,
        beratKg: b.beratKg,
        tinggiCm: b.tinggiCm,
        diukurTelentang: b.diukurTelentang ?? false,
      },
      sebelumnya
        ? {
            beratKg: Number(sebelumnya.berat_kg),
            tinggiCm: Number(sebelumnya.tinggi_cm),
            tanggal: sebelumnya.tanggal,
          }
        : undefined,
    );

    if (!proses.ok) {
      hasil.push({
        indeks,
        nama: b.nama,
        ok: false,
        galat: proses.temuan[0]?.pesan ?? "Angka tidak wajar",
      });
      continue;
    }

    /*
     * Disimpan dengan sumber 'ocr_ai' dan dikonfirmasi true.
     *
     * Keduanya benar sekaligus: nilainya berasal dari pembacaan mesin, namun
     * sudah dilihat dan disetujui kader lewat tabel koreksi. Jejak asalnya
     * tetap tersimpan agar dapat dibedakan dari pencatatan langsung, sesuai
     * FR-10.4.
     */
    const { error: galatSimpan } = await supabase.from("pengukuran").insert({
      anak_id: anak.id,
      tanggal: b.tanggal,
      berat_kg: b.beratKg,
      tinggi_cm: b.tinggiCm,
      diukur_telentang: b.diukurTelentang ?? false,
      usia_bulan: proses.usiaBulan,
      z_bb_u: proses.penilaian.zBeratUsia,
      z_tb_u: proses.penilaian.zTinggiUsia,
      z_bb_tb: proses.penilaian.zBeratTinggi,
      status: proses.penilaian.status,
      sumber: "ocr_ai",
      dikonfirmasi: true,
      penanda: proses.penanda,
      dicatat_oleh: pengguna.user.id,
    });

    if (galatSimpan) {
      // Batasan unik pada pasangan anak dan tanggal. Kader mungkin memfoto
      // halaman yang sama dua kali, dan itu bukan kesalahan yang perlu
      // ditakuti.
      if (galatSimpan.code === "23505") {
        hasil.push({
          indeks,
          nama: b.nama,
          ok: false,
          galat: "Data untuk tanggal ini sudah pernah tersimpan.",
        });
        continue;
      }
      hasil.push({
        indeks,
        nama: b.nama,
        ok: false,
        galat: "Gagal menyimpan. Mohon coba lagi.",
      });
      continue;
    }

    hasil.push({
      indeks,
      nama: b.nama,
      ok: true,
      status: proses.penilaian.status,
      usiaBulan: proses.usiaBulan,
    });
  }

  const berhasil = hasil.filter((h) => h.ok).length;

  return NextResponse.json({
    ok: true,
    berhasil,
    gagal: hasil.length - berhasil,
    hasil,
  });
}
