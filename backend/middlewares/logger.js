/**
 * Request Logging Middleware
 * Logs all incoming requests with relevant details
 */

const requestLogger = (req, res, next) => {
	const start = Date.now();

	// Log request details
	const logRequest = () => {
		const duration = Date.now() - start;
		const timestamp = new Date().toISOString();

		// Basic request info
		const requestInfo = {
			timestamp,
			method: req.method,
			url: req.originalUrl || req.url,
			ip: req.ip || (req.connection && req.connection.remoteAddress),
			userAgent: req.get ? req.get("User-Agent") : req.headers && req.headers['user-agent'],
			duration: `${duration}ms`,
			status: res.statusCode,
		};

		// Add user info if authenticated
		if (req.user_id) {
			requestInfo.userId = req.user_id;
		}

		// Add request body for non-GET requests (excluding passwords)
		if (req.method !== "GET" && req.body) {
			const sanitizedBody = { ...req.body };

			// Remove sensitive information from logs
			if (sanitizedBody.password) {
				sanitizedBody.password = "[REDACTED]";
			}
			if (sanitizedBody.token) {
				sanitizedBody.token = "[REDACTED]";
			}

			requestInfo.body = sanitizedBody;
		}

		// Color code based on status
		let logColor = "\x1b[32m"; // Green for success
		if (res.statusCode >= 400 && res.statusCode < 500) {
			logColor = "\x1b[33m"; // Yellow for client errors
		} else if (res.statusCode >= 500) {
			logColor = "\x1b[31m"; // Red for server errors
		}

		// Log format: [TIMESTAMP] METHOD URL - STATUS (DURATION) - IP
		if (process.env.NODE_ENV !== "test") {
			console.log(
				`${logColor}[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - ${req.ip}\x1b[0m`
			);

			// Log additional details in development
			if (process.env.NODE_ENV === "development") {
				console.log("Request details:", JSON.stringify(requestInfo, null, 2));
			}
		}
	};

	// Hook into response finish event (only if res.on exists)
	if (res && typeof res.on === 'function') {
		res.on("finish", logRequest);
	}

	next();
};

// Security logger for sensitive operations
const securityLogger = (operation) => {
	return (req, res, next) => {
		const timestamp = new Date().toISOString();
		const ip = req.ip || req.connection.remoteAddress;
		const userAgent = req.get("User-Agent");

		if (process.env.NODE_ENV !== "test") {
			console.log(`ðŸ” [${timestamp}] SECURITY: ${operation} attempt from ${ip}`);
			console.log(`   User-Agent: ${userAgent}`);

			if (req.user_id) {
				console.log(`   User ID: ${req.user_id}`);
			}
		}

		next();
	};
};

// API usage statistics (simple in-memory counter)
const apiStats = {
	requests: 0,
	endpoints: {},
	errors: 0,
	startTime: Date.now(),
};

const statsLogger = (req, res, next) => {
	apiStats.requests++;

	const endpoint = `${req.method} ${req.route?.path || req.path}`;
	apiStats.endpoints[endpoint] = (apiStats.endpoints[endpoint] || 0) + 1;

	// Count errors
	const originalSend = res.send;
	res.send = function (data) {
		if (res.statusCode >= 400) {
			apiStats.errors++;
		}
		originalSend.call(this, data);
	};

	next();
};

// Get API statistics
const getApiStats = () => {
	const uptime = Date.now() - apiStats.startTime;
	const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
	const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

	return {
		...apiStats,
		uptime: `${uptimeHours}h ${uptimeMinutes}m`,
		requestsPerHour: Math.round(
			apiStats.requests / (uptime / (1000 * 60 * 60))
		),
		errorRate: ((apiStats.errors / apiStats.requests) * 100).toFixed(2) + "%",
	};
};

module.exports = {
	requestLogger,
	securityLogger,
	statsLogger,
	getApiStats,
};


