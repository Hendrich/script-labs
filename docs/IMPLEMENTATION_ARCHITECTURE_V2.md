# 🚀 Script Labs App - Arsitektur Implementasi V2.0

## 📋 Informasi Dokumen

- **Versi**: 2.0 (ditulis ulang agar merujuk ke kode asli — tanpa contoh implementasi Supabase fiktif)
- **Tanggal**: 13 September 2026
- **Status**: Aktif / Acuan Utama
- **Terkait**: [PRD V2.0](./PRD_Script_Labs_V2.md), [Arsitektur Sistem](./SYSTEM_ARCHITECTURE_V2.md)

> Versi dokumen ini sebelumnya berisi contoh kode untuk implementasi berbasis Supabase (pencarian dengan `tsvector`, lupa password dengan email service, RLS policy). Semua itu tidak pernah dibangun. Dokumen ini sebagai gantinya menunjuk ke file asli, supaya siapa pun yang membacanya — developer atau QA — bisa langsung ke sumber kebenaran.

---

## 🎯 Tujuan

Ini adalah peta dari "konsep" ke "file asli", supaya kamu tidak perlu menebak di mana suatu perilaku diimplementasikan.

---

## 🔐 Implementasi Autentikasi

**File**: `backend/routes/authRoutes.js`

| Aspek | Lokasi |
|-------|--------|
| Hashing password | `bcrypt.hash(password, 12)` saat register |
| Verifikasi password | `bcrypt.compare(password, user.password_hash)` saat login |
| Penerbitan token | `buildToken()` — menandatangani `{ userId, email, role, status }` dengan `config.jwt.secret`, masa berlaku dari `config.jwt.expiresIn` (default `24h`) |
| Normalisasi email | `String(req.body.email || "").trim().toLowerCase()` sebelum setiap lookup/insert |
| Rate limiting | `authAttemptLimiter` yang didefinisikan secara lokal (5 request / 15 menit / IP), dilewati hanya saat `config.nodeEnv === "test"` |
| Anti-enumeration | Login mengembalikan response `AUTH_FAILED` / "Invalid email or password" yang identik, baik email tidak ada maupun password salah |

**File**: `backend/middlewares/authMiddleware.js`

