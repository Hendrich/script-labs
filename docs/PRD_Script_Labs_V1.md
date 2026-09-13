# Product Requirements Document (PRD) - Versi 1.0 (Baseline Historis)

## Script Labs Application

### Informasi Dokumen

- **Versi**: 1.0
- **Tanggal**: 2024 (ditulis ulang 13 September 2026 agar akurat)
- **Penulis**: Hendri Christianto
- **Status**: Historis / Sudah digantikan — disimpan hanya sebagai konteks sejarah proyek.
- **Requirement resmi saat ini**: lihat [PRD V2.0](./PRD_Script_Labs_V2.md). Dokumen V1 ini menjelaskan cakupan MVP awal proyek. Versi sebelumnya dari dokumen ini masih menyebut fitur katalog buku, UI/frontend, dan Supabase yang **tidak pernah diimplementasikan** — semua itu sudah dihapus dari versi ini agar tidak menyesatkan.

---

## 1. Ringkasan Eksekutif

### 1.1 Gambaran Produk

Script Labs App adalah REST API untuk manajemen resource "lab" (record dengan `title` + `description`) milik user, dengan sistem autentikasi JWT. Aplikasi ini dipakai sebagai **API latihan untuk QA** — bukan produk SaaS produksi — sehingga QA dapat mendaftar, login, dan melakukan operasi CRUD (Create, Read, Update, Delete) untuk keperluan penulisan test case, automation, dan performance testing.

### 1.2 Tujuan Bisnis

- Menyediakan API nyata (bukan mock) yang mudah dipakai untuk latihan QA: desain test case, automation, dan performance testing.
- Implementasi best practice dalam pengembangan REST API (Node.js, Express, PostgreSQL, JWT).
- Pembelajaran dan portfolio development.

### 1.3 Catatan Penting

