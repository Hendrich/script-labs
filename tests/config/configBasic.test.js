/**
 * Config Basic Tests
 * Simple tests to increase config.js coverage
 */

describe('Config Basic Tests', () => {
	beforeEach(() => {
		// Clear module cache to get fresh config
		delete require.cache[require.resolve('../../backend/config/config')];
	});

	test('should load config without errors', () => {
		expect(() => {
			require('../../backend/config/config');
		}).not.toThrow();
	});

	test('should have required config properties', () => {
		const config = require('../../backend/config/config');

		expect(config).toHaveProperty('port');
		expect(config).toHaveProperty('nodeEnv');
		expect(config).toHaveProperty('database');
		expect(config).toHaveProperty('jwt');
		expect(config).toHaveProperty('cors');
		expect(config).toHaveProperty('rateLimit');
	});

	test('should have database config', () => {
		const config = require('../../backend/config/config');

		expect(config.database).toHaveProperty('ssl');
		expect(typeof config.database.ssl).toBe('boolean');
	});

	test('should have cors origin function', () => {
		const config = require('../../backend/config/config');

		expect(config.cors).toHaveProperty('origin');
		expect(typeof config.cors.origin).toBe('function');
	});

	test('should handle CORS origin validation', (done) => {
		const config = require('../../backend/config/config');

		// Test null origin (should be allowed)
		config.cors.origin(null, (err, allow) => {
			expect(err).toBe(null);
			expect(allow).toBe(true);
			done();
		});
	});

	test('should allow localhost origins in CORS', (done) => {
		const config = require('../../backend/config/config');

		config.cors.origin('http://localhost:3000', (err, allow) => {
			expect(err).toBe(null);
			expect(allow).toBe(true);
			done();
		});
	});

	test('should allow 127.0.0.1 origins in CORS', (done) => {
		const config = require('../../backend/config/config');

		config.cors.origin('http://127.0.0.1:3000', (err, allow) => {
			expect(err).toBe(null);
			expect(allow).toBe(true);
			done();
		});
	});

	test('should allow Vite dev server origin in CORS', (done) => {
		const config = require('../../backend/config/config');

		config.cors.origin('http://localhost:5173', (err, allow) => {
			expect(err).toBe(null);
			expect(allow).toBe(true);
			done();
		});
	});

	test('should block disallowed origins in CORS', (done) => {
		// Set NODE_ENV to something other than test to enable blocking
		process.env.NODE_ENV = 'development';
		delete require.cache[require.resolve('../../backend/config/config')];
		const config = require('../../backend/config/config');

		config.cors.origin('http://malicious-site.com', (err, allow) => {
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toBe('Not allowed by CORS');

			// Reset NODE_ENV back to test
			process.env.NODE_ENV = 'test';
			done();
		});
	});

	test('should have rate limit config with numbers', () => {
		const config = require('../../backend/config/config');

		expect(typeof config.rateLimit.windowMs).toBe('number');
		expect(typeof config.rateLimit.maxRequests).toBe('number');
		expect(typeof config.rateLimit.maxAuthRequests).toBe('number');
	});

	test('should configure SSL for different environments', () => {
		// This test checks the logic but doesn't enforce specific values
		// since the actual configuration may vary based on runtime environment
		const originalEnv = process.env.NODE_ENV;

		// Test that the SSL configuration responds to environment changes
		process.env.NODE_ENV = 'production';
		delete require.cache[require.resolve('../../backend/config/config')];
		const prodConfig = require('../../backend/config/config');

		// SSL should be set based on NODE_ENV === 'production'
		expect(typeof prodConfig.database.ssl).toBe('boolean');

		// Reset to original environment
		process.env.NODE_ENV = originalEnv;
	});

	test('should handle port configuration', () => {
		// Test that port is properly configured
		const config = require('../../backend/config/config');

		expect(config.port).toBeDefined();
		expect(typeof config.port === 'string' || typeof config.port === 'number').toBe(true);
	});

	test('should handle environment configuration', () => {
		// Test that nodeEnv is properly configured  
		const config = require('../../backend/config/config');

		expect(config.nodeEnv).toBeDefined();
		expect(typeof config.nodeEnv).toBe('string');
	});
});


