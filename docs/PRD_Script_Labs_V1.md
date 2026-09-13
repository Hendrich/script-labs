# Product Requirements Document (PRD) - Version 1.0 (Historical Baseline)

## Script Labs Application

### Document Information

- **Version**: 1.0
- **Date**: 2024
- **Author**: Hendri Christianto
- **Status**: Historical / Superseded — kept for context only.
- **Canonical current requirements**: see [PRD V2.0](./PRD_Script_Labs_V2.md). This V1 document describes the original MVP scope; some technical details below (database provider, hosting) were later corrected in V2 to match what was actually built and deployed.

---

## 1. Executive Summary

### 1.1 Product Overview

Script Labs App adalah REST API untuk manajemen katalog "lab" (record dengan `title` + `description`) milik user, dengan sistem autentikasi JWT. Aplikasi ini dipakai sebagai **API latihan untuk QA** — bukan produk SaaS produksi — sehingga QA dapat mendaftar, login, dan melakukan operasi CRUD (Create, Read, Update, Delete) untuk keperluan penulisan test case, automation, dan performance testing.

### 1.2 Business Objectives

- Menyediakan API nyata (bukan mock) yang mudah dipakai untuk latihan QA: test case design, automation, dan performance testing
- Implementasi best practices dalam pengembangan REST API (Node.js, Express, PostgreSQL, JWT)
- Pembelajaran dan portfolio development

### 1.3 Success Metrics

- Aplikasi dapat menangani operasi CRUD buku dengan response time < 500ms
- Authentication system yang secure dengan JWT token
- User-friendly interface dengan responsive design
- Code quality dengan test coverage minimal 80%

---

## 2. Product Vision & Strategy

### 2.1 Vision Statement

"Menjadi aplikasi katalog buku digital yang sederhana, aman, dan mudah digunakan untuk manajemen koleksi buku pribadi."

### 2.2 Target Users

- **Primary**: Pembaca aktif yang ingin mengorganisir koleksi buku digital
- **Secondary**: Developers yang belajar full-stack development
- **Tertiary**: Educational purposes dan portfolio demonstration

### 2.3 User Personas

#### Persona 1: lab Enthusiast

- **Age**: 25-45
- **Tech Savvy**: Medium
- **Goals**: Mengorganisir dan tracking buku yang telah dibaca
- **Pain Points**: Kesulitan mengingat buku yang sudah dibaca, tidak ada sistem untuk track reading progress

#### Persona 2: Student Developer

- **Age**: 20-30
- **Tech Savvy**: High
- **Goals**: Belajar full-stack development dengan real project
- **Pain Points**: Butuh contoh implementasi best practices untuk portfolio

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| Feature ID | Feature Name         | Priority | Description                                     |
| ---------- | -------------------- | -------- | ----------------------------------------------- |
| AUTH-001   | User Registration    | High     | User dapat mendaftar dengan email dan password  |
| AUTH-002   | User Login           | High     | User dapat login dan mendapat JWT token         |
| AUTH-003   | JWT Token Validation | High     | Semua protected routes memvalidasi JWT token    |
| AUTH-004   | Password Encryption  | High     | Password di-hash dengan bcrypt sebelum disimpan |
| AUTH-005   | Token Expiration     | Medium   | JWT token memiliki expiration time              |

### 3.2 lab Management

| Feature ID | Feature Name   | Priority | Description                                      |
| ---------- | -------------- | -------- | ------------------------------------------------ |
| lab-001    | View All labs  | High     | User dapat melihat semua buku dalam koleksi      |
| lab-002    | Add New lab    | High     | User dapat menambah buku baru (title, author)    |
| lab-003    | Update lab     | High     | User dapat mengedit informasi buku               |
| lab-004    | Delete lab     | High     | User dapat menghapus buku dari koleksi           |
| lab-005    | lab Search     | Medium   | User dapat mencari buku berdasarkan title/author |
| lab-006    | lab Categories | Low      | User dapat mengkategorikan buku                  |

