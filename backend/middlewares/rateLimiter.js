const rateLimit = require("express-rate-limit");
const config = require("../config/config");

/**
 * Rate limiting middleware to prevent abuse
 */

// Create rate limiter with custom configuration
const createRateLimiter = (
	windowMs,
	max,
	message,
	skipSuccessfulRequests = false
) => {
	return rateLimit({
		windowMs,
		max,
		message: {
			success: false,
			error: {
				message,
				code: "RATE_LIMIT_EXCEEDED",
			},
			timestamp: new Date().toISOString(),
		},
		standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers
		skipSuccessfulRequests, // Don't count successful requests
		keyGenerator: (req) => {
			// Gunakan IP asli dari header x-forwarded-for jika ada, fallback ke req.ip
			const forwarded = req.headers["x-forwarded-for"];
			if (forwarded) {
				// Ambil IP pertama dari daftar (jika ada beberapa IP)
				return forwarded.split(",")[0].trim();
			}
			return req.ip;
		},
		handler: (req, res) => {
			// Logging setiap kali rate limit tercapai
			const forwarded = req.headers["x-forwarded-for"];
			const ip = forwarded ? forwarded.split(",")[0].trim() : req.ip;
			if (ip === "::1") {
				// Bypass rate limit untuk localhost
				if (process.env.NODE_ENV !== "test") {
					console.warn(
						`[RATE LIMIT BYPASS] IP: ::1 (localhost), Path: ${req.path
						}, Time: ${new Date().toISOString()}`
					);
				}
				return res
					.status(200)
					.json({ success: true, message: "Bypass rate limit for localhost" });
			}
			if (process.env.NODE_ENV !== "test") {
				console.warn(
					`[RATE LIMIT] IP: ${ip}, Path: ${req.path
					}, Time: ${new Date().toISOString()}`
				);
			}
			res.status(429).json({
				success: false,
				error: {
					message,
					code: "RATE_LIMIT_EXCEEDED",
					retryAfter: Math.round(windowMs / 1000),
				},
				timestamp: new Date().toISOString(),
			});
		},
	});
};

// Different rate limiters for different endpoint types

// General API rate limiter
const apiLimiter = createRateLimiter(
	config.rateLimit.windowMs, // 15 minutes
	config.rateLimit.maxRequests, // 100 requests per windowMs
	"Too many API requests from this IP, please try again later"
);

// Stricter rate limiter for authentication endpoints
const authLimiter = createRateLimiter(
	config.rateLimit.windowMs, // 15 minutes
	config.nodeEnv === "development" ? 50 : config.rateLimit.maxAuthRequests, // More permissive in dev
	"Too many authentication attempts from this IP, please try again later",
	false // Count all requests, including failed ones
);

// Very strict rate limiter for password reset/sensitive operations
const strictLimiter = createRateLimiter(
	60 * 60 * 1000, // 1 hour
	config.nodeEnv === "development" ? 20 : 3, // More permissive in dev
	"Too many sensitive operation attempts from this IP, please try again later"
);

// More permissive rate limiter for public endpoints (if any)
const publicLimiter = createRateLimiter(
	config.rateLimit.windowMs, // 15 minutes
	config.rateLimit.maxRequests * 2, // 200 requests per windowMs
	"Too many requests from this IP, please try again later"
);

module.exports = {
	apiLimiter,
	authLimiter,
	strictLimiter,
	publicLimiter,
	createRateLimiter,
	// Relaxed limiter for /api/auth and /api/labs endpoints
	getRelaxedLimiter: () =>
		createRateLimiter(
			config.rateLimit.windowMs,
			config.nodeEnv === "development" ? 500 : 100, // 500 in dev, 100 in prod
			"Too many requests from this IP, please try again later"
		),
};


