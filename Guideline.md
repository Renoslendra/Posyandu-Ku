# Guideline — PosyanduKu Hackathon

**Event**: Indonesianext 2026 Hackathon by Telkomsel
**Tanggal**: 28-29 Juli 2026

---

## 1. Prinsip Dasar

### 1.1 Filosofi Pembangunan

> "Bangun dari keresahan, bukan karena bisa dibuat."

PosyanduKu dibangun untuk menyelesaikan masalah NYATA: data posyandu yang menumpuk dan tidak pernah diolah. Setiap keputusan teknis harus mendukung tujuan ini.

### 1.2 Aturan Emas

| No | Aturan | Penjelasan |
|----|--------|------------|
| 1 | **Sederhana > Kompleks** | Kader posyandu tidak paham teknologi. UI harus SANGAT sederhana. |
| 2 | **Fungsi > Kecantikan** | Utamakan fitur berfungsi daripada UI yang cantik. |
| 3 | **Bukan Alat Diagnosis** | Semua output adalah "alat bantu kader", bukan diagnosis medis. |
| 4 | **Data Sensitif** | Data kesehatan anak harus dilindungi. RLS wajib aktif. |
| 5 | **AI sebagai Fungsi Inti** | AI bukan chatbot, tapi fungsi yang menggerakkan fitur (classify, generate, detect). |

---

## 2. Tech Stack

### 2.1 Stack yang Digunakan

| Layer | Technology | Versi | Alasan |
|-------|-----------|-------|--------|
| Framework | Next.js | 14+ | Fast build, API routes, SSR |
| Styling | Tailwind CSS | 3+ | Utility-first, cepat |
| Database | Supabase | - | PostgreSQL + Auth + RLS |
| AI | OpenAI API | GPT-4o | LLM untuk summary, menu |
| Deploy | Vercel | - | One-click deploy |
| Charts | Recharts | 2+ | React chart library |
| Language | TypeScript | 5+ | Type safety |

### 2.2 Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "openai": "^4.0.0",
    "recharts": "^2.0.0",
    "tailwindcss": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## 3. Coding Standards

### 3.1 File Structure

```
posyanduku/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── input/
│   │   └── page.tsx        # Halaman input anak (kader)
│   ├── dashboard/
│   │   └── page.tsx        # Dashboard bidan
│   ├── child/
│   │   └── [id]/
│   │       └── page.tsx    # Profil anak
│   └── api/
│       ├── children/
│       │   └── route.ts    # API CRUD anak
│       ├── measurements/
│       │   └── route.ts    # API pengukuran + Z-score
│       ├── dashboard/
│       │   └── route.ts    # API data dashboard
│       ├── summary/
│       │   └── route.ts    # API AI summary
│       └── menu/
│           └── route.ts    # API menu lokal
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── openai.ts           # OpenAI client
│   └── z-score.ts          # Fungsi hitung Z-score
├── components/
│   ├── InputForm.tsx       # Form input anak
│   ├── Dashboard.tsx       # Komponen dashboard
│   ├── GrowthChart.tsx     # Grafik pertumbuhan
│   ├── StatusBadge.tsx     # Badge status gizi
│   └── MenuCard.tsx        # Card menu lokal
├── .env.local              # Environment variables
├── .env.example            # Contoh environment variables
└── README.md               # Dokumentasi project
```

### 3.2 Naming Conventions

| Jenis | Convention | Contoh |
|-------|------------|--------|
| File (component) | PascalCase | `InputForm.tsx`, `GrowthChart.tsx` |
| File (API route) | kebab-case | `route.ts`, `children/route.ts` |
| Variable | camelCase | `childName`, `zScoreWeight` |
| Constant | UPPER_SNAKE | `MAX_Z_SCORE`, `API_URL` |
| Function | camelCase | `calculateZScore()`, `generateSummary()` |
| Database table | snake_case | `children`, `measurements` |
| Database column | snake_case | `child_id`, `weight_kg` |
| CSS class | kebab-case | `bg-green-500`, `text-xl` |

### 3.3 Code Style

```typescript
// BENAR: Deskriptif, jelas
const calculateZScore = (weight: number, ageInMonths: number): number => {
  // Rumus Z-score WHO
  const median = getMedianWeight(ageInMonths);
  const sd = getStandardDeviation(ageInMonths);
  return (weight - median) / sd;
};

// SALAH: Tidak jelas, singkatan membingungkan
const calc = (w: number, a: number): number => {
  const m = getMed(a);
  const s = getSD(a);
  return (w - m) / s;
};
```

