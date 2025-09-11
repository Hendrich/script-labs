// server.js - Enhanced with security and middleware improvements
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");

// Import configuration and middleware
const config = require("./config/config");
const { errorHandler } = require("./middlewares/errorHandler");
const { requestLogger, statsLogger } = require("./middlewares/logger");
// Removed global rate limiter; now applied only to specific auth endpoints
const { sanitize } = require("./middlewares/validation");
// CSRF middleware removed (using stateless/JWT approach + SameSite + Origin checks)

// CSRF protection removed (csurf deprecated & introduced vulnerable transitive dependency).
// Rely on: SameSite=strict cookies, Origin/Referer validation (to be added), and JWT/Supabase flows.

// Import routes
const labRoutes = require("./routes/labRoutes");
const authRoutes = require("./routes/authRoutes");

// Load OpenAPI specification with fallback
let openApiSpec;
try {
  // Try multiple possible paths for openapi-spec.json
  const possiblePaths = [
    path.join(__dirname, "../openapi-spec.json"), // ./openapi-spec.json
    path.join(__dirname, "../../openapi-spec.json"), // ../openapi-spec.json
    path.join(process.cwd(), "openapi-spec.json"), // root/openapi-spec.json
    path.join(__dirname, "../docs/api/openapi-spec.json"), // docs/api/openapi-spec.json
  ];

  let specPath = null;
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      specPath = tryPath;
      break;
    }
  }

  if (specPath) {
    openApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  } else {
    // Fallback minimal spec for tests
    openApiSpec = {
      openapi: "3.0.0",
      info: { title: "Script Labs API", version: "2.0.0" },
      paths: {},
    };
  }
} catch (error) {
  console.warn(
    "Warning: Could not load OpenAPI spec, using fallback:",
    error.message
  );
  // Minimal fallback spec
  openApiSpec = {
    openapi: "3.0.0",
    info: { title: "Script Labs API", version: "2.0.0" },
    paths: {},
  };
}

const app = express();
// Trust first proxy (Render / reverse proxy) so secure cookies & protocol detection work
app.set("trust proxy", 1);
const PORT = config.port;

// Session middleware removed: application is fully stateless (JWT in Authorization header).

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
// Strengthened CSP & security headers (no unsafe-inline). If inline scripts needed, migrate to nonce approach later.
app.use((req, res, next) => {
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https://*.supabase.co"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginEmbedderPolicy: false,
  })(req, res, next);
});

// =============================================================================
// GENERAL MIDDLEWARE
// =============================================================================

// Request logging (only in development and production, not in test)
if (config.nodeEnv !== "test") {
  app.use(requestLogger);
  app.use(statsLogger);
}

// Logging setiap request ke semua API
app.use((req, res, next) => {
  // Log hanya untuk endpoint API
  if (req.path.startsWith("/api/")) {
    console.log(
      `[API REQUEST] ${req.method} ${req.path} - IP: ${
        req.headers["x-forwarded-for"] || req.ip
      } - ${new Date().toISOString()}`
    );
  }
  next();
});

// Global rate limiter removed; scoped limiter now only inside authRoutes for /login & /register.

// Body parsing
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Removed verbose request body debug logging to prevent leaking sensitive info.

// Input sanitization
app.use(sanitize);

// CORS configuration (no CSRF header needed anymore)
app.use(
  cors({
    ...config.cors,
  })
);

// Strict Origin/Referer enforcement for state-changing requests (extra CSRF hardening)
app.use((req, res, next) => {
  const stateChanging = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChanging.includes(req.method)) return next();

  // Allow only configured origins
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowed = new Set();
  // Build allowed origins from CORS config (if function, replicate logic partially)
  const customAllowed = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean);
  customAllowed.forEach((o) => allowed.add(o));

  const check = (val) =>
    val ? [...allowed].some((a) => val.startsWith(a)) : true; // allow requests with no origin (e.g., curl)

  if (!check(origin) || !check(referer)) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Origin/Referer not allowed",
        code: "CSRF_ORIGIN_REFERER",
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
});

// CSRF token route removed. State-changing protection relies on auth + SameSite cookie + Origin/Referer check.

// =============================================================================
// API ROUTES
// =============================================================================

// Swagger UI Documentation
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
  `,
  customSiteTitle: "Script Labs API Documentation",
  customfavIcon: "/favicon.ico",
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, swaggerOptions)
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    nodeEnv: config.nodeEnv,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/labs", labRoutes);

// API stats endpoint (only in development)
if (config.nodeEnv === "development") {
  const { getApiStats } = require("./middlewares/logger");
  app.get("/api/stats", (req, res) => {
    res.json({
      success: true,
      data: getApiStats(),
      timestamp: new Date().toISOString(),
    });
  });
}

// =============================================================================
// STATIC FILES & FRONTEND
// =============================================================================

// ...frontend static serving removed. Only API endpoints are served.

// Catch-all handler for non-existent API endpoints
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({
      success: false,
      error: {
        message: "API endpoint not found",
        code: "ENDPOINT_NOT_FOUND",
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    // Return a simple text response for non-API routes to avoid frontend misinterpreting HTML as JSON
    res
      .status(404)
      .type("text")
      .send(
        "The page cannot be found on backend. Frontend is served from Vercel."
      );
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handling middleware (must be last)
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Only start server if not being required by tests
if (require.main === module) {
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`🚀 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);

    if (config.nodeEnv === "development") {
      console.log(`📊 API Stats: http://localhost:${PORT}/api/stats`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
    }
  });

  // Graceful shutdown handling
  process.on("SIGTERM", () => {
    console.log("🛑 SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("🛑 SIGINT signal received: closing HTTP server");
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });
  });
}

module.exports = app;
