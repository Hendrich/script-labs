const authMiddleware = require('../../backend/middlewares/authMiddleware');
const TestHelpers = require('../utils/testHelpers');

describe('authMiddleware', () => {
	let req, res, next;

	beforeEach(() => {
		req = TestHelpers.createMockRequest();
		res = TestHelpers.createMockResponse();
		next = TestHelpers.createMockNext();
	});

	describe('Valid Authentication', () => {
		test('should authenticate user with valid token', () => {
			// Arrange
			const validToken = TestHelpers.generateValidToken({
				userId: 'user-123',
				email: 'test@example.com'
			});

			req.headers.authorization = `Bearer ${validToken}`;

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(req.user_id).toBe('user-123');
			expect(req.user_email).toBe('test@example.com');
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith();
			expect(res.status).not.toHaveBeenCalled();
			expect(res.json).not.toHaveBeenCalled();
		});

		test('should handle token with minimal payload', () => {
			// Arrange
			const token = TestHelpers.generateValidToken({
				userId: 'minimal-user'
			});

			req.headers.authorization = `Bearer ${token}`;

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(req.user_id).toBe('minimal-user');
			expect(next).toHaveBeenCalledTimes(1);
		});
	});

	describe('Missing Authorization', () => {
		test('should reject request without authorization header', () => {
			// Arrange
			req.headers = {}; // No authorization header

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'No token provided'
			});
			expect(next).not.toHaveBeenCalled();
			expect(req.user_id).toBeUndefined();
		});

		test('should reject request with empty authorization header', () => {
			// Arrange
			req.headers.authorization = '';

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'No token provided'
			});
			expect(next).not.toHaveBeenCalled();
		});

		test('should reject request with null authorization header', () => {
			// Arrange
			req.headers.authorization = null;

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'No token provided'
			});
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('Invalid Token Format', () => {
		test('should reject malformed authorization header', () => {
			// Arrange
			req.headers.authorization = 'InvalidFormat';

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token format'
			});
			expect(next).not.toHaveBeenCalled();
		});

		test('should reject authorization header without Bearer prefix', () => {
			// Arrange
			const validToken = TestHelpers.generateValidToken();
			req.headers.authorization = validToken; // Missing "Bearer " prefix

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token format'
			});
			expect(next).not.toHaveBeenCalled();
		});

		test('should reject authorization header with only Bearer', () => {
			// Arrange
			req.headers.authorization = 'Bearer ';

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token format'
			});
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('Invalid JWT Token', () => {
		test('should reject invalid JWT token', () => {
			// Arrange
			req.headers.authorization = 'Bearer invalid.jwt.token';

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token'
			});
			expect(next).not.toHaveBeenCalled();
		});

		test('should reject expired JWT token', () => {
			// Arrange
			const expiredToken = TestHelpers.generateExpiredToken();
			req.headers.authorization = `Bearer ${expiredToken}`;

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token'
			});
			expect(next).not.toHaveBeenCalled();
		});

		test('should reject token with invalid signature', () => {
			// Arrange
			const tokenWithWrongSecret = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjQwOTk1MjAwfQ.invalid_signature';
			req.headers.authorization = tokenWithWrongSecret;

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token'
			});
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('Edge Cases', () => {
		test('should handle token with extra spaces', () => {
			// Arrange
			const validToken = TestHelpers.generateValidToken();
			req.headers.authorization = `  Bearer   ${validToken}  `;

			// Act - This should work with the improved implementation
			authMiddleware(req, res, next);

			// Assert - Implementation now handles this gracefully
			expect(req.user_id).toBeDefined();
			expect(next).toHaveBeenCalledTimes(1);
		});

		test('should handle case-sensitive Bearer token', () => {
			// Arrange
			const validToken = TestHelpers.generateValidToken();
			req.headers.authorization = `bearer ${validToken}`; // lowercase 'bearer'

			// Act
			authMiddleware(req, res, next);

			// Assert - Current implementation should handle this now
			expect(req.user_id).toBeDefined();
			expect(next).toHaveBeenCalledTimes(1);
		});

		test('should handle authorization header with multiple spaces', () => {
			// Arrange
			const validToken = TestHelpers.generateValidToken();
			req.headers.authorization = `Bearer  ${validToken}`; // Double space

			// Act
			authMiddleware(req, res, next);

			// Assert - This should work with split(' ')[1]
			expect(req.user_id).toBeDefined();
			expect(next).toHaveBeenCalledTimes(1);
		});
	});

	describe('Security Tests', () => {
		test('should not expose sensitive information in error messages', () => {
			// Arrange
			req.headers.authorization = 'Bearer malicious.token.here';

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token'
			});

			// Ensure no sensitive data is leaked
			const callArgs = res.json.mock.calls[0][0];
			expect(JSON.stringify(callArgs)).not.toContain('malicious');
			expect(JSON.stringify(callArgs)).not.toContain('JWT_SECRET');
		});

		test('should handle extremely long tokens gracefully', () => {
			// Arrange
			const longToken = 'a'.repeat(10000);
			req.headers.authorization = `Bearer ${longToken}`;

			// Act
			authMiddleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Invalid token'
			});
		});
	});
});


