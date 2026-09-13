# 📋 Script Labs — Roadmap Enablement QA

## 📋 Informasi Dokumen

- **Versi**: 2.0 (dialihfungsikan dari rencana pengembangan fitur menjadi roadmap pembelajaran QA)
- **Tanggal**: 13 September 2026
- **Status**: Aktif / Acuan Utama
- **Terkait**: [PRD V2.0](./PRD_Script_Labs_V2.md), [Dokumentasi API](./API_DOCUMENTATION_V2.md), [Checklist Implementasi](./IMPLEMENTATION_CHECKLIST.md)

> Versi dokumen ini sebelumnya adalah rencana sprint untuk membangun migrasi Supabase, full-text search, dan fitur lupa password. Tidak satu pun dari itu dibangun, dan tujuan sebenarnya aplikasi ini berbeda: ini adalah **target latihan QA**, bukan produk yang sedang dikembangkan aktif. Dokumen ini sekarang berisi jalur belajar yang disarankan untuk seseorang yang memakai aplikasi ini untuk membangun skill QA, dari desain test case sampai performance testing.

---

## 🎯 Tujuan

Memakai API Script Labs (sudah sepenuhnya diimplementasikan — lihat [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md)) untuk berlatih, secara berurutan:

1. Desain test case manual
2. Automation testing API
3. Performance/load testing

Setiap fase di bawah menghasilkan artefak konkret.

---

## Fase 1: Desain Test Case (dari PRD)

**Input**: [PRD_Script_Labs_V2.md](./PRD_Script_Labs_V2.md), Bagian 3-5
**Output**: Dokumen/spreadsheet test case yang mencakup setiap endpoint

### Tugas

- [ ] Tulis test case happy-path untuk kelima endpoint auth dan keenam endpoint lab.
- [ ] Tulis test case boundary untuk setiap aturan field di PRD Bagian 3.1.1 / 3.2.1 (mis. panjang password 5/6/128/129, panjang title 0/1/255/256).
- [ ] Tulis test case negatif: kredensial salah, akun terkunci, token kedaluwarsa/tidak valid, mengakses lab user lain lewat ID, body JSON yang salah bentuk.
- [ ] Tulis test case untuk perilaku rate-limiting (5 request/15 menit pada `/register` dan `/login`).
- [ ] Tulis test case yang memverifikasi bentuk response error yang **persis** untuk setiap mode kegagalan — Bagian 6 dokumen API menjelaskan tiga bentuk berbeda yang dipakai; test case yang baik seharusnya bisa menangkap kalau bentuk yang "salah" yang muncul.

### Kriteria Penerimaan

- Setiap ID requirement di PRD Bagian 3 (AUTH-001 … AUTH-008, LAB-001 … LAB-008) punya minimal satu test case yang sesuai.
- Test case ditulis secara independen dari source code (hanya dari PRD), lalu dijalankan sekali terhadap API sesungguhnya untuk melihat apakah implementasi cocok dengan spesifikasi.

---

## Fase 2: Automation Testing API

**Input**: Test case dari Fase 1
**Output**: Suite otomatis yang bisa dijalankan (koleksi Postman/Newman, atau berbasis kode — REST-assured, Playwright API testing, Supertest, dll.)

### Tugas

- [ ] Siapkan file environment/config dengan base URL dan cara mendapatkan JWT baru (langkah setup register atau login user test tetap).
- [ ] Otomasi semua kasus happy-path Fase 1 terlebih dahulu; pastikan lolos terhadap instance yang berjalan.
- [ ] Otomasi kasus negatif/boundary; sebagian diperkirakan akan **gagal** terhadap implementasi saat ini — itu memang tujuannya. Catat setiap kegagalan sebagai defect (lihat "Pelaporan Defect" di bawah), jangan hanya di-skip.
- [ ] Tambahkan suite data-driven untuk kasus boundary field (mis. tabel panjang password → status code yang diharapkan).
- [ ] Hubungkan suite ke step CI (repository ini sudah punya GitHub Actions di `.github/workflows/` untuk test aplikasi sendiri — suite automation QA bisa berjalan sebagai job terpisah atau repository terpisah).

### Kriteria Penerimaan

- Suite bisa berjalan tanpa campur tangan manual (`newman run ...` atau setara `npm test`) dan menghasilkan laporan pass/fail.
- Setup/teardown data test tidak butuh intervensi database manual (pakai API itu sendiri — register/create/delete — bukan SQL langsung).

---

## Fase 3: Performance Testing

**Input**: PRD Bagian 4.2 (target performa), [SYSTEM_ARCHITECTURE_V2.md](./SYSTEM_ARCHITECTURE_V2.md#-karakteristik-performa-realistis-untuk-perencanaan-test)
**Output**: Script load test + laporan singkat perilaku yang diamati vs target

### Tugas

- [ ] Pilih tool (k6, JMeter, Artillery, Locust).
- [ ] Buat script skenario baseline: traffic stabil pada `GET /api/labs` untuk user yang login, meningkatkan konkurensi bertahap, mengukur latensi p95 dan error rate.
- [ ] Buat script skenario rate-limit: traffic burst pada `POST /api/auth/login` untuk memastikan limit 5 request/15 menit benar-benar memicu `429`, dan mengukur seberapa cepat pulihnya.
- [ ] Buat script skenario stress yang menyasar batasan yang sudah diketahui (cost bcrypt pada login/register, default 10-connection DB pool, pencarian `ILIKE` tanpa index) untuk menemukan di mana waktu respons mulai memburuk.
- [ ] **Jangan** menjalankan load test berat terhadap instance shared/production tanpa mengecek dulu — lebih baik pakai deployment terpisah untuk fase ini (lihat diskusi soal biaya/dampak yang sudah pernah dibahas dengan pemilik aplikasi, atau [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)).

### Kriteria Penerimaan

- Laporan singkat yang menyatakan: apakah setiap target PRD Bagian 4.2 tercapai, dan apa bottleneck sesungguhnya kalau tidak tercapai (rate limiter, DB pool, hashing CPU-bound, atau hal lain).

---

## Pelaporan Defect

Saat test case (manual, otomatis, atau performa) menemukan perilaku yang tidak sesuai PRD, catat sebagai defect dengan:

- Endpoint + request persis (method, header, body)
- Hasil yang diharapkan (kutip ID requirement PRD)
- Hasil aktual (status code + body)
- Severity/dampak

Inilah loop inti yang didukung aplikasi ini: **spec → test → jalankan → bandingkan → laporkan**.

---

**Status Dokumen**: Aktif
**Terakhir Diperbarui**: 13 September 2026
**Pemilik**: Hendri Christianto
