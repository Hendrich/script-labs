# Product Requirements Document (PRD) - Version 2.0

## Script Labs Application - Enhanced Features

### Document Information

- **Version**: 2.0
- **Date**: July 29, 2025
- **Status**: Enhancement Phase
- **Previous Version**: [PRD v1.0](./PRD-lab-Catalog-App.md)

---

## 1. Executive Summary

### 1.1 Product Overview

Script Labs App V2 adalah peningkatan dari aplikasi manajemen katalog buku dengan penambahan fitur pencarian & filter buku, sistem forgot password yang aman, dan migrasi penuh ke Supabase sebagai backend database utama.

### 1.2 Business Objectives

- **Enhanced User Experience**: Pencarian dan filter buku yang powerful untuk koleksi besar
- **Security Enhancement**: Sistem forgot password yang aman dengan email verification
- **Infrastructure Modernization**: Full migration ke Supabase untuk scalability dan reliability
- **Performance Improvement**: Query optimization dengan Supabase PostgreSQL

### 1.3 Success Metrics V2

- Search response time < 200ms untuk 1000+ labs
- Password reset success rate > 95%
- Zero downtime migration ke Supabase
- User engagement increase 40% dengan enhanced search features

---

## 2. What's New in Version 2.0

### 2.1 New Features Summary

| Feature                | Priority | Status       | Impact |
| ---------------------- | -------- | ------------ | ------ |
| Search & Filter labs   | High     | ï¿½ Planned  | High   |
| Forgot Password System | High     | ðŸ“‹ Planned | Medium |
| Supabase Migration     | High     | ðŸ“‹ Planned | High   |

### 2.2 Migration Rationale

**From Local PostgreSQL to Supabase:**

- **Scalability**: Auto-scaling database
- **Authentication**: Built-in auth with email verification
- **Real-time**: Real-time subscriptions capability
- **Managed Service**: Reduced operational overhead
- **Security**: Enterprise-grade security features

---

## 3. Enhanced Functional Requirements

### 3.1 Search & Filter System

| Feature ID | Feature Name           | Priority | Description                       |
| ---------- | ---------------------- | -------- | --------------------------------- |
| SEARCH-001 | Basic Text Search      | High     | Search labs by title and author   |
| SEARCH-002 | Filter by Title/Author | High     | Filter labs by title or author    |
| SEARCH-003 | Sort Options           | High     | Sort by title, author, date added |

#### 3.1.1 Search API Specifications

```javascript
// GET /api/labs/search
Query Parameters:
- q: string (search query for title/author)
- sort_by: enum (title|author|created_at)
- sort_order: enum (asc|desc)
- page: number (pagination)
- limit: number (results per page, max 50)

Response:
{
  "success": true,
  "data": {
    "labs": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_results": 95,
      "per_page": 10
    },
    "search_query": "javascript"
    }
  },
  "performance": {
    "query_time_ms": 45,
    "results_count": 10
  }
}
```

### 3.2 Forgot Password System

| Feature ID | Feature Name           | Priority | Description                               |
| ---------- | ---------------------- | -------- | ----------------------------------------- |
| FORGOT-001 | Password Reset Request | High     | User requests password reset via email    |
| FORGOT-002 | Email Verification     | High     | Send secure reset link to user email      |
| FORGOT-003 | Token Validation       | High     | Validate reset token and expiration       |
| FORGOT-004 | Password Update        | High     | Secure password update with new hash      |
| FORGOT-005 | Reset Notification     | Medium   | Email confirmation after successful reset |
| FORGOT-006 | Rate Limiting          | High     | Prevent abuse with rate limiting          |

#### 3.2.1 Forgot Password API Flow

```javascript
// 1. Request Password Reset
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}

// 2. Verify Reset Token
GET /api/auth/reset-password/:token

// 3. Set New Password
POST /api/auth/reset-password
{
  "token": "secure_reset_token",
  "new_password": "new_secure_password",
  "confirm_password": "new_secure_password"
}
```

