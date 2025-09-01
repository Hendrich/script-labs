# ðŸš€ Script Labs App - Deployment Guide

## Enhanced Version with Security & Best Practices

### ðŸ“‹ Overview

Panduan lengkap untuk deploy Script Labs App yang telah ditingkatkan dengan security middleware, error handling, validation, dan performance optimization.

---

## ðŸ”§ Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **PostgreSQL**: >= 12.0 (via Supabase recommended)
- **Git**: untuk version control

### Required Services

- **Supabase Account**: untuk authentication dan database
- **Hosting Platform**: Render.com (recommended), Heroku, atau Vercel

---

## ðŸ“¦ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/script-labs-app.git
cd script-labs-app
```

### 2. Install Dependencies

```bash
# Install production dependencies
npm install

# For development with additional tools
npm install --include=dev
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.template .env

# Edit .env with your actual values
nano .env
```

### Required Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Frontend
FRONTEND_URL=https://your-domain.com

# CORS
CORS_ORIGINS=https://your-domain.com

# Security (optional)
ENABLE_RATE_LIMITING=true
ENABLE_REQUEST_LOGGING=true
ENABLE_SECURITY_HEADERS=true
```

---

## ðŸŽ¯ Development Setup

### 1. Database Setup (Supabase)

1. Create new Supabase project
2. Run database migration:

```sql
-- labs table
CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own labs" ON labs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own labs" ON labs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labs" ON labs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own labs" ON labs
  FOR DELETE USING (auth.uid() = user_id);
```

### 2. Start Development Server

```bash
# Start with nodemon (auto-restart)
npm run dev

# Or start normally
npm start
```

### 3. Verify Installation

- **Health Check**: http://localhost:3000/health
- **API Stats**: http://localhost:3000/api/stats (development only)
- **Frontend**: http://localhost:3000

---

## ðŸŒ Production Deployment

### Option 1: Render.com (Recommended)

#### 1. Prepare Repository

```bash
# Ensure .render.yaml is present and configured
cat .render.yaml
```

#### 2. Deploy to Render

1. Connect GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically on git push

#### 3. Configure Environment Variables in Render

```
PORT=3000
NODE_ENV=production
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_production_jwt_secret
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
FRONTEND_URL=https://your-app-name.onrender.com
CORS_ORIGINS=https://your-app-name.onrender.com
ENABLE_RATE_LIMITING=true
ENABLE_REQUEST_LOGGING=false
ENABLE_SECURITY_HEADERS=true
```

### Option 2: Heroku

#### 1. Install Heroku CLI

```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your_database_url
heroku config:set JWT_SECRET=your_jwt_secret
# ... add all other env vars

# Deploy
git push heroku main
```

### Option 3: Vercel (Frontend + Serverless Functions)

#### 1. Install Vercel CLI

```bash
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

---

## ðŸ”’ Security Checklist

### Pre-Deployment Security

- [ ] All environment variables set properly
- [ ] JWT_SECRET is strong and unique (64+ characters)
- [ ] Database credentials are secure
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled for production
- [ ] Security headers are enabled

### Post-Deployment Verification

```bash
# Test health endpoint
curl https://your-app.com/health

# Test rate limiting
for i in {1..10}; do curl https://your-app.com/api/labs; done

# Check security headers
curl -I https://your-app.com
```

---

## ðŸ“Š Monitoring & Maintenance

### Health Monitoring

```bash
# Set up periodic health checks
curl https://your-app.com/health

# Monitor API performance (if stats enabled)
curl https://your-app.com/api/stats
```

### Log Monitoring

- Check application logs in hosting platform dashboard
- Monitor error rates and response times
- Set up alerts for critical errors

### Database Maintenance

- Monitor Supabase usage and performance
- Set up automated backups
- Review and optimize queries periodically

---

## ðŸ› Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading

```bash
# Check if .env file exists and is properly formatted
cat .env

# Verify environment variables are set
node -e "console.log(process.env.DATABASE_URL)"
```

#### 2. Database Connection Issues

```bash
# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
```

#### 3. CORS Issues

- Verify FRONTEND_URL and CORS_ORIGINS are correctly set
- Check browser developer tools for CORS errors
- Ensure Supabase CORS settings are configured

#### 4. Rate Limiting Issues

```bash
# Temporarily disable rate limiting for testing
# Set ENABLE_RATE_LIMITING=false in environment
```

### Performance Issues

- Enable request logging to identify slow endpoints
- Monitor API stats endpoint in development
- Use browser developer tools to check frontend performance

---

## ðŸ“ˆ Performance Optimization

### Backend Optimizations

- Enable connection pooling for database
- Implement response caching for static data
- Optimize database queries with indexes
- Use compression middleware

### Frontend Optimizations

- Minimize HTTP requests
- Implement lazy loading for images
- Use service workers for caching
- Optimize bundle size

---

## ðŸ”„ Continuous Integration/Deployment

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test
      - name: Deploy to Render
        # Add Render deployment step
```

### Pre-deployment Checks

```bash
# Run tests (when implemented)
npm test

# Lint code
npm run lint

# Security audit
npm audit

# Check for outdated dependencies
npm outdated
```

---

## ðŸ“š API Documentation

### Endpoints Overview

- **Health**: `GET /health`
- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`
- **labs**: `GET|POST|PUT|DELETE /api/labs`
- **Stats**: `GET /api/stats` (dev only)

### Authentication

All protected endpoints require:

```
Authorization: Bearer <supabase_access_token>
```

### Error Handling

Standardized error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## ðŸ“ž Support & Maintenance

### Regular Maintenance Tasks

- [ ] Update dependencies monthly
- [ ] Review security vulnerabilities
- [ ] Monitor application performance
- [ ] Backup database regularly
- [ ] Review and rotate JWT secrets

### Getting Help

- Check application logs first
- Use health endpoint to verify system status
- Review this documentation
- Check API documentation for endpoint details

---

**Last Updated**: 2024
**Version**: Enhanced v1.0
**Support**: Check GitHub issues for common problems