### 3.4 Komentar

```typescript
// BENAR: Komentar menjelaskan MENGAPA, bukan APA
// Z-score < -3 menurut WHO menunjukkan gizi buruk
// Lihat: https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators
if (zScore < -3) {
  status = 'gizi_buruk';
}

// SALAH: Komentar menjelaskan APA yang sudah jelas dari kode
// Jika zScore kurang dari -3
if (zScore < -3) {
  status = 'gizi_buruk';
}
```

---

## 4. Git Workflow

### 4.1 Branch Strategy

```
main          ← Production (deployed ke Vercel)
  └── develop ← Development (merge ke main sebelum demo)
       ├── feature/input-anak
       ├── feature/dashboard
       ├── feature/ai-summary
       └── feature/menu-lokal
```

### 4.2 Commit Messages

Format: `<type>: <description>`

| Type | Kapan Digunakan | Contoh |
|------|-----------------|--------|
| `feat` | Fitur baru | `feat: add child input form` |
| `fix` | Bug fix | `fix: Z-score calculation error` |
| `style` | Perubahan CSS/UI | `style: increase font size for kader` |
| `refactor` | Refactor kode | `refactor: extract Z-score function` |
| `docs` | Dokumentasi | `docs: add README setup guide` |
| `chore` | Maintenance | `chore: update dependencies` |

### 4.3 Aturan Git

| No | Aturan | Alasan |
|----|--------|--------|
| 1 | Commit kecil dan sering | Mudah rollback jika ada error |
| 2 | Jangan commit ke main langsung | Gunakan branch untuk setiap fitur |
| 3 | Push ke GitHub setiap 30 menit | Backup kode secara berkala |
| 4 | Pull sebelum mulai kerja | Pastikan kode terbaru |
| 5 | Jangan commit `.env.local` | Secret tidak boleh di repo |

---

## 5. UI/UX Guidelines

### 5.1 Prinsip Desain

**Target User**: Kader posyandu (ibu-ibu sukarelawan, literasi digital rendah)

| No | Prinsip | Implementasi |
|----|---------|--------------|
| 1 | **Font Besar** | Minimal 16px untuk teks, 24px untuk heading |
| 2 | **Tombol Besar** | Minimal 48x48px untuk tombol aksi utama |
| 3 | **Kontras Tinggi** | Warna hijau/kuning/merah untuk status |
| 4 | **Sederhana** | Tidak lebih dari 3 langkah untuk setiap aksi |
| 5 | **Bahasa Indonesia** | Semua teks dalam Bahasa Indonesia |
| 6 | **Ikon + Teks** | Gunakan ikon disertai teks, bukan ikon saja |

### 5.2 Warna Status Gizi

| Status | Warna | Kode | Keterangan |
|--------|-------|------|------------|
| Normal | Hijau | `bg-green-500` | Z-score >= -2 |
| Risiko | Kuning | `bg-yellow-500` | Z-score -2 sampai -3 |
| Gizi Buruk | Merah | `bg-red-500` | Z-score < -3 |

### 5.3 Layout Halaman

```
┌─────────────────────────────────────────────┐
│  HEADER: Logo + Judul Halaman               │
├─────────────────────────────────────────────┤
│                                             │
│  KONTEN UTAMA                               │
│  (Form / Dashboard / Grafik)                │
│                                             │
│  - Font besar (16px+)                       │
│  - Tombol besar (48px+)                     │
│  - Spasi cukup                              │
│                                             │
├─────────────────────────────────────────────┤
│  FOOTER: Disclaimer + Link                  │
└─────────────────────────────────────────────┘
```

### 5.4 Disclaimer yang Wajib Ada

Setiap halaman yang menampilkan data kesehatan harus menyertakan:

```
Ini adalah alat bantu kader posyandu, bukan alat diagnosis.
Untuk diagnosis resmi, silakan konsultasi ke bidan atau puskesmas terdekat.
```

---

## 6. AI Guidelines

### 6.1 Prinsip Penggunaan AI

| No | Prinsip | Penjelasan |
|----|---------|------------|
| 1 | **AI = Fungsi Inti** | AI bukan chatbot, tapi fungsi yang menggerakkan fitur |
| 2 | **Invisible AI** | User tidak tahu ada AI, mereka hanya tahu fiturnya berfungsi |
| 3 | **Bukan Diagnosis** | AI tidak mendiagnosis, AI memberikan informasi untuk kader |
| 4 | **Prompt yang Jelas** | Prompt harus spesifik dan terstruktur |
| 5 | **Error Handling** | Jika AI gagal, aplikasi tetap berfungsi |

