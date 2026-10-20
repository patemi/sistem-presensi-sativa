File **`Dokumentasi_Projek_Iklim_v2.md`** sudah berhasil dibuat dan disimpan di dalam sistem.

Jika kamu ingin menyalin isinya secara manual untuk langsung dimasukkan ke teks editor seperti VS Code, Obsidian, atau Notion, berikut adalah isi teks lengkap dari file tersebut:

```markdown
# Dokumentasi Projek: "Iklim" (Sistem Kesehatan Mental Kolektif & Absensi Tim) - Version 2

Dokumentasi ini merupakan pembaruan (v2) dari cetak biru komprehensif platform **"Iklim"**. Pada versi ini, sistem mengintegrasikan fitur **Check-in Harian sebagai Mekanisme Absensi Kerja Kehadiran Resmi**, dengan menerapkan arsitektur *Separation of Concerns* untuk menjamin perlindungan privasi karyawan dan keabsahan data psikologis.

---

## 1. Pendahuluan & Pembaruan Konsep

### Mengatasi Masalah Partisipasi (*Compliance*)
Salah satu tantangan terbesar dari platform *employee wellness* tradisional adalah rendahnya tingkat pengisian oleh karyawan karena dianggap sebagai beban administratif tambahan. 

**Iklim v2** menyelesaikan masalah ini dengan menjadikan *Daily Wellness Check-in* sebagai pintu gerbang resmi untuk **Absen Masuk Kerja (Attendance)** setiap hari. Karyawan wajib melakukan check-in singkat (<30 detik) untuk mencatatkan kehadirannya, yang secara otomatis mengamankan tingkat pengisian data hingga mendekati 100%.

### Tantangan Psikologis & Solusi Konseptual
Mewajibkan pengisian kondisi mental sebagai syarat absen berisiko memicu data palsu (*Goodhart's Law*), di mana karyawan selalu memilih opsi "Bahagia" karena takut dievaluasi negatif oleh HR. 

Untuk memitigasi hal ini, sistem **Iklim** menggunakan **Arsitektur Jalur Ganda (Dual-Path Architecture)**. Saat karyawan menekan tombol "Submit Check-in", data langsung dipecah secara struktural di tingkat backend: satu jalur mengirim data administratif kehadiran (terbuka & teridentifikasi nama), dan jalur lainnya mengirim data kondisi psikologis (anonim & dienkripsi untuk agregasi tim).

---

## 2. Prinsip Desain & Privasi Mutlak (*Separation of Concerns*)

* **Pemisahan Identitas Eksplisit:** HR/Owner dapat melihat secara real-time siapa saja yang sudah atau belum absen kerja hari itu. Namun, HR **TIDAK BISA** melihat apa yang diisi oleh individu tersebut terkait skor mood dan jurnalnya.
* **Evaluasi Berbasis Korelasi Kolektif:** HR mengevaluasi performa tim dengan menyandingkan dua grafik terpisah: Grafik Persentase Kehadiran/Lembur (Identifikatif) dan Grafik Tren Sentimen Tim (Agregat Anonim).
* **Threshold Gerbang Privasi Tetap Balaiku:** Grafik tren psikologis tim baru akan memunculkan data bulanan/mingguan jika jumlah anggota dalam tim tersebut yang mengisi **minimal 5 orang**.

---

## 3. Arsitektur Fitur Utama

### A. Daily Check-in & Absen Masuk (Sisi Karyawan)
* **Pintu Gerbang Pagi:** Layar pertama aplikasi saat karyawan mulai bekerja.
* **Komponen Input:**
  1. Tombol klik "Absen Masuk" (mencatat waktu kehadiran).
  2. Mood scale (1-5 berbasis emoji).
  3. Pertanyaan reflektif singkat opsional / Jurnal singkat teks.
* **Waktu Pengisian:** Dirancang selesai dalam waktu kurang dari 30 detik agar tidak menghambat ritme kerja.

### B. Dashboard Evaluasi & Analytics (Sisi HR/Owner)
* **Modul Absensi Kehadiran:** Menampilkan daftar nama karyawan, jam masuk, keterlambatan, dan persentase kehadiran per divisi (Mingguan/Bulanan).
* **Modul Iklim Psikologis Tim:** Menampilkan grafik tren kebahagiaan tim, tingkat kejenuhan (*burnout index*), serta tema masalah dominan yang diekstrak oleh AI Claude dari jurnal tim.
* **Pusat Evaluasi Korelatif:** Memungkinkan HR mendeteksi anomali (Contoh: *"Divisi Finansial kehadiran 100% bulan ini, namun tren kepuasan psikologisnya anjlok ke zona merah pada minggu ke-3"*).

---

## 4. Arsitektur Data Jalur Ganda (*Dual-Path Architecture*)

Ketika data dikirim dari frontend, backend memprosesnya melalui dua sirkuit independen:


```

