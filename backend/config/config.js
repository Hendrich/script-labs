require("dotenv").config();

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
        "http://localhost:5173", // <--- tambahkan ini!
        //"https://lab-catalog-app-z8p8.onrender.com",
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

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs:
      process.env.NODE_ENV === "development" ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 min in prod
    maxRequests: process.env.NODE_ENV === "development" ? 200 : 100, // 200 in dev, 100 in prod
    maxAuthRequests: process.env.NODE_ENV === "development" ? 50 : 5, // 50 in dev, 5 in prod
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("âŒ Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error(
    "\nPlease check your .env file and ensure all required variables are set."
  );
  process.exit(1);
}

module.exports = config;