### 6.2 Prompt Templates

#### Prompt untuk Generate Summary

```
Anda adalah asisten yang membantu bidan desa menganalisa data posyandu.

Berikut data anak bulan ini:
- Total anak: {total}
- Normal: {normal} ({percent_normal}%)
- Risiko: {risiko} ({percent_risiko}%)
- Gizi Buruk: {gizi_buruk} ({percent_gizi_buruk}%)

Anak yang perlu ditindaklanjuti:
{daftar_anak_bermasalah}

Buatlah ringkasan dalam Bahasa Indonesia yang:
1. Jelas dan mudah dipahami
2. Menyebutkan angka-angka penting
3. Memberikan rekomendasi tindakan konkret
4. Menggunakan format bullet point

PENTING: Ini adalah alat bantu, bukan diagnosis. Selalu arahkan ke bidan/puskesmas.
```

#### Prompt untuk Generate Menu Lokal

```
Anda adalah ahli gizi yang membantu ibu di desa menyiapkan makanan bergizi untuk anak.

Status gizi anak: {status_gizi}
Umur anak: {umur} bulan
Lokasi: {lokasi}

Buatlah menu harian yang:
1. Menggunakan bahan LOKAL yang MURAH (tempe, telur, bayam, ikan teri, kangkung, pisang, dll)
2. Bisa dibeli di pasar desa
3. Total biaya di bawah Rp 20.000
4. Mengandung protein, vitamin, dan karbohidrat yang cukup
5. Mudah dimasak oleh ibu di desa
6. Dalam Bahasa Indonesia yang sederhana

Format:
PAGI: [menu] - [keterangan]
SIANG: [menu] - [keterangan]
SNACK: [menu] - [keterangan]
MALAM: [menu] - [keterangan]

BAHAN YANG DIBUTUHKAN:
- [bahan] (Rp [harga])

TOTAL BIAYA: Rp [total]

PENTING: Ini adalah saran umum, bukan anjuran medis. Untuk konsultasi gizi, silakan ke bidan/puskesmas.
```

### 6.3 Error Handling untuk AI

```typescript
// Contoh error handling yang baik
async function generateSummary(data: ChildData[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
  } catch (error) {
    // Jika AI gagal, tetap return ringkasan sederhana
    console.error('AI Summary Error:', error);
    return generateSimpleSummary(data); // Fallback function
  }
}
```

---

## 7. Database Guidelines

### 7.1 Row Level Security (RLS)

**WAJIB AKTIF** di semua tabel yang berisi data sensitif.

```sql
-- Contoh RLS untuk tabel children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Policy: Kader hanya bisa akses anak di posyandunya
CREATE POLICY "Kader akses anak posyandu" ON children
  FOR ALL
  USING (
    posyandu_id IN (
      SELECT posyandu_id FROM cadres 
      WHERE id = auth.uid()
    )
  );

-- Policy: Orang tua hanya bisa akses anaknya sendiri
CREATE POLICY "Orang tua akses anak sendiri" ON children
  FOR SELECT
  USING (
    parent_phone = auth.jwt()->>'phone'
  );
```

### 7.2 Indexes

```sql
-- Index untuk query yang sering digunakan
CREATE INDEX idx_children_posyandu ON children(posyandu_id);
CREATE INDEX idx_measurements_child ON measurements(child_id);
CREATE INDEX idx_measurements_date ON measurements(measurement_date);
CREATE INDEX idx_measurements_status ON measurements(status);
```

### 7.3 Environment Variables

```env
# .env.local (JANGAN di-commit ke Git)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
OPENAI_API_KEY=sk-xxx
```

```env
# .env.example (BOLEH di-commit ke Git)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

---

## 8. Deployment Guidelines

### 8.1 Pre-Deployment Checklist

- [ ] Semua environment variables sudah di-set di Vercel
- [ ] RLS aktif di semua tabel
- [ ] Tidak ada secret di client-side code
- [ ] Semua API endpoint berfungsi
- [ ] UI responsive di mobile dan desktop
- [ ] Error handling di semua API
- [ ] Disclaimer ada di setiap halaman data kesehatan

### 8.2 Deploy ke Vercel

```bash
# 1. Pastikan semua perubahan sudah di-commit
git add .
git commit -m "feat: ready for deployment"