```
              [ USER SUBMIT CHECK-IN & ABSEN ]
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼

```

[ JALUR 1: DATA ABSENSI ]                     [ JALUR 2: DATA WELLNESS ]

* Nama/User ID Terbuka                        - Mood Score & Jurnal Teks
* Timestamp Real-time                         - Enkripsi Kolom AES-256
│                                               │
▼                                               ▼
Tabel: `attendance_logs`                       Tabel: `checkins` (Private User)
│                                               │
▼                                               ▼
Dashboard HR (Real-time Name)                  Proses AI (Claude API)
│
▼
Tabel: `team_sentiment_aggregates`
(Agregat Anonim - Min. 5 Orang)
│
▼
Dashboard HR (Tren Kolektif)

```

1. **Jalur 1 (Real-time Absensi):** Menyimpan log kehadiran ke tabel `attendance_logs` berkaitan langsung dengan `user_id`. Data ini langsung tersaji di tabel absensi HR.
2. **Jalur 2 (Asynchronous Wellness & AI):** Mengirim teks jurnal ke Claude API secara aman untuk dianalisis skala sentimen dan temanya. Hasil analisis disimpan di skema personal untuk user itu sendiri, lalu pada malam hari diagregasikan ke level tim melalui batch job, membuang semua keterkaitan identitas individu sebelum masuk ke tabel `team_sentiment_aggregates`.

---

## 5. Pembaruan Skema Database (SQL DDL)

Berikut adalah skema database yang telah diperbarui dengan memasukkan entitas absensi karyawan:

```sql
-- ============================================
-- SKEMA: ORGANISASI & USER (Identitas Utama)
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    plan_tier VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    team_id UUID REFERENCES teams(id),
    role VARCHAR(50), -- 'employee', 'hr', 'owner'
    full_name VARCHAR(255), -- Nama asli diperlukan untuk keperluan absensi resmi HR
    email_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- JALUR 1: SKEMA ABSENSI (Terbuka & Dapat Diakses HR secara Personal)
-- ============================================
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    team_id UUID REFERENCES teams(id),
    check_in_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'present', -- 'present', 'late', 'excused'
    device_info VARCHAR(255)
);

