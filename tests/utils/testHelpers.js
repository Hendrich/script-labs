const jwt = require("jsonwebtoken");
const request = require("supertest");

/**
 * Test utilities for unit and integration tests
 */

class TestHelpers {
  /**
   * Generate a valid JWT token for testing
   */
  static generateValidToken(payload = {}) {
    const defaultPayload = {
      userId: "test-user-123",
      email: "test@example.com",
      ...payload,
    };

    return jwt.sign(defaultPayload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  /**
   * Generate an expired JWT token for testing
   */
  static generateExpiredToken(payload = {}) {
    const defaultPayload = {
      userId: "test-user-123",
      email: "test@example.com",
      ...payload,
    };

    return jwt.sign(defaultPayload, process.env.JWT_SECRET, {
      expiresIn: "-1h",
    });
  }

  /**
   * Generate an invalid JWT token for testing
   */
  static generateInvalidToken() {
    return "invalid.jwt.token";
  }

  /**
   * Create mock request object
   */
  static createMockRequest(options = {}) {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      ...options,
    };
  }

  /**
   * Create mock response object
   */
  static createMockResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  }

  /**
   * Create mock next function
   */
  static createMockNext() {
    return jest.fn();
  }

  /**
   * Mock database query responses
   */
  static mockDbResponses = {
    // Mock successful lab creation
    createLab: {
      rows: [
        {
          id: 1,
          title: "Test lab",
          description: "Test Description",
          user_id: "test-user-123",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    },

    // Mock lab list
    LabList: {
      rows: [
        {
          id: 1,
          title: "Test lab 1",
          description: "Test Description 1",
          user_id: "test-user-123",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          title: "Test lab 2",
          description: "Test Description 2",
          user_id: "test-user-123",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    },

    // Mock empty result
    empty: {
      rows: [],
    },

    // Mock count result
    count: {
      rows: [{ count: "2" }],
    },
  };

  /**
   * Sample test data
   */
  static sampleData = {
    validBook: {
      title: "Sample lab Title",
      description: "Sample Description",
    },

    invalidBook: {
      title: "", // Invalid: empty title
      description: "A".repeat(1001), // Invalid: too long
    },

    validUser: {
      email: "test@example.com",
      password: "password123",
    },

    invalidUser: {
      email: "invalid-email", // Invalid email format
      password: "123", // Too short password
    },
  };

  /**
   * Assert error response format
   */
  static assertErrorResponse(response, expectedStatus, expectedMessage) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
    expect(response.body).toHaveProperty("timestamp");

    if (expectedMessage) {
      expect(response.body.error.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert success response format
   */
  static assertSuccessResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("timestamp");
  }

  /**
   * Wait for async operations
   */
  static async sleep(ms = 100) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create test app instance for integration tests
   */
  static createTestApp() {
    // We'll implement this when creating integration tests
    return null;
  }
}

module.exports = TestHelpers;
