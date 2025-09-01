// Test environment setup
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_testing_only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test_anon_key';
process.env.PORT = '3001';

// Suppress console.log during tests (except errors)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
	// Only suppress console.log, keep console.error for debugging
	console.log = jest.fn();
});

afterEach(() => {
	// Restore console.log after each test
	console.log = originalConsoleLog;

	// Clear all mocks
	jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000); // Increased from 10000 to 30000

// Mock external dependencies that we don't want to test
jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			signUp: jest.fn(),
			signInWithPassword: jest.fn(),
			signOut: jest.fn(),
			getUser: jest.fn()
		}
	}))
}));

// Mock pg database connection
jest.mock('../../backend/db.js', () => ({
	query: jest.fn()
}));

// Global error handler for unhandled promises in tests
process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


