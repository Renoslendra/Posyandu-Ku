/**
 * Ringkasan bulanan untuk bidan.
 *
 * Pembagian peran yang ditegakkan di sini:
 *   - angka dihitung modul dashboard (deterministik, teruji)
 *   - LLM hanya menyusun kalimatnya
 *
 * Bila LLM gagal, ringkasan tetap tersusun dari template. Isi angkanya sama
 * persis, hanya bahasanya lebih datar. Aplikasi tidak pernah menampilkan
 * halaman kosong karena penyedia model bermasalah.
 */

import type { RingkasanDashboard } from "./dashboard";
import { panggilTeks } from "./llm";

export interface HasilRingkasan {
  teks: string;
  /** true bila disusun template, bukan LLM. Ditampilkan apa adanya ke bidan. */
  dariFallback: boolean;
}

/**
 * Menyusun ringkasan dengan template.
 *
 * Bukan sekadar jalur darurat: ini juga yang menjamin angka pada ringkasan
 * selalu berasal dari perhitungan, bukan dari model.
 */
export function ringkasanTemplate(data: RingkasanDashboard): string {
  const baris: string[] = [];

  baris.push(
    `Dari ${data.totalAnak} anak terdaftar, ${data.sudahDiukur} anak sudah memiliki hasil penimbangan.`,
  );

  baris.push(
    `Status gizi: ${data.distribusi.normal} normal, ${data.distribusi.risiko} perlu perhatian, ${data.distribusi.berat} perlu segera diperiksa.`,
  );

  if (data.belumDinilai > 0) {
    baris.push(`${data.belumDinilai} anak belum memiliki hasil penimbangan.`);
  }

  if (data.prioritas.length === 0) {
    baris.push("Tidak ada anak yang perlu ditindaklanjuti pada periode ini.");
  } else {
    const nama = data.prioritas.slice(0, 5).map((a) => a.nama);
    baris.push(
      `Perlu ditindaklanjuti (${data.prioritas.length} anak), terutama: ${nama.join(", ")}.`,
    );
  }

  if (data.hilangDariPemantauan.length > 0) {
    baris.push(
      `${data.hilangDariPemantauan.length} anak sudah lama tidak menimbang dan perlu dikunjungi kader.`,
    );
  }

  baris.push(
    "Ini adalah alat bantu, bukan diagnosis. Keputusan rujukan tetap pada tenaga kesehatan.",
  );

  return baris.join("\n\n");
}

const PERINTAH_SISTEM = `Anda membantu bidan desa di Indonesia menyusun ringkasan bulanan data posyandu.

Aturan yang wajib dipatuhi:
1. Gunakan HANYA angka yang diberikan. Jangan menghitung, memperkirakan, atau menambah angka baru.
2. Gunakan Bahasa Indonesia yang sederhana dan lugas.
3. Susun sebagai paragraf pendek, maksimal 5 paragraf.
4. Jangan memberi diagnosis medis. Arahkan tindak lanjut ke pemeriksaan bidan atau puskesmas.
5. Jangan menyebut nama anak lebih dari yang tercantum pada data.
6. Akhiri dengan pengingat bahwa ini alat bantu, bukan diagnosis.

Tulis dengan nada tenang dan faktual, tanpa hiperbola.`;

function susunPerintahPengguna(data: RingkasanDashboard): string {
  const prioritas = data.prioritas
    .slice(0, 10)
    .map((a) => `- ${a.nama}: ${a.alasan.join("; ")}`)
    .join("\n");

  const hilang = data.hilangDariPemantauan
    .slice(0, 10)
    .map((a) =>
      a.tanggalTerakhir
        ? `- ${a.nama}: ${a.jedaHari} hari tidak menimbang`
        : `- ${a.nama}: belum pernah tercatat menimbang`,
    )
    .join("\n");

  return `Data posyandu:
- Total anak terdaftar: ${data.totalAnak}
- Sudah ditimbang: ${data.sudahDiukur}
- Status normal: ${data.distribusi.normal}
- Status perlu perhatian: ${data.distribusi.risiko}
- Status perlu segera diperiksa: ${data.distribusi.berat}
- Belum dinilai: ${data.belumDinilai}

Anak yang perlu ditindaklanjuti (${data.prioritas.length} anak):
${prioritas || "(tidak ada)"}

Anak yang berhenti datang menimbang (${data.hilangDariPemantauan.length} anak):
${hilang || "(tidak ada)"}

Susun ringkasan bulanan berdasarkan data di atas.`;
}

/**
 * Menyusun ringkasan, mengutamakan LLM dan jatuh ke template bila gagal.
 *
 * Penanda `dariFallback` diteruskan ke antarmuka dan ditampilkan terus terang.
 * Bidan berhak tahu ringkasan yang dibacanya disusun mesin bahasa atau template.
 */
export async function susunRingkasanNaratif(
  data: RingkasanDashboard,
): Promise<HasilRingkasan> {
  const hasil = await panggilTeks([
    { role: "system", content: PERINTAH_SISTEM },
    { role: "user", content: susunPerintahPengguna(data) },
  ]);

  if (!hasil.ok) {
    // Dicatat di log server agar kegagalan penyedia model dapat ditelusuri,
    // tanpa mengganggu pengguna.
    console.warn("Ringkasan LLM gagal, memakai template:", hasil.alasan);
    return { teks: ringkasanTemplate(data), dariFallback: true };
  }

  return { teks: hasil.teks, dariFallback: false };
}
