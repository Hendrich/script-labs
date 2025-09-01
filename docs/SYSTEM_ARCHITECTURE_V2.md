# ðŸ—ï¸ Script Labs App - System Architecture V2.0

## ðŸ“‹ Document Information

- **Version**: 2.0
- **Date**: July 29, 2025
- **Status**: Enhanced Architecture
- **Related**: [PRD V2.0](./PRD_Script_Labs_V2.md)

---

## ðŸŽ¯ Architecture Overview

Script Labs App V2 implements a modern, scalable architecture with Supabase integration, enhanced search capabilities, and comprehensive security features.

### ðŸ”„ High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend UI]
        PWA[Progressive Web App]
    end

    subgraph "API Gateway"
        LB[Load Balancer]
        CORS[CORS Handler]
        AUTH[Auth Middleware]
        RATE[Rate Limiter]
    end

    subgraph "Application Layer"
        API[Express.js API]
        SEARCH[Search Service]
        EMAIL[Email Service]
        VALID[Validation Layer]
    end

    subgraph "Data Layer"
        SUPABASE[(Supabase PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end

    subgraph "External Services"
        TELEGRAM[Telegram Bot]
        MONITOR[Monitoring]
        LOGS[Logging Service]
    end

    FE --> LB
    PWA --> LB
    LB --> CORS
    CORS --> AUTH
    AUTH --> RATE
    RATE --> API

    API --> SEARCH
    API --> EMAIL
    API --> VALID

    SEARCH --> SUPABASE
    EMAIL --> SUPABASE
    VALID --> REDIS

    API --> TELEGRAM
    API --> MONITOR
    API --> LOGS

    SUPABASE --> FILES
```

---

## ðŸ›ï¸ Layered Architecture

### 1. **Presentation Layer**

```
ðŸ“± Frontend (Client)
â”œâ”€â”€ HTML5/CSS3/JavaScript
â”œâ”€â”€ Responsive Design
â”œâ”€â”€ Progressive Web App Features
â””â”€â”€ Real-time Updates (Future)
```

### 2. **API Gateway Layer**

```
ðŸšª Gateway Services
â”œâ”€â”€ Load Balancing
â”œâ”€â”€ CORS Configuration
â”œâ”€â”€ Authentication Middleware
â”œâ”€â”€ Rate Limiting
â”œâ”€â”€ Request Validation
â””â”€â”€ Security Headers
```

### 3. **Business Logic Layer**

```
âš™ï¸ Application Services
â”œâ”€â”€ lab Management Service
â”œâ”€â”€ Search & Filter Service
â”œâ”€â”€ Authentication Service
â”œâ”€â”€ Password Reset Service
â”œâ”€â”€ Email Service
â”œâ”€â”€ Telegram Notification Service
â””â”€â”€ Validation Service
```

### 4. **Data Access Layer**

```
ðŸ“Š Data Services
â”œâ”€â”€ Supabase Client
â”œâ”€â”€ Query Optimization
â”œâ”€â”€ Connection Pooling
â”œâ”€â”€ Cache Management
â”œâ”€â”€ Transaction Handling
â””â”€â”€ Migration Scripts
```

### 5. **Infrastructure Layer**

```
ðŸ”§ Infrastructure
â”œâ”€â”€ Supabase Database
â”œâ”€â”€ Redis Cache
â”œâ”€â”€ File Storage
â”œâ”€â”€ CI/CD Pipeline
â”œâ”€â”€ Monitoring & Logging
â””â”€â”€ Backup Systems
```

---

## ðŸ” Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant SUPA as Supabase Auth
    participant DB as Database

    C->>API: Login Request
    API->>SUPA: Validate Credentials
    SUPA->>API: Auth Token
    API->>C: JWT + Supabase Token

    C->>API: API Request + JWT
    API->>API: Validate JWT
    API->>SUPA: Check Permissions
    SUPA->>API: User Context
    API->>DB: Authorized Query
    DB->>API: Data Response
    API->>C: Filtered Response
```

### Security Layers

```
ðŸ›¡ï¸ Security Stack
â”œâ”€â”€ Frontend Security
â”‚   â”œâ”€â”€ Input Sanitization
â”‚   â”œâ”€â”€ XSS Protection
â”‚   â””â”€â”€ CSRF Tokens
â”œâ”€â”€ API Security
â”‚   â”œâ”€â”€ JWT Validation
â”‚   â”œâ”€â”€ Rate Limiting
â”‚   â”œâ”€â”€ Request Validation
â”‚   â””â”€â”€ HTTPS Enforcement
â”œâ”€â”€ Database Security
â”‚   â”œâ”€â”€ Row Level Security (RLS)
â”‚   â”œâ”€â”€ SQL Injection Prevention
â”‚   â”œâ”€â”€ Encrypted Connections
â”‚   â””â”€â”€ Audit Logging
â””â”€â”€ Infrastructure Security
    â”œâ”€â”€ Environment Variables
    â”œâ”€â”€ Secret Management
    â”œâ”€â”€ Network Security
    â””â”€â”€ Access Controls
```

---

## ðŸ“Š Data Architecture

### Database Schema Design

```sql
-- Core Entities Relationship
Users (Supabase Auth) 1---* labs
Users (Supabase Auth) 1---* PasswordResetTokens
Users (Supabase Auth) 1---* UserSessions
```

### Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Sources"
        USER[User Input]
        FILE[File Uploads]
        EXT[External APIs]
    end

    subgraph "Data Processing"
        VALID[Validation]
        TRANSFORM[Transformation]
        CACHE[Caching]
    end

    subgraph "Data Storage"
        PRIMARY[(Primary DB)]
        BACKUP[(Backup DB)]
        SEARCH[(Search Index)]
    end

    USER --> VALID
    FILE --> VALID
    EXT --> VALID

    VALID --> TRANSFORM
    TRANSFORM --> CACHE
    CACHE --> PRIMARY

    PRIMARY --> BACKUP
    PRIMARY --> SEARCH
```

### Caching Strategy

```
ðŸ“‹ Cache Layers
â”œâ”€â”€ Browser Cache (Static Assets)
â”œâ”€â”€ CDN Cache (Global Distribution)
â”œâ”€â”€ Application Cache (API Responses)
â”œâ”€â”€ Database Cache (Query Results)
â””â”€â”€ Session Cache (User Data)
```

---

## ðŸ” Search Architecture

### Search System Design

```mermaid
graph TB
    subgraph "Search Interface"
        QUERY[Search Query]
        FILTERS[Filters & Sorting]
        PAGINATION[Pagination]
    end

    subgraph "Search Processing"
        PARSER[Query Parser]
        OPTIMIZER[Query Optimizer]
        EXECUTOR[Search Executor]
    end

    subgraph "Search Backend"
        POSTGRES[PostgreSQL FTS]
        INDEXES[Search Indexes]
        CACHE[Result Cache]
    end

    QUERY --> PARSER
    FILTERS --> PARSER
    PAGINATION --> PARSER

    PARSER --> OPTIMIZER
    OPTIMIZER --> EXECUTOR

    EXECUTOR --> POSTGRES
    EXECUTOR --> INDEXES
    EXECUTOR --> CACHE
```

### Search Performance Optimization

```
ðŸš€ Search Optimizations
â”œâ”€â”€ Database Indexes
â”‚   â”œâ”€â”€ Title B-tree Index
â”‚   â”œâ”€â”€ Author B-tree Index
â”‚   â”œâ”€â”€ Full-text Search Index
â”‚   â””â”€â”€ Composite Indexes
â”œâ”€â”€ Query Optimization
â”‚   â”œâ”€â”€ Query Planning
â”‚   â”œâ”€â”€ Result Caching
â”‚   â”œâ”€â”€ Pagination Optimization
â”‚   â””â”€â”€ Filter Preprocessing
â””â”€â”€ Performance Monitoring
    â”œâ”€â”€ Query Execution Time
    â”œâ”€â”€ Index Usage Statistics
    â”œâ”€â”€ Cache Hit Ratios
    â””â”€â”€ Resource Utilization
```

---

## ðŸ“§ Email Architecture

### Email Service Integration

```mermaid
graph LR
    subgraph "Email Triggers"
        FORGOT[Password Reset]
        WELCOME[Welcome Email]
        NOTIFY[Notifications]
    end

    subgraph "Email Processing"
        QUEUE[Email Queue]
        TEMPLATE[Template Engine]
        DELIVERY[Delivery Service]
    end

    subgraph "Email Providers"
        SUPABASE[Supabase Email]
        SENDGRID[SendGrid]
        FALLBACK[Fallback Service]
    end

    FORGOT --> QUEUE
    WELCOME --> QUEUE
    NOTIFY --> QUEUE

    QUEUE --> TEMPLATE
    TEMPLATE --> DELIVERY

    DELIVERY --> SUPABASE
    DELIVERY --> SENDGRID
    DELIVERY --> FALLBACK
```

### Email Security & Compliance

```
ðŸ“§ Email Security
â”œâ”€â”€ Authentication
â”‚   â”œâ”€â”€ SPF Records
â”‚   â”œâ”€â”€ DKIM Signing
â”‚   â””â”€â”€ DMARC Policy
â”œâ”€â”€ Content Security
â”‚   â”œâ”€â”€ Template Validation
â”‚   â”œâ”€â”€ Link Security
â”‚   â””â”€â”€ Attachment Scanning
â””â”€â”€ Delivery Monitoring
    â”œâ”€â”€ Bounce Handling
    â”œâ”€â”€ Complaint Processing
    â”œâ”€â”€ Delivery Tracking
    â””â”€â”€ Analytics
```

---

## ðŸ¤– Telegram Integration Architecture

### Bot Architecture

```mermaid
graph TB
    subgraph "Triggers"
        TEST[Test Completion]
        CI[CI/CD Events]
        MANUAL[Manual Triggers]
    end

    subgraph "Processing"
        PARSER[Data Parser]
        FORMAT[Message Formatter]
        VALIDATE[Data Validator]
    end

    subgraph "Delivery"
        BOT[Telegram Bot API]
        CHANNEL[Channel/Group]
        FALLBACK[Fallback Notification]
    end

    TEST --> PARSER
    CI --> PARSER
    MANUAL --> PARSER

    PARSER --> FORMAT
    FORMAT --> VALIDATE
    VALIDATE --> BOT

    BOT --> CHANNEL
    BOT --> FALLBACK
```

---

## ðŸ”„ Migration Architecture

### Database Migration Strategy

```mermaid
graph TB
    subgraph "Source"
        OLD_DB[(Old PostgreSQL)]
        OLD_DATA[Existing Data]
        OLD_SCHEMA[Old Schema]
    end

    subgraph "Migration Process"
        EXTRACT[Data Extraction]
        TRANSFORM[Data Transformation]
        VALIDATE[Data Validation]
        LOAD[Data Loading]
    end

    subgraph "Target"
        SUPABASE[(Supabase)]
        NEW_SCHEMA[Enhanced Schema]
        NEW_FEATURES[New Features]
    end

    OLD_DB --> EXTRACT
    OLD_DATA --> EXTRACT
    OLD_SCHEMA --> EXTRACT

    EXTRACT --> TRANSFORM
    TRANSFORM --> VALIDATE
    VALIDATE --> LOAD

    LOAD --> SUPABASE
    LOAD --> NEW_SCHEMA
    LOAD --> NEW_FEATURES
```

### Migration Phases

```
ðŸ”„ Migration Strategy
â”œâ”€â”€ Phase 1: Infrastructure Setup
â”‚   â”œâ”€â”€ Supabase Project Creation
â”‚   â”œâ”€â”€ Authentication Configuration
â”‚   â”œâ”€â”€ Database Schema Setup
â”‚   â””â”€â”€ Security Policies
â”œâ”€â”€ Phase 2: Parallel Development
â”‚   â”œâ”€â”€ API Endpoint Updates
â”‚   â”œâ”€â”€ Database Client Changes
â”‚   â”œâ”€â”€ Feature Flag Implementation
â”‚   â””â”€â”€ Testing Environment
â”œâ”€â”€ Phase 3: Data Migration
â”‚   â”œâ”€â”€ Data Export Scripts
â”‚   â”œâ”€â”€ Data Transformation
â”‚   â”œâ”€â”€ Data Validation
â”‚   â””â”€â”€ Data Import
â””â”€â”€ Phase 4: Cutover
    â”œâ”€â”€ DNS Updates
    â”œâ”€â”€ Database Switching
    â”œâ”€â”€ Monitoring & Alerts
    â””â”€â”€ Rollback Procedures
```

---

## ðŸ“ˆ Performance Architecture

### Performance Monitoring

```mermaid
graph TB
    subgraph "Metrics Collection"
        APM[Application Performance]
        DB_METRICS[Database Metrics]
        SERVER_METRICS[Server Metrics]
    end

    subgraph "Processing"
        AGGREGATION[Data Aggregation]
        ANALYSIS[Performance Analysis]
        ALERTING[Alert Processing]
    end

    subgraph "Visualization"
        DASHBOARD[Performance Dashboard]
        REPORTS[Performance Reports]
        NOTIFICATIONS[Alert Notifications]
    end

    APM --> AGGREGATION
    DB_METRICS --> AGGREGATION
    SERVER_METRICS --> AGGREGATION

    AGGREGATION --> ANALYSIS
    ANALYSIS --> ALERTING

    ALERTING --> DASHBOARD
    ALERTING --> REPORTS
    ALERTING --> NOTIFICATIONS
```

### Performance Targets

```
ðŸŽ¯ Performance Benchmarks
â”œâ”€â”€ API Response Times
â”‚   â”œâ”€â”€ lab CRUD: < 200ms
â”‚   â”œâ”€â”€ Search Queries: < 300ms
â”‚   â”œâ”€â”€ Authentication: < 100ms
â”‚   â””â”€â”€ File Uploads: < 2s
â”œâ”€â”€ Database Performance
â”‚   â”œâ”€â”€ Query Execution: < 50ms
â”‚   â”œâ”€â”€ Connection Pool: 95% efficiency
â”‚   â”œâ”€â”€ Index Usage: > 90%
â”‚   â””â”€â”€ Cache Hit Rate: > 80%
â””â”€â”€ System Resources
    â”œâ”€â”€ CPU Usage: < 70%
    â”œâ”€â”€ Memory Usage: < 80%
    â”œâ”€â”€ Disk I/O: < 60%
    â””â”€â”€ Network Latency: < 50ms
```

---

## ðŸ› ï¸ Deployment Architecture

### CI/CD Pipeline

```mermaid
graph LR
    subgraph "Source Control"
        GIT[Git Repository]
        BRANCH[Feature Branches]
        PR[Pull Requests]
    end

    subgraph "CI Pipeline"
        BUILD[Build]
        TEST[Testing]
        LINT[Code Quality]
        SECURITY[Security Scan]
    end

    subgraph "CD Pipeline"
        STAGING[Staging Deploy]
        PROD[Production Deploy]
        ROLLBACK[Rollback]
    end

    GIT --> BUILD
    BRANCH --> BUILD
    PR --> BUILD

    BUILD --> TEST
    TEST --> LINT
    LINT --> SECURITY

    SECURITY --> STAGING
    STAGING --> PROD
    PROD --> ROLLBACK
```

### Environment Architecture

```
ðŸŒ Environment Strategy
â”œâ”€â”€ Development
â”‚   â”œâ”€â”€ Local Database
â”‚   â”œâ”€â”€ Mock Services
â”‚   â”œâ”€â”€ Development Secrets
â”‚   â””â”€â”€ Debug Logging
â”œâ”€â”€ Staging
â”‚   â”œâ”€â”€ Supabase Staging
â”‚   â”œâ”€â”€ Production-like Data
â”‚   â”œâ”€â”€ Performance Testing
â”‚   â””â”€â”€ Integration Testing
â””â”€â”€ Production
    â”œâ”€â”€ Supabase Production
    â”œâ”€â”€ High Availability
    â”œâ”€â”€ Monitoring & Alerts
    â””â”€â”€ Backup & Recovery
```

---

## ðŸ“‹ Technology Stack

### Frontend Stack

```
ðŸŽ¨ Frontend Technologies
â”œâ”€â”€ Core Technologies
â”‚   â”œâ”€â”€ HTML5 (Semantic markup)
â”‚   â”œâ”€â”€ CSS3 (Modern styling)
â”‚   â””â”€â”€ Vanilla JavaScript (ES6+)
â”œâ”€â”€ Build Tools
â”‚   â”œâ”€â”€ Webpack (Future consideration)
â”‚   â”œâ”€â”€ Babel (Future consideration)
â”‚   â””â”€â”€ PostCSS (Future consideration)
â””â”€â”€ Testing
    â”œâ”€â”€ Jest (Unit testing)
    â”œâ”€â”€ Cypress (E2E testing)
    â””â”€â”€ Testing Library (Component testing)
```

### Backend Stack

```
âš™ï¸ Backend Technologies
â”œâ”€â”€ Runtime & Framework
â”‚   â”œâ”€â”€ Node.js (v18+)
â”‚   â”œâ”€â”€ Express.js (Web framework)
â”‚   â””â”€â”€ Middleware Stack
â”œâ”€â”€ Database & Storage
â”‚   â”œâ”€â”€ Supabase PostgreSQL
â”‚   â”œâ”€â”€ Redis (Caching)
â”‚   â””â”€â”€ File Storage (Future)
â”œâ”€â”€ Authentication
â”‚   â”œâ”€â”€ Supabase Auth
â”‚   â”œâ”€â”€ JWT Tokens
â”‚   â””â”€â”€ bcryptjs (Password hashing)
â””â”€â”€ Communication
    â”œâ”€â”€ REST APIs
    â”œâ”€â”€ Telegram Bot API
    â””â”€â”€ Email Services
```

### DevOps Stack

```
ðŸ”§ DevOps Technologies
â”œâ”€â”€ Version Control
â”‚   â”œâ”€â”€ Git
â”‚   â””â”€â”€ GitHub
â”œâ”€â”€ CI/CD
â”‚   â”œâ”€â”€ GitHub Actions
â”‚   â”œâ”€â”€ Docker (Future)
â”‚   â””â”€â”€ Container Registry
â”œâ”€â”€ Monitoring
â”‚   â”œâ”€â”€ Application Monitoring
â”‚   â”œâ”€â”€ Database Monitoring
â”‚   â””â”€â”€ Infrastructure Monitoring
â””â”€â”€ Security
    â”œâ”€â”€ SonarCloud (Code Quality)
    â”œâ”€â”€ Snyk (Security Scanning)
    â””â”€â”€ Environment Secrets
```

---

## ðŸ”® Future Architecture Considerations

### Scalability Enhancements

```
ðŸ“ˆ Future Scalability
â”œâ”€â”€ Microservices Architecture
â”‚   â”œâ”€â”€ lab Service
â”‚   â”œâ”€â”€ User Service
â”‚   â”œâ”€â”€ Search Service
â”‚   â””â”€â”€ Notification Service
â”œâ”€â”€ Containerization
â”‚   â”œâ”€â”€ Docker Containers
â”‚   â”œâ”€â”€ Kubernetes Orchestration
â”‚   â””â”€â”€ Service Mesh
â””â”€â”€ Performance Optimization
    â”œâ”€â”€ CDN Integration
    â”œâ”€â”€ Edge Computing
    â””â”€â”€ Advanced Caching
```

### Advanced Features

```
ðŸš€ Future Features
â”œâ”€â”€ Real-time Capabilities
â”‚   â”œâ”€â”€ WebSocket Integration
â”‚   â”œâ”€â”€ Live Updates
â”‚   â””â”€â”€ Collaborative Features
â”œâ”€â”€ AI/ML Integration
â”‚   â”œâ”€â”€ lab Recommendations
â”‚   â”œâ”€â”€ Search Enhancement
â”‚   â””â”€â”€ Content Analysis
â””â”€â”€ Mobile Applications
    â”œâ”€â”€ React Native
    â”œâ”€â”€ Progressive Web App
    â””â”€â”€ Offline Capabilities
```

---

## ðŸ“Š Architecture Metrics

### Quality Attributes

| Attribute           | Current | Target    | Measurement             |
| ------------------- | ------- | --------- | ----------------------- |
| **Availability**    | 99.0%   | 99.9%     | Uptime monitoring       |
| **Performance**     | Good    | Excellent | Response time < 300ms   |
| **Scalability**     | Limited | High      | Concurrent users: 1000+ |
| **Security**        | Good    | Excellent | Security audit score    |
| **Maintainability** | Good    | Excellent | Code complexity metrics |
| **Reliability**     | Good    | Excellent | Error rate < 0.1%       |

### Architecture Decision Records (ADRs)

1. **ADR-001**: Choose Supabase over self-hosted PostgreSQL
2. **ADR-002**: Implement hybrid authentication (Supabase + JWT)
3. **ADR-003**: Use PostgreSQL full-text search over Elasticsearch
4. **ADR-004**: Implement Telegram notifications for CI/CD
5. **ADR-005**: Choose REST API over GraphQL for simplicity

---

## ðŸŽ¯ Conclusion

The Script Labs App V2 architecture provides a solid foundation for:

- **Scalable Growth**: Supabase backend with modern stack
- **Enhanced Features**: Search, password reset, notifications
- **Security First**: Comprehensive security layers
- **Performance**: Optimized for speed and efficiency
- **Maintainability**: Clean architecture and separation of concerns

This architecture supports current requirements while providing flexibility for future enhancements and scaling needs.

---

**Document Status**: âœ… Complete  
**Last Updated**: July 29, 2025  
**Next Review**: During implementation milestones
