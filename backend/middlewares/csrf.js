const crypto = require("crypto");

// Safe (non state-changing) HTTP methods per RFC
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// Generate a strong random token
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Constant-time comparison to mitigate timing attacks
function safeCompare(a, b) {
  if (!a || !b) return false;
  const buffA = Buffer.from(a);
  const buffB = Buffer.from(b);
  if (buffA.length !== buffB.length) return false;
  return crypto.timingSafeEqual(buffA, buffB);
}

/**
 * Custom CSRF protection middleware.
 * Strategy: Per-session token stored in `req.session.csrfToken`.
 * - For safe methods: ensure token exists, attach via `X-CSRF-Token` response header.
 * - For state-changing methods: require token in header `x-csrf-token`, body `_csrf`, atau query `_csrf`.
 */
function csrfProtection(req, res, next) {
  // Pastikan session tersedia
  if (!req.session) {
    return res.status(500).json({
      success: false,
      error: {
        message: "Session not initialized for CSRF protection",
        code: "CSRF_NO_SESSION",
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Inisialisasi token jika belum ada
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  // Safe methods: hanya expose token
  if (SAFE_METHODS.includes(req.method)) {
    res.setHeader("X-CSRF-Token", req.session.csrfToken);
    return next();
  }

  // Validate token
  const provided = (
    req.headers["x-csrf-token"] ||
    req.body?._csrf ||
    req.query?._csrf ||
    ""
  ).toString();

  if (!safeCompare(provided, req.session.csrfToken)) {
    return res.status(403).json({
      success: false,
      error: { message: "Invalid or missing CSRF token", code: "CSRF_INVALID" },
      timestamp: new Date().toISOString(),
    });
  }

  // Optionally rotate token after successful validation (uncomment if desired)
  // req.session.csrfToken = generateToken();

  next();
}

module.exports = { csrfProtection };