# 2. Push ke GitHub
git push origin main

# 3. Vercel otomatis deploy dari GitHub
# 4. Cek deployment di vercel.com/dashboard
# 5. Test di production URL
```

### 8.3 Post-Deployment Checklist

- [ ] Aplikasi bisa diakses dari production URL
- [ ] Input anak berfungsi
- [ ] Z-score terhitung otomatis
- [ ] Dashboard menampilkan data
- [ ] AI summary bisa di-generate
- [ ] Menu lokal bisa di-generate
- [ ] Tidak ada error di console browser
- [ ] Tidak ada error di Vercel logs

---

## 9. Demo Guidelines

### 9.1 Struktur Demo (5 menit)

| Durasi | Bagian | Apa yang Ditunjukkan |
|--------|--------|---------------------|
| 1 menit | **Opening** | Ceritakan masalah stunting dan data posyandu yang menumpuk |
| 1 menit | **Input Data** | Demo input anak, tampilkan Z-score otomatis |
| 1 menit | **Dashboard** | Demo dashboard bidan, filter anak bermasalah |
| 1 menit | **AI Summary** | Demo generate ringkasan dan menu lokal |
| 1 menit | **Closing** | Ceritakan impact dan next steps |

### 9.2 Tips Demo

| No | Tips | Alasan |
|----|------|--------|
| 1 | Mulai dengan cerita emosional | Menarik perhatian juri |
| 2 | Tunjukkan data nyata | Bukan mockup, tapi data yang benar-benar tersimpan |
| 3 | Jelaskan AI sebagai "fitur", bukan "teknologi" | Juri ingin tahu dampaknya, bukan teknologinya |
| 4 | Tunjukkan responsivitas | Buka di HP dan desktop |
| 5 | Akhiri dengan impact numbers | "300.000 posyandu, 1,2 juta kader, jutaan anak" |

### 9.3 Contoh Script Demo

**Opening**:
> "1 dari 3 anak Indonesia mengalami stunting. Bu Ani, kader posyandu di Desa Sukamakmur, sudah 5 tahun nyatat data 200 anak di buku tulis. Data menumpuk, tapi tidak pernah diolah. Bulan lalu, Budi (3 tahun) baru ketahuan gizi buruk setelah sakit. Kalau datanya diolah, Budi bisa ditolong lebih awal. Ini keresahan kami."

**Input Data**:
> "Ini form untuk kader. Cukup masukkan nama, umur, berat, tinggi... Lihat, Z-score langsung terhitung otomatis. Budi terdeteksi GIZI BURUK. Kader langsung tahu tanpa perlu hitung manual."

**Dashboard**:
> "Ini yang bidan lihat. 200 anak, 170 normal, 20 risiko, 10 gizi buruk. Klik 'Gizi Buruk'... langsung tahu siapa yang perlu ditolong."

**AI Summary**:
> "AI bantu bidan buat laporan bulanan. Lihat, ada rekomendasi: Budi perlu rujuk puskesmas. Dan untuk orang tua, AI sarankan menu: bubur tempe + telur orak-arik, total Rp 15.000. Bukan 'asupan protein hewani' yang abstrak, tapi tempe, telur, bayam yang ada di pasar desa."

**Closing**:
> "PosyanduKu mengubah data tumpukan buku tulis menjadi informasi yang menyelamatkan anak. 300.000 posyandu, 1,2 juta kader, jutaan anak menunggu solusi ini."

---

## 10. Troubleshooting

### 10.1 Masalah Umum

| Masalah | Solusi |
|---------|--------|
| Supabase tidak terkoneksi | Cek `.env.local`, pastikan URL dan key benar |
| Z-score salah | Cek rumus WHO, pastikan menggunakan tabel yang benar |
| AI tidak merespons | Cek API key OpenAI, pastikan ada credit |
| Deploy gagal | Cek error di Vercel logs, pastikan semua env var ada |
| RLS memblokir akses | Cek policy, pastikan user role benar |
| Chart tidak tampil | Cek data, pastikan format tanggal benar |

### 10.2 Kontak Bantuan

| Sumber | Link |
|--------|------|
| Next.js Docs | https://nextjs.org/docs |
| Supabase Docs | https://supabase.com/docs |
| OpenAI Docs | https://platform.openai.com/docs |
| Vercel Docs | https://vercel.com/docs |
| Recharts Docs | https://recharts.org/en-US |
| WHO Growth Standards | https://www.who.int/tools/growth-reference-data-for-5to19-years |
