#  Script Labs API

A secure and production-ready Script Labs API built with Node.js, Express, PostgreSQL (Supabase), and JWT authentication.

##  Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Supabase account & project

### Installation

1. **Clone & Install**

   ```bash
   git clone <repository-url>
   cd script-labs-app
   npm install
   ```

2. **Environment Setup**

   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your Supabase credentials
   ```

3. **Database Setup**

   ```bash
   # Run the SQL schema in your Supabase SQL editor
   # File: database/schema_pg.sql (for PostgreSQL)
   # File: database/schema_my.sql (for MySQL)
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## – API Documentation

###  Interactive Documentation (Swagger UI)

```
http://localhost:3000/api-docs
```

**Swagger UI provides:**

- Interactive API testing
  cd script-labs-app
- Authentication support
- Request/response examples
- Schema validation

### ‹ Alternative Documentation

- **OpenAPI Spec**: `openapi-spec.json`
- **Swagger Guide**: `SWAGGER_UI_GUIDE.md`

## Authentication

The API uses JWT authentication via Supabase:

1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`
3. **Use Token**: Include in header: `Authorization: Bearer <token>`

##  API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Labs Management

- `GET /api/labs` - Get all user's labs
- `GET /api/labs/:id` - Get specific lab
- `POST /api/labs` - Create new lab
- `PUT /api/labs/:id` - Update lab
- `DELETE /api/labs/:id` - Delete lab

### System

- `GET /health` - Health check
- `GET /api/stats` - API statistics (dev only)

## Development

### Scripts

```bash
npm start          # Production server
npm run dev        # Development with nodemon
npm test           # Run tests
npm run lint       # Code linting
npm run lint:fix   # Fix linting issues
```

### Project Structure

```
script-labs/
 backend/
‚    server.js              # Main server file
‚    config/
‚   ‚   ” config.js          # Configuration
‚    middlewares/           # Custom middlewares
‚   ‚    authMiddleware.js
‚   ‚    errorHandler.js
‚   ‚    logger.js
‚   ‚    rateLimiter.js
‚   ‚   ” validation.js
‚    routes/                # API routes
‚   ‚    authRoutes.js
‚   ‚   ” labRoutes.js
‚   ” db.js                  # Database connection
 database/                  # Database schemas and scripts
‚    schema_pg.sql          # PostgreSQL schema
‚    schema_my.sql          # MySQL schema
‚    query.sql              # Example queries
‚   ” README.md
 docs/                      # Documentation
‚    api/                   # API documentation
‚   ‚    openapi-spec.json
‚   ‚    OPENAPI_GUIDE.md
‚   ‚    SWAGGER_INTEGRATION_COMPLETE.md
‚   ‚   ” SWAGGER_UI_GUIDE.md
‚    assignments/           # Assignment files
‚    deployment/            # Deployment guides
‚   ‚    DEPLOYMENT_GUIDE.md
‚   ‚   ” CRITICAL_DEPLOYMENT_FIX.md
‚   ” *.md                   # Other documentation
 postman/                   # Postman collections
‚    Script_Labs_API_v2.postman_collection.json
‚    Script-Labs-Environment.postman_environment.json
‚    POSTMAN_COLLECTION_GUIDE.md
‚    POSTMAN_COLLECTION_README.md
‚   ” README.md
 tests/                     # Test files
‚    test-api.js
‚   ” README.md
 scripts/                   # Utility scripts
 .env                       # Environment variables
 .env.template              # Environment template
 package.json
” README.md
```

## Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

##  Deployment

### Render.com (Recommended)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Vercel

1. Install Vercel CLI
2. Configure `vercel.json`
3. Deploy with `vercel --prod`

### Other Platforms

- Heroku
- Railway
- DigitalOcean App Platform

See `docs/deployment/DEPLOYMENT_GUIDE.md` for detailed instructions.

## ðŸ§ª Testing

### Manual Testing

1. **Start server**: `npm run dev`
2. **Open Swagger UI**: `http://localhost:3000/api-docs`
3. **Test endpoints interactively**

### Automated Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Security Features

- **Helmet**: Security headers
- **Rate Limiting**: API protection
- **CORS**: Cross-origin configuration
- **Input Validation**: Joi schema validation
- **JWT Authentication**: Secure token-based auth
- **Input Sanitization**: XSS protection

## Troubleshooting

### Common Issues & Solutions

#### **429 Too Many Requests Error**

```json
{
  "success": false,
  "error": {
    "message": "Too many operation attempts from this IP",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

**Solutions:**

1. **Wait**: Rate limits reset after the window expires
2. **Development**: Rate limits are more permissive in development mode
3. **Check Requests**: Ensure frontend doesn't send duplicate requests
4. **Network**: Clear browser cache and restart development server

#### **Validation Error (Email & Password Required)**

```json
{
  "success": false,
  "error": {
    "message": "Validation Error: Email is required, Password is required"
  }
}
```

**Solutions:**

1. **Check Frontend**: Ensure form sends `email` and `password` fields
2. **Content-Type**: Verify `Content-Type: application/json` header
3. **Data Format**: Ensure JSON data is properly formatted
4. **Network**: Check browser dev tools for request payload

#### **CORS Issues**

- **Local Development**: Ensure server runs on `http://localhost:3000`
- **Production**: Update CORS configuration in `backend/config/config.js`
- **Mixed Content**: Don't mix HTTP and HTTPS requests

#### **Connection Issues**

1. **Local Server**: Ensure `npm run dev` is running
2. **Port**: Verify server runs on correct port (3000)
3. **Firewall**: Check Windows Firewall settings
4. **Network**: Try accessing `http://localhost:3000/health` directly

### **Debug Tools**

#### **Test API Script**

```bash
# Test both local and production
node test-api.js

# Test local only
node test-api.js local

# Test production only
node test-api.js production
```

#### **Swagger UI Testing**

1. Open `http://localhost:3000/api-docs`
2. Test individual endpoints interactively
3. Use "Authorize" button for authentication
4. Check request/response in browser dev tools

#### **Manual Testing with curl**

```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### **Environment Check**

```bash
# Check if server is running
curl http://localhost:3000/health

# Check API stats (development only)
curl http://localhost:3000/api/stats

# View server logs
npm run dev
```

## ‹ TODO & Roadmap

- [ ] User roles and permissions
- [ ] Lab categories and tags
- [ ] Search and filtering
- [ ] File upload for lab covers
- [ ] API versioning
- [ ] Comprehensive test coverage

## ðŸ¤ Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## „ License

MIT License - see LICENSE file for details.

## Support

- **Author**: Hendri Christianto
- **Email**: hendri.christianto24@gmail.com
- **Documentation**: Check `SWAGGER_UI_GUIDE.md`
- **Issues**: Create GitHub issue

---

##  Documentation Files

- `SWAGGER_UI_GUIDE.md` - Swagger UI usage guide
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `OPENAPI_GUIDE.md` - OpenAPI specification guide
- `PROJECT_SUMMARY.md` - Project overview
- `IMPLEMENTATION_CHECKLIST.md` - Development checklist

---

**Happy coding! **


