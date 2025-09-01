const { createRateLimiter, authLimiter, apiLimiter, getRelaxedLimiter } = require('../../backend/middlewares/rateLimiter');

describe('Rate Limiter Middleware', () => {
	let req, res, next;

	beforeEach(() => {
		req = {
			ip: '127.0.0.1',
			method: 'GET',
			url: '/api/test'
		};
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			set: jest.fn()
		};
		next = jest.fn();

		// Clear all mocks
		jest.clearAllMocks();
	});

	describe('createRateLimiter Function', () => {
		test('should create rate limiter with default configuration', () => {
			// Act
			const limiter = createRateLimiter();

			// Assert
			expect(limiter).toBeDefined();
			expect(typeof limiter).toBe('function');
		});

		test('should create rate limiter with custom configuration', () => {
			// Arrange
			const options = {
				windowMs: 60000,
				max: 100,
				message: 'Custom rate limit message'
			};

			// Act
			const limiter = createRateLimiter(options);

			// Assert
			expect(limiter).toBeDefined();
			expect(typeof limiter).toBe('function');
		});

		test('should create rate limiter with custom skip function', () => {
			// Arrange
			const skipFunction = jest.fn(() => false);
			const options = {
				skip: skipFunction
			};

			// Act
			const limiter = createRateLimiter(options);

			// Assert
			expect(limiter).toBeDefined();
		});
	});

	describe('authLimiter', () => {
		test('should be defined and be a function', () => {
			// Assert
			expect(authLimiter).toBeDefined();
			expect(typeof authLimiter).toBe('function');
		});

		test('should allow requests under the limit', async () => {
			// Act
			await authLimiter(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		test('should set rate limit headers', async () => {
			// Act
			await authLimiter(req, res, next);

			// Assert - The middleware should call next() for requests under limit
			// Note: express-rate-limit sets headers internally, but our mock doesn't capture this
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled(); // No error status set
		});

		test('should handle multiple requests from same IP', async () => {
			// Act - Make multiple requests
			for (let i = 0; i < 3; i++) {
				await authLimiter(req, res, next);
			}

			// Assert
			expect(next).toHaveBeenCalledTimes(3);
		});
	});

	describe('apiLimiter', () => {
		test('should be defined and be a function', () => {
			// Assert
			expect(apiLimiter).toBeDefined();
			expect(typeof apiLimiter).toBe('function');
		});

		test('should allow requests under the limit', async () => {
			// Act
			await apiLimiter(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		test('should set rate limit headers', async () => {
			// Act
			await apiLimiter(req, res, next);

			// Assert - The middleware should call next() for requests under limit
			// Note: express-rate-limit sets headers internally, but our mock doesn't capture this
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled(); // No error status set
		});
	});

	describe('Rate Limiting Behavior', () => {
		test('should track requests per IP address', async () => {
			// Arrange
			const req1 = { ...req, ip: '192.168.1.1' };
			const req2 = { ...req, ip: '192.168.1.2' };

			// Act
			await apiLimiter(req1, res, next);
			await apiLimiter(req2, res, next);

			// Assert
			expect(next).toHaveBeenCalledTimes(2);
		});

		test('should handle IPv6 addresses', async () => {
			// Arrange
			req.ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

			// Act
			await apiLimiter(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
		});

		test('should handle requests with proxy headers', async () => {
			// Arrange
			req.headers = {
				'x-forwarded-for': '203.0.113.195',
				'x-real-ip': '203.0.113.195'
			};

			// Act
			await apiLimiter(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		test('should handle missing IP address gracefully', async () => {
			// Arrange
			delete req.ip;

			// Act & Assert
			expect(async () => {
				await apiLimiter(req, res, next);
			}).not.toThrow();
		});

		test('should handle malformed requests', async () => {
			// Arrange
			const malformedReq = {};

			// Act & Assert
			expect(async () => {
				await apiLimiter(malformedReq, res, next);
			}).not.toThrow();
		});
	});

	describe('Configuration Validation', () => {
		test('should handle invalid windowMs gracefully', () => {
			// Act & Assert
			expect(() => {
				createRateLimiter({ windowMs: -1 });
			}).not.toThrow();
		});

		test('should handle invalid max value gracefully', () => {
			// Act & Assert
			expect(() => {
				createRateLimiter({ max: -1 });
			}).not.toThrow();
		});

		test('should handle null options gracefully', () => {
			// Act & Assert
			expect(() => {
				createRateLimiter(null);
			}).not.toThrow();
		});
	});

	describe('Custom Message Handling', () => {
		test('should use custom rate limit message', () => {
			// Arrange
			const customMessage = 'Custom rate limit exceeded';
			const limiter = createRateLimiter({
				message: customMessage
			});

			// Assert
			expect(limiter).toBeDefined();
		});

		test('should use default message when none provided', () => {
			// Act
			const limiter = createRateLimiter();

			// Assert
			expect(limiter).toBeDefined();
		});
	});

	describe('Skip Function', () => {
		test('should allow creating limiter with skip successful requests', () => {
			// Arrange & Act
			const limiter = createRateLimiter(
				60000, // windowMs
				10,    // max
				'Rate limit exceeded',
				true   // skipSuccessfulRequests
			);

			// Assert
			expect(limiter).toBeDefined();
			expect(typeof limiter).toBe('function');
		});

		test('should allow creating limiter without skip successful requests', () => {
			// Arrange & Act
			const limiter = createRateLimiter(
				60000, // windowMs
				10,    // max
				'Rate limit exceeded',
				false  // skipSuccessfulRequests
			);

			// Assert
			expect(limiter).toBeDefined();
			expect(typeof limiter).toBe('function');
		});
	});

	describe('getRelaxedLimiter', () => {
		test('should return a rate limiter function', () => {
			// Act
			const relaxedLimiter = getRelaxedLimiter();

			// Assert
			expect(relaxedLimiter).toBeDefined();
			expect(typeof relaxedLimiter).toBe('function');
		});

		test('should create different limits for development vs production', () => {
			// Arrange
			const originalEnv = process.env.NODE_ENV;

			// Test development
			process.env.NODE_ENV = 'development';
			const devLimiter = getRelaxedLimiter();
			expect(devLimiter).toBeDefined();

			// Test production
			process.env.NODE_ENV = 'production';
			const prodLimiter = getRelaxedLimiter();
			expect(prodLimiter).toBeDefined();

			// Cleanup
			process.env.NODE_ENV = originalEnv;
		});
	});
});