Proyek ini **tidak memiliki frontend/UI**. Repository ini hanya berisi backend API. Jangan menulis requirement atau test case berbasis tampilan/UI berdasarkan dokumen ini — lihat [PRD V2.0, Bagian 2.2](./PRD_Script_Labs_V2.md#22-di-luar-ruang-lingkup) untuk daftar lengkap hal-hal yang secara eksplisit di luar ruang lingkup proyek ini.

---

## 2. Kebutuhan Fungsional (Ringkas)

Lihat [PRD V2.0, Bagian 3](./PRD_Script_Labs_V2.md#3-kebutuhan-fungsional-functional-requirements) untuk requirement lengkap berformat Given/When/Then. Ringkasan cakupan awal (MVP):

### 2.1 Autentikasi & Otorisasi

| ID Fitur | Nama Fitur | Prioritas | Deskripsi |
|----------|-----------|-----------|-----------|
| AUTH-001 | Registrasi User | Tinggi | User dapat mendaftar dengan email dan password |
| AUTH-002 | Login User | Tinggi | User dapat login dan mendapat JWT token |
| AUTH-003 | Validasi JWT Token | Tinggi | Semua protected route memvalidasi JWT token |
| AUTH-004 | Enkripsi Password | Tinggi | Password di-hash dengan bcrypt sebelum disimpan |
| AUTH-005 | Kedaluwarsa Token | Sedang | JWT token memiliki waktu kedaluwarsa |

### 2.2 Manajemen Lab

| ID Fitur | Nama Fitur | Prioritas | Deskripsi |
|----------|-----------|-----------|-----------|
| LAB-001 | Lihat Semua Lab | Tinggi | User dapat melihat semua lab miliknya |
| LAB-002 | Tambah Lab Baru | Tinggi | User dapat menambah lab baru (title, description) |
| LAB-003 | Ubah Lab | Tinggi | User dapat mengedit informasi lab |
| LAB-004 | Hapus Lab | Tinggi | User dapat menghapus lab dari koleksinya |
| LAB-005 | Pencarian Lab | Sedang | User dapat mencari lab berdasarkan title/description |

---

## 3. Kebutuhan Teknis

### 3.1 Arsitektur

```
Client (Postman / automation / load test) ↔ Backend API (Node.js/Express) ↔ Database (PostgreSQL, self-hosted)
                                            ↕
                                     JWT Authentication
```

### 3.2 Technology Stack

- **Backend**: Node.js, Express.js (API-only — tidak ada frontend yang disajikan oleh repository ini)
- **Database**: PostgreSQL self-hosted
- **Autentikasi**: JWT (JSON Web Token)
- **Database Client**: pg (node-postgres)
- **Keamanan**: bcrypt untuk hashing password
- **CORS**: middleware cors
- **Environment**: dotenv

### 3.3 Spesifikasi API

#### Endpoint Autentikasi

- `POST /api/auth/register` - Registrasi user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Konfirmasi logout sisi client (stateless)
- `GET /api/auth/me` - Ambil profil user yang sedang login
- `POST /api/auth/verify-token` - Verifikasi JWT masih valid

#### Endpoint Lab (Terproteksi)

- `GET /api/labs` - Ambil semua lab milik user (dengan pagination, opsional `search`)
- `GET /api/labs/search` - Cari lab milik user (dengan pagination, param `q`)
- `GET /api/labs/:id` - Ambil satu lab
- `POST /api/labs` - Tambah lab baru
- `PUT /api/labs/:id` - Ubah lab
- `DELETE /api/labs/:id` - Hapus lab

Lihat [PRD V2.0, Bagian 3](./PRD_Script_Labs_V2.md#3-kebutuhan-fungsional-functional-requirements) untuk kontrak request/response lengkap dan terkini per endpoint.

### 3.4 Skema Database

```sql
-- tabel users (PostgreSQL self-hosted, lihat database/schema_pg.sql)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- tabel labs
CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

> Catatan: nilai `id` adalah bilangan bulat auto-increment biasa (`SERIAL`), bukan UUID, dan tidak ada field `author`/`isbn`/`rating` — sebuah lab hanya punya `title` dan `description`.

---

## 4. Kebutuhan Non-Fungsional

### 4.1 Performa

- Waktu respons API: < 500ms untuk sebagian besar endpoint
- Optimasi query database untuk dataset besar
- Concurrent users: minimal 100 user (target, belum diverifikasi dengan performance test)

### 4.2 Keamanan

- Hashing password dengan bcrypt (cost factor 12)
- JWT dengan secret key yang aman
- Konfigurasi CORS untuk cross-origin request
- Validasi dan sanitasi input
- Pencegahan SQL injection dengan parameterized query

### 4.3 Skalabilitas

- Struktur kode modular untuk kemudahan maintenance
- Konfigurasi berbasis environment
- Database connection pooling
- Desain API stateless

### 4.4 Reliabilitas

- Error handling dengan HTTP status code yang tepat
- Pesan error yang informatif untuk client
- Penanganan error koneksi database

---

## 5. Standar Desain API

### 5.1 Prinsip RESTful

- Metode HTTP yang tepat (GET, POST, PUT, DELETE)
- URL resource yang bermakna
- Format response yang konsisten
- HTTP status code yang sesuai

### 5.2 Format Response Sukses

```json
{
  "success": true,
  "data": { "..." : "..." },
  "message": "Operation successful",
  "timestamp": "2026-09-13T00:00:00Z"
}
```

### 5.3 Format Response Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  },
  "timestamp": "2026-09-13T00:00:00Z"
}
```

> Catatan: bentuk error aktual di API ini sedikit lebih bervariasi dari contoh di atas — lihat [API_DOCUMENTATION_V2.md, bagian Error Handling](./API_DOCUMENTATION_V2.md#-penanganan-error) untuk 3 bentuk error yang benar-benar dipakai saat ini.

---

## 6. Strategi Testing

### 6.1 Jenis Testing

- **Unit Test**: fungsi dan middleware individual
- **Integration Test**: endpoint API dengan database
- **API Test**: koleksi Postman untuk testing manual/automation

### 6.2 Cakupan Test

- Semua endpoint API diuji
- Alur autentikasi diuji
- Skenario error diuji

### 6.3 Tools Testing

- **Backend**: Jest + Supertest untuk unit/integration test (sudah ada di `tests/`)
- **API**: koleksi Postman dengan test otomatis (lihat folder `postman/`)
- **Database**: database test terpisah untuk integration test

---

## 7. Deployment & Infrastruktur

### 7.1 Environment Development

- Development lokal dengan nodemon
- Environment variable via file `.env`
- Koneksi PostgreSQL lokal

### 7.2 Environment Production

- **Hosting**: Vultr VPS (PM2 sebagai process manager + Nginx sebagai reverse proxy) — lihat [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Database**: PostgreSQL self-hosted di VPS yang sama
- **Environment Variable**: konfigurasi aman (`.env`, tidak pernah di-commit)
- **SSL**: HTTPS wajib via Nginx + Let's Encrypt (certbot)

---

## 8. Penilaian Risiko

### 8.1 Risiko Teknis

| Risiko | Dampak | Kemungkinan | Mitigasi |
|--------|--------|-------------|----------|
| Masalah koneksi database | Tinggi | Sedang | Connection pooling, error handling |
| Keamanan JWT token | Tinggi | Rendah | Secret key yang aman, token expiration |
| Rate limiting API | Sedang | Sedang | Middleware rate limiting pada endpoint auth |
| Konfigurasi CORS | Sedang | Rendah | Setup CORS yang tepat untuk production |

### 8.2 Risiko Bisnis

| Risiko | Dampak | Kemungkinan | Mitigasi |
|--------|--------|-------------|----------|
| Kehilangan data user | Tinggi | Rendah | Backup rutin |
| Degradasi performa | Sedang | Sedang | Optimasi query |
| Kerentanan keamanan | Tinggi | Rendah | Best practice keamanan, update rutin |

---

## 9. Kriteria Keberhasilan (MVP)

- [x] User dapat register dan login
- [x] User dapat CRUD lab setelah login
- [x] Endpoint API berfungsi dengan autentikasi yang tepat
- [x] Rate limiting aktif pada endpoint auth
- [ ] Test suite otomatis mencakup seluruh requirement (lihat [PRD V2.0, Bagian 6](./PRD_Script_Labs_V2.md#6-kriteria-keberhasilan))

---

## 10. Lampiran

### 10.1 Glosarium

- **JWT**: JSON Web Token untuk autentikasi
- **CRUD**: Create, Read, Update, Delete
- **API**: Application Programming Interface
- **CORS**: Cross-Origin Resource Sharing

### 10.2 Referensi

- [Dokumentasi Express.js](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [Dokumentasi PostgreSQL](https://www.postgresql.org/docs/)

### 10.3 Riwayat Dokumen

| Versi | Tanggal | Perubahan | Penulis |
|-------|---------|-----------|---------|
| 1.0 | 2024 | Draf PRD awal (masih menyebut katalog buku & frontend fiktif) | Hendri Christianto |
| 1.1 | 13 Sep 2026 | Ditulis ulang: hapus semua referensi katalog buku/UI/Supabase, samakan dengan API yang sesungguhnya, dialihbahasakan ke Indonesia | — |

---

**Status Dokumen**: Historis / Baseline
**Requirement Aktif**: [PRD V2.0](./PRD_Script_Labs_V2.md)
