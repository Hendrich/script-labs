# 🚀 Script Labs App - Deployment Guide

## Matches the Actual Production Setup (Vultr + PM2 + Nginx + self-hosted PostgreSQL)

### 📋 Overview

This guide replaces an earlier draft that described deploying to Render/Heroku/Vercel with a Supabase database. The app is actually deployed on a **Vultr VPS**, running PostgreSQL locally on the same machine, managed by **PM2**, fronted by **Nginx**. See [README.md](../README.md) for the condensed version this guide expands on.

---

## 🔧 Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **PostgreSQL**: >= 12 (self-hosted — no managed provider required)
- A VPS (this project uses Vultr; any Ubuntu/Debian VPS works the same way)

---

## 📦 Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/Hendrich/script-labs.git
cd script-labs
npm install
```

### 2. Database

```bash
psql -U postgres -c "CREATE DATABASE scriptlabs_db;"
psql -U postgres -c "CREATE USER scriptlabs_user WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE scriptlabs_db TO scriptlabs_user;"
psql "postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db" -f database/schema_pg.sql
```

### 3. Environment Configuration

```bash
cp .env.template .env
```

Minimum required values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db
JWT_SECRET=<a long random string>
FRONTEND_URL=http://localhost:5173
```

### 4. Run

```bash
npm run dev     # nodemon, auto-restart
# or
npm start
```

Verify: `http://localhost:3000/health` and `http://localhost:3000/api-docs`.

---

## 🌐 Production Deployment (Vultr VPS)

### 1. Provision & Clone

```bash
cd /root
git clone https://github.com/Hendrich/script-labs.git
cd script-labs
npm install
```

### 2. PostgreSQL on the VPS

```sql
CREATE DATABASE scriptlabs_db;
CREATE USER scriptlabs_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE scriptlabs_db TO scriptlabs_user;
ALTER DATABASE scriptlabs_db OWNER TO scriptlabs_user;
```

```bash
psql "postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db" -f database/schema_pg.sql
```

### 3. Environment Variables (`.env` on the VPS)

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db
JWT_SECRET=<strong production secret, 64+ chars>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://labs.hendri.me
```

### 4. Run with PM2

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

> The `X-Forwarded-For` header set here is what the rate limiter's `keyGenerator` reads (see `backend/middlewares/rateLimiter.js`) — without it, all traffic through Nginx would appear to originate from `127.0.0.1`/`::1` to the app.

### 6. SSL

```bash
certbot --nginx -d api-script-labs.hendri.me
curl https://api-script-labs.hendri.me/health
```

---

## 🔒 Pre-Deployment Security Checklist

- [ ] `JWT_SECRET` is strong, unique, and not committed to git
- [ ] `.env` is present on the server and not committed to git
- [ ] `DATABASE_URL` credentials are not the Postgres defaults
- [ ] CORS `FRONTEND_URL` points to the real frontend origin
- [ ] Rate limiting is confirmed active on `/api/auth/register` and `/api/auth/login` (`curl` them 6 times in a row and expect a 429 on the 6th)
- [ ] `NODE_ENV=production` (this disables the rate-limiter bypass that only applies when `NODE_ENV=test`)

---

## 💾 Backup

```bash
mkdir -p /root/backups/script-labs
pg_dump "postgresql://scriptlabs_user:your_password@localhost:5432/scriptlabs_db" > /root/backups/script-labs/scriptlabs_backup.sql
```

---

## 🐛 Troubleshooting

### 500 on login/register

Check `pm2 logs script-labs-api` — the actual database error is printed server-side even though the client only sees a generic message (see `backend/routes/authRoutes.js`). The most common cause is the `users`/`labs` table schema not matching `database/schema_pg.sql` (e.g. a stale table created from an older schema draft).

### CORS errors

Confirm `FRONTEND_URL` in `.env` matches the calling origin exactly, then `pm2 restart script-labs-api --update-env`.

### Rate limiting seems to not apply / applies to the wrong IP

Check that Nginx is actually forwarding `X-Forwarded-For` (see the config above) — otherwise every client behind the proxy is rate-limited as a single IP.

### Performance/load testing considerations

Before running load or performance tests against this deployment, be aware this is a single small VPS running the API, Nginx, and PostgreSQL together, with no autoscaling and a flat monthly billing plan (not pay-per-request). Heavy sustained testing can affect real users of the same instance and, in extreme/attack-level cases, bandwidth overage — prefer a separate staging VPS for performance testing when possible.

---

## 📚 Endpoint Reference

See [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md) for the full, current endpoint list and contracts.

---

**Last Updated**: 13 September 2026
**Status**: Current / Authoritative
