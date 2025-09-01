const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { validateAuth } = require("../middlewares/validation");
const { authLimiter, strictLimiter } = require("../middlewares/rateLimiter");
const { securityLogger } = require("../middlewares/logger");
const { AppError } = require("../middlewares/errorHandler");

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Remove global strict rate limiting; will apply only to register and login endpoints

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user via Supabase
 * @access  Public
 */
router.post(
	"/register",
	validateAuth,
	securityLogger("USER_REGISTRATION"),
	async (req, res, next) => {
		try {
			if (process.env.NODE_ENV !== "test") {
				console.log("[DEBUG] Register body:", req.body);
			}
			const { email, password } = req.body;

			// Register user with Supabase
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
			});

			if (error) {
				if (process.env.NODE_ENV !== "test") {
					console.error("âŒ Registration error:", error.message);
				}
				return res.status(400).json({
					success: false,
					error: {
						message: error.message,
						code: "REGISTRATION_FAILED",
					},
					timestamp: new Date().toISOString(),
				});
			}

			res.status(201).json({
				success: true,
				message: "User registered successfully",
				data: {
					user: {
						id: data.user?.id,
						email: data.user?.email,
					},
					requiresConfirmation: !data.session,
				},
				timestamp: new Date().toISOString(),
			});
		} catch (err) {
			if (process.env.NODE_ENV !== "test") {
				console.error("âŒ Error in registration endpoint:", err.message);
			}
			next(new AppError("Registration endpoint error", 500));
		}
	}
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user via Supabase
 * @access  Public
 */
router.post(
	"/login",
	validateAuth,
	securityLogger("USER_LOGIN"),
	async (req, res, next) => {
		try {
			if (process.env.NODE_ENV !== "test") {
				console.log("[DEBUG] Login body:", req.body);
			}
			const { email, password } = req.body;

			// Login user with Supabase
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				if (process.env.NODE_ENV !== "test") {
					console.error("âŒ Login error:", error.message);
				}
				return res.status(401).json({
					success: false,
					error: {
						message: error.message,
						code: "LOGIN_FAILED",
					},
					timestamp: new Date().toISOString(),
				});
			}

			// Generate our own JWT token for backend authentication
			const token = jwt.sign(
				{
					userId: data.user.id,
					email: data.user.email,
				},
				config.jwt.secret,
				{
					expiresIn: config.jwt.expiresIn,
				}
			);

			res.status(200).json({
				success: true,
				message: "Login successful",
				data: {
					token,
					user: {
						id: data.user.id,
						email: data.user.email,
					},
				},
				timestamp: new Date().toISOString(),
			});
		} catch (err) {
			if (process.env.NODE_ENV !== "test") {
				console.error("âŒ Error in login endpoint:", err.message);
			}
			next(new AppError("Login endpoint error", 500));
		}
	}
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (handled by Supabase)
 * @access  Public
 * @note    This endpoint is primarily for documentation purposes
 *          as logout is handled client-side via Supabase
 */
router.post(
	"/logout",
	securityLogger("USER_LOGOUT"),
	async (req, res, next) => {
		try {
			res.status(200).json({
				success: true,
				message: "Logout should be handled via Supabase client-side",
				data: {
					note: "Use Supabase auth.signOut() method on the frontend",
				},
				timestamp: new Date().toISOString(),
			});
		} catch (err) {
			if (process.env.NODE_ENV !== "test") {
				console.error("âŒ Error in logout endpoint:", err.message);
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
			// Return basic user info from the JWT token
			res.status(200).json({
				success: true,
				data: {
					user_id: req.user_id,
					email: req.user_email || "N/A",
					authenticated: true,
				},
				timestamp: new Date().toISOString(),
			});
		} catch (err) {
			if (process.env.NODE_ENV !== "test") {
				console.error("âŒ Error fetching user info:", err.message);
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
			// If we reach here, the token is valid (thanks to authMiddleware)
			res.status(200).json({
				success: true,
				data: {
					valid: true,
					user_id: req.user_id,
					expires_at: req.token_expires || "N/A",
				},
				message: "Token is valid",
				timestamp: new Date().toISOString(),
			});
		} catch (err) {
			if (process.env.NODE_ENV !== "test") {
				console.error("âŒ Error verifying token:", err.message);
			}
			next(new AppError("Token verification failed", 401));
		}
	}
);

module.exports = router;