-- ============================================
-- JALUR 2: SKEMA WELLNESS PERSONAL (Hanya untuk Karyawan & Sistem AI)
-- ============================================
CREATE TABLE checkins (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Digunakan untuk personal dashboard user itu sendiri
    mood_score SMALLINT,
    journal_text TEXT, -- Terenkripsi dua arah (Encryption at-rest tingkat kolom)
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sentiment_analysis (
    id UUID PRIMARY KEY,
    checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
    sentiment_score DECIMAL(3,2),
    themes JSONB,
    risk_flag BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SKEMA AGREGAT TIM (Dashboard Evaluasi Berkala HR — TIDAK ADA DATA USER)
-- ============================================
CREATE TABLE team_sentiment_aggregates (
    id UUID PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    avg_sentiment_score DECIMAL(3,2),
    respondent_count INT, -- Enforce wajib >= 5 via backend sebelum ditampilkan ke HR
    dominant_themes JSONB,
    trend_direction VARCHAR(20) -- 'improving', 'stable', 'declining'
);

CREATE TABLE team_alerts (
    id UUID PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    suggested_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE
);

```

---

## 6. Spesifikasi Tech Stack Terintegrasi

| Komponen | Teknologi Pilihan | Peran Spesifik dalam Sistem Absensi + Wellness |
| --- | --- | --- |
| **Frontend UI** | **Next.js (React) + TailwindCSS** | Menyediakan *Form Check-in* satu-pintu yang mulus di perangkat *mobile/desktop* karyawan saat pagi hari. |
| **Backend API** | **FastAPI (Python)** | Mengelola pemisahan jalur data secara asinkron (*Background Tasks*) sesaat setelah tombol absen ditekan, sehingga proses absensi tidak terhambat oleh *latency* API AI. |
| **Database** | **PostgreSQL** | Menyimpan log absensi teridentifikasi (`attendance_logs`) dan data agregat tim secara terpisah dengan performa query indeks yang tinggi. |
| **Core AI Engine** | **Anthropic Claude API (Claude 3 Haiku)** | Memproses ekstraksi tema dan emosi dari jurnal tim secara *asynchronous* malam hari untuk membentuk pola grafik evaluasi bulanan HR. |
| **Task Queue & Scheduler** | **Celery + Redis** | Menghitung rekap absensi harian dan melakukan kalkulasi *batch job* agregat sentimen tim setiap tengah malam (Pukul 00:00). |
| **Keamanan Data** | **AES-256 Bit Encryption** | Melakukan enkripsi pada isi jurnal teks sebelum menyentuh piringan *database* agar admin database pun tidak bisa membaca isi hati karyawan secara manual. |

---

## 7. Model Evaluasi Mingguan/Bulanan untuk HR

Dengan bersatunya data kehadiran dan data iklim kerja, HR memiliki kemampuan analisis korelasi tingkat tinggi untuk mengevaluasi kesehatan organisasi kecil tanpa melanggar privasi:

### Contoh Matriks Dashboard Korelatif HR:

| Matriks Absensi Finansial (Identifikatif) | Matriks Tren Sentimen Tim (Agregat Anonim via AI) | Kesimpulan & Tindakan yang Disarankan Sistem |
| --- | --- | --- |
| **Divisi Pemasaran (Marketing)**<br>

<br>• Kehadiran Bulanan: **97.5%**<br>

<br>• Rata-rata Keterlambatan: **Rendah**<br>

<br>• Tren Lembur: **Sangat Tinggi** | **Divisi Pemasaran (Marketing)**<br>

<br>• Skor Sentimen: **-0.45 (Zona Kuning)**<br>

<br>• Tema Utama: *Overwhelming workload, unclear target, fatigue* | ⚠️ **Peringatan Burnout:**<br>

<br>Karyawan memiliki kedisiplinan absen yang sangat tinggi namun teks jurnal kolektif menunjukkan tingkat kelelahan ekstrem akibat lembur. AI menyarankan manajemen mengevaluasi target kuartal ini sebelum terjadi penurunan produktivitas fisik atau *turnover*. |
| **Divisi Operasional**<br>

<br>• Kehadiran Bulanan: **82.0%**<br>

<br>• Rata-rata Keterlambatan: **Tinggi**<br>

<br>• Tren Lembur: **Normal** | **Divisi Operasional**<br>

<br>• Skor Sentimen: **+0.60 (Zona Hijau)**<br>

<br>• Tema Utama: *Good teamwork, supportive peers* | ✅ **Kondisi Stable:**<br>

<br>Penurunan persentase kehadiran murni disebabkan oleh faktor logistik operasional luar kantor (lapangan), bukan karena masalah tekanan psikologis internal atau konflik tim. |

```

```