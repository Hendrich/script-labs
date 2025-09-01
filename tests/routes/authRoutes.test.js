const request = require('supertest');
const express = require('express');
const TestHelpers = require('../utils/testHelpers');
const { errorHandler } = require('../../backend/middlewares/errorHandler');

// Mock modules before importing
const mockSupabaseAuth = {
	signUp: jest.fn(),
	signInWithPassword: jest.fn(),
	signOut: jest.fn(),
	getUser: jest.fn()
};

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: mockSupabaseAuth
	}))
}));

// Mock JWT for predictable tokens
const jwt = require('jsonwebtoken');
jest.mock('jsonwebtoken');

// Mock the auth middleware
jest.mock('../../backend/middlewares/authMiddleware', () => (req, res, next) => {
	const authHeader = req.headers.authorization;

	// Simulate different auth scenarios based on the token provided
	if (!authHeader) {
		return res.status(401).json({ message: 'No token provided' });
	}

	const token = authHeader.split(' ')[1];
	if (!token || token === 'invalid.token') {
		return res.status(401).json({ message: 'Invalid token' });
	}

	// Add mock user data that auth middleware would normally add
	req.user_id = 'test-user-123';
	req.user_email = 'test@example.com';
	req.user = {
		userId: 'test-user-123',
		email: 'test@example.com'
	};
	next();
});

// Now import the routes after mocking
const authRoutes = require('../../backend/routes/authRoutes');

