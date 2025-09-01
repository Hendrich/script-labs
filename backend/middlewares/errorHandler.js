/**
 * Centralized Error Handling Middleware
 * Handles all errors consistently across the application
 */

class AppError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		this.isOperational = true;

		Error.captureStackTrace(this, this.constructor);
	}
}

const errorHandler = (err, req, res, next) => {
	// Handle null/undefined errors
	if (!err) {
		err = new Error('Something went wrong!');
		err.statusCode = 500;
	}

	let error = { ...err };
	error.message = err.message || 'Something went wrong!';

	// Log error details (except in test environment)
	if (process.env.NODE_ENV !== "test") {
		console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
		console.error("Error:", error.message);
		if (process.env.NODE_ENV === "development") {
			console.error("Stack:", err.stack);
		}
	}

	// Mongoose bad ObjectId
	if (err.name === "CastError") {
		const message = "Resource not found";
		error = new AppError(message, 404);
	}

	// Mongoose duplicate key
	if (err.code === 11000) {
		const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
		const message = `Duplicate field value: ${value}. Please use another value!`;
		error = new AppError(message, 400);
	}

	// Mongoose validation error
	if (err.name === "ValidationError") {
		const errors = Object.values(err.errors).map((val) => val.message);
		const message = `Invalid input data. ${errors.join(". ")}`;
		error = new AppError(message, 400);
	}

	// JWT errors
	if (err.name === "JsonWebTokenError") {
		const message = "Invalid token. Please log in again!";
		error = new AppError(message, 401);
	}

	if (err.name === "TokenExpiredError") {
		const message = "Your token has expired! Please log in again.";
		error = new AppError(message, 401);
	}

	// PostgreSQL errors
	if (err.code === "23505") {
		// Unique violation
		const message = "Duplicate entry detected";
		error = new AppError(message, 400);
	}

	if (err.code === "23503") {
		// Foreign key violation
		const message = "Related resource not found";
		error = new AppError(message, 400);
	}

	// Default to 500 server error
	const statusCode = error.statusCode || 500;
	const status = error.status || "error";

	// Send error response
	res.status(statusCode).json({
		success: false,
		status,
		error: {
			message: error.message || "Something went wrong!",
			...(process.env.NODE_ENV === "development" && {
				stack: err.stack,
				error: err,
			}),
		},
		timestamp: new Date().toISOString(),
		path: req.path,
		method: req.method,
	});
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
	console.error("ðŸš¨ Unhandled Promise Rejection:");
	console.error("Error:", err.message);
	console.error("Promise:", promise);

	// Close server & exit process
	process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
	console.error("ðŸš¨ Uncaught Exception:");
	console.error("Error:", err.message);
	console.error("Stack:", err.stack);

	// Close server & exit process
	process.exit(1);
});

module.exports = {
	AppError,
	errorHandler,
};


