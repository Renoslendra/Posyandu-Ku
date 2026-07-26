"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ARTI_GARIS,
  GARIS_SD,
  LABEL_GARIS,
  WARNA_GARIS,
  gabungkanDenganDataAnak,
  kurvaReferensi,
} from "@/lib/gizi/kurva";
import type { Indikator, JenisKelamin } from "@/lib/gizi/zscore";

/**
 * Grafik pertumbuhan dengan garis referensi WHO.
 *
 * Garis referensi wajib ada: angka 9 kg bermakna berbeda pada usia 12 bulan dan
 * 36 bulan, sehingga titik pengukuran tanpa konteks tidak dapat dibaca.
 *
 * Rentang sumbu dibatasi di sekitar usia anak, bukan seluruh 0-60 bulan, agar
 * perubahan antar kunjungan terlihat jelas alih-alih memadat di satu sisi.
 */

export interface TitikPengukuran {
  usiaBulan: number;
  nilai: number;
}

export function GrafikPertumbuhan({
  indikator,
  jenisKelamin,
  data,
  judul,
  satuan,
}: {
  indikator: Indikator;
  jenisKelamin: JenisKelamin;
  data: TitikPengukuran[];
  judul: string;
  satuan: string;
}) {
  if (data.length === 0) {
    return (
      <div className="kartu p-5">
        <h3 className="font-semibold text-dasar-900">{judul}</h3>
        <p className="mt-2 text-base text-dasar-700">
          Belum ada data pengukuran untuk digambarkan.
        </p>
      </div>
    );
  }

  const usiaAnak = data.map((d) => d.usiaBulan);
  const batas = {
    min: Math.max(0, Math.min(...usiaAnak) - 6),
    maks: Math.min(60, Math.max(...usiaAnak) + 6),
  };

  const titik = gabungkanDenganDataAnak(
    kurvaReferensi(indikator, jenisKelamin, batas),
    data.map((d) => ({ x: d.usiaBulan, nilai: d.nilai })),
  );

  return (
    <div className="kartu p-5">
      <h3 className="font-semibold text-dasar-900">{judul}</h3>

      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={titik} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[batas.min, batas.maks]}
              tick={{ fontSize: 12 }}
              label={{ value: "Usia (bulan)", position: "bottom", fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              width={45}
              label={{ value: satuan, angle: -90, position: "insideLeft", fontSize: 12 }}
            />
            <Tooltip
              formatter={(nilai: number, nama: string) => [
                `${nilai} ${satuan}`,
                nama === "anak" ? "Anak ini" : (LABEL_GARIS[nama] ?? nama),
              ]}
              labelFormatter={(x) => `Usia ${x} bulan`}
            />

            {/* Garis referensi digambar lebih dahulu agar berada di belakang. */}
            {GARIS_SD.map((sd) => {
              const kunci =
                sd === 0 ? "sd_0" : `sd_${Math.abs(sd)}${sd < 0 ? "n" : "p"}`;
              return (
                <Line
                  key={kunci}
                  type="monotone"
                  dataKey={kunci}
                  stroke={WARNA_GARIS[kunci]}
                  strokeWidth={sd === -2 || sd === -3 ? 2 : 1}
                  strokeDasharray={sd === 0 ? undefined : "4 3"}
                  dot={false}
                  connectNulls
                />
              );
            })}

            <Line
              type="monotone"
              dataKey="anak"
              stroke="#0f766e"
              strokeWidth={3}
              dot={{ r: 5, fill: "#0f766e" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-dasar-600">
        <li className="flex items-center gap-2">
          <span className="inline-block h-1 w-5 rounded bg-brand-500" />
          <span className="font-semibold text-dasar-800">Anak ini</span>
        </li>
        {GARIS_SD.map((sd) => {
          const kunci = sd === 0 ? "sd_0" : `sd_${Math.abs(sd)}${sd < 0 ? "n" : "p"}`;
          return (
            <li key={kunci} className="flex items-center gap-2">
              <span
                className="inline-block h-1 w-5 rounded"
                style={{ backgroundColor: WARNA_GARIS[kunci] }}
              />
              {ARTI_GARIS[kunci] ?? LABEL_GARIS[kunci]}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 rounded-lg bg-dasar-50 p-4 text-sm leading-relaxed text-dasar-700">
        <p className="font-semibold text-dasar-900">Cara membaca grafik ini</p>

        <p className="mt-2">
          Garis <span className="font-semibold text-brand-600">hijau tebal</span> adalah
          anak ini. Garis-garis lain adalah pembanding: angka pertumbuhan anak sehat
          seusianya, menurut standar WHO.
        </p>

        <p className="mt-2">
          Yang perlu diperhatikan bukan letak titiknya, melainkan{" "}
          <span className="font-semibold">arah garis hijaunya</span>. Selama garis itu
          menanjak sejajar dengan garis pembanding, anak tumbuh baik meskipun ia berada
          di garis bawah. Garis yang mendatar atau menurun perlu ditanyakan ke bidan,
          bahkan bila anak masih berada di tengah.
        </p>

        <ul className="mt-3 flex flex-col gap-1.5">
          <li>
            <span className="font-semibold">Di atas garis tengah</span> — pertumbuhan di
            atas rata-rata anak seusianya.
          </li>
          <li>
            <span className="font-semibold">Antara garis tengah dan batas bawah</span> —
            wajar, tidak perlu dikhawatirkan.
          </li>
          <li>
            <span className="font-semibold text-status-risiko">
              Di bawah batas bawah
            </span>{" "}
            — perlu diperiksa bidan.
          </li>
          <li>
            <span className="font-semibold text-status-berat">
              Di bawah batas bahaya
            </span>{" "}
            — perlu segera diperiksa.
          </li>
        </ul>

        <p className="mt-3 text-dasar-600">
          Istilah teknisnya: garis tengah disebut median, batas bawah -2 SD, batas bahaya
          -3 SD, dan batas atas +2 SD.
        </p>
      </div>
    </div>
  );
}
