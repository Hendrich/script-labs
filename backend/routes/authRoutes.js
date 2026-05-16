const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config/config");
const { validateAuth } = require("../middlewares/validation");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const { securityLogger } = require("../middlewares/logger");
const { AppError } = require("../middlewares/errorHandler");

const router = express.Router();

// Stricter rate limiter: 5 attempts / 15m for register & login (per IP). Bypass in tests.
const authAttemptLimiter =
  config.nodeEnv === "test"
    ? (req, res, next) => next()
    : createRateLimiter(
        15 * 60 * 1000,
        5,
        "Too many authentication attempts. Please try again later",
        false
      );

const buildToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || "user",
      status: user.status || "active",
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role || "user",
  status: user.status || "active",
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user in local PostgreSQL database
 * @access  Public
 */
router.post(
  "/register",
  validateAuth,
  authAttemptLimiter,
  securityLogger("USER_REGISTRATION"),
  async (req, res, next) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const { password } = req.body;

      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: "Email already registered",
            code: "EMAIL_EXISTS",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, email, role, status, created_at`,
        [email, passwordHash, "user", "active"]
      );

      const user = rows[0];
      const token = buildToken(user);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          token,
          user: sanitizeUser(user),
          requiresConfirmation: false,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Error in registration endpoint:", err.message);
      }
      next(new AppError("Registration endpoint error", 500));
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user via local PostgreSQL database
 * @access  Public
 */
router.post(
  "/login",
  validateAuth,
  authAttemptLimiter,
  securityLogger("USER_LOGIN"),
  async (req, res, next) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const { password } = req.body;

      const { rows } = await pool.query(
        "SELECT id, email, password_hash, role, status FROM users WHERE email = $1",
        [email]
      );

      const user = rows[0];
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Invalid email or password",
            code: "AUTH_FAILED",
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.status === "locked") {
        return res.status(403).json({
          success: false,
          error: {
            message: "User account is locked",
            code: "USER_LOCKED",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Invalid email or password",
            code: "AUTH_FAILED",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const token = buildToken(user);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: sanitizeUser(user),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Error in login endpoint:", err.message);
      }
      next(new AppError("Login endpoint error", 500));
    }
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user, handled client-side by removing JWT
 * @access  Public
 */
router.post(
  "/logout",
  securityLogger("USER_LOGOUT"),
  async (req, res, next) => {
    try {
      res.status(200).json({
        success: true,
        message: "Logout successful. Remove the token on the client side.",
        data: {
          note: "This API uses stateless JWT auth.",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Error in logout endpoint:", err.message);
      }
      next(new AppError("Logout endpoint error", 500));
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
  "/me",
  require("../middlewares/authMiddleware"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, email, role, status, created_at FROM users WHERE id = $1",
        [req.user_id]
      );

      res.status(200).json({
        success: true,
        data: {
          user: rows[0] || {
            id: req.user_id,
            email: req.user_email || "N/A",
            authenticated: true,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Error fetching user info:", err.message);
      }
      next(new AppError("Failed to fetch user info", 500));
    }
  }
);

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if a JWT token is valid
 * @access  Private
 */
router.post(
  "/verify-token",
  require("../middlewares/authMiddleware"),
  async (req, res, next) => {
    try {
      res.status(200).json({
        success: true,
        data: {
          valid: true,
          user_id: req.user_id,
          email: req.user_email,
          expires_at: req.token_expires || "N/A",
        },
        message: "Token is valid",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Error verifying token:", err.message);
      }
      next(new AppError("Token verification failed", 401));
    }
  }
);

module.exports = router;
