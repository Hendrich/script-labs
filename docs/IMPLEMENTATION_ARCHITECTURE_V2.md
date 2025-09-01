# ðŸš€ Script Labs App - Implementation Architecture V2.0

## ðŸ“‹ Document Information

- **Version**: 2.0
- **Date**: July 29, 2025
- **Status**: Implementation Guide
- **Related**: [PRD V2.0](./PRD_Script_Labs_V2.md), [System Architecture](./SYSTEM_ARCHITECTURE.md)

---

## ðŸŽ¯ Implementation Overview

This document provides detailed implementation guidelines for Script Labs App V2, including code examples, configuration setups, and deployment strategies for the enhanced features.

---

## ðŸ”„ Phase 1: Supabase Migration Implementation

### 1.1 Supabase Project Setup

#### **Step 1: Create Supabase Project**

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Initialize project
supabase init script-labs-v2

# Link to remote project
supabase link --project-ref your-project-ref
```

#### **Step 2: Environment Configuration**

```javascript
// config/supabase.config.js
const { createClient } = require("@supabase/supabase-js");

const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
};

// Client for frontend operations
const supabaseClient = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  supabaseConfig.options
);

// Admin client for backend operations
const supabaseAdmin = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceKey
);

module.exports = {
  supabaseClient,
  supabaseAdmin,
  supabaseConfig,
};
```

#### **Step 3: Database Schema Implementation**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enhanced labs table
CREATE TABLE public.labs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300) NOT NULL,
  category VARCHAR(100),
  publication_year INTEGER,
  isbn VARCHAR(20),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  reading_status VARCHAR(20) CHECK (reading_status IN ('to_read', 'reading', 'read')),
  notes TEXT,
  cover_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_labs_user_id ON public.labs(user_id);
CREATE INDEX idx_labs_title ON public.labs USING GIN (to_tsvector('english', title));
CREATE INDEX idx_labs_author ON public.labs USING GIN (to_tsvector('english', author));
CREATE INDEX idx_labs_title_author ON public.labs USING GIN (to_tsvector('english', title || ' ' || author));
CREATE INDEX idx_labs_category ON public.labs(category);
CREATE INDEX idx_labs_status ON public.labs(reading_status);
CREATE INDEX idx_labs_created_at ON public.labs(created_at DESC);

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Row Level Security (RLS)
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for labs
CREATE POLICY "Users can view their own labs" ON public.labs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own labs" ON public.labs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labs" ON public.labs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labs" ON public.labs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for password reset tokens
CREATE POLICY "Users can view their own reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage reset tokens" ON public.password_reset_tokens
  FOR ALL USING (true);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_labs_updated_at
  BEFORE UPDATE ON public.labs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Database Connection Implementation

```javascript
// backend/db.js - Enhanced with Supabase
const { supabaseAdmin, supabaseClient } = require("../config/supabase.config");
const { Pool } = require("pg");