---

## 4. Technical Architecture V2

### 4.1 Enhanced Architecture

```
Frontend (Enhanced UI) â†” Backend API (Node.js/Express) â†” Supabase (PostgreSQL + Auth)
                        â†•                               â†•
                   JWT + Supabase Auth           Real-time Updates
                        â†•                               â†•
                   Email Service (Supabase)      File Storage (Future)
```

### 4.2 Technology Stack Updates

**Added/Updated:**

- **Database**: Supabase PostgreSQL (replacing local PostgreSQL)
- **Authentication**: Supabase Auth + JWT hybrid approach
- **Email Service**: Supabase built-in email (or SendGrid integration)
- **Search**: PostgreSQL full-text search with ts_vector
- **Real-time**: Supabase real-time subscriptions (future feature)

**Maintained:**

- **Frontend**: HTML5, CSS3, Enhanced JavaScript
- **Backend**: Node.js, Express.js (enhanced middleware)
- **Security**: bcryptjs, CORS, Helmet
- **Testing**: Jest with enhanced coverage

### 4.3 Database Schema V2

```sql
-- Enhanced labs table
CREATE TABLE public.labs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_labs_user_id ON public.labs(user_id);
CREATE INDEX idx_labs_title ON public.labs(title);
CREATE INDEX idx_labs_author ON public.labs(author);

-- Password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
```

---

## 5. API Specifications V2

### 5.1 Enhanced lab Endpoints

```javascript
// Search labs by title/author
GET /api/labs/search?q={query}&sort_by={field}&page={num}

// Standard CRUD operations (existing)
GET /api/labs
POST /api/labs
PUT /api/labs/:id
DELETE /api/labs/:id

// Update lab (same as V1)
PUT /api/labs/:id
{
  "title": "lab Title",
  "author": "Author Name"
  "category": "Technical",
  "publication_year": 2024,
  "isbn": "978-1234567890",
  "rating": 5,
  "reading_status": "read",
  "notes": "Excellent lab about...",
  "cover_url": "https://example.com/cover.jpg"
}

// Bulk operations (future)
POST /api/labs/bulk
{
  "action": "update_status",
  "lab_ids": ["uuid1", "uuid2"],
  "data": { "reading_status": "read" }
}
```

```javascript
// New endpoint on Enhance V2
// GET /api/labs/search
Query Parameters:
- q: string (search query for title/author)
- page: number (pagination, default: 1)
- limit: number (results per page, default: 10, max: 100)

Response:
{
  "success": true,
  "data": [
    { "id": 14, "title": "Atomic Habits", "author": "James Clear", "user_id": "..." }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "search_query": "atomic",
  "timestamp": "2025-07-31T10:00:00.000Z"
}
```

### 5.2 Password Reset Endpoints

```javascript
// 1. Initiate password reset
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
Response: {
  "success": true,
  "message": "Password reset email sent if account exists",
  "rate_limit": {
    "remaining_attempts": 2,
    "reset_time": "2025-07-29T10:00:00Z"
  }
}

// 2. Validate reset token
GET /api/auth/reset-password/:token
Response: {
  "success": true,
  "data": {
    "token_valid": true,
    "expires_at": "2025-07-29T09:00:00Z",
    "email": "u***@example.com"
  }
}

// 3. Complete password reset
POST /api/auth/reset-password
{
  "token": "secure_reset_token",
  "new_password": "new_secure_password"
}
Response: {
  "success": true,
  "message": "Password successfully updated"
}
```

---

## 6. Migration Strategy

### 6.1 Database Migration Plan

#### Phase 1: Supabase Setup (Week 1)

```sql
-- 1. Create Supabase project
-- 2. Set up authentication
-- 3. Create enhanced tables
-- 4. Set up Row Level Security (RLS)

-- RLS Policies
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own labs" ON public.labs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own labs" ON public.labs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labs" ON public.labs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labs" ON public.labs
  FOR DELETE USING (auth.uid() = user_id);
```

