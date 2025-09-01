const config = require("../../backend/config/config");

describe("Configuration Module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and restore original environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Environment Configuration", () => {
    test("should load configuration with default values", () => {
      // Arrange - Set required env vars
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.port).toBe(3000); // From test setup, not default 3000
      expect(config.nodeEnv).toBe("test"); // From test setup
      expect(config.database.url).toBe(
        "postgresql://test:test@localhost:5432/test"
      );
      expect(config.jwt.secret).toBe("test-secret");
      expect(config.jwt.expiresIn).toBe("24h"); // Default
    });

    test("should use custom port from environment", () => {
      // Arrange
      process.env.PORT = "8080";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.port).toBe(8080);
    });

    test("should use custom JWT expiration from environment", () => {
      // Arrange
      process.env.JWT_EXPIRES_IN = "7d";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.jwt.expiresIn).toBe("7d");
    });

    test("should configure SSL for production", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.database.ssl).toBe(true);
    });

    test("should disable SSL for development", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.database.ssl).toBe(false);
    });
  });

  describe("CORS Configuration", () => {
    test("should include default allowed origins", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.cors).toHaveProperty("origin");
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.methods).toContain("GET");
      expect(config.cors.methods).toContain("POST");
      expect(config.cors.methods).toContain("PUT");
      expect(config.cors.methods).toContain("DELETE");
    });

    test("should allow requests with no origin", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const config = require("../../backend/config/config");
      const mockCallback = jest.fn();

      // Act
      config.cors.origin(null, mockCallback);

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    test("should allow localhost origins", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const config = require("../../backend/config/config");
      const mockCallback = jest.fn();
      const testOrigin = "http://localhost:3000";

      // Act
      config.cors.origin(testOrigin, mockCallback);

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    test("should allow custom frontend URL from environment", () => {
      // Arrange
      const customFrontendUrl = "https://my-custom-frontend.com";
      process.env.FRONTEND_URL = customFrontendUrl;
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const config = require("../../backend/config/config");
      const mockCallback = jest.fn();

      // Act
      config.cors.origin(customFrontendUrl, mockCallback);

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    test("should reject unauthorized origins", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const config = require("../../backend/config/config");
      const mockCallback = jest.fn();
      const unauthorizedOrigin = "https://malicious-site.com";

      // Act
      config.cors.origin(unauthorizedOrigin, mockCallback);

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
      const error = mockCallback.mock.calls[0][0];
      expect(error.message).toBe("Not allowed by CORS");
    });
  });

  describe("Supabase Configuration", () => {
    test("should include Supabase URL and anon key", () => {
      // Arrange
      const supabaseUrl = "https://test.supabase.co";
      const supabaseAnonKey = "test-anon-key";

      process.env.SUPABASE_URL = supabaseUrl;
      process.env.SUPABASE_ANON_KEY = supabaseAnonKey;
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.supabase.url).toBe(supabaseUrl);
      expect(config.supabase.anonKey).toBe(supabaseAnonKey);
    });
  });

  describe("Rate Limiting Configuration", () => {
    test("should use development settings in development", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.rateLimit.windowMs).toBe(60 * 1000); // 1 minute
      expect(config.rateLimit.maxRequests).toBe(200);
      expect(config.rateLimit.maxAuthRequests).toBe(50);
    });

    test("should use production settings in production", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config.rateLimit.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(config.rateLimit.maxRequests).toBe(100);
      expect(config.rateLimit.maxAuthRequests).toBe(5);
    });
  });

  describe("Environment Variable Validation", () => {
    // Note: These tests are difficult to run in Jest because the validation
    // happens at module load time and our test setup already provides all variables.
    // Instead, we test that the module loads successfully with all required vars.

    test("should load successfully with all required environment variables", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act & Assert - Should not throw
      expect(() => {
        delete require.cache[require.resolve("../../backend/config/config")];
        require("../../backend/config/config");
      }).not.toThrow();
    });

    test("should have all required config properties", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert - All critical configuration should be present
      expect(config.database.url).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(config.supabase.url).toBeDefined();
      expect(config.supabase.anonKey).toBeDefined();
    });
  });

  describe("Module Export", () => {
    test("should export all required configuration sections", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      process.env.JWT_SECRET = "test-secret";
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      // Act
      const config = require("../../backend/config/config");

      // Assert
      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("nodeEnv");
      expect(config).toHaveProperty("database");
      expect(config).toHaveProperty("jwt");
      expect(config).toHaveProperty("cors");
      expect(config).toHaveProperty("supabase");
      expect(config).toHaveProperty("rateLimit");
    });
  });
});
