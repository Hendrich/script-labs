# Script Labs App - QA Testing Checklist

## A Practical Checklist for QA Practice on This API

### 📋 Overview

This checklist replaces an earlier generic "development checklist" (which referenced a frontend, Supabase, and other things that don't exist in this repository). It's now scoped to what QA can actually exercise: the real API described in [PRD_Script_Labs_V2.md](./PRD_Script_Labs_V2.md) and [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md).

---

## ✅ What's Actually Built (ground truth)

- [x] Express.js API (`backend/server.js`), no frontend served by this repo
- [x] PostgreSQL, self-hosted, single `pool` connection (`backend/db.js`)
- [x] JWT auth (register/login/logout/me/verify-token)
- [x] Password hashing with bcrypt
- [x] Labs CRUD + search, all scoped to the authenticated user
- [x] Joi-based input validation
- [x] Rate limiting on `/api/auth/register` and `/api/auth/login`
- [x] Helmet security headers + custom Origin/Referer check
- [x] Swagger UI at `/api-docs`
- [x] Existing Jest/Supertest test suite (`npm test`)

---

## 🧪 Functional Test Coverage Checklist

### Authentication

- [ ] Register — happy path
- [ ] Register — duplicate email (case-insensitive: `A@b.com` vs `a@b.com`)
- [ ] Register — password boundary (5 / 6 / 128 / 129 characters)
- [ ] Register — invalid email formats
- [ ] Register — rate limit (6th attempt in 15 min from same IP)
- [ ] Login — happy path
- [ ] Login — wrong password / non-existent email (assert identical response)
- [ ] Login — locked account (403, not 401)
- [ ] Login — rate limit
- [ ] Logout — with and without a token
- [ ] `/me` — valid token, missing token, expired token, malformed token
- [ ] `/verify-token` — same variations as `/me`

### Labs CRUD

- [ ] List labs — pagination defaults and explicit `page`/`limit`
- [ ] List labs — invalid `page`/`limit` (non-numeric, negative, zero, decimal) → should be 400
- [ ] Search labs — matches on `title`, matches on `description`, no matches, empty query
- [ ] Get one lab — owned, not found, owned-by-someone-else (should both 404 identically)
- [ ] Get one lab — invalid `id` format (non-numeric, negative)
- [ ] Create lab — happy path
- [ ] Create lab — duplicate title+description for same user (409)
- [ ] Create lab — field boundaries (title/description at min/max/over-max length, missing fields)
- [ ] Update lab — single field, both fields, empty body (400), not owned (404)
- [ ] Delete lab — happy path, not owned (404), delete twice (second call should 404)
- [ ] Cross-user isolation — user A cannot read/update/delete user B's lab by ID under any endpoint

### Cross-Cutting

- [ ] Missing `Authorization` header on every protected endpoint
- [ ] Malformed JSON body on every `POST`/`PUT` endpoint
- [ ] Response shape matches the documented contract (Shape A/B/C — see [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md#-error-handling)) for each error type
- [ ] CORS/Origin behavior on state-changing requests from disallowed origins

---

## 🤖 Automation Coverage Checklist

- [ ] All functional cases above scripted (Postman/Newman, or code-based)
- [ ] Suite is runnable unattended with a single command
- [ ] Test data setup/teardown goes through the API, not direct SQL
- [ ] Suite runs against a configurable base URL (local vs. deployed)

## 📈 Performance Coverage Checklist

- [ ] Baseline load test on `GET /api/labs`
- [ ] Burst test confirming the auth rate limiter triggers correctly
- [ ] Stress test identifying the actual bottleneck (bcrypt cost, DB pool size of 10, or unindexed search)
- [ ] Report comparing observed results to PRD Section 4.2 targets

## 🔒 Security-Focused Coverage Checklist

- [ ] Password never appears in any response body
- [ ] SQL injection attempts in `email`, `title`, `description`, search query params (expected: safely handled — all queries are parameterized)
- [ ] XSS payloads (`<script>...`) in `title`/`description` (expected: stripped by the `sanitize` middleware)
- [ ] JWT tampering (modified payload/signature) is rejected
- [ ] Expired JWT is rejected

---

## 📝 Notes

- The existing `tests/` directory (Jest + Supertest) is a useful reference for exact expected shapes, but writing your own test cases from the PRD first — then comparing against what's already tested — is more valuable practice than only reading the existing suite.
- Anything found here that deviates from the PRD is a defect: report it (endpoint, request, expected vs. actual, severity) rather than treating it as "how the app works."

---

**Last Updated**: 13 September 2026
**Status**: Active