#### Phase 2: Data Migration (Week 2)

```javascript
// Migration script
const migrationScript = `
-- Export existing data
COPY (
  SELECT 
    gen_random_uuid() as id,
    title,
    author,
    user_id,
    created_at,
    updated_at
  FROM old_books_table
) TO '/tmp/books_export.csv' WITH CSV HEADER;

-- Import to Supabase
-- (Use Supabase Dashboard or API)
`;
```

#### Phase 3: API Updates (Week 3)

- Update database connection to Supabase
- Implement new search endpoints
- Add forgot password functionality
- Enhanced error handling

### 6.2 Rollback Strategy

- **Database**: Keep old PostgreSQL running for 2 weeks
- **Code**: Feature flags for new functionality
- **Data**: Daily backups during migration period
- **Testing**: Parallel testing on both systems

---

## 7. Enhanced Security Requirements

### 7.1 Authentication Security

```javascript
// Enhanced JWT with Supabase
const jwtConfig = {
  // Primary: Supabase JWT
  supabase: {
    jwt_secret: process.env.SUPABASE_JWT_SECRET,
    algorithm: "HS256",
    expiresIn: "1h",
  },
  // Fallback: Custom JWT
  custom: {
    jwt_secret: process.env.JWT_SECRET,
    algorithm: "HS256",
    expiresIn: "24h",
  },
};
```

### 7.2 Password Reset Security

- **Token Expiration**: 1 hour maximum
- **Single Use**: Tokens become invalid after use
- **Rate Limiting**: 3 attempts per hour per email
- **Secure Generation**: Crypto-random tokens (32 bytes)
- **Email Verification**: Confirm email ownership

### 7.3 Search Security

- **Input Sanitization**: Prevent SQL injection in search queries
- **Query Limits**: Maximum 100 results per request
- **Rate Limiting**: 100 searches per minute per user
- **Permission Check**: Users can only search their own labs

---

## 8. Performance Requirements V2

### 8.1 Search Performance

| Metric               | Target  | Current | Improvement           |
| -------------------- | ------- | ------- | --------------------- |
| Search Response Time | < 300ms | N/A     | New Feature           |
| Results per Page     | 10-50   | N/A     | Configurable          |
| Concurrent Searches  | 100/min | N/A     | Load Testing Required |

### 8.2 Database Performance

```sql
-- Performance monitoring queries
SELECT COUNT(*) FROM labs WHERE user_id = $1;

-- Search query performance
EXPLAIN ANALYZE
SELECT * FROM labs
WHERE user_id = $1 AND (title ILIKE $2 OR author ILIKE $3);
```

---

## 9. Testing Strategy V2

### 9.1 Enhanced Test Coverage

```javascript
// Search functionality tests
describe("lab Search API", () => {
  test("should return labs matching search query", async () => {
    const response = await request(app)
      .get("/api/labs/search?q=javascript")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.data.labs).toHaveLength(5);
    expect(response.body.performance.query_time_ms).toBeLessThan(200);
  });

  test("should handle complex filters", async () => {
    const response = await request(app)
      .get("/api/labs/search?category=Technical&year_from=2020&sort_by=rating")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.data.filters_applied.category).toBe("Technical");
  });
});

// Password reset tests
describe("Password Reset Flow", () => {
  test("should send reset email for valid user", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test@example.com" })
      .expect(200);

    expect(emailService.sendEmail).toHaveBeenCalled();
  });

  test("should validate reset token correctly", async () => {
    const token = await generateResetToken("user_id");
    const response = await request(app)
      .get(`/api/auth/reset-password/${token}`)
      .expect(200);

    expect(response.body.data.token_valid).toBe(true);
  });
});
```

### 9.2 Migration Testing

