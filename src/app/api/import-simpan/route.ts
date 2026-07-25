import { NextResponse } from "next/server";
import { cocokkanNama, type CalonAnak } from "@/lib/cocok-nama";
import { prosesPengukuran } from "@/lib/proses-pengukuran";
import { klienServer, supabaseTerkonfigurasi } from "@/lib/supabase";
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
  /**
   * Nama anak yang benar-benar menerima pengukuran ini.
   *
   * Dikembalikan agar kader dapat memeriksa bahwa angka masuk ke rekam yang
   * benar. Medan `nama` memuat nama yang dibaca dari foto, dan keduanya dapat
   * berbeda: pencocokan "Bagas" ke "Bagas Pratama" adalah keadaan normal.
   * Tanpa medan ini, pertukaran data tidak akan pernah terlihat.
   */
  namaAnakTujuan?: string;
  /**
   * Calon anak yang paling menyerupai, untuk baris yang perlu keputusan kader.
   *
   * Antarmuka dapat memakainya untuk memilih calon itu lebih dahulu, sehingga
   * kader hanya perlu membenarkan alih-alih mencari sendiri di seluruh daftar.
   */
  saranAnakId?: string;
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

      /*
       * Hanya kecocokan persis yang disimpan tanpa bertanya.
       *
       * Kecocokan "sebagian" adalah tebakan, dan modul pencocokan sendiri
       * menyatakannya lewat pesan "Mohon pastikan benar". Sebelumnya tebakan itu
       * langsung disimpan, sedangkan permintaan konfirmasinya tidak pernah
       * sampai ke layar. Kader hanya melihat "1 baris tersimpan", tanpa cara
       * mengetahui ke rekam anak mana angka itu masuk.
       *
       * Pencocokan otomatis boleh saja salah. Yang tidak boleh adalah salah
       * tanpa meninggalkan jejak, sebab kekeliruan yang tidak terlihat tidak
       * akan pernah diperbaiki.
       */
      if (cocok.jenis === "persis") {
        anakId = cocok.anakId;
      } else {
        hasil.push({
          indeks,
          nama: b.nama,
          ok: false,
          galat:
            cocok.jenis === "sebagian"
              ? `Nama mirip dengan ${cocok.kandidat[0].nama}. Mohon pastikan anaknya benar.`
              : cocok.jenis === "ganda"
                ? "Ada beberapa anak dengan nama serupa. Mohon pilih yang benar."
                : "Nama tidak ditemukan di posyandu Anda. Pilih anak, atau daftarkan lebih dahulu.",
          saranAnakId: cocok.kandidat.length > 0 ? cocok.kandidat[0].id : undefined,
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
      namaAnakTujuan: anak.nama,
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
