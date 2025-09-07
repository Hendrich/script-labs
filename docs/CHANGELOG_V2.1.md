# Changelog Script Labs API

## Version 2.1.0 - 2025-09-07

### Security Hardening

- Removed broad global rate limiting; introduced scoped strict limiter (5 attempts / 15m) only on `/api/auth/register` and `/api/auth/login`.
- Unified authentication error responses to a generic message (`Invalid email or password`) to mitigate user enumeration.
- Strengthened Content Security Policy: removed `'unsafe-inline'` for scripts/styles; limited external sources to self + Google Fonts only (styles/fonts) and Supabase for connect.
- Removed verbose request body debug logging that could leak sensitive data (passwords/tokens).
- Validation order adjusted (validation runs before rate limiter) to avoid counting malformed requests against brute force threshold.
- Rate limiter bypass in automated test environment (`NODE_ENV=test`) to prevent false negatives in CI.

### Code / Middleware Changes

- `backend/server.js`: replaced legacy Helmet CSP block with stricter configuration; removed global `/api/auth` & `/api/labs` rate limiters; deleted body debug logger.
- `backend/routes/authRoutes.js`: added scoped rate limiter, reordered middleware, standardized error output, returned 400 for registration errors and 401 for login failures.
- Updated tests to align with new auth error contract and limiter behavior.
- Adjusted validation test to assert unknown fields are stripped correctly.

### Test & Coverage

- All 334 tests passing after changes.
- Coverage (approx): Statements 79%, Branches 70%, Functions 79%, Lines 79%.

### Backward Compatibility Notes

- Error codes `REGISTRATION_FAILED` / `LOGIN_FAILED` are replaced by `AUTH_FAILED` for Supabase-auth related credential failures.
- Clients relying on specific error messages or codes must update parsing logic.
- CSP tightening may require frontend to eliminate inline scripts/styles or adopt nonce/hash strategy if reintroduced.

### Recommended Follow-ups

- Add HSTS & Permissions-Policy headers.
- Introduce refresh token & JWT revocation list.
- Centralized structured security logging (e.g., Winston + daily rotate).
- Replace simple sanitization with a vetted library if rich text support is needed.

---

Generated automatically on 2025-09-07.