### 3.3 User Interface

| Feature ID | Feature Name        | Priority | Description                              |
| ---------- | ------------------- | -------- | ---------------------------------------- |
| UI-001     | Responsive Design   | High     | UI responsif untuk desktop dan mobile    |
| UI-002     | Login/Register Form | High     | Form yang user-friendly untuk auth       |
| UI-003     | lab List Display    | High     | Tampilan list buku yang mudah dibaca     |
| UI-004     | Add/Edit lab Modal  | High     | Modal untuk input data buku              |
| UI-005     | Error Messages      | High     | Pesan error yang informatif              |
| UI-006     | Loading States      | Medium   | Indikator loading untuk async operations |

---

## 4. Technical Requirements

### 4.1 Architecture

```
Frontend (HTML/CSS/JS) â†” Backend API (Node.js/Express) â†” Database (PostgreSQL/Supabase)
                        â†•
                   JWT Authentication
```

### 4.2 Technology Stack

- **Backend**: Node.js, Express.js (API only — no frontend is served by this repository)
- **Database**: Self-hosted PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **ORM/Database Client**: pg (node-postgres)
- **Security**: bcrypt for password hashing
- **CORS**: cors middleware
- **Environment**: dotenv

### 4.3 API Specifications

#### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Client-side token discard (stateless)
- `GET /api/auth/me` - Get current authenticated user's profile
- `POST /api/auth/verify-token` - Verify a JWT is still valid

#### lab Endpoints (Protected)

- `GET /api/labs` - Get all user's labs (paginated, optional `search`)
- `GET /api/labs/search` - Search user's labs (paginated, `q` param)
- `GET /api/labs/:id` - Get a single lab
- `POST /api/labs` - Add new lab
- `PUT /api/labs/:id` - Update lab
- `DELETE /api/labs/:id` - Delete lab

