const jwt = require("jsonwebtoken");
const config = require("../config/config");

module.exports = function (req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).json({ message: "No token provided" });
	}

	// Handle case-insensitive Bearer token and multiple spaces
	const parts = authHeader.trim().split(/\s+/);
	if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
		return res.status(401).json({ message: "Invalid token format" });
	}

	const token = parts[1];
	if (!token) {
		return res.status(401).json({ message: "No token provided" });
	}

	jwt.verify(token, config.jwt.secret, (err, payload) => {
		if (err) return res.status(401).json({ message: "Invalid token" });
		// Ambil user_id dari payload.userId (sesuai JWT backend)
		req.user_id = payload.userId;
		req.user_email = payload.email;
		req.token_expires = payload.exp;
		next();
	});
};


