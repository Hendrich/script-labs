-- PostgreSQL version of script_labs
-- Kept in sync with backend/routes/authRoutes.js and backend/routes/labRoutes.js

-- Drop tables if exists (untuk keperluan reimport)
DROP TABLE IF EXISTS labs;
DROP TABLE IF EXISTS users;

-- Tabel Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Labs
CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Catatan: seed user dibuat lewat POST /api/auth/register (bukan INSERT manual)
-- supaya password_hash-nya dihasilkan oleh bcrypt sesuai yang dipakai di authRoutes.js.

