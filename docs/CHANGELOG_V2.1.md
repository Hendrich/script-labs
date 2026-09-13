# Changelog Script Labs API

## Versi 2.1.0 - 07-09-2025

### Pengerasan Keamanan (Security Hardening)

- Menghapus rate limiting global yang luas; mengganti dengan limiter ketat yang di-scope (5 percobaan / 15 menit) hanya pada `/api/auth/register` dan `/api/auth/login`.
- Menyatukan response error autentikasi menjadi satu pesan generik (`Invalid email or password`) untuk mencegah user enumeration.
- Memperketat Content Security Policy: menghapus `'unsafe-inline'` untuk script/style; membatasi sumber eksternal hanya ke self + Google Fonts (style/font) dan `*.supabase.co` untuk `connect-src` (izin ini tersisa dari draf lama dan tidak benar-benar dipakai aplikasi saat ini, tapi tidak berbahaya untuk dibiarkan).
- Menghapus logging debug body request yang verbose, yang berpotensi membocorkan data sensitif (password/token).
- Urutan validasi disesuaikan (validasi berjalan sebelum rate limiter) supaya request yang salah bentuk tidak ikut terhitung ke ambang batas brute force.
- Rate limiter dilewati (bypass) di environment test otomatis (`NODE_ENV=test`) untuk mencegah false negative di CI.

### Perubahan Kode / Middleware

- `backend/server.js`: mengganti blok CSP Helmet lama dengan konfigurasi yang lebih ketat; menghapus rate limiter global `/api/auth` & `/api/labs`; menghapus body debug logger.
- `backend/routes/authRoutes.js`: menambahkan rate limiter yang di-scope, mengurutkan ulang middleware, menstandarkan output error, mengembalikan 400 untuk error registrasi dan 401 untuk kegagalan login.
- Memperbarui test agar sesuai dengan kontrak error auth dan perilaku limiter yang baru.
- Menyesuaikan test validasi untuk memverifikasi field yang tidak dikenal terhapus dengan benar.

### Test & Coverage

- Seluruh 334 test lolos setelah perubahan ini.
- Coverage (perkiraan): Statements 79%, Branches 70%, Functions 79%, Lines 79%.

### Catatan Kompatibilitas Mundur

- Kode error `REGISTRATION_FAILED` / `LOGIN_FAILED` digantikan oleh `AUTH_FAILED` untuk kegagalan kredensial berbasis database lokal.
- Client yang bergantung pada pesan atau kode error tertentu harus memperbarui logic parsing-nya.
- Pengetatan CSP mungkin mengharuskan frontend menghilangkan inline script/style atau mengadopsi strategi nonce/hash jika dipakai kembali.

### Rekomendasi Tindak Lanjut

- Tambahkan header HSTS & Permissions-Policy.
- Perkenalkan refresh token & daftar revoke JWT.
- Logging keamanan terstruktur terpusat (mis. Winston + daily rotate).
- Ganti sanitasi sederhana dengan library yang teruji kalau dukungan rich text dibutuhkan.

---

Dibuat otomatis pada 07-09-2025. Dialihbahasakan ke Indonesia pada 13 September 2026.
