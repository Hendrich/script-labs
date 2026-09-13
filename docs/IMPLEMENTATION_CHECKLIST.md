# Script Labs App - Checklist Testing QA

## Checklist Praktis untuk Latihan QA di API Ini

### 📋 Gambaran Umum

Checklist ini menggantikan "development checklist" generik sebelumnya (yang menyebut Supabase dan fitur lain yang tidak ada di repository ini). Sekarang ruang lingkupnya adalah apa yang benar-benar bisa diuji QA di sisi **backend/API**: yang dijelaskan di [PRD_Script_Labs_V2.md](./PRD_Script_Labs_V2.md) dan [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md). Checklist untuk testing UI/frontend berada di repository terpisah ([script-labs-app](https://github.com/Hendrich/script-labs-app)), di luar cakupan dokumen ini.

---

## ✅ Yang Benar-Benar Sudah Dibangun (fakta di lapangan)

- [x] API Express.js (`backend/server.js`), tanpa frontend yang disajikan repo ini
- [x] PostgreSQL, self-hosted, satu koneksi `pool` (`backend/db.js`)
- [x] Auth JWT (register/login/logout/me/verify-token)
- [x] Hashing password dengan bcrypt
- [x] CRUD + pencarian lab, semua di-scope ke user yang login
- [x] Validasi input berbasis Joi
- [x] Rate limiting pada `/api/auth/register` dan `/api/auth/login`
- [x] Header keamanan Helmet + pengecekan Origin/Referer kustom
- [x] Swagger UI di `/api-docs`
- [x] Test suite Jest/Supertest yang sudah ada (`npm test`)

---

## 🧪 Checklist Cakupan Test Fungsional

### Autentikasi

- [ ] Register — happy path
- [ ] Register — email duplikat (tidak case-sensitive: `A@b.com` vs `a@b.com`)
- [ ] Register — boundary password (5 / 6 / 128 / 129 karakter)
- [ ] Register — format email tidak valid
- [ ] Register — rate limit (percobaan ke-6 dalam 15 menit dari IP yang sama)
- [ ] Login — happy path
- [ ] Login — password salah / email tidak ada (verifikasi response identik)
- [ ] Login — akun terkunci (403, bukan 401)
- [ ] Login — rate limit
- [ ] Logout — dengan dan tanpa token
- [ ] `/me` — token valid, token kosong, token kedaluwarsa, token salah bentuk
- [ ] `/verify-token` — variasi sama seperti `/me`

### CRUD Lab

- [ ] List lab — default pagination dan `page`/`limit` eksplisit
- [ ] List lab — `page`/`limit` tidak valid (bukan angka, negatif, nol, desimal) → seharusnya 400
- [ ] Search lab — cocok di `title`, cocok di `description`, tidak ada yang cocok, query kosong
- [ ] Ambil satu lab — milik sendiri, tidak ditemukan, milik orang lain (keduanya harus 404 identik)
- [ ] Ambil satu lab — format `id` tidak valid (bukan angka, negatif)
- [ ] Buat lab — happy path
- [ ] Buat lab — title+description duplikat untuk user yang sama (409)
- [ ] Buat lab — boundary field (title/description di batas min/max/lebih dari max, field kosong)
- [ ] Ubah lab — satu field, kedua field, body kosong (400), bukan milik sendiri (404)
- [ ] Hapus lab — happy path, bukan milik sendiri (404), hapus dua kali (panggilan kedua harus 404)
- [ ] Isolasi antar-user — user A tidak boleh bisa membaca/mengubah/menghapus lab user B lewat ID di endpoint mana pun

### Lintas-Fungsi

- [ ] Header `Authorization` kosong di setiap endpoint terproteksi
- [ ] Body JSON salah bentuk di setiap endpoint `POST`/`PUT`
- [ ] Bentuk response sesuai kontrak yang didokumentasikan (Bentuk A/B/C — lihat [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md#-penanganan-error)) untuk setiap jenis error
- [ ] Perilaku CORS/Origin pada request pengubah state dari origin yang tidak diizinkan

---

## 🤖 Checklist Cakupan Automation

- [ ] Semua kasus fungsional di atas sudah di-script (Postman/Newman, atau berbasis kode)
- [ ] Suite bisa dijalankan tanpa campur tangan manual dengan satu perintah
- [ ] Setup/teardown data test lewat API, bukan SQL langsung
- [ ] Suite berjalan dengan base URL yang bisa dikonfigurasi (lokal vs. deployed)

## 📈 Checklist Cakupan Performance

- [ ] Baseline load test pada `GET /api/labs`
- [ ] Burst test yang memastikan rate limiter auth memicu dengan benar
- [ ] Stress test yang mengidentifikasi bottleneck sesungguhnya (cost bcrypt, ukuran DB pool 10, atau pencarian tanpa index)
- [ ] Laporan yang membandingkan hasil pengamatan dengan target di PRD Bagian 4.2

## 🔒 Checklist Cakupan Fokus Keamanan

- [ ] Password tidak pernah muncul di body response mana pun
- [ ] Percobaan SQL injection di param `email`, `title`, `description`, query pencarian (diharapkan: ditangani dengan aman — semua query parameterized)
- [ ] Payload XSS (`<script>...`) di `title`/`description` (diharapkan: dihapus oleh middleware `sanitize`)
- [ ] Manipulasi JWT (payload/signature diubah) ditolak
- [ ] JWT kedaluwarsa ditolak

---

## 📝 Catatan

- Direktori `tests/` yang sudah ada (Jest + Supertest) adalah referensi berguna untuk bentuk yang diharapkan secara persis, tapi menulis test case sendiri dari PRD terlebih dahulu — lalu membandingkan dengan yang sudah diuji — adalah latihan yang lebih berharga daripada hanya membaca suite yang sudah ada.
- Apa pun yang ditemukan di sini yang menyimpang dari PRD adalah defect: laporkan (endpoint, request, hasil yang diharapkan vs. aktual, severity), jangan dianggap sebagai "memang begitu cara kerja aplikasinya."

---

**Terakhir Diperbarui**: 13 September 2026
**Status**: Aktif
