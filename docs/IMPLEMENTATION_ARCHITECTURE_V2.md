# 🚀 Script Labs App - Implementation Architecture V2.0

## 📋 Document Information

- **Version**: 2.0 (rewritten to reference the actual code — no fictional Supabase implementation)
- **Date**: 13 September 2026
- **Status**: Current / Authoritative
- **Related**: [PRD V2.0](./PRD_Script_Labs_V2.md), [System Architecture](./SYSTEM_ARCHITECTURE_V2.md)

> An earlier version of this document contained example code for a Supabase-backed implementation (search with `tsvector`, forgot-password with email service, RLS policies). None of that was ever built. This document instead points to the real files, so anyone reading it — developer or QA — can go straight to the source of truth.

---

## 🎯 Purpose

This is a map from "concept" to "actual file", so you don't have to guess where a piece of behavior lives.

---

## 🔐 Authentication Implementation

**File**: `backend/routes/authRoutes.js`

| Concern | Where |
|---------|-------|
| Password hashing | `bcrypt.hash(password, 12)` on register |
| Password verification | `bcrypt.compare(password, user.password_hash)` on login |
| Token issuance | `buildToken()` — signs `{ userId, email, role, status }` with `config.jwt.secret`, expiry from `config.jwt.expiresIn` (default `24h`) |
| Email normalization | `String(req.body.email || "").trim().toLowerCase()` before every lookup/insert |
| Rate limiting | Locally-defined `authAttemptLimiter` (5 requests / 15 min / IP), bypassed only when `config.nodeEnv === "test"` |
| Anti-enumeration | Login returns the identical `AUTH_FAILED` / "Invalid email or password" response whether the email doesn't exist or the password is wrong |

**File**: `backend/middlewares/authMiddleware.js`

- Parses `Authorization: Bearer <token>` (case-insensitive `Bearer`, tolerant of extra whitespace).
- Verifies the JWT with `config.jwt.secret`; on success attaches `req.user_id`, `req.user_email`, `req.token_expires`.
- On any failure returns a bare `{ message: "..." }` body with `401` — this does **not** use the app's standard `{success, error, timestamp}` envelope. This is a real, current inconsistency (see [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md#-error-handling)) worth writing a contract test around.

---

## 📚 Lab CRUD Implementation

**File**: `backend/routes/labRoutes.js`

- `router.use(authMiddleware)` at the top — every route in this file requires a valid token, applied once rather than per-route.
- Every query includes `user_id = $N` in its `WHERE` clause, sourced from `req.user_id` (the JWT payload) — never from the request body or params. This is what enforces data isolation between users.
- `PUT /:id` builds its `SET` clause dynamically but **whitelists** allowed columns (`["title", "description"]`) before interpolating column names, to avoid building SQL from untrusted field names.
- `POST /` checks for an existing row with the same `title` + `description` + `user_id` before inserting, to reject duplicates (409).
- Pagination (`page`, `limit`) is parsed with `parseInt()` and clamped with `Math.max`/`Math.min` — there is **no upstream validation middleware** on these query params today, even though a Joi schema for exactly this purpose (`schemas.labQuery` in `validation.js`) already exists. This gap is worth a QA regression test: confirm that invalid `page`/`limit` values are rejected with a clean `400`, as required by the PRD.

---

## ✅ Validation

**File**: `backend/middlewares/validation.js`

| Schema | Used by | Rules |
|--------|---------|-------|
| `schemas.auth` | `POST /register`, `POST /login` | `email` (valid format, required), `password` (6-128 chars, required) |
| `schemas.lab` | `POST /api/labs` | `title` (1-255 chars, required, trimmed), `description` (1-1000 chars, required, trimmed) |
| `schemas.id` | `GET/PUT/DELETE /api/labs/:id` | positive integer |
| `schemas.labQuery` | *(defined, but not wired into any route today)* | `page`, `limit`, `sortBy`, `sortOrder`, `search` |
| `validateLabUpdate` (custom, not schema-based) | `PUT /api/labs/:id` | same field rules as `schemas.lab` but all optional, at least one required |

`sanitize` (also in this file) strips `<script>` tags and any other HTML tags from every string field in `req.body` and `req.query`, applied globally in `server.js`.

---

## 🚦 Rate Limiting

**File**: `backend/middlewares/rateLimiter.js`

- Exports several pre-built limiters (`apiLimiter`, `authLimiter`, `strictLimiter`, `publicLimiter`), but **only** `authRoutes.js`'s own locally-defined limiter is actually applied in the running app, to `/register` and `/login`.
- `labRoutes.js` imports `authLimiter` from this file but never attaches it to a route — labs endpoints are unrate-limited today.
- The rate-limit `keyGenerator` reads `X-Forwarded-For` first (relevant when running behind Nginx — see the sample config in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)), falling back to `req.ip`.

---

## 🚨 Error Handling

**File**: `backend/middlewares/errorHandler.js`

- `AppError` is a custom `Error` subclass carrying a `statusCode` and derived `status` (`"fail"` for 4xx, `"error"` for 5xx).
- The centralized `errorHandler` middleware is the **last** middleware registered in `server.js`; any `next(err)` call anywhere in the app eventually reaches it.
- In non-`development` environments the response omits `stack` and the raw `error` object — but the top-level `error.message` string is **always** included, regardless of environment. A raw, unwrapped database error passed straight to `next(err)` (as `GET /api/labs/search` does in its `catch` block, unlike every other route which wraps errors in a generic `AppError` first) will therefore have its message text reach the client even in production. This is a concrete, checkable difference between two very similar endpoints worth a security/negative test case.

---

## 🌐 Server Composition

**File**: `backend/server.js`

Order of global middleware (matters for how requests are processed):

1. `helmet` (CSP, security headers)
2. request logging (skipped when `NODE_ENV=test`)
3. `body-parser` (JSON/urlencoded, 10mb limit)
4. `sanitize`
5. `cors` (allow-listed origins from `config.js`)
6. custom Origin/Referer check for state-changing methods
7. `/api-docs` (Swagger UI), `/health`
8. `/api/auth`, `/api/labs`
9. catch-all 404 for unknown `/api/*` paths
10. `errorHandler` (must stay last)

---

## 🧪 Existing Test Suite

**Directory**: `tests/`

- Jest + Supertest, run via `npm test`.
- Organized by concern: `tests/routes/`, `tests/middlewares/`, `tests/config/`, `tests/database/`, `tests/integration/`.
- This is a good reference for the exact request/response shapes the app already asserts on — useful as a starting point before writing new QA automation, though it should not be treated as a complete substitute for independent QA test design (the whole point of this app is to practice writing tests from the PRD, not from the existing suite).

---

**Document Status**: ✅ Complete
**Last Updated**: 13 September 2026
