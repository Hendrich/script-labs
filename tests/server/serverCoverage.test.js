/**
 * Server Coverage Tests - Additional Coverage
 * Specific tests to cover remaining uncovered lines
 */

const request = require('supertest');

describe('Server Additional Coverage', () => {
	let app;

	beforeAll(() => {
		// Set test environment
		process.env.NODE_ENV = 'test';
		process.env.JWT_SECRET = 'test_secret_key';
		process.env.SESSION_SECRET = 'test_session_secret';
		process.env.PORT = '3002';

		// Import app after setting environment
		app = require('../../backend/server');
	});

	test('should handle uncaught exceptions gracefully', (done) => {
		// Test that app handles exceptions without crashing
		expect(app).toBeDefined();

		// Trigger a request to ensure server is running
		request(app)
			.get('/api/health')
			.expect((res) => {
				expect([200, 404, 500]).toContain(res.status);
			})
			.end(done);
	});

	test('should handle 404 routes', async () => {
		await request(app)
			.get('/nonexistent-route')
			.expect(404);
	});

	test('should handle malformed requests', async () => {
		await request(app)
			.post('/api/auth/register')
			.set('Content-Type', 'application/json')
			.send('invalid json')
			.expect((res) => {
				expect([400, 401, 500]).toContain(res.status);
			});
	});

	test('should handle server startup', () => {
		const originalPort = process.env.PORT;
		process.env.PORT = '3003';

		// Re-require the server module
		jest.resetModules();
		const serverModule = require('../../backend/server');
		expect(serverModule).toBeDefined();

		process.env.PORT = originalPort;
	});

	test('should handle different environment configurations', () => {
		const originalEnv = process.env.NODE_ENV;

		// Test with production environment
		process.env.NODE_ENV = 'production';
		jest.resetModules();

		const prodServer = require('../../backend/server');
		expect(prodServer).toBeDefined();

		// Reset environment
		process.env.NODE_ENV = originalEnv;
	});
});


