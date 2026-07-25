/**
 * Lapisan pemanggilan LLM.
 *
 * Prinsip yang ditegakkan di sini:
 *
 *   1. Seluruh panggilan berjalan di server. Kunci API tidak pernah sampai
 *      ke peramban.
 *   2. Setiap pemanggilan memiliki batas waktu. Aplikasi tidak boleh menggantung
 *      menunggu penyedia model.
 *   3. Kegagalan bukan kondisi luar biasa. Pemanggil selalu menerima penanda
 *      gagal, bukan pengecualian, sehingga wajib menyiapkan jalur cadangan.
 *   4. LLM tidak pernah menghitung angka. Perannya terbatas pada bahasa dan
 *      persepsi.
 */

const BATAS_WAKTU_MS = 20_000;

export interface HasilLLM {
  ok: boolean;
  teks: string;
  /** Alasan kegagalan, untuk dicatat di log server. */
  alasan?: string;
}

/** Apakah mode demo aman aktif, yang membuat LLM tidak dipanggil sama sekali. */
export function modeDemoAman(): boolean {
  return process.env.DEMO_SAFE_MODE === "true";
}

export function llmTersedia(): boolean {
  return Boolean(process.env.LLM_API_KEY) && !modeDemoAman();
}

interface PesanTeks {
  role: "system" | "user";
  content: string;
}

/**
 * Memanggil model teks.
 *
 * Memakai format API yang kompatibel dengan OpenAI Chat Completions sehingga
 * penyedia dapat diganti lewat LLM_BASE_URL tanpa mengubah kode.
 */
export async function panggilTeks(
  pesan: PesanTeks[],
  opsi: { maksToken?: number } = {},
): Promise<HasilLLM> {
  if (!llmTersedia()) {
    return { ok: false, teks: "", alasan: "LLM tidak dikonfigurasi atau mode demo aktif" };
  }

  const pembatal = new AbortController();
  const pewaktu = setTimeout(() => pembatal.abort(), BATAS_WAKTU_MS);

  try {
    const respons = await fetch(
      `${process.env.LLM_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL_TEXT ?? "gpt-4o-mini",
          messages: pesan,
          max_tokens: opsi.maksToken ?? 700,
          temperature: 0.3,
        }),
        signal: pembatal.signal,
      },
    );

    if (!respons.ok) {
      return { ok: false, teks: "", alasan: `HTTP ${respons.status}` };
    }

    const isi = await respons.json();
    const teks: string | undefined = isi?.choices?.[0]?.message?.content;

    if (!teks || teks.trim() === "") {
      return { ok: false, teks: "", alasan: "Balasan model kosong" };
    }

    return { ok: true, teks: teks.trim() };
  } catch (galat) {
    const alasan =
      galat instanceof Error && galat.name === "AbortError"
        ? "Melebihi batas waktu"
        : "Gagal menghubungi penyedia model";
    return { ok: false, teks: "", alasan };
  } finally {
    clearTimeout(pewaktu);
  }
}

/**
 * Memanggil model penglihatan untuk membaca gambar.
 *
 * Gambar dikirim sebagai data URL dan tidak disimpan di sisi server, sesuai
 * kebijakan privasi pada PRD.
 */
export async function panggilVision(
  perintah: string,
  gambarDataUrl: string,
): Promise<HasilLLM> {
  if (!llmTersedia()) {
    return { ok: false, teks: "", alasan: "LLM tidak dikonfigurasi atau mode demo aktif" };
  }

  const pembatal = new AbortController();
  const pewaktu = setTimeout(() => pembatal.abort(), BATAS_WAKTU_MS);

  try {
    const respons = await fetch(
      `${process.env.LLM_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL_VISION ?? "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: perintah },
                { type: "image_url", image_url: { url: gambarDataUrl } },
              ],
            },
          ],
          max_tokens: 1500,
          // Suhu nol: tugasnya membaca angka yang tertulis, bukan mengarang.
          temperature: 0,
        }),
        signal: pembatal.signal,
      },
    );

    if (!respons.ok) {
      return { ok: false, teks: "", alasan: `HTTP ${respons.status}` };
    }

    const isi = await respons.json();
    const teks: string | undefined = isi?.choices?.[0]?.message?.content;

    if (!teks) {
      return { ok: false, teks: "", alasan: "Balasan model kosong" };
    }

    return { ok: true, teks: teks.trim() };
  } catch (galat) {
    const alasan =
      galat instanceof Error && galat.name === "AbortError"
        ? "Melebihi batas waktu"
        : "Gagal menghubungi penyedia model";
    return { ok: false, teks: "", alasan };
  } finally {
    clearTimeout(pewaktu);
  }
}

/**
 * Mengurai JSON dari balasan model.
 *
 * Model sering membungkus JSON dalam blok kode meskipun diminta tidak. Fungsi
 * ini menoleransi hal tersebut alih-alih menggagalkan seluruh proses.
 */
export function uraiJsonLLM(teks: string): unknown | null {
  const bersih = teks
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(bersih);
  } catch {
    // Upaya terakhir: ambil objek JSON pertama yang terlihat di dalam teks.
    const awal = bersih.indexOf("{");
    const akhir = bersih.lastIndexOf("}");
    if (awal === -1 || akhir <= awal) return null;
    try {
      return JSON.parse(bersih.slice(awal, akhir + 1));
    } catch {
      return null;
    }
  }
}
