# Product Requirements Document (PRD) - Version 2.0

## Script Labs App — QA Practice API

### Document Information

- **Version**: 2.0 (rewritten to match the actual shipped API)
- **Date**: 13 September 2026
- **Status**: Current / Authoritative
- **Purpose**: This PRD is the **source of truth for expected behavior**. It is written so a QA engineer can derive test cases (positive, negative, boundary, security, performance) directly from it and run them against the real API.
- **Related**: [PRD V1.0](./PRD_Script_Labs_V1.md) (historical baseline), [API Documentation](./API_DOCUMENTATION_V2.md), [Database Architecture](./DATABASE_ARCHITECTURE_V2.md)

---

## 1. Executive Summary

### 1.1 Product Overview

Script Labs is a small, self-hosted REST API (Node.js/Express + PostgreSQL) built to give QA professionals a **realistic target to practice on** — not a production SaaS product. It exposes user authentication (JWT-based) and a "labs" resource with full CRUD + search, deployed on a real server (Vultr VPS) so it behaves like a genuine environment: real network latency, real rate limits, real error paths.

### 1.2 Why this app exists (Business Objectives)

- Give QA learners a **safe, low-stakes API** to practice the full QA skill path on:
  1. **Test case design** — functional, negative, boundary, and security test cases derived from this PRD.
  2. **Test automation** — scripting API tests (Postman/Newman, REST-assured, Playwright API testing, etc.) against a real deployed backend.
  3. **Performance testing** — running load/stress tests (k6, JMeter, Artillery) against a real, resource-constrained VPS and observing real bottlenecks (rate limits, DB connection pool limits, CPU-bound password hashing).
- Provide a codebase simple enough to read end-to-end, so learners can eventually cross-reference "expected" (this PRD) vs. "actual" (the running API) and practice defect reporting.

### 1.3 Success Metrics

- A QA learner can write a complete test suite (happy path + negative + edge cases) for every endpoint in this document without needing to read the source code.
- Automated test suites (Postman/Newman or code-based) can run against the deployed API without manual setup beyond registering a test user.
- Performance test scripts can be pointed at the deployed API and produce meaningful, reproducible latency/error-rate numbers.

---

## 2. Scope

### 2.1 In Scope

- User registration, login, logout, session/token verification (JWT, stateless).
- CRUD + search for a single resource type: **"lab"** (`title`, `description`, owned by a user).
- Rate limiting on authentication endpoints.
- Input validation and consistent error responses.

### 2.2 Out of Scope (explicitly NOT implemented — do not write test cases assuming these exist)

- No frontend/UI — this is an API-only product. Any UI-based test cases must target a separate frontend project, not this repository.
- No forgot-password / email-based password reset flow.
- No third-party auth (Google/Supabase/OAuth) — authentication is local email+password only.
- No "sort_by" / "sort_order" / category / rating / ISBN fields on labs — a lab only has `title` and `description`.
- No bulk operations, no admin/metrics endpoints, no user statistics endpoints.

> QA note: earlier drafts of this PRD (and other docs in this repository) referenced Supabase, forgot-password, book ratings/ISBN, and other fields. Those were aspirational drafts that were **never implemented**. This section exists specifically so QA does not write test cases against features that don't exist in the real API.

---

## 3. Functional Requirements

Each requirement below includes the field-level rules needed to design equivalence classes and boundary values.

### 3.1 Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-001 | A visitor can register with a unique `email` and a `password`. | High |
| AUTH-002 | A registered user can log in with `email` + `password` and receive a JWT. | High |
| AUTH-003 | Every protected endpoint must reject requests without a valid `Authorization: Bearer <token>` header. | High |
| AUTH-004 | Passwords must never be stored or returned in plaintext. | High |
| AUTH-005 | A JWT must expire (default: 24 hours) and be rejected once expired. | Medium |
| AUTH-006 | A client can call a "logout" endpoint; since auth is stateless, this only needs to signal success — the client is responsible for discarding the token. | Low |
| AUTH-007 | An authenticated user can fetch their own profile (`/me`) and verify their own token (`/verify-token`). | Medium |
| AUTH-008 | Repeated failed login/registration attempts from the same IP must be throttled. | High |

#### 3.1.1 Field Rules

| Field | Rule |
|-------|------|
| `email` | Required. Must be a syntactically valid email address. Case-insensitive for matching (e.g. `A@B.com` and `a@b.com` are the same account). |
| `password` | Required. Minimum 6 characters, maximum 128 characters. No complexity requirement (no forced uppercase/number/symbol). |

#### 3.1.2 Endpoint Requirements

**`POST /api/auth/register`**

- **Given** a valid, not-yet-registered `email` and a `password` between 6-128 characters
  **When** the client submits registration
  **Then** the API returns **201 Created** with a JWT and the created user's `id`, `email`, `role` (default `"user"`), and `status` (default `"active"`). The response must never include the password or its hash.
- **Given** an `email` that is already registered (comparison is case-insensitive)
  **When** the client submits registration
  **Then** the API returns **409 Conflict** with an `EMAIL_EXISTS` error code, and no new account is created.
