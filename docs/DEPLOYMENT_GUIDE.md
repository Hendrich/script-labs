# 🚀 Script Labs App - Panduan Deployment

## Sesuai Setup Production Sesungguhnya (Vultr + PM2 + Nginx + PostgreSQL self-hosted)

### 📋 Gambaran Umum

Panduan ini menggantikan draf sebelumnya yang menjelaskan deployment ke Render/Heroku/Vercel dengan database Supabase. Aplikasi ini sebenarnya di-deploy di **Vultr VPS**, menjalankan PostgreSQL secara lokal di mesin yang sama, dikelola oleh **PM2**, dan berada di belakang **Nginx** (opsional juga di belakang Cloudflare). Lihat [README.md](../README.md) untuk versi ringkas yang dijabarkan panduan ini.

---

## 🔧 Prasyarat

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **PostgreSQL**: >= 12 (self-hosted — tidak butuh provider terkelola)
- VPS (proyek ini memakai Vultr; VPS Ubuntu/Debian apa pun bekerja dengan cara yang sama)

---

## 📦 Setup Development Lokal

### 1. Clone & Install

```bash
git clone https://github.com/Hendrich/script-labs.git
cd script-labs
npm install
```

### 2. Database

```bash
psql -U postgres -c "CREATE DATABASE scriptlabs_db;"
psql -U postgres -c "CREATE USER scriptlabs_user WITH PASSWORD 'password_kamu';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE scriptlabs_db TO scriptlabs_user;"
psql "postgresql://scriptlabs_user:password_kamu@localhost:5432/scriptlabs_db" -f database/schema_pg.sql
```

### 3. Konfigurasi Environment

```bash
cp .env.template .env
```

Nilai minimum yang dibutuhkan:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://scriptlabs_user:password_kamu@localhost:5432/scriptlabs_db
JWT_SECRET=<string random yang panjang>
FRONTEND_URL=http://localhost:5173
```

### 4. Jalankan

```bash
npm run dev     # nodemon, auto-restart
# atau
npm start
```

Verifikasi: `http://localhost:3000/health` dan `http://localhost:3000/api-docs`.

---

## 🌐 Deployment Production (Vultr VPS)

### 1. Provisioning & Clone

```bash
cd /root
git clone https://github.com/Hendrich/script-labs.git
cd script-labs
npm install
```

### 2. PostgreSQL di VPS

```sql
CREATE DATABASE scriptlabs_db;
CREATE USER scriptlabs_user WITH PASSWORD 'password_kamu';
GRANT ALL PRIVILEGES ON DATABASE scriptlabs_db TO scriptlabs_user;
ALTER DATABASE scriptlabs_db OWNER TO scriptlabs_user;
```

```bash
psql "postgresql://scriptlabs_user:password_kamu@localhost:5432/scriptlabs_db" -f database/schema_pg.sql
```

### 3. Environment Variable (`.env` di VPS)

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://scriptlabs_user:password_kamu@localhost:5432/scriptlabs_db
JWT_SECRET=<secret production yang kuat, 64+ karakter>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://labs.hendri.me
```

### 4. Jalankan dengan PM2

```bash
cd /root/script-labs
pm2 start backend/server.js --name script-labs-api
pm2 save
pm2 status
curl http://localhost:5000/health
```

### 5. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api-script-labs.hendri.me;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/script-labs-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

> Kalau traffic lewat Cloudflare di depan Nginx, rate limiter (`backend/middlewares/rateLimiter.js`) memprioritaskan header `CF-Connecting-IP` (tidak bisa dipalsukan client karena berasal dari koneksi TCP asli ke edge Cloudflare) sebelum jatuh ke `X-Forwarded-For`/`req.ip`. Header `X-Forwarded-For` yang di-set di config Nginx di atas tetap penting untuk traffic yang tidak lewat Cloudflare (akses langsung/lokal) — tanpa salah satu dari kedua header ini, rate limiter akan menganggap semua traffic berasal dari satu IP yang sama.

### 6. SSL

```bash
certbot --nginx -d api-script-labs.hendri.me
curl https://api-script-labs.hendri.me/health
```

---

## 🔒 Checklist Keamanan Pra-Deployment

- [ ] `JWT_SECRET` kuat, unik, dan tidak di-commit ke git
- [ ] `.env` ada di server dan tidak di-commit ke git
- [ ] Kredensial `DATABASE_URL` bukan default Postgres
- [ ] `FRONTEND_URL` CORS mengarah ke origin frontend yang benar
- [ ] Rate limiting dipastikan aktif di `/api/auth/register` dan `/api/auth/login` (`curl` 6 kali berturut-turut dan pastikan 429 muncul di percobaan ke-6)
- [ ] `NODE_ENV=production` (ini menonaktifkan bypass rate-limiter yang hanya berlaku saat `NODE_ENV=test`)

---

## 💾 Backup

```bash
mkdir -p /root/backups/script-labs
pg_dump "postgresql://scriptlabs_user:password_kamu@localhost:5432/scriptlabs_db" > /root/backups/script-labs/scriptlabs_backup.sql
```

---

## 🐛 Troubleshooting

### 500 saat login/register

Cek `pm2 logs script-labs-api` — error database yang sesungguhnya tetap dicetak di sisi server meski client hanya melihat pesan generik (lihat `backend/routes/authRoutes.js`). Penyebab paling umum adalah skema tabel `users`/`labs` yang tidak cocok dengan `database/schema_pg.sql` (mis. tabel lama yang dibuat dari draf skema versi sebelumnya).

### Error CORS

Pastikan `FRONTEND_URL` di `.env` cocok persis dengan origin pemanggil, lalu `pm2 restart script-labs-api --update-env`.

### Rate limiting sepertinya tidak berlaku / berlaku ke IP yang salah

Cek apakah Nginx benar-benar meneruskan `X-Forwarded-For` (lihat config di atas), dan kalau memakai Cloudflare, pastikan `CF-Connecting-IP` juga sampai ke aplikasi — kalau tidak, semua client di belakang proxy akan dibatasi rate sebagai satu IP yang sama.

### Pertimbangan untuk performance/load testing

Sebelum menjalankan load atau performance test terhadap deployment ini, perlu diingat ini adalah satu VPS kecil yang menjalankan API, Nginx, dan PostgreSQL bersamaan, tanpa autoscaling, dan dengan billing bulanan flat (bukan pay-per-request). Testing berat yang berkelanjutan bisa memengaruhi user asli di instance yang sama dan, dalam kasus ekstrem/setara serangan, bisa memicu biaya kelebihan bandwidth — sebaiknya pakai VPS staging terpisah untuk performance testing kalau memungkinkan.

---

## 📚 Referensi Endpoint

Lihat [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md) untuk daftar endpoint lengkap dan kontrak terkini.

---

**Terakhir Diperbarui**: 13 September 2026
**Status**: Aktif / Acuan Utama