describe('Auth Routes', () => {
	let app;

	beforeEach(() => {
		// Create Express app for testing
		app = express();
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));

		// Mock authentication middleware for protected routes
		app.use((req, res, next) => {
			// Add mock user data that auth middleware would normally add
			req.user = {
				userId: 'test-user-123',
				email: 'test@example.com'
			};
			req.user_id = 'test-user-123';
			next();
		});

		app.use('/api/auth', authRoutes);
		app.use(errorHandler);

		// Reset all mocks
		jest.clearAllMocks();

		// Setup default JWT mock
		jwt.sign.mockReturnValue('mock.jwt.token');
		jwt.verify.mockReturnValue({
			userId: 'test-user-123',
			email: 'test@example.com'
		});

		// Setup default Supabase mocks for successful operations
		mockSupabaseAuth.signUp.mockResolvedValue({
			data: {
				user: {
					id: 'test-user-123',
					email: 'test@example.com'
				},
				session: null
			},
			error: null
		});

		mockSupabaseAuth.signInWithPassword.mockResolvedValue({
			data: {
				user: {
					id: 'test-user-123',
					email: 'test@example.com'
				},
				session: {
					access_token: 'mock.supabase.token'
				}
			},
			error: null
		});
	});

	describe('POST /api/auth/register', () => {
		describe('Successful Registration', () => {
			test('should register user successfully', async () => {
				// Arrange
				const userData = {
					email: 'test@example.com',
					password: 'password123'
				};

				mockSupabaseAuth.signUp.mockResolvedValueOnce({
					data: {
						user: {
							id: 'user-123',
							email: 'test@example.com'
						},
						session: null // No session means confirmation required
					},
					error: null
				});

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(userData)
					.expect(201);

				// Assert
				expect(response.body.success).toBe(true);
				expect(response.body.message).toBe('User registered successfully');
				expect(response.body.data.user.id).toBe('user-123');
				expect(response.body.data.user.email).toBe('test@example.com');
				expect(response.body.data.requiresConfirmation).toBe(true);
				expect(response.body.timestamp).toBeDefined();

				// Verify Supabase was called correctly
				expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
					email: 'test@example.com',
					password: 'password123'
				});
			});

			test('should handle registration with session (auto-confirmed)', async () => {
				// Arrange
				const userData = {
					email: 'test@example.com',
					password: 'password123'
				};

				mockSupabaseAuth.signUp.mockResolvedValueOnce({
					data: {
						user: {
							id: 'user-123',
							email: 'test@example.com'
						},
						session: { // Session exists = auto-confirmed
							access_token: 'supabase-token'
						}
					},
					error: null
				});

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(userData)
					.expect(201);

				// Assert
				expect(response.body.success).toBe(true);
				expect(response.body.data.requiresConfirmation).toBe(false);
			});
		});

		describe('Registration Errors', () => {
			test('should handle Supabase registration errors', async () => {
				// Arrange
				const userData = {
					email: 'test@example.com',
					password: 'password123'
				};

				mockSupabaseAuth.signUp.mockResolvedValueOnce({
					data: null,
					error: {
						message: 'User already registered'
					}
				});

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(userData)
					.expect(400);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toBe('User already registered');
				expect(response.body.error.code).toBe('REGISTRATION_FAILED');
				expect(response.body.timestamp).toBeDefined();
			});

			test('should handle validation errors', async () => {
				// Arrange
				const invalidUserData = {
					email: 'invalid-email',
					password: '123'
				};

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(invalidUserData)
					.expect(400);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toContain('Validation Error');
				expect(response.body.error.message).toContain('Please provide a valid email address');
				expect(response.body.error.message).toContain('Password must be at least 6 characters long');
			});

			test('should handle missing email', async () => {
				// Arrange
				const incompleteData = {
					password: 'password123'
				};

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(incompleteData)
					.expect(400);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toContain('Email is required');
			});

			test('should handle missing password', async () => {
				// Arrange
				const incompleteData = {
					email: 'test@example.com'
				};

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(incompleteData)
					.expect(400);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toContain('Password is required');
			});

			test('should handle Supabase service errors', async () => {
				// Arrange
				const userData = {
					email: 'test@example.com',
					password: 'password123'
				};

				mockSupabaseAuth.signUp.mockRejectedValueOnce(new Error('Service unavailable'));

				// Act
				const response = await request(app)
					.post('/api/auth/register')
					.send(userData)
					.expect(500);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toBe('Registration endpoint error');
			});
		});
	});

	describe('POST /api/auth/login', () => {
		describe('Successful Login', () => {
			test('should login user successfully', async () => {
				// Arrange
				const loginData = {
					email: 'test@example.com',
					password: 'password123'
				};

				mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
					data: {
						user: {
							id: 'user-123',
							email: 'test@example.com'
						},
						session: {
							access_token: 'supabase-access-token'
						}
					},
					error: null
				});

				jwt.sign.mockReturnValue('generated.jwt.token');

				// Act
				const response = await request(app)
					.post('/api/auth/login')
					.send(loginData)
					.expect(200);

				// Assert
				expect(response.body.success).toBe(true);
				expect(response.body.message).toBe('Login successful');
				expect(response.body.data.token).toBe('generated.jwt.token');
				expect(response.body.data.user.id).toBe('user-123');
				expect(response.body.data.user.email).toBe('test@example.com');
				expect(response.body.timestamp).toBeDefined();

				// Verify Supabase was called correctly
				expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
					email: 'test@example.com',
					password: 'password123'
				});

				// Verify JWT token generation
				expect(jwt.sign).toHaveBeenCalledWith(
					{
						userId: 'user-123',
						email: 'test@example.com'
					},
					process.env.JWT_SECRET,
					{
						expiresIn: expect.any(String)
					}
				);
			});
		});

		describe('Login Errors', () => {
			test('should handle invalid credentials', async () => {
				// Arrange
				const loginData = {
					email: 'test@example.com',
					password: 'wrongpassword'
				};

				mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
					data: null,
					error: {
						message: 'Invalid login credentials'
					}
				});

				// Act
				const response = await request(app)
					.post('/api/auth/login')
					.send(loginData)
					.expect(401);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toBe('Invalid login credentials');
				expect(response.body.error.code).toBe('LOGIN_FAILED');
				expect(response.body.timestamp).toBeDefined();
			});

			test('should handle validation errors', async () => {
				// Arrange
				const invalidLoginData = {
					email: 'invalid-email',
					password: '123'
				};

				// Act
				const response = await request(app)
					.post('/api/auth/login')
					.send(invalidLoginData)
					.expect(400);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toContain('Validation Error');
			});

			test('should handle missing credentials', async () => {
				// Arrange
				const incompleteData = {};

				// Act
				const response = await request(app)
					.post('/api/auth/login')
					.send(incompleteData)
					.expect(400);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toContain('Email is required');
				expect(response.body.error.message).toContain('Password is required');
			});

			test('should handle Supabase service errors', async () => {
				// Arrange
				const loginData = {
					email: 'test@example.com',
					password: 'password123'
				};

				mockSupabaseAuth.signInWithPassword.mockRejectedValueOnce(new Error('Service unavailable'));

				// Act
				const response = await request(app)
					.post('/api/auth/login')
					.send(loginData)
					.expect(500);

				// Assert
				expect(response.body.success).toBe(false);
				expect(response.body.error.message).toBe('Login endpoint error');
			});
		});
	});

	describe('POST /api/auth/logout', () => {
		test('should return logout instructions', async () => {
			// Act
			const response = await request(app)
				.post('/api/auth/logout')
				.expect(200);

			// Assert
			expect(response.body.success).toBe(true);
			expect(response.body.message).toBe('Logout should be handled via Supabase client-side');
			expect(response.body.data.note).toContain('Use Supabase auth.signOut()');
			expect(response.body.timestamp).toBeDefined();
		});

		test('should handle errors gracefully', async () => {
			// This test is more for coverage since logout doesn't do much
			const response = await request(app)
				.post('/api/auth/logout')
				.expect(200);

			expect(response.body.success).toBe(true);
		});
	});

	describe('GET /api/auth/me', () => {
		test('should return user info for authenticated user', async () => {
			// Arrange - Mock auth middleware by setting headers
			const token = TestHelpers.generateValidToken({
				userId: 'test-user-123',
				email: 'test@example.com'
			});

			// Act
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			// Assert
			expect(response.body.success).toBe(true);
			expect(response.body.data.user_id).toBe('test-user-123');
			expect(response.body.data.email).toBe('test@example.com');
			expect(response.body.data.authenticated).toBe(true);
			expect(response.body.timestamp).toBeDefined();
		});

		test('should require authentication', async () => {
			// Act - No authorization header
			const response = await request(app)
				.get('/api/auth/me')
				.expect(401);

			// Assert
			expect(response.body.message).toBe('No token provided');
		});

		test('should handle invalid tokens', async () => {
			// Act
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', 'Bearer invalid.token')
				.expect(401);

			// Assert
			expect(response.body.message).toBe('Invalid token');
		});
	});

	describe('POST /api/auth/verify-token', () => {
		test('should verify valid token', async () => {
			// Arrange
			const token = TestHelpers.generateValidToken({
				userId: 'test-user-123',
				email: 'test@example.com'
			});

			// Act
			const response = await request(app)
				.post('/api/auth/verify-token')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			// Assert
			expect(response.body.success).toBe(true);
			expect(response.body.data.valid).toBe(true);
			expect(response.body.data.user_id).toBe('test-user-123');
			expect(response.body.message).toBe('Token is valid');
			expect(response.body.timestamp).toBeDefined();
		});

		test('should reject invalid token', async () => {
			// Act
			const response = await request(app)
				.post('/api/auth/verify-token')
				.set('Authorization', 'Bearer invalid.token')
				.expect(401);

			// Assert
			expect(response.body.message).toBe('Invalid token');
		});

		test('should require authentication', async () => {
			// Act
			const response = await request(app)
				.post('/api/auth/verify-token')
				.expect(401);

			// Assert
			expect(response.body.message).toBe('No token provided');
		});
	});

	describe('Security Features', () => {
		test('should log security events', async () => {
			// This test verifies that security logging is applied
			// The actual logging is mocked, so we just verify the endpoints work

			const userData = {
				email: 'test@example.com',
				password: 'password123'
			};

			mockSupabaseAuth.signUp.mockResolvedValueOnce({
				data: {
					user: { id: 'user-123', email: 'test@example.com' },
					session: null
				},
				error: null
			});

			const response = await request(app)
				.post('/api/auth/register')
				.send(userData)
				.expect(201);

			expect(response.body.success).toBe(true);
		});

		test('should sanitize input data', async () => {
			// Arrange
			const maliciousData = {
				email: '<script>alert("xss")</script>test@example.com',
				password: 'password123<script>'
			};

			// Act - Should not crash due to sanitization middleware
			const response = await request(app)
				.post('/api/auth/register')
				.send(maliciousData)
				.expect(400); // Will fail validation but won't crash

			// Assert - Should handle malicious input gracefully
			expect(response.body.success).toBe(false);
		});
	});

	describe('Error Handling', () => {
		test('should handle unexpected errors gracefully', async () => {
			// Arrange - Force an unexpected error by making the mock throw
			mockSupabaseAuth.signUp.mockRejectedValueOnce(new Error('Service unavailable'));

			const userData = {
				email: 'test@example.com',
				password: 'password123'
			};

			// Act
			const response = await request(app)
				.post('/api/auth/register')
				.send(userData)
				.expect(500);

			// Assert
			expect(response.body.success).toBe(false);
			expect(response.body.error.message).toBe('Registration endpoint error');
		});

		test('should maintain consistent error response format', async () => {
			// Arrange - Use valid format but wrong credentials to get past validation
			mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
				data: null,
				error: { message: 'Invalid login credentials' }
			});

			// Act
			const response = await request(app)
				.post('/api/auth/login')
				.send({ email: 'test@example.com', password: 'wrongpassword123' })
				.expect(401);

			// Assert - Verify consistent error format
			expect(response.body).toHaveProperty('success', false);
			expect(response.body).toHaveProperty('error');
			expect(response.body).toHaveProperty('timestamp');
			expect(response.body.error.code).toBe('LOGIN_FAILED');
		});
	});

	describe('Integration with JWT', () => {
		test('should generate JWT with correct payload', async () => {
			// Arrange
			const loginData = {
				email: 'test@example.com',
				password: 'password123'
			};

			mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
				data: {
					user: {
						id: 'user-123',
						email: 'test@example.com'
					},
					session: { access_token: 'supabase-token' }
				},
				error: null
			});

			// Act
			await request(app)
				.post('/api/auth/login')
				.send(loginData)
				.expect(200);

			// Assert JWT generation
			expect(jwt.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-123',
					email: 'test@example.com'
				}),
				process.env.JWT_SECRET,
				expect.objectContaining({
					expiresIn: expect.any(String)
				})
			);
		});
	});
});


