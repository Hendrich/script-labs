const { AppError, errorHandler } = require('../../backend/middlewares/errorHandler');
const TestHelpers = require('../utils/testHelpers');

describe('Error Handler Middleware', () => {
	let req, res, next;
	const originalNodeEnv = process.env.NODE_ENV;
	let consoleErrorSpy;

	beforeEach(() => {
		req = TestHelpers.createMockRequest({
			path: '/api/test',
			method: 'POST'
		});
		res = TestHelpers.createMockResponse();
		next = TestHelpers.createMockNext();

		// Mock console.error to suppress test output
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		// Reset NODE_ENV
		process.env.NODE_ENV = 'test';
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		consoleErrorSpy.mockRestore();
	});

	describe('AppError Class', () => {
		test('should create AppError with message and status code', () => {
			// Arrange & Act
			const error = new AppError('Test error message', 400);

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(AppError);
			expect(error.message).toBe('Test error message');
			expect(error.statusCode).toBe(400);
			expect(error.status).toBe('fail');
			expect(error.isOperational).toBe(true);
		});

		test('should set status as "error" for 5xx codes', () => {
			// Arrange & Act
			const error = new AppError('Server error', 500);

			// Assert
			expect(error.status).toBe('error');
			expect(error.statusCode).toBe(500);
		});

		test('should set status as "fail" for 4xx codes', () => {
			// Arrange & Act
			const error = new AppError('Client error', 404);

			// Assert
			expect(error.status).toBe('fail');
			expect(error.statusCode).toBe(404);
		});

		test('should capture stack trace', () => {
			// Arrange & Act
			const error = new AppError('Test error', 400);

			// Assert
			expect(error.stack).toBeDefined();
			expect(error.stack).toContain('Test error');
		});
	});

	describe('Error Handler Function', () => {
		describe('AppError Handling', () => {
			test('should handle AppError correctly', () => {
				// Arrange
				const error = new AppError('Custom error message', 400);

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				expect(res.json).toHaveBeenCalledWith({
					success: false,
					status: 'fail',
					error: {
						message: 'Custom error message'
					},
					timestamp: expect.any(String),
					path: '/api/test',
					method: 'POST'
				});
			});

			test('should include error details in development', () => {
				// Arrange
				process.env.NODE_ENV = 'development';
				const error = new AppError('Dev error', 400);
				error.stack = 'Mock stack trace';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.stack).toBeDefined();
				expect(responseData.error.error).toBeDefined();
			});

			test('should not include error details in production', () => {
				// Arrange
				process.env.NODE_ENV = 'production';
				const error = new AppError('Prod error', 400);
				error.stack = 'Mock stack trace';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.stack).toBeUndefined();
				expect(responseData.error.error).toBeUndefined();
			});
		});

		describe('JWT Error Handling', () => {
			test('should handle JsonWebTokenError', () => {
				// Arrange
				const error = new Error('jwt malformed');
				error.name = 'JsonWebTokenError';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(401);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Invalid token. Please log in again!');
				expect(responseData.status).toBe('fail');
			});

			test('should handle TokenExpiredError', () => {
				// Arrange
				const error = new Error('jwt expired');
				error.name = 'TokenExpiredError';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(401);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Your token has expired! Please log in again.');
				expect(responseData.status).toBe('fail');
			});
		});

		describe('Database Error Handling', () => {
			test('should handle PostgreSQL unique violation (23505)', () => {
				// Arrange
				const error = new Error('duplicate key value violates unique constraint');
				error.code = '23505';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Duplicate entry detected');
				expect(responseData.status).toBe('fail');
			});

			test('should handle PostgreSQL foreign key violation (23503)', () => {
				// Arrange
				const error = new Error('foreign key constraint fails');
				error.code = '23503';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Related resource not found');
				expect(responseData.status).toBe('fail');
			});
		});

		describe('Mongoose Error Handling', () => {
			test('should handle CastError', () => {
				// Arrange
				const error = new Error('Cast to ObjectId failed');
				error.name = 'CastError';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(404);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Resource not found');
				expect(responseData.status).toBe('fail');
			});

			test('should handle ValidationError', () => {
				// Arrange
				const error = new Error('Validation failed');
				error.name = 'ValidationError';
				error.errors = {
					name: { message: 'Name is required' },
					email: { message: 'Email is invalid' }
				};

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toContain('Invalid input data');
				expect(responseData.error.message).toContain('Name is required');
				expect(responseData.error.message).toContain('Email is invalid');
			});

			test('should handle duplicate key error (11000)', () => {
				// Arrange
				const error = new Error('E11000 duplicate key error');
				error.code = 11000;
				error.errmsg = 'duplicate key error collection: test.users index: email_1 dup key: { email: "test@example.com" }';

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(400);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toContain('Duplicate field value');
				expect(responseData.error.message).toContain('test@example.com');
			});
		});

		describe('Generic Error Handling', () => {
			test('should handle generic errors with 500 status', () => {
				// Arrange
				const error = new Error('Generic error message');

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(500);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.success).toBe(false);
				expect(responseData.status).toBe('error');
				expect(responseData.error.message).toBe('Generic error message');
				expect(responseData.timestamp).toBeDefined();
				expect(responseData.path).toBe('/api/test');
				expect(responseData.method).toBe('POST');
			});

			test('should handle errors without message', () => {
				// Arrange
				const error = new Error();

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(500);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Something went wrong!');
			});

			test('should handle null/undefined errors', () => {
				// Arrange
				const error = null;

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(res.status).toHaveBeenCalledWith(500);
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.error.message).toBe('Something went wrong!');
			});
		});

		describe('Response Format', () => {
			test('should always include required response fields', () => {
				// Arrange
				const error = new AppError('Test error', 400);

				// Act
				errorHandler(error, req, res, next);

				// Assert
				const responseData = res.json.mock.calls[0][0];
				expect(responseData).toHaveProperty('success', false);
				expect(responseData).toHaveProperty('status');
				expect(responseData).toHaveProperty('error');
				expect(responseData).toHaveProperty('timestamp');
				expect(responseData).toHaveProperty('path');
				expect(responseData).toHaveProperty('method');

				// Timestamp should be valid ISO string
				expect(new Date(responseData.timestamp)).toBeInstanceOf(Date);
			});

			test('should preserve request context in error response', () => {
				// Arrange
				req.path = '/api/labs/123';
				req.method = 'DELETE';
				const error = new AppError('Test error', 404);

				// Act
				errorHandler(error, req, res, next);

				// Assert
				const responseData = res.json.mock.calls[0][0];
				expect(responseData.path).toBe('/api/labs/123');
				expect(responseData.method).toBe('DELETE');
			});
		});

		describe('Error Logging', () => {
			test('should not log errors in test environment', () => {
				// Arrange
				process.env.NODE_ENV = 'test';
				const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
				const error = new AppError('Test error', 400);

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(consoleSpy).not.toHaveBeenCalled();

				// Cleanup
				consoleSpy.mockRestore();
			});

			test('should log errors in development environment', () => {
				// Arrange
				process.env.NODE_ENV = 'development';
				const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
				const error = new AppError('Test error', 400);

				// Act
				errorHandler(error, req, res, next);

				// Assert
				expect(consoleSpy).toHaveBeenCalled();

				// Cleanup
				consoleSpy.mockRestore();
			});
		});
	});

	describe('Edge Cases', () => {
		test('should handle circular reference in error object', () => {
			// Arrange
			const error = new Error('Circular reference error');
			error.circular = error; // Create circular reference

			// Act & Assert - Should not throw
			expect(() => {
				errorHandler(error, req, res, next);
			}).not.toThrow();

			expect(res.status).toHaveBeenCalledWith(500);
		});

		test('should handle very long error messages', () => {
			// Arrange
			const longMessage = 'A'.repeat(10000);
			const error = new AppError(longMessage, 400);

			// Act
			errorHandler(error, req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(400);
			const responseData = res.json.mock.calls[0][0];
			expect(responseData.error.message).toBe(longMessage);
		});

		test('should handle error with non-standard properties', () => {
			// Arrange
			const error = new Error('Standard error');
			error.customProperty = 'custom value';
			error.statusCode = 422;

			// Act
			errorHandler(error, req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(422);
			const responseData = res.json.mock.calls[0][0];
			expect(responseData.error.message).toBe('Standard error');
		});
	});
});