- **Given** a missing/malformed `email` or a `password` shorter than 6 or longer than 128 characters
  **When** the client submits registration
  **Then** the API returns **400 Bad Request** describing which field(s) failed validation, and no account is created.
- **Given** more than 5 registration attempts from the same IP within 15 minutes
  **When** the client submits another registration
  **Then** the API returns **429 Too Many Requests**.

**`POST /api/auth/login`**

- **Given** correct `email` + `password` for an active account
  **When** the client logs in
  **Then** the API returns **200 OK** with a JWT and the user's `id`, `email`, `role`, `status`.
- **Given** an `email` that does not exist, OR a correct `email` with a wrong `password`
  **When** the client logs in
  **Then** the API returns **401 Unauthorized** with the **same generic message** in both cases (e.g. "Invalid email or password") — the API must never reveal whether the email exists (anti user-enumeration).
- **Given** a correct `email` + `password` for an account whose `status` is `"locked"`
  **When** the client logs in
  **Then** the API returns **403 Forbidden**, not 401.
- **Given** missing/malformed `email` or `password`
  **When** the client logs in
  **Then** the API returns **400 Bad Request**.
- **Given** more than 5 login attempts from the same IP within 15 minutes
  **When** the client logs in again
  **Then** the API returns **429 Too Many Requests**, regardless of whether the credentials in that 6th attempt are correct.

**`POST /api/auth/logout`**

- **Given** any request, with or without a token
  **When** the client calls logout
  **Then** the API returns **200 OK** confirming logout. (Stateless JWT — server holds no session to invalidate; this endpoint exists purely as a client-facing confirmation.)

**`GET /api/auth/me`**

- **Given** a valid, unexpired token
  **When** the client requests their profile
  **Then** the API returns **200 OK** with the user's `id`, `email`, `role`, `status`, `created_at`.
- **Given** a missing, malformed, or expired token
  **When** the client requests their profile
  **Then** the API returns **401 Unauthorized**.

**`POST /api/auth/verify-token`**

- **Given** a valid, unexpired token
  **When** the client verifies it
  **Then** the API returns **200 OK** with `valid: true`, the `user_id`, `email`, and the token's expiry.
- **Given** a missing, malformed, or expired token
  **When** the client verifies it
  **Then** the API returns **401 Unauthorized**.

### 3.2 Lab Management (CRUD)

All endpoints under `/api/labs` require a valid `Authorization: Bearer <token>` header. A user may only see and modify their **own** labs.

| ID | Requirement | Priority |
|----|-------------|----------|
| LAB-001 | An authenticated user can list their own labs, paginated. | High |
| LAB-002 | An authenticated user can retrieve one of their own labs by ID. | High |
| LAB-003 | An authenticated user can create a new lab with a `title` and `description`. | High |
| LAB-004 | An authenticated user can update the `title` and/or `description` of their own lab. | High |
| LAB-005 | An authenticated user can delete their own lab. | High |
| LAB-006 | An authenticated user can search their own labs by keyword in `title` or `description`, paginated. | Medium |
| LAB-007 | A user must never be able to view, edit, or delete another user's lab, even by guessing its numeric ID. | High |
| LAB-008 | Creating a lab with the exact same `title` and `description` as an existing lab (for the same user) must be rejected as a duplicate. | Medium |

#### 3.2.1 Field Rules

| Field | Rule |
|-------|------|
| `title` | Required on create. 1-255 characters (after trimming whitespace). |
| `description` | Required on create. 1-1000 characters (after trimming whitespace). |
| `id` (path param) | Must be a positive integer. |
| `page` (query param) | Positive integer, default `1`. |
| `limit` (query param) | Positive integer, default `10` (list) or `10` (search), capped at `100`. |

#### 3.2.2 Endpoint Requirements

**`GET /api/labs`**

- **Given** an authenticated user with N labs
  **When** they call this endpoint with no query params
  **Then** the API returns **200 OK** with their labs (default 10 per page), ordered newest first, plus pagination metadata (`page`, `limit`, `total`, `totalPages`).
- **Given** an optional `search` query param
  **When** provided
  **Then** the results are filtered to labs whose `title` or `description` contains the search text (case-insensitive).
- **Given** a `page` or `limit` value that is not a valid positive integer (e.g. text, negative, zero, decimal)
  **When** the client calls this endpoint
  **Then** the API must return **400 Bad Request** with a clear validation message — never a 500 error and never a raw database error message.

**`GET /api/labs/search`**

- Same contract as `GET /api/labs`, but the query parameter is named `q` instead of `search`, and the response includes an `echo` of the search query (`search_query`).
- **Given** an empty or missing `q`
  **When** the client searches
  **Then** the API returns all of the user's labs (paginated), equivalent to `GET /api/labs`.
- Same validation requirement as above: invalid `page`/`limit` must return **400**, never a 500 or a raw database error.

**`GET /api/labs/:id`**

- **Given** an `id` that exists and belongs to the caller
  **When** the client requests it
  **Then** the API returns **200 OK** with the lab.
