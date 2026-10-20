# Dokumentasi Sistem: SATIVA — BelajarVibe Corporate (v4)

**SATIVA** = *Sistem Absensi & Kesehatan Tim BelajarVibe*.

Pembaruan v4 ini mengubah total arah sistem dari sekadar presensi resmi (v3/Wening) menjadi **sistem presensi yang terintegrasi dengan monitoring kesehatan mental tim secara anonim**, dengan tujuan utama: membantu HR mendeteksi tanda-tanda keresahan/ketidaknyamanan kerja per divisi sedini mungkin, sebagai langkah pencegahan sebelum terjadi resign mendadak (*sudden resignation*).

---

## 1. Perubahan Nama & Tujuan Sistem

| Aspek | v3 (Wening) | v4 (SATIVA) |
|---|---|---|
| Nama | Wening | **SATIVA** |
| Kepanjangan | — | Sistem Absensi & Kesehatan Tim BelajarVibe |
| Tujuan utama | Presensi resmi + feedback wajib | Presensi resmi **sekaligus** alat deteksi dini kesehatan mental tim per divisi |
| Sifat feedback | Melekat pada identitas karyawan | **Anonim**, hanya tampil sebagai insight agregat per divisi |
| Output ke HR | Data presensi + feedback individual | Data presensi individual + **insight kesehatan mental per divisi** (bukan per individu) |

**Kenapa digabung dengan presensi?** Supaya pengisian feedback mood/keresahan tidak menjadi tugas tambahan yang harus diingatkan manual oleh HR — feedback menjadi bagian dari alur presensi pulang yang memang sudah wajib dilakukan setiap hari. Ini menjamin tingkat partisipasi mendekati 100% secara alami.

---

## 2. Prinsip Privasi (Non-Negotiable)

Ini adalah aturan paling penting dalam SATIVA — pelanggaran terhadap prinsip ini merusak kepercayaan karyawan terhadap sistem:

1. **Data presensi (kehadiran, jam masuk/pulang, lokasi) bersifat identifikatif** — HR dan owner boleh melihat nama karyawan terkait data ini, karena ini kebutuhan administratif yang sah.
2. **Data feedback mood/keresahan bersifat anonim mutlak** — tidak pernah ditampilkan dengan nama karyawan ke HR maupun owner, dalam bentuk apapun, termasuk di log audit internal HR.
3. **Insight hanya muncul di level divisi, bukan individu** — dashboard HR hanya menampilkan agregat per divisi (skor rata-rata, tren, tema keresahan dominan hasil analisis AI).
4. **Threshold minimum jumlah responden** — insight kesehatan mental sebuah divisi baru ditampilkan jika jumlah karyawan yang mengisi feedback pada periode tersebut **minimal 5 orang**. Di bawah itu, dashboard menampilkan "Data belum cukup untuk ditampilkan" agar individu tidak bisa ditebak dari agregat kecil.
5. **Pemisahan sirkuit data secara struktural di backend** — begitu karyawan submit presensi pulang, data langsung dipecah: jalur presensi (identifikatif) dan jalur feedback (anonim) diproses dan disimpan secara terpisah sejak titik masuk pertama, bukan disamarkan belakangan.

---

## 3. Role & Hak Akses

| Role | Presensi | Isi feedback | Lihat data presensi karyawan | Lihat insight kesehatan mental divisi | Ekspor Excel | Kelola user |
|---|---|---|---|---|---|---|
| **Karyawan** | Ya (masuk & pulang) | Ya (wajib saat pulang) | Hanya riwayat sendiri | Tidak | Tidak | Tidak |
| **HR** | Ya (presensi sendiri) | Ya (wajib saat pulang) | Ya, seluruh karyawan | Ya (agregat per divisi) | Ya | Ya (undang/nonaktifkan akun karyawan) |
| **Owner** | Tidak (view-only, tidak presensi) | Tidak | Ya, ringkasan seluruh organisasi (read-only) | Ya (agregat per divisi, read-only) | Tidak | Tidak |

Catatan desain: **Owner murni observer** — tidak ada tombol aksi transaksional (presensi, ekspor, kelola user) di akun owner, hanya dashboard ringkasan untuk pengambilan keputusan strategis. **HR adalah operator utama** — presensi seperti karyawan biasa, tapi punya akses tambahan untuk memantau dan bertindak. **Karyawan** hanya berinteraksi dengan dua layar: presensi masuk dan presensi pulang.

---

## 4. Alur Presensi & Status Kehadiran

Perubahan penting: **status "Hadir" tidak langsung terhitung saat check-in**. Karyawan baru dianggap hadir penuh setelah menyelesaikan siklus presensi pulang (termasuk mengisi feedback wajib).