```javascript
// Migration test suite
describe("Database Migration", () => {
  test("should migrate all labs data correctly", async () => {
    const oldCount = await getOldDatabaseBookCount();
    await runMigration();
    const newCount = await getSupabaseBookCount();

    expect(newCount).toBe(oldCount);
  });

  test("should maintain data integrity after migration", async () => {
    const sampleBooks = await getRandomBooksFromOldDB(10);
    await runMigration();

    for (const lab of sampleBooks) {
      const migratedBook = await getBookFromSupabase(lab.id);
      expect(migratedBook.title).toBe(lab.title);
      expect(migratedBook.author).toBe(lab.author);
    }
  });
});
```

---

## 10. Implementation Timeline

### Phase 1: Foundation Enhancement (Week 1-2)

- [x] âœ… Project structure analysis
- [ ] ðŸ”„ Supabase project setup
- [ ] ðŸ”„ Enhanced database schema
- [ ] ðŸ“‹ Authentication system update

### Phase 2: Search & Filter (Week 3-4)

- [ ] ðŸ“‹ Basic search implementation
- [ ] ðŸ“‹ Search API endpoints
- [ ] ðŸ“‹ Frontend search UI

### Phase 3: Forgot Password (Week 5-6)

- [ ] ðŸ“‹ Email service integration
- [ ] ðŸ“‹ Password reset flow
- [ ] ðŸ“‹ Security implementation
- [ ] ðŸ“‹ Frontend reset forms

### Phase 4: Migration & Testing (Week 7-8)

- [ ] ðŸ“‹ Data migration scripts
- [ ] ðŸ“‹ System testing
- [ ] ðŸ“‹ Security audit

---

## 11. Success Criteria V2

### 11.1 MVP V2 Requirements

- [ ] Search labs by title/author with < 300ms response time
- [ ] Forgot password with email verification
- [ ] 100% data migration success to Supabase
- [ ] Zero downtime deployment

### 11.2 Performance Benchmarks

```javascript
// Performance test targets
const performanceTargets = {
  search: {
    basic_search: "< 300ms",
    pagination: "< 100ms",
  },
  auth: {
    password_reset_request: "< 1s",
    token_validation: "< 100ms",
    password_update: "< 500ms",
  },
  database: {
    migration_success: "100%",
  },
};
```

---

## 12. Risk Assessment V2

### 12.1 Technical Risks

| Risk                  | Impact   | Probability | Mitigation                                      |
| --------------------- | -------- | ----------- | ----------------------------------------------- |
| Migration Data Loss   | Critical | Low         | Comprehensive backup strategy, parallel testing |
| Search Performance    | High     | Medium      | Database indexing, query optimization           |
| Email Delivery Issues | Medium   | Medium      | Multiple email providers, monitoring            |
| Supabase Limitations  | High     | Low         | Thorough testing, fallback plans                |

### 12.2 Migration Risks

| Risk                    | Impact   | Probability | Mitigation                              |
| ----------------------- | -------- | ----------- | --------------------------------------- |
| User Data Corruption    | Critical | Low         | Staged migration, rollback procedures   |
| Service Downtime        | High     | Medium      | Blue-green deployment, feature flags    |
| Authentication Breaking | High     | Low         | Hybrid auth approach, gradual migration |
| Performance Regression  | Medium   | Medium      | Load testing, performance monitoring    |

---

## 13. Conclusion

Script Labs V2 focuses on three core enhancements: search functionality, password recovery, and Supabase migration. This streamlined approach ensures reliable implementation while maintaining system stability.

### Key Deliverables:

1. **Search System** - Basic search by title and author
2. **Password Recovery** - Email-based password reset with security measures
3. **Supabase Migration** - Complete transition to managed database service

### Next Steps:

1. Review and approve this PRD
2. Set up development environment with Supabase
3. Begin implementation following the phased approach

---

**Document Status**: Ready for Development  
**Approval Required**: Technical Lead, Product Owner  
**Next Review**: Weekly during development phase
