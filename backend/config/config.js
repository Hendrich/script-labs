require("dotenv").config();

const isJest = Boolean(process.env.JEST_WORKER_ID);
const isTest = process.env.NODE_ENV === "test" || isJest;

// Jest imports config.js from many isolated test files. Tests should not exit the
// worker process just because production-only environment variables are absent.
// Production and normal development still validate required env values strictly.
if (isTest) {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://test_user:test_password@localhost:5432/scriptlabs_test_db";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
}

const config = {
  // Server Configuration
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production",
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  // CORS Configuration
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        if (process.env.NODE_ENV !== "test") {
          console.log("CORS blocked origin:", origin);
        }
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs:
      process.env.NODE_ENV === "development" ? 60 * 1000 : 15 * 60 * 1000,
    maxRequests: process.env.NODE_ENV === "development" ? 200 : 100,
    maxAuthRequests: process.env.NODE_ENV === "development" ? 50 : 5,
  },
};

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error(
    "\nPlease check your .env file and ensure all required variables are set."
  );
  process.exit(1);
}

module.exports = config;