```
[ Check-in pagi ]
       │
       ▼
 Status: "Belum lengkap"
 (tervalidasi lokasi, jam tercatat,
  tapi belum dihitung Hadir)
       │
       ▼
[ Karyawan bekerja seharian ]
       │
       ▼
[ Check-out sore + isi feedback wajib ]
       │
       ▼
 Status: "Hadir" (baru terkunci sah)
```

Jika karyawan check-in tapi tidak pernah check-out sampai batas waktu tertentu (misalnya tengah malam), sistem otomatis menandai status sebagai **"Presensi tidak lengkap"** — bukan "Hadir" — dan memunculkan notifikasi ke HR untuk ditindaklanjuti secara manual (misalnya karyawan lupa checkout vs benar-benar tidak masuk kerja).

---

## 5. Ketentuan Validasi Lokasi (Geofencing)

- Radius maksimal presensi (masuk maupun pulang) adalah **100 meter** dari titik koordinat kantor yang terdaftar. Ini adalah batas atas tetap (*hard limit*) di seluruh sistem — HR/admin bisa mempersempit radius per lokasi kantor, tapi tidak bisa memperlebar melebihi 100 meter, untuk meminimalisir kecurangan titip absen.
- Validasi dilakukan **di backend**, bukan hanya di frontend, dengan menghitung jarak menggunakan formula Haversine dari koordinat GPS perangkat terhadap koordinat kantor.
- Di luar radius: tombol presensi otomatis nonaktif dan permintaan ditolak (HTTP 422) apabila tetap dipaksa lewat manipulasi request langsung ke API.

---

## 6. Arsitektur Fitur

### A. Sisi Karyawan
- Layar presensi masuk: tombol "Absen masuk", status validasi lokasi, jam realtime.
- Layar presensi pulang: tombol "Absen pulang" + form feedback wajib (mood scale 1–5 emoji + catatan singkat opsional). Tombol submit nonaktif sampai feedback terisi.
- Riwayat presensi pribadi (kalender bulanan: hadir, terlambat, tidak lengkap).

### B. Sisi HR
- Dashboard presensi real-time seluruh karyawan (identifikatif): nama, jam masuk/pulang, status, validasi lokasi.
- Dashboard insight kesehatan mental per divisi (anonim, agregat, threshold ≥5 responden): skor rata-rata mood, tren mingguan/bulanan, tema keresahan dominan (hasil ekstraksi AI dari catatan feedback).
- Panel rekomendasi tindakan otomatis dari AI ketika suatu divisi menunjukkan tren menurun (contoh: divisi tertentu menunjukkan penurunan skor mood tiga minggu berturut-turut dengan tema dominan beban kerja berlebih).
- Ekspor data presensi ke Excel (`.xlsx`) per rentang tanggal/divisi.
- Manajemen akun karyawan (undang via email, nonaktifkan akun).

### C. Sisi Owner
- Dashboard ringkasan organisasi: persentase kehadiran keseluruhan, jumlah divisi dengan status kesehatan mental "perlu perhatian", tren umum perusahaan.
- Tidak ada akses ke data individu maupun tombol aksi apapun (read-only).

---

## 7. Skema Database (SQL DDL)

```sql
-- ============================================
-- ORGANISASI, LOKASI KANTOR, DIVISI, USER
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE office_locations (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    label VARCHAR(255),
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100 CHECK (radius_meters <= 100)
);

CREATE TABLE divisions (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    division_id UUID REFERENCES divisions(id),
    role VARCHAR(50) NOT NULL, -- 'karyawan', 'hr', 'owner'
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    shift_start TIME DEFAULT '08:00',
    shift_end TIME DEFAULT '17:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRESENSI (IDENTIFIKATIF)
-- ============================================
CREATE TABLE attendance_checkins (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    office_location_id UUID REFERENCES office_locations(id),
    check_in_time TIMESTAMP NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    distance_meters DECIMAL(8,2) NOT NULL,
    is_within_geofence BOOLEAN NOT NULL,
    late_minutes INT DEFAULT 0,
    attendance_status VARCHAR(30) DEFAULT 'belum_lengkap'
    -- 'belum_lengkap' -> 'hadir' (setelah checkout) / 'tidak_lengkap' (timeout)
);

CREATE TABLE attendance_checkouts (
    id UUID PRIMARY KEY,
    checkin_id UUID REFERENCES attendance_checkins(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    check_out_time TIMESTAMP NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    distance_meters DECIMAL(8,2) NOT NULL,
    is_within_geofence BOOLEAN NOT NULL
);

-- ============================================
-- FEEDBACK KESEHATAN MENTAL (ANONIM — TIDAK ADA user_id)
-- ============================================
CREATE TABLE wellbeing_feedback (
    id UUID PRIMARY KEY,
    -- SENGAJA tidak menyimpan user_id. Hanya jejak non-identifikatif
    -- yang dibutuhkan untuk agregasi:
    division_id UUID REFERENCES divisions(id),
    organization_id UUID REFERENCES organizations(id),
    submitted_date DATE NOT NULL,
    mood_score SMALLINT NOT NULL, -- 1-5
    note_text TEXT, -- terenkripsi at-rest, diproses AI lalu boleh dihapus/di-hash setelah agregasi
    processed BOOLEAN DEFAULT FALSE
);

-- ============================================
-- AGREGAT INSIGHT DIVISI (YANG TAMPIL DI DASHBOARD HR/OWNER)
-- ============================================
CREATE TABLE division_wellbeing_insights (
    id UUID PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    avg_mood_score DECIMAL(3,2),
    respondent_count INT, -- ditampilkan ke HR hanya jika >= 5
    dominant_themes JSONB,
    trend_direction VARCHAR(20), -- 'membaik', 'stabil', 'menurun'
    risk_level VARCHAR(20) -- 'aman', 'perlu_perhatian', 'kritis'
);
```