class DatabaseService {
  constructor() {
    this.supabase = supabaseAdmin;
    this.client = supabaseClient;

    // Fallback PostgreSQL connection
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from("labs")
        .select("count", { count: "exact", head: true });

      if (error) throw error;

      console.log("âœ… Supabase connection successful");
      return true;
    } catch (error) {
      console.error("âŒ Supabase connection failed:", error.message);
      return false;
    }
  }

  // Get user labs with search
  async getUserLabs(userId, searchParams = {}) {
    try {
      let query = this.supabase.from("labs").select("*").eq("user_id", userId);

      // Add search functionality
      if (searchParams.q) {
        query = query.or(
          `title.ilike.%${searchParams.q}%,author.ilike.%${searchParams.q}%`
        );
      }

      if (searchParams.category) {
        query = query.eq("category", searchParams.category);
      }

      if (searchParams.reading_status) {
        query = query.eq("reading_status", searchParams.reading_status);
      }

      // Sorting
      const sortBy = searchParams.sort_by || "created_at";
      const sortOrder =
        searchParams.sort_order === "asc"
          ? { ascending: true }
          : { ascending: false };
      query = query.order(sortBy, sortOrder);

      // Pagination
      const page = parseInt(searchParams.page) || 1;
      const limit = Math.min(parseInt(searchParams.limit) || 10, 50);
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        labs: data || [],
        pagination: {
          current_page: page,
          per_page: limit,
          total_results: count,
          total_pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Failed to fetch labs");
    }
  }

  // Create lab
  async createLab(labData, userId) {
    try {
      const { data, error } = await this.supabase
        .from("labs")
        .insert([{ ...labData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Create lab error:", error);
      throw new Error("Failed to create lab");
    }
  }

  // Update lab
  async updateLab(labId, labData, userId) {
    try {
      const { data, error } = await this.supabase
        .from("labs")
        .update(labData)
        .eq("id", labId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Update lab error:", error);
      throw new Error("Failed to update lab");
    }
  }

  // Delete lab
  async deleteLab(labId, userId) {
    try {
      const { error } = await this.supabase
        .from("labs")
        .delete()
        .eq("id", labId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Delete lab error:", error);
      throw new Error("Failed to delete lab");
    }
  }

  // Password reset token management
  async createPasswordResetToken(userId, token, expiresAt) {
    try {
      const { data, error } = await this.supabase
        .from("password_reset_tokens")
        .insert([
          {
            user_id: userId,
            token: token,
            expires_at: expiresAt,
            used: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Create reset token error:", error);
      throw new Error("Failed to create reset token");
    }
  }

  async validatePasswordResetToken(token) {
    try {
      const { data, error } = await this.supabase
        .from("password_reset_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) return null;
      return data;
    } catch (error) {
      console.error("Validate reset token error:", error);
      return null;
    }
  }

  async markPasswordResetTokenAsUsed(token) {
    try {
      const { error } = await this.supabase
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("token", token);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Mark token used error:", error);
      return false;
    }
  }
}

module.exports = new DatabaseService();
```

---

## ðŸ” Phase 2: Search & Filter Implementation

### 2.1 Enhanced lab Routes

```javascript
// backend/routes/labRoutes.js - Enhanced with search
const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  validatelabData,
  validateSearchParams,
} = require("../middlewares/validation");
const rateLimit = require("express-rate-limit");

// Search rate limiting
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many search requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Advanced search endpoint
router.get(
  "/search",
  authMiddleware,
  searchLimiter,
  validateSearchParams,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.user.id;
      const searchParams = {
        q: req.query.q,
        category: req.query.category,
        reading_status: req.query.reading_status,
        sort_by: req.query.sort_by || "created_at",
        sort_order: req.query.sort_order || "desc",
        page: req.query.page || 1,
        limit: req.query.limit || 10,
      };

      const result = await db.getUserLabs(userId, searchParams);
      const queryTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          labs: result.labs,
          pagination: result.pagination,
          search_query: searchParams.q || "",
          filters_applied: {
            category: searchParams.category,
            reading_status: searchParams.reading_status,
            sort_by: searchParams.sort_by,
            sort_order: searchParams.sort_order,
          },
        },
        performance: {
          query_time_ms: queryTime,
          results_count: result.labs.length,
        },
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        success: false,
        message: "Search failed",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
);

// Get all labs (with basic search)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const searchParams = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort_by: req.query.sort_by || "created_at",
      sort_order: req.query.sort_order || "desc",
    };

    const result = await db.getUserLabs(userId, searchParams);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get labs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch labs",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Create lab
router.post("/", authMiddleware, validatelabData, async (req, res) => {
  try {
    const userId = req.user.id;
    const labData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      publication_year: req.body.publication_year,
      isbn: req.body.isbn,
      rating: req.body.rating,
      reading_status: req.body.reading_status || "to_read",
      notes: req.body.notes,
      cover_url: req.body.cover_url,
    };

    const lab = await db.createLab(labData, userId);

    res.status(201).json({
      success: true,
      data: lab,
      message: "lab created successfully",
    });
  } catch (error) {
    console.error("Create lab error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create lab",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Update lab
router.put("/:id", authMiddleware, validatelabData, async (req, res) => {
  try {
    const userId = req.user.id;
    const labId = req.params.id;
    const labData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      publication_year: req.body.publication_year,
      isbn: req.body.isbn,
      rating: req.body.rating,
      reading_status: req.body.reading_status,
      notes: req.body.notes,
      cover_url: req.body.cover_url,
    };

    const lab = await db.updateLab(labId, labData, userId);

    res.json({
      success: true,
      data: lab,
      message: "lab updated successfully",
    });
  } catch (error) {
    console.error("Update lab error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lab",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Delete lab
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const labId = req.params.id;

    await db.deleteLab(labId, userId);

    res.json({
      success: true,
      message: "lab deleted successfully",
    });
  } catch (error) {
    console.error("Delete lab error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lab",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Bulk operations endpoint
router.post("/bulk", authMiddleware, async (req, res) => {
  try {
    const { action, lab_ids, data } = req.body;
    const userId = req.user.id;

    if (!action || !lab_ids || !Array.isArray(lab_ids)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bulk operation parameters",
      });
    }

    const results = [];

    switch (action) {
      case "update_status":
        for (const labId of lab_ids) {
          try {
            const lab = await db.updateLab(labId, data, userId);
            results.push({ id: labId, success: true, data: lab });
          } catch (error) {
            results.push({ id: labId, success: false, error: error.message });
          }
        }
        break;

      case "delete":
        for (const labId of lab_ids) {
          try {
            await db.deleteLab(labId, userId);
            results.push({ id: labId, success: true });
          } catch (error) {
            results.push({ id: labId, success: false, error: error.message });
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Unsupported bulk action",
        });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      data: {
        total_processed: results.length,
        successful: successCount,
        failed: failCount,
        results: results,
      },
      message: `Bulk ${action} completed: ${successCount} successful, ${failCount} failed`,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    res.status(500).json({
      success: false,
      message: "Bulk operation failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
```

### 2.2 Enhanced Validation Middleware

```javascript
// backend/middlewares/validation.js - Enhanced validation
const { body, query, validationResult } = require("express-validator");

// lab data validation
const validatelabData = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Title must be between 1 and 500 characters"),

  body("author")
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage("Author must be between 1 and 300 characters"),

  body("category")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Category must be less than 100 characters"),

  body("publication_year")
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() + 1 })
    .withMessage("Publication year must be a valid year"),

  body("isbn")
    .optional()
    .trim()
    .matches(/^(97[89])?\d{9}(\d|X)$/)
    .withMessage("ISBN must be a valid format"),

  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("reading_status")
    .optional()
    .isIn(["to_read", "reading", "read"])
    .withMessage("Reading status must be: to_read, reading, or read"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Notes must be less than 5000 characters"),

  body("cover_url")
    .optional()
    .isURL()
    .withMessage("Cover URL must be a valid URL"),

  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Search parameters validation
const validateSearchParams = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),

  query("category")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Category filter must be between 1 and 100 characters"),

  query("reading_status")
    .optional()
    .isIn(["to_read", "reading", "read"])
    .withMessage("Reading status must be: to_read, reading, or read"),

  query("sort_by")
    .optional()
    .isIn([
      "title",
      "author",
      "created_at",
      "updated_at",
      "rating",
      "publication_year",
    ])
    .withMessage(
      "Sort field must be: title, author, created_at, updated_at, rating, or publication_year"
    ),

  query("sort_order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be: asc or desc"),

  query("page")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Page must be between 1 and 1000"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid search parameters",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Password reset validation
const validateForgotPassword = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        errors: errors.array(),
      });
    }
    next();
  },
];

const validateResetPassword = [
  body("token")
    .isLength({ min: 32, max: 255 })
    .withMessage("Invalid reset token"),

  body("new_password")
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must be 8-128 characters with uppercase, lowercase, number, and special character"
    ),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Password reset validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = {
  validatelabData,
  validateSearchParams,
  validateForgotPassword,
  validateResetPassword,
};
```

---

## ðŸ” Phase 3: Forgot Password Implementation

### 3.1 Enhanced Authentication Routes

```javascript
// backend/routes/authRoutes.js - Enhanced with password reset
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { supabaseAdmin } = require("../config/supabase.config");
const db = require("../db");
const emailService = require("../services/emailService");
const {
  validateForgotPassword,
  validateResetPassword,
} = require("../middlewares/validation");

// Rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour per IP
  message: "Too many password reset attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || req.ip, // Rate limit by email
});

// Forgot password endpoint
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validateForgotPassword,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user exists (using Supabase Auth)
      const { data: user, error } =
        await supabaseAdmin.auth.admin.getUserByEmail(email);

      if (error || !user) {
        // Always return success to prevent email enumeration
        return res.json({
          success: true,
          message: "Password reset email sent if account exists",
          rate_limit: {
            remaining_attempts: 2,
            reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
        });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token in database
      await db.createPasswordResetToken(user.user.id, resetToken, expiresAt);

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail(
        email,
        resetUrl,
        user.user.user_metadata?.name || "User"
      );

      res.json({
        success: true,
        message: "Password reset email sent if account exists",
        rate_limit: {
          remaining_attempts: 2,
          reset_time: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
);

// Validate reset token endpoint
router.get("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const resetTokenData = await db.validatePasswordResetToken(token);

    if (!resetTokenData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Get user info for the response
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(
      resetTokenData.user_id
    );
    const maskedEmail = user?.user?.email
      ? user.user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
      : "u***@example.com";

    res.json({
      success: true,
      data: {
        token_valid: true,
        expires_at: resetTokenData.expires_at,
        email: maskedEmail,
      },
    });
  } catch (error) {
    console.error("Validate reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate reset token",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Reset password endpoint
router.post("/reset-password", validateResetPassword, async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Validate reset token
    const resetTokenData = await db.validatePasswordResetToken(token);

    if (!resetTokenData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update user password in Supabase Auth
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(resetTokenData.user_id, {
        password: new_password,
      });

    if (updateError) {
      throw new Error("Failed to update password");
    }

    // Mark token as used
    await db.markPasswordResetTokenAsUsed(token);

    // Send confirmation email
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(
      resetTokenData.user_id
    );
    if (user?.user?.email) {
      await emailService.sendPasswordResetConfirmation(
        user.user.email,
        user.user.user_metadata?.name || "User"
      );
    }

    res.json({
      success: true,
      message: "Password successfully updated",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Enhanced login with Supabase
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate custom JWT for API access
    const customToken = jwt.sign(
      {
        id: data.user.id,
        email: data.user.email,
        supabase_token: data.session.access_token,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
        },
        tokens: {
          access_token: customToken,
          supabase_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Enhanced register with Supabase
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Register with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // Auto-confirm for development
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
        },
      },
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
```

### 3.2 Email Service Implementation

```javascript
// backend/services/emailService.js
const nodemailer = require("nodemailer");
const { supabaseAdmin } = require("../config/supabase.config");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // Try Supabase email first, fallback to SMTP
    if (process.env.SUPABASE_EMAIL_ENABLED === "true") {
      console.log("Using Supabase email service");
      return;
    }

    // Fallback to SMTP configuration
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await this.transporter.verify();
      console.log("âœ… SMTP email service initialized");
    } catch (error) {
      console.error("âŒ SMTP email service failed:", error.message);
    }
  }

  async sendEmail(to, subject, html, text) {
    try {
      // Try Supabase email first
      if (process.env.SUPABASE_EMAIL_ENABLED === "true") {
        // Note: Supabase email API implementation
        // This would use Supabase's email service when available
        console.log(`Sending email via Supabase to: ${to}`);
        return { success: true, provider: "supabase" };
      }

      // Fallback to SMTP
      if (!this.transporter) {
        throw new Error("Email service not initialized");
      }

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`âœ… Email sent via SMTP to: ${to}`);
      return { success: true, provider: "smtp", messageId: result.messageId };
    } catch (error) {
      console.error("âŒ Email sending failed:", error.message);
      throw new Error("Failed to send email");
    }
  }

  async sendPasswordResetEmail(email, resetUrl, userName = "User") {
    const subject = "Password Reset Request - Script Labs";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>You requested a password reset for your Script Labs account. Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>For security, this link can only be used once.</p>
          </div>
          <div class="footer">
            <p>Script Labs App - Secure Password Reset</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${userName},
      
      You requested a password reset for your Script Labs account.
      
      Please use this link to reset your password: ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email.
      
      Script Labs App
    `;

    return await this.sendEmail(email, subject, html, text);
  }

  async sendPasswordResetConfirmation(email, userName = "User") {
    const subject = "Password Reset Successful - Script Labs";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your password has been successfully reset for your Script Labs account.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
            <p>For security tips:</p>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Don't share your password with anyone</li>
              <li>Log out from shared devices</li>
            </ul>
          </div>
          <div class="footer">
            <p>Script Labs App - Security Notification</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${userName},
      
      Your password has been successfully reset for your Script Labs account.
      
      If you didn't make this change, please contact support immediately.
      
      Script Labs App
    `;

    return await this.sendEmail(email, subject, html, text);
  }

  // Test email functionality
  async sendTestEmail(email) {
    const subject = "Test Email - Script Labs";
    const html =
      "<h1>Test Email</h1><p>Email service is working correctly!</p>";
    const text = "Test Email - Email service is working correctly!";

    return await this.sendEmail(email, subject, html, text);
  }
}

module.exports = new EmailService();
```

---

## ðŸ§ª Phase 4: Testing Implementation

### 4.1 Enhanced Test Configuration

```javascript
// jest.config.js - Enhanced configuration
module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "backend/**/*.js",
    "!backend/node_modules/**",
    "!backend/coverage/**",
    "!backend/logs/**",
  ],
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.spec.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
};
```

### 4.2 Test Setup and Utilities

```javascript
// tests/setup.js
const { supabaseAdmin } = require("../config/supabase.config");
const db = require("../backend/db");

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  const connected = await db.testConnection();
  if (!connected) {
    throw new Error("Failed to connect to test database");
  }

  console.log("Test database connected");
});

afterAll(async () => {
  // Cleanup connections
  console.log("Cleaning up test environment");
});

// Test utilities
global.testUtils = {
  async createTestUser(email = "test@example.com", password = "Test123!@#") {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: "Test User" },
      email_confirm: true,
    });

    if (error) throw error;
    return data.user;
  },

  async deleteTestUser(userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  },

  async createTestBook(userId, labData = {}) {
    const defaultBook = {
      title: "Test lab",
      author: "Test Author",
      category: "Fiction",
      reading_status: "to_read",
    };

    return await db.createLab({ ...defaultBook, ...labData }, userId);
  },

  generateAuthToken(user) {
    const jwt = require("jsonwebtoken");
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  },
};
```

---

## ðŸš€ Phase 5: Deployment Implementation

### 5.1 Environment Configuration

```javascript
// config/environments/production.js
module.exports = {
  database: {
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: "24h",
    passwordResetExpiry: 3600000, // 1 hour
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || "smtp",
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    searchMax: 200, // search requests per window
  },
};
```

### 5.2 Migration Scripts

```javascript
// scripts/migration/migrate-to-supabase.js
const { Pool } = require("pg");
const { supabaseAdmin } = require("../../config/supabase.config");
const fs = require("fs").promises;

class SupabaseMigration {
  constructor() {
    this.oldDb = new Pool({
      connectionString: process.env.OLD_DATABASE_URL,
    });
    this.supabase = supabaseAdmin;
  }

  async migrate() {
    console.log("ðŸš€ Starting Supabase migration...");

    try {
      // Step 1: Export users
      await this.migrateUsers();

      // Step 2: Export labs
      await this.migrateBooks();

      // Step 3: Verify data integrity
      await this.verifyMigration();

      console.log("âœ… Migration completed successfully!");
    } catch (error) {
      console.error("âŒ Migration failed:", error);
      throw error;
    }
  }

  async migrateUsers() {
    console.log("ðŸ“¤ Migrating users...");

    const users = await this.oldDb.query("SELECT * FROM users");

    for (const user of users.rows) {
      try {
        // Create user in Supabase Auth
        const { data, error } = await this.supabase.auth.admin.createUser({
          email: user.email,
          password: user.password, // Already hashed
          user_metadata: {
            name: user.name,
            migrated_at: new Date().toISOString(),
            old_id: user.id,
          },
          email_confirm: true,
        });

        if (error) {
          console.error(`Failed to migrate user ${user.email}:`, error);
          continue;
        }

        console.log(`âœ… Migrated user: ${user.email}`);
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      }
    }
  }

  async migrateBooks() {
    console.log("ðŸ“š Migrating labs...");

    // Get user mapping (old ID to new Supabase ID)
    const userMapping = await this.getUserMapping();

    const labs = await this.oldDb.query("SELECT * FROM labs");

    for (const lab of labs.rows) {
      try {
        const newUserId = userMapping[lab.user_id];
        if (!newUserId) {
          console.warn(`No user mapping found for lab ${lab.id}`);
          continue;
        }

        const { data, error } = await this.supabase.from("labs").insert([
          {
            title: lab.title,
            author: lab.author,
            category: lab.category,
            publication_year: lab.publication_year,
            isbn: lab.isbn,
            rating: lab.rating,
            reading_status: lab.reading_status,
            notes: lab.notes,
            cover_url: lab.cover_url,
            user_id: newUserId,
            created_at: lab.created_at,
            updated_at: lab.updated_at,
          },
        ]);

        if (error) {
          console.error(`Failed to migrate lab ${lab.id}:`, error);
          continue;
        }

        console.log(`âœ… Migrated lab: ${lab.title}`);
      } catch (error) {
        console.error(`Error migrating lab ${lab.id}:`, error);
      }
    }
  }

  async getUserMapping() {
    // Create mapping from old user IDs to new Supabase user IDs
    const oldUsers = await this.oldDb.query("SELECT id, email FROM users");
    const mapping = {};

    for (const oldUser of oldUsers.rows) {
      try {
        const { data } = await this.supabase.auth.admin.getUserByEmail(
          oldUser.email
        );
        if (data?.user) {
          mapping[oldUser.id] = data.user.id;
        }
      } catch (error) {
        console.error(`Failed to map user ${oldUser.email}:`, error);
      }
    }

    return mapping;
  }

  async verifyMigration() {
    console.log("ðŸ” Verifying migration...");

    // Count records in old database
    const oldUserCount = await this.oldDb.query("SELECT COUNT(*) FROM users");
    const oldBookCount = await this.oldDb.query("SELECT COUNT(*) FROM labs");

    // Count records in Supabase
    const { count: newUserCount } = await this.supabase.auth.admin.listUsers();
    const { count: newBookCount } = await this.supabase
      .from("labs")
      .select("*", { count: "exact", head: true });

    console.log("Migration Verification:");
    console.log(`Users: ${oldUserCount.rows[0].count} â†’ ${newUserCount}`);
    console.log(`labs: ${oldBookCount.rows[0].count} â†’ ${newBookCount}`);

    if (parseInt(oldUserCount.rows[0].count) !== newUserCount) {
      throw new Error("User count mismatch after migration");
    }

    if (parseInt(oldBookCount.rows[0].count) !== newBookCount) {
      throw new Error("lab count mismatch after migration");
    }

    console.log("âœ… Migration verification passed");
  }

  async rollback() {
    console.log("ðŸ”„ Rolling back migration...");

    // This would implement rollback procedures
    // For safety, we'll just log the process
    console.log("Rollback procedures would be implemented here");
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new SupabaseMigration();
  migration.migrate().catch(console.error);
}

module.exports = SupabaseMigration;
```

---

## ðŸ“‹ Implementation Checklist

### âœ… **Phase 1: Supabase Setup**

- [ ] Create Supabase project
- [ ] Configure environment variables
- [ ] Setup database schema with RLS
- [ ] Test database connection
- [ ] Configure authentication

### âœ… **Phase 2: Search Implementation**

- [ ] Enhanced lab routes with search
- [ ] Database indexes for performance
- [ ] Search validation middleware
- [ ] Search rate limiting
- [ ] Performance monitoring

### âœ… **Phase 3: Password Reset**

- [ ] Password reset endpoints
- [ ] Email service integration
- [ ] Token management system
- [ ] Security validation
- [ ] Email templates

### âœ… **Phase 4: Testing**

- [ ] Enhanced test configuration
- [ ] Unit tests for new features
- [ ] Integration tests
- [ ] Migration tests
- [ ] Performance tests

### âœ… **Phase 5: Deployment**

- [ ] Environment configuration
- [ ] Migration scripts
- [ ] Rollback procedures
- [ ] Monitoring setup
- [ ] CI/CD integration

---

## ðŸŽ¯ **Next Steps**

1. **Review Implementation Guide**: Ensure all team members understand the architecture
2. **Setup Development Environment**: Configure local Supabase and testing
3. **Begin Phase 1**: Start with Supabase migration and schema setup
4. **Iterative Development**: Implement features incrementally with testing
5. **Performance Monitoring**: Implement monitoring from day one

**This implementation guide provides the complete technical foundation for Script Labs V2 development!** ðŸš€