See [PRD V2.0, Section 3](./PRD_Script_Labs_V2.md#3-functional-requirements) for the full, current request/response contract for each endpoint.

### 4.4 Database Schema

```sql
-- users table (self-hosted PostgreSQL, see database/schema_pg.sql)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- labs table
CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

> Note: `id` values are plain auto-incrementing integers (`SERIAL`), not UUIDs, and there is no `author`/`isbn`/`rating` field — a lab only has `title` and `description`.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- API response time: < 500ms untuk semua endpoints
- Database query optimization untuk large datasets
- Frontend loading time: < 3 seconds
- Concurrent users: minimal 100 users

### 5.2 Security

- Password hashing dengan bcrypt (salt rounds: 10)
- JWT token dengan secure secret key
- CORS configuration untuk cross-origin requests
- Input validation dan sanitization
- SQL injection prevention dengan parameterized queries

### 5.3 Scalability

- Modular code structure untuk easy maintenance
- Environment-based configuration
- Database connection pooling
- Stateless API design

### 5.4 Reliability

- Error handling dengan proper HTTP status codes
- Graceful error messages untuk users
- Database connection error handling
- API versioning untuk backward compatibility

### 5.5 Usability

- Intuitive user interface
- Clear error messages
- Responsive design untuk semua devices
- Accessibility considerations (ARIA labels, semantic HTML)

---

## 6. API Design Standards

### 6.1 RESTful Principles

- Proper HTTP methods (GET, POST, PUT, DELETE)
- Meaningful resource URLs
- Consistent response formats
- Appropriate HTTP status codes

### 6.2 Response Format

```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 6.3 Error Handling

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": {...}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 7. Testing Strategy

### 7.1 Testing Types

- **Unit Tests**: Individual functions dan components
- **Integration Tests**: API endpoints dengan database
- **E2E Tests**: Full user workflows
- **API Tests**: Postman collection untuk manual testing

### 7.2 Test Coverage

- Minimum 80% code coverage
- All API endpoints tested
- Authentication flow testing
- Error scenarios testing

### 7.3 Testing Tools

- **Backend**: Jest/Mocha untuk unit tests
- **API**: Postman collection dengan automated tests
- **Frontend**: Manual testing + Browser developer tools
- **Database**: Test database untuk integration tests

---

## 8. Deployment & Infrastructure

### 8.1 Development Environment

- Local development dengan nodemon
- Environment variables via .env file
- Local PostgreSQL atau Supabase connection

### 8.2 Production Environment

- **Hosting**: Vultr VPS (PM2 process manager + Nginx reverse proxy) — see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Database**: Self-hosted PostgreSQL on the same VPS
- **Environment Variables**: Secure environment configuration (`.env`, never committed)
- **SSL**: HTTPS enforced via Nginx + Let's Encrypt (certbot)

### 8.3 CI/CD Pipeline

- Git-based deployment
- Automated testing before deployment
- Environment-specific configurations
- Database migration scripts

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk                       | Impact | Probability | Mitigation                           |
| -------------------------- | ------ | ----------- | ------------------------------------ |
| Database connection issues | High   | Medium      | Connection pooling, error handling   |
| JWT token security         | High   | Low         | Secure secret keys, token expiration |
| API rate limiting          | Medium | Medium      | Implement rate limiting middleware   |
| CORS configuration         | Medium | Low         | Proper CORS setup untuk production   |

### 9.2 Business Risks

| Risk                     | Impact | Probability | Mitigation                               |
| ------------------------ | ------ | ----------- | ---------------------------------------- |
| User data loss           | High   | Low         | Regular backups, transaction handling    |
| Performance degradation  | Medium | Medium      | Query optimization, caching              |
| Security vulnerabilities | High   | Low         | Security best practices, regular updates |

---

## 10. Timeline & Milestones

### Phase 1: Foundation (Week 1-2) âœ… COMPLETED

- [x] Basic project structure
- [x] Authentication system (register/login)
- [x] Database setup dengan Supabase
- [x] Basic API endpoints

### Phase 2: Core Features (Week 3-4) âœ… COMPLETED

- [x] CRUD operations untuk labs
- [x] JWT middleware
- [x] Frontend integration
- [x] Basic error handling

### Phase 3: Enhancement (Week 5-6) ðŸ”„ CURRENT

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Postman collection dengan tests
- [ ] Code refactoring dan optimization
- [ ] UI/UX improvements

### Phase 4: Quality Assurance (Week 7-8) ðŸ“‹ PLANNED

- [ ] Comprehensive testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation completion

### Phase 5: Deployment & Maintenance (Week 9+) ðŸ“‹ PLANNED

- [ ] Production deployment
- [ ] Monitoring setup
- [ ] User feedback collection
- [ ] Iterative improvements

---

## 11. Success Criteria

### 11.1 MVP (Minimum Viable Product)

- [x] User dapat register dan login
- [x] User dapat CRUD buku setelah login
- [x] API endpoints working dengan proper authentication
- [x] Basic frontend interface

### 11.2 Enhanced Version

- [ ] Comprehensive API documentation
- [ ] Automated testing suite
- [ ] Enhanced UI/UX
- [ ] Performance optimization
- [ ] Security hardening

### 11.3 Future Enhancements

- [ ] lab categories dan tags
- [ ] Reading progress tracking
- [ ] lab recommendations
- [ ] Export/import functionality
- [ ] Social features (sharing, reviews)

---

## 12. Appendices

### 12.1 Glossary

- **JWT**: JSON Web Token untuk authentication
- **CRUD**: Create, Read, Update, Delete operations
- **API**: Application Programming Interface
- **CORS**: Cross-Origin Resource Sharing
- **ORM**: Object-Relational Mapping

### 12.2 References

- [Express.js Documentation](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [Supabase Documentation](https://supabase.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### 12.3 Document History

| Version | Date | Changes              | Author             |
| ------- | ---- | -------------------- | ------------------ |
| 1.0     | 2024 | Initial PRD creation | Hendri Christianto |

---

**Document Status**: Active Development
**Next Review Date**: Weekly during development phase
**Stakeholders**: Development Team, Product Owner