---

## 8. Tech Stack

| Komponen | Teknologi | Peran |
|---|---|---|
| Frontend | Next.js (React) + TailwindCSS | Layar presensi, login, registrasi, dashboard role-based |
| Autentikasi & Role | JWT + Role-Based Access Control (RBAC) | Membedakan akses karyawan/HR/owner di level API, bukan hanya UI |
| Geolokasi | Browser Geolocation API + Haversine formula (backend) | Validasi radius maksimal 100 meter |
| Backend API | FastAPI (Python) | Validasi lokasi, pemisahan jalur data presensi vs feedback |
| Database | PostgreSQL | Penyimpanan terpisah data identifikatif dan anonim |
| Analisis AI | Anthropic Claude API | Ekstraksi tema keresahan & sentimen dari `note_text`, dijalankan sebagai batch job malam hari sebelum agregasi ke `division_wellbeing_insights` |
| Ekspor Excel | `openpyxl` (Python) | Ekspor data presensi untuk HR |
| Task Scheduler | Celery + Redis | Cron harian: tandai "tidak lengkap" untuk checkin tanpa checkout, agregasi mingguan insight divisi |

---

## 9. Panduan Desain (Brand Guidelines)

Identitas warna korporat BelajarVibe: **merah, emas (gold), dan putih** sebagai warna dominan; **ungu** digunakan terbatas sebagai aksen spiritual/ketenangan — khususnya di area yang berkaitan dengan kesehatan mental (form feedback, dashboard insight divisi) agar secara psikologis terasa berbeda dari area administratif (presensi/absensi yang tetap merah-emas-putih).

| Elemen | Warna | Fungsi |
|---|---|---|
| Latar utama | Putih | Netral, bersih, profesional |
| Aksen presensi/administratif | Merah tua | Tombol presensi, status terlambat, elemen tegas |
| Aksen prestise | Emas | Badge tepat waktu, garis pemisah, elemen highlight |
| Aksen kesehatan mental | Ungu tua | Form feedback, dashboard insight divisi, ikon ketenangan |
| Teks utama | Abu gelap | Keterbacaan tinggi tanpa hitam pekat |

Prinsip: hairline border tipis, tanpa gradasi/efek neon, sudut membulat halus (bukan pill berlebihan), tipografi serif untuk branding/judul dan sans-serif untuk konten fungsional — supaya kesan korporat matang, bukan generik ala template AI.

---

## 10. Halaman Login & Registrasi

- **Login**: satu form untuk semua role (karyawan/HR/owner) — sistem otomatis mengarahkan ke dashboard sesuai role setelah autentikasi berhasil. Tidak ada pemilihan role manual saat login (mencegah kebingungan/penyalahgunaan).
- **Registrasi**: hanya tersedia untuk role **karyawan**, menggunakan kode organisasi/undangan dari HR agar tidak sembarang orang bisa mendaftar ke workspace perusahaan. Akun **HR** dan **owner** dibuat melalui mekanisme undangan (invite-only) oleh admin/HR yang sudah ada — bukan dari halaman registrasi publik, untuk menjaga keamanan role sensitif.

---

## 11. Ringkasan Perubahan v3 (Wening) → v4 (SATIVA)

| Aspek | v3 (Wening) | v4 (SATIVA) |
|---|---|---|
| Nama sistem | Wening | SATIVA |
| Tujuan utama | Presensi resmi | Presensi + deteksi dini kesehatan mental tim per divisi |
| Sifat feedback | Identifikatif | Anonim, agregat per divisi (min. 5 responden) |
| Status "Hadir" | Terhitung saat check-in | Terhitung setelah check-out + feedback selesai |
| Radius lokasi | Dikonfigurasi bebas | Maksimal tetap 100 meter (hard limit sistem) |
| Role | Karyawan, HR/Owner (belum dipisah rinci) | Karyawan, HR (operator + monitor), Owner (view-only murni) |
| Registrasi | Belum ada | Registrasi karyawan via kode organisasi; HR/Owner via undangan |
