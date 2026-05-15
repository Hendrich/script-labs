# Script Labs API

Backend API untuk Script Labs, dibangun dengan Node.js, Express, PostgreSQL, JWT, dan middleware security. API ini digunakan oleh frontend `script-labs-app` sebagai playground QA automation.

## Live Setup

```text
Backend API : https://api-script-labs.hendri.me
Frontend    : https://labs.hendri.me
Frontend repository: https://github.com/Hendrich/script-labs-app
Database    : PostgreSQL di Vultr
Runtime     : Node.js + PM2 di Vultr
Reverse proxy: Nginx + SSL
Auth        : Supabase Auth untuk fase transisi
```

## Status Arsitektur Saat Ini

- Backend sudah berjalan di Vultr.
- Database Script CRUD sudah memakai PostgreSQL di Vultr.
- Login/register masih memakai Supabase Auth.
- JWT backend tetap dipakai untuk akses endpoint private seperti `/api/labs`.
- Frontend berjalan di Vercel dan diarahkan ke API Vultr.

## Fitur API

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/verify-token
```

### Labs CRUD

```text
GET    /api/labs
GET    /api/labs/search
GET    /api/labs/:id
POST   /api/labs
PUT    /api/labs/:id
DELETE /api/labs/:id
```

### System

```text
GET /health
GET /api-docs
```

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- pg
- JWT
- Supabase Auth, sementara/transisi
- Helmet
- CORS
- Joi validation
- PM2
- Nginx

## Environment Variables

Buat file `.env` di root project backend:

```env
PORT=5000
NODE_ENV=production

DATABASE_URL=postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db

JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=24h

FRONTEND_URL=https://labs.hendri.me

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Catatan: `SUPABASE_URL` dan `SUPABASE_ANON_KEY` masih wajib selama login/register masih memakai Supabase Auth.

## Local Development

```bash
git clone https://github.com/Hendrich/script-labs.git
cd script-labs
npm install
npm run dev
```

Default local API:

```text
http://localhost:3000
```

Jika ingin memakai port 5000 secara local, set di `.env`:

```env
PORT=5000
```

## Production Deployment on Vultr

### 1. Clone Repository

```bash
cd /root
git clone https://github.com/Hendrich/script-labs.git
cd script-labs
npm install
```

### 2. Setup PostgreSQL

```sql
CREATE DATABASE scriptlabs_db;
CREATE USER scriptlabs_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE scriptlabs_db TO scriptlabs_user;
ALTER DATABASE scriptlabs_db OWNER TO scriptlabs_user;
```

### 3. Minimal Table Schema

```sql
CREATE TABLE IF NOT EXISTS labs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Run with PM2

```bash
cd /root/script-labs
pm2 start backend/server.js --name script-labs-api
pm2 save
pm2 status
```

Test local API from VPS:

```bash
curl http://localhost:5000/health
```

### 5. Nginx Reverse Proxy

Example config:

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

Enable config:

```bash
ln -s /etc/nginx/sites-available/script-labs-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 6. SSL

```bash
certbot --nginx -d api-script-labs.hendri.me
```

Test public API:

```bash
curl https://api-script-labs.hendri.me/health
```

## Backup Database

Manual backup:

```bash
mkdir -p /root/backups/script-labs
pg_dump "postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db" > /root/backups/script-labs/scriptlabs_backup.sql
ls -lh /root/backups/script-labs
```

## Security Notes

- JWT dikirim via `Authorization: Bearer <token>`.
- CORS hanya mengizinkan origin yang dikonfigurasi melalui `FRONTEND_URL`.
- State-changing request dicek dengan Origin/Referer.
- Query database memakai parameterized query dari `pg`.
- Rate limiter diterapkan untuk endpoint auth.
- Helmet dipakai untuk security headers.

## Troubleshooting

### Health check gagal

```bash
pm2 status
pm2 logs script-labs-api --lines 100
curl http://localhost:5000/health
```

### CORS error

Pastikan `.env` backend:

```env
FRONTEND_URL=https://labs.hendri.me
```

Restart PM2:

```bash
pm2 restart script-labs-api --update-env
```

Test preflight:

```bash
curl -i -X OPTIONS https://api-script-labs.hendri.me/api/auth/register \
  -H "Origin: https://labs.hendri.me" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

### SSL certificate mismatch

Pastikan DNS `api-script-labs.hendri.me` mengarah ke IP Vultr dan jalankan:

```bash
certbot --nginx -d api-script-labs.hendri.me
```

### Labs gagal fetch

Cek apakah table `labs` sudah ada:

```bash
psql "postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db"
\dt
```

Jika belum ada, buat table `labs` sesuai schema di atas.

## Roadmap

- [x] Deploy backend ke Vultr
- [x] Setup Nginx reverse proxy dan SSL
- [x] Setup PostgreSQL Vultr
- [x] Script CRUD memakai PostgreSQL Vultr
- [ ] Ganti Supabase Auth ke local/dummy auth
- [ ] Tambah products API
- [ ] Tambah checkout dummy API
- [ ] Tambah `/api/test/reset` untuk automation testing
- [ ] Tambah seed data deterministic

## License

MIT License.