- **Given** an `id` that does not exist, or exists but belongs to a different user
  **When** the client requests it
  **Then** the API returns **404 Not Found** — the response must be identical in both cases (do not leak whether the ID exists but belongs to someone else).
- **Given** an `id` that is not a positive integer (e.g. `abc`, `-1`, `1.5`)
  **When** the client requests it
  **Then** the API returns **400 Bad Request**.

**`POST /api/labs`**

- **Given** a valid `title` (1-255 chars) and `description` (1-1000 chars)
  **When** the client creates a lab
  **Then** the API returns **201 Created** with the new lab, including its generated `id`, `created_at`, `updated_at`.
- **Given** a `title`+`description` pair that is identical to one the same user already has
  **When** the client tries to create it again
  **Then** the API returns **409 Conflict**.
- **Given** a missing `title`, missing `description`, or either field out of length bounds (empty after trim, or over the max)
  **When** the client creates a lab
  **Then** the API returns **400 Bad Request** describing the invalid field(s).

**`PUT /api/labs/:id`**

- **Given** an owned, existing lab `id` and at least one of `title`/`description` in the body
  **When** the client updates it
  **Then** the API returns **200 OK** with the updated lab, and `updated_at` changes.
- **Given** an empty body (no fields to update)
  **When** the client attempts an update
  **Then** the API returns **400 Bad Request**.
- **Given** an `id` that doesn't exist or isn't owned by the caller
  **When** the client attempts an update
  **Then** the API returns **404 Not Found**.

**`DELETE /api/labs/:id`**

- **Given** an owned, existing lab `id`
  **When** the client deletes it
  **Then** the API returns **200 OK** confirming deletion, and a subsequent `GET` on that `id` returns 404.
- **Given** an `id` that doesn't exist or isn't owned by the caller
  **When** the client attempts to delete it
  **Then** the API returns **404 Not Found**.

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID | Requirement |
|----|-------------|
| SEC-001 | Passwords must be hashed (never stored or logged in plaintext). |
| SEC-002 | All state-changing requests (`POST`/`PUT`/`DELETE`) must be rejected if their `Origin`/`Referer` header does not match an allow-listed origin. |
| SEC-003 | Authentication endpoints must rate-limit by IP to resist brute-force and credential-stuffing attacks. |
| SEC-004 | Error responses in production must never leak stack traces, raw database error text, or internal file paths. |
| SEC-005 | A user must never be able to access or modify another user's data through any endpoint. |

### 4.2 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| PERF-001 | `GET /api/labs` / `GET /api/labs/search` response time under normal load | < 500 ms (p95) |
| PERF-002 | `POST /api/auth/login` response time (bcrypt is intentionally CPU-bound; expect this to be the slowest endpoint) | < 1000 ms (p95) |
| PERF-003 | The API should degrade gracefully (clear error responses, not hangs or crashes) when the configured rate limits or database connection pool are exceeded — this is exactly what performance/load testing on this app should probe. |

### 4.3 Reliability & Error Contract

| ID | Requirement |
|----|-------------|
| REL-001 | Every error response must include a human-readable `message`. |
| REL-002 | Validation errors must return `400`, authentication errors `401`/`403`, not-found `404`, conflicts `409`, rate-limit `429`, and unexpected server failures `500` — status codes must be used consistently across all endpoints. |
| REL-003 | A malformed or unexpected input must never crash the server or return an unhandled `500` when a `400` is the correct response — this is the single most important rule for negative test-case design against this API. |

---

## 5. Test Case Design Guidance for QA

This PRD is intentionally written so each endpoint requirement above maps to a Given/When/Then that can become one or more test cases. Suggested coverage per endpoint:

1. **Happy path** — valid input, assert status code + response shape.
2. **Boundary values** — for every length/number rule above (e.g. password of exactly 6, 5, 128, 129 characters; page = 0, 1, negative, non-numeric).
3. **Negative/security** — wrong credentials, locked account, accessing another user's resource by ID, missing/expired/malformed token, malformed JSON body.
4. **Rate limiting** — exceeding the 5 requests/15 minutes limit on `/register` and `/login`.
5. **Contract consistency** — compare the actual response shape/status code against what this document specifies; any mismatch is a defect to report.

This structure is also what automation suites (Postman/Newman collections, or code-based API tests) should be organized around, and what performance test scripts should target for realistic load scenarios (e.g. sustained traffic on `GET /api/labs`, burst traffic on `POST /api/auth/login` to observe rate-limiting behavior).

---

## 6. Success Criteria

- [x] Registration, login, logout, `/me`, `/verify-token` implemented and match Section 3.1.
- [x] Labs CRUD + search implemented and match Section 3.2.
- [x] Rate limiting active on `/register` and `/login`.
- [ ] All Section 3 requirements verified by an automated test suite (QA deliverable).
- [ ] Performance baseline established for Section 4.2 targets (QA deliverable).

---

**Document Status**: Active / Authoritative
**Last Updated**: 13 September 2026
**Owner**: Hendri Christianto
