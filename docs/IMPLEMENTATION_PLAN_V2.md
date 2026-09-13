# 📋 Script Labs — QA Enablement Roadmap

## 📋 Document Information

- **Version**: 2.0 (repurposed from a feature-development plan to a QA learning roadmap)
- **Date**: 13 September 2026
- **Status**: Current / Authoritative
- **Related**: [PRD V2.0](./PRD_Script_Labs_V2.md), [API Documentation](./API_DOCUMENTATION_V2.md), [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)

> An earlier version of this document was a sprint plan for building Supabase migration, full-text search, and forgot-password features. None of that was built, and this app's actual purpose is different: it's a **QA training target**, not a product under active feature development. This document now lays out the recommended learning path for someone using this app to build QA skills, from test case design through to performance testing.

---

## 🎯 Goal

Use the Script Labs API (already fully implemented — see [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md)) to practice, in order:

1. Manual test case design
2. API test automation
3. Performance/load testing

Each phase below produces a concrete artifact.

---

## Phase 1: Test Case Design (from the PRD)

**Input**: [PRD_Script_Labs_V2.md](./PRD_Script_Labs_V2.md), Sections 3-5
**Output**: A test case document/spreadsheet covering every endpoint

### Tasks

- [ ] Write happy-path test cases for all 5 auth endpoints and all 6 lab endpoints.
- [ ] Write boundary test cases for every field rule in PRD Section 3.1.1 / 3.2.1 (e.g. password length 5/6/128/129, title length 0/1/255/256).
- [ ] Write negative test cases: wrong credentials, locked account, expired/malformed token, accessing another user's lab by ID, malformed JSON body.
- [ ] Write test cases for the rate-limiting behavior (5 requests/15 min on `/register` and `/login`).
- [ ] Write test cases that assert the **exact** error response shape for each failure mode — Section 6 of the API doc describes three different shapes in use; a good test case should catch if the "wrong" shape comes back.

### Acceptance Criteria

- Every requirement ID in PRD Section 3 (AUTH-001 … AUTH-008, LAB-001 … LAB-008) has at least one corresponding test case.
- Test cases are written independently of the source code (from the PRD only), then run once against the real API to see whether the implementation matches the spec.

---

## Phase 2: API Test Automation

**Input**: Phase 1 test cases
**Output**: A runnable automated suite (Postman/Newman collection, or code-based — REST-assured, Playwright API testing, Supertest, etc.)

### Tasks

- [ ] Set up an environment file/config with a base URL and a way to obtain a fresh JWT (register or login a fixed test user as a setup step).
- [ ] Automate all Phase 1 happy-path cases first; confirm they pass against a running instance.
- [ ] Automate negative/boundary cases; some are expected to **fail** against the current implementation — that's the point. Log each failure as a defect (see "Defect Reporting" below), don't just skip it.
- [ ] Add a data-driven suite for the field-boundary cases (e.g. a table of password lengths → expected status code).
- [ ] Wire the suite into a CI step (this repo already has GitHub Actions under `.github/workflows/` for the app's own tests — a QA automation suite can run as a separate job or a separate repository).

### Acceptance Criteria

- The suite can run unattended (`newman run ...` or `npm test` equivalent) and produce a pass/fail report.
- Test data setup/teardown doesn't require manual database intervention (use the API itself — register/create/delete — not direct SQL).

---

## Phase 3: Performance Testing

**Input**: PRD Section 4.2 (performance targets), [SYSTEM_ARCHITECTURE_V2.md](./SYSTEM_ARCHITECTURE_V2.md#-performance-characteristics-realistic-for-test-planning)
**Output**: A load test script + a short report of observed behavior vs. targets

### Tasks

- [ ] Pick a tool (k6, JMeter, Artillery, Locust).
- [ ] Script a baseline scenario: steady traffic on `GET /api/labs` for an authenticated user, ramping concurrency, measuring p95 latency and error rate.
- [ ] Script a rate-limit scenario: burst traffic on `POST /api/auth/login` to confirm the 5-requests/15-min limit actually triggers `429`, and measure how quickly it recovers.
- [ ] Script a stress scenario aimed at the known constraints (bcrypt cost on login/register, default 10-connection DB pool, unindexed `ILIKE` search) to find where response times degrade.
- [ ] **Do not** run heavy load tests against a shared/production instance without checking first — prefer a separate deployment for this phase (see the cost/impact discussion already had with the app owner, or [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)).

### Acceptance Criteria

- A short report stating: was each PRD Section 4.2 target met, and what was the actual bottleneck when it wasn't (rate limiter, DB pool, CPU-bound hashing, or something else).

---

## Defect Reporting

When a test case (manual, automated, or performance) reveals behavior that doesn't match the PRD, record it as a defect with:

- Endpoint + exact request (method, headers, body)
- Expected result (quote the PRD requirement ID)
- Actual result (status code + body)
- Severity/impact

This is the core loop this app is designed to support: **spec → test → run → compare → report**.

---

**Document Status**: Active
**Last Updated**: 13 September 2026
**Owner**: Hendri Christianto