- Mem-parsing `Authorization: Bearer <token>` (tidak case-sensitive pada kata `Bearer`, toleran terhadap spasi berlebih).
- Memverifikasi JWT dengan `config.jwt.secret`; jika berhasil, menempelkan `req.user_id`, `req.user_email`, `req.token_expires`.
- Saat gagal, mengembalikan body `{ message: "..." }` polos dengan status `401` — ini **tidak** memakai envelope standar aplikasi `{success, error, timestamp}`. Ini adalah inkonsistensi nyata yang masih ada saat ini (lihat [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md#-penanganan-error)) dan layak dibuatkan contract test.

---

## 📚 Implementasi CRUD Lab

**File**: `backend/routes/labRoutes.js`

- `router.use(authMiddleware)` di bagian atas — setiap route di file ini butuh token valid, diterapkan sekali, bukan per-route.
- Setiap query menyertakan `user_id = $N` di klausa `WHERE`, bersumber dari `req.user_id` (payload JWT) — tidak pernah dari body atau params request. Inilah yang menegakkan isolasi data antar user.
- `PUT /:id` membangun klausa `SET` secara dinamis tapi **whitelist** kolom yang diizinkan (`["title", "description"]`) sebelum menyisipkan nama kolom, untuk menghindari membangun SQL dari nama field yang tidak dipercaya.
- `POST /` mengecek baris yang sudah ada dengan `title` + `description` + `user_id` yang sama sebelum insert, untuk menolak duplikat (409).
- Pagination (`page`, `limit`) di-parse dengan `parseInt()` dan dibatasi dengan `Math.max`/`Math.min` — **belum ada middleware validasi upstream** untuk query param ini hari ini, padahal skema Joi untuk keperluan ini (`schemas.labQuery` di `validation.js`) sudah ada. Gap ini layak dijadikan regression test QA: pastikan nilai `page`/`limit` yang tidak valid ditolak dengan `400` yang bersih, sesuai yang diwajibkan PRD.

---

## ✅ Validasi

**File**: `backend/middlewares/validation.js`

| Skema | Dipakai oleh | Aturan |
|-------|--------------|--------|
| `schemas.auth` | `POST /register`, `POST /login` | `email` (format valid, wajib), `password` (6-128 karakter, wajib) |
| `schemas.lab` | `POST /api/labs` | `title` (1-255 karakter, wajib, di-trim), `description` (1-1000 karakter, wajib, di-trim) |
| `schemas.id` | `GET/PUT/DELETE /api/labs/:id` | bilangan bulat positif |
| `schemas.labQuery` | *(didefinisikan, tapi belum dipasang ke route mana pun hari ini)* | `page`, `limit`, `sortBy`, `sortOrder`, `search` |
| `validateLabUpdate` (kustom, bukan berbasis schema) | `PUT /api/labs/:id` | aturan field sama seperti `schemas.lab` tapi semua opsional, minimal satu wajib diisi |

`sanitize` (juga di file ini) menghapus tag `<script>` dan tag HTML lainnya dari semua field string di `req.body` dan `req.query`, diterapkan secara global di `server.js`.

---

## 🚦 Rate Limiting

**File**: `backend/middlewares/rateLimiter.js`

- Mengekspor beberapa limiter siap pakai (`apiLimiter`, `authLimiter`, `strictLimiter`, `publicLimiter`), tapi **hanya** limiter yang didefinisikan secara lokal di `authRoutes.js` yang benar-benar diterapkan di aplikasi yang berjalan, ke `/register` dan `/login`.
- `labRoutes.js` meng-import `authLimiter` dari file ini tapi tidak pernah memasangnya ke route mana pun — endpoint labs tidak dibatasi rate hari ini.
- `keyGenerator` rate limiter membaca `CF-Connecting-IP` (jika deployment berada di belakang Cloudflare) terlebih dahulu, lalu `X-Forwarded-For` (relevan saat berjalan di belakang Nginx — lihat contoh konfigurasi di [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)), dan barulah jatuh ke `req.ip` sebagai fallback terakhir.

---

## 🚨 Penanganan Error

**File**: `backend/middlewares/errorHandler.js`

- `AppError` adalah subclass `Error` kustom yang membawa `statusCode` dan `status` turunan (`"fail"` untuk 4xx, `"error"` untuk 5xx).
- Middleware `errorHandler` terpusat adalah middleware **terakhir** yang didaftarkan di `server.js`; pemanggilan `next(err)` di mana pun dalam aplikasi pada akhirnya sampai ke sini.
- Di environment selain `development`, response menghilangkan `stack` dan objek `error` mentah — tapi string `error.message` tingkat atas **selalu** disertakan, terlepas dari environment-nya. Error database mentah yang tidak dibungkus dan dilempar langsung ke `next(err)` (seperti yang dilakukan blok `catch` di `GET /api/labs/search`, berbeda dengan route lain yang membungkus error dalam `AppError` generik terlebih dahulu) akan membuat teks pesannya sampai ke client bahkan di production. Ini perbedaan konkret dan bisa diverifikasi antara dua endpoint yang sangat mirip — layak dijadikan test case negatif/keamanan.

---

## 🌐 Komposisi Server

**File**: `backend/server.js`

Urutan middleware global (berpengaruh pada bagaimana request diproses):

1. `helmet` (CSP, header keamanan)
2. request logging (dilewati saat `NODE_ENV=test`)
3. `body-parser` (JSON/urlencoded, limit 10mb)
4. `sanitize`
5. `cors` (origin yang di-allow-list dari `config.js`)
6. pengecekan Origin/Referer kustom untuk method pengubah state
7. `/api-docs` (Swagger UI), `/health`
8. `/api/auth`, `/api/labs`
9. catch-all 404 untuk path `/api/*` yang tidak dikenal
10. `errorHandler` (harus tetap di akhir)

---

## 🧪 Test Suite yang Sudah Ada

**Direktori**: `tests/`

- Jest + Supertest, dijalankan via `npm test`.
- Diorganisir per aspek: `tests/routes/`, `tests/middlewares/`, `tests/config/`, `tests/database/`, `tests/integration/`.
- Ini referensi yang baik untuk bentuk request/response yang sudah diverifikasi aplikasi, berguna sebagai titik awal sebelum menulis automation QA baru — meski sebaiknya tidak dianggap sebagai pengganti penuh desain test QA yang independen (justru inti dari aplikasi ini adalah berlatih menulis test dari PRD, bukan dari test suite yang sudah ada).

---

**Status Dokumen**: ✅ Lengkap
**Terakhir Diperbarui**: 13 September 2026
