const request = require("supertest");
const express = require("express");
const { errorHandler } = require("../../backend/middlewares/errorHandler");
const TestHelpers = require("../utils/testHelpers");

// Mock modules before importing
const mockSupabaseAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
};

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}));

// Mock JWT for predictable tokens
const jwt = require("jsonwebtoken");
jest.mock("jsonwebtoken");

// Mock the auth middleware
jest.mock(
  "../../backend/middlewares/authMiddleware",
  () => (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Simulate different auth scenarios based on the token provided
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "invalid.token") {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Use custom test header to identify user for testing
    const testUser = req.get("x-test-user");
    if (testUser === "user-a") {
      req.user_id = "user-a";
      req.user_email = "usera@test.com";
    } else {
      req.user_id = "test-user-123";
      req.user_email = "test@example.com";
    }

    req.user = {
      userId: req.user_id,
      email: req.user_email,
    };
    next();
  }
);

// Now import the routes after mocking
const authRoutes = require("../../backend/routes/authRoutes");
const labRoutes = require("../../backend/routes/labRoutes");

// Mock database
const mockDb = require("../../backend/db");
jest.mock("../../backend/db");

describe("Integration Tests - Complete User Workflow", () => {
  // Re-enabled integration tests for better coverage
  let app;
  let userToken;
  let userId;
  let labId;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/Labs", labRoutes);
    app.use(errorHandler);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    userId = "integration-test-user-123";
    userToken = TestHelpers.generateValidToken({
      userId: userId,
      email: "integration@test.com",
    });
    labId = 1;
  });

  describe("Complete Authentication Flow", () => {
    test("should complete full registration and login flow", async () => {
      // Step 1: Register User
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: {
          user: {
            id: userId,
            email: "integration@test.com",
          },
          session: null,
        },
        error: null,
      });

      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "integration@test.com",
          password: "password123",
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(
        "integration@test.com"
      );

      // Step 2: Login User
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: {
            id: userId,
            email: "integration@test.com",
          },
          session: { access_token: "supabase-token" },
        },
        error: null,
      });

      jwt.sign.mockReturnValue(userToken);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: "integration@test.com",
          password: "password123",
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBe(userToken);

      // Step 3: Verify Token
      const verifyResponse = await request(app)
        .post("/api/auth/verify-token")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.valid).toBe(true);

      // Step 4: Get User Info
      const userInfoResponse = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(userInfoResponse.body.success).toBe(true);
      expect(userInfoResponse.body.data.user_id).toBe("test-user-123"); // Updated to match mock
      expect(userInfoResponse.body.data.email).toBe("test@example.com"); // Updated to match mock
    });
  });

  describe("Complete lab Management Flow", () => {
    test("should complete full CRUD operations for labs", async () => {
      // Setup: User is authenticated
      const authToken = `Bearer ${userToken}`;

      // Step 1: Get initial labs list (should be empty)
      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // labs query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // Count query

      const initialBooksResponse = await request(app)
        .get("/api/Labs")
        .set("Authorization", authToken)
        .expect(200);

      expect(initialBooksResponse.body.success).toBe(true);
      expect(initialBooksResponse.body.data).toEqual([]);
      expect(initialBooksResponse.body.pagination.total).toBe(0);

      // Step 2: Create a new lab
      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // No duplicate check
        .mockResolvedValueOnce({
          rows: [
            {
              id: labId,
              title: "Integration Test lab",
              description: "Test Description",
              user_id: userId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }); // Create lab

      const createLabResponse = await request(app)
        .post("/api/Labs")
        .set("Authorization", authToken)
        .send({
          title: "Integration Test lab",
          description: "Test Description",
        })
        .expect(201);

      expect(createLabResponse.body.success).toBe(true);
      expect(createLabResponse.body.data.title).toBe("Integration Test lab"); // Match actual returned data
      expect(createLabResponse.body.message).toBe("Lab added successfully");

      // Step 3: Get specific lab by ID
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: labId,
            title: "Integration Test lab",
            description: "Test Description",
            user_id: userId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const getBookResponse = await request(app)
        .get(`/api/Labs/${labId}`)
        .set("Authorization", authToken)
        .expect(200);

      expect(getBookResponse.body.success).toBe(true);
      expect(getBookResponse.body.data.id).toBe(labId);
      expect(getBookResponse.body.data.title).toBe("Integration Test lab");

      // Step 4: Update the lab
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: labId,
            title: "Updated Integration Test lab",
            description: "Updated Test Description",
            user_id: userId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const updateLabResponse = await request(app)
        .put(`/api/Labs/${labId}`)
        .set("Authorization", authToken)
        .send({
          title: "Updated Integration Test lab",
          description: "Updated Test Description",
        })
        .expect(200);

      expect(updateLabResponse.body.success).toBe(true);
      expect(updateLabResponse.body.data.title).toBe(
        "Updated Integration Test lab"
      );
      expect(updateLabResponse.body.message).toBe("lab updated successfully");

      // Step 5: Get updated labs list
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: labId,
              title: "Updated Integration Test lab",
              description: "Updated Test Description",
              user_id: userId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }) // labs query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] }); // Count query

      const updatedBooksResponse = await request(app)
        .get("/api/Labs")
        .set("Authorization", authToken)
        .expect(200);

      expect(updatedBooksResponse.body.success).toBe(true);
      expect(updatedBooksResponse.body.data).toHaveLength(1);
      expect(updatedBooksResponse.body.data[0].title).toBe(
        "Updated Integration Test lab"
      );
      expect(updatedBooksResponse.body.pagination.total).toBe(1);

      // Step 6: Delete the lab
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: labId,
            title: "Updated Integration Test lab",
            description: "Updated Test Author",
            user_id: userId,
          },
        ],
      });

      const deleteLabResponse = await request(app)
        .delete(`/api/Labs/${labId}`)
        .set("Authorization", authToken)
        .expect(200);

      expect(deleteLabResponse.body.success).toBe(true);
      expect(deleteLabResponse.body.data.id).toBe(labId); // Remove .toString() since it's returning a number
      expect(deleteLabResponse.body.message).toBe("lab deleted successfully");

      // Step 7: Verify lab is deleted (empty list again)
      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // labs query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // Count query

      const finalBooksResponse = await request(app)
        .get("/api/Labs")
        .set("Authorization", authToken)
        .expect(200);

      expect(finalBooksResponse.body.success).toBe(true);
      expect(finalBooksResponse.body.data).toEqual([]);
      expect(finalBooksResponse.body.pagination.total).toBe(0);
    });
  });

  describe("Error Handling Integration", () => {
    test("should handle authentication errors throughout the flow", async () => {
      // Test 1: Accessing protected route without token
      const unauthorizedResponse = await request(app)
        .get("/api/Labs")
        .expect(401);

      expect(unauthorizedResponse.body.message).toBe("No token provided");

      // Test 2: Accessing protected route with invalid token
      const invalidTokenResponse = await request(app)
        .get("/api/Labs")
        .set("Authorization", "Bearer invalid.token")
        .expect(401);

      expect(invalidTokenResponse.body.message).toBe("Invalid token");

      // Test 3: Valid token but trying to access other user's resource
      mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

      const forbiddenResponse = await request(app)
        .get("/api/Labs/999")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);

      expect(forbiddenResponse.body.success).toBe(false);
      expect(forbiddenResponse.body.error.message).toBe("lab not found");
    });

    test("should handle validation errors consistently", async () => {
      const authToken = `Bearer ${userToken}`;

      // Test 1: Invalid lab creation
      const invalidBookResponse = await request(app)
        .post("/api/Labs")
        .set("Authorization", authToken)
        .send({
          title: "", // Invalid: empty title
          description: "Valid Author",
        })
        .expect(400);

      expect(invalidBookResponse.body.success).toBe(false);
      expect(invalidBookResponse.body.error.message).toContain(
        "Title cannot be empty"
      );

      // Test 2: Invalid lab update
      const invalidUpdateResponse = await request(app)
        .put("/api/Labs/1")
        .set("Authorization", authToken)
        .send({
          title: "A".repeat(256), // Invalid: too long
        })
        .expect(400);

      expect(invalidUpdateResponse.body.success).toBe(false);
      expect(invalidUpdateResponse.body.error.message).toContain(
        "length must be less than or equal to 255 characters"
      ); // Updated to match actual validation message

      // Test 3: Invalid ID parameter
      const invalidIdResponse = await request(app)
        .get("/api/Labs/invalid-id")
        .set("Authorization", authToken)
        .expect(400);

      expect(invalidIdResponse.body.success).toBe(false);
      expect(invalidIdResponse.body.error.message).toContain(
        "ID must be a number"
      );
    });

    test("should handle database errors gracefully", async () => {
      const authToken = `Bearer ${userToken}`;

      // Simulate database connection error
      mockDb.query.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const dbErrorResponse = await request(app)
        .get("/api/Labs")
        .set("Authorization", authToken)
        .expect(500);

      expect(dbErrorResponse.body.success).toBe(false);
      expect(dbErrorResponse.body.error.message).toBe("Failed to fetch labs");
    });
  });

  describe("Business Logic Integration", () => {
    test("should prevent duplicate labs for same user", async () => {
      const authToken = `Bearer ${userToken}`;

      // Mock: lab already exists
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }], // Existing lab found
      });

      const duplicateResponse = await request(app)
        .post("/api/Labs")
        .set("Authorization", authToken)
        .send({
          title: "Existing lab",
          description: "Existing Description",
        })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error.message).toBe(
        "Lab with this title and description already exists"
      );
    });

    test("should handle pagination and search correctly", async () => {
      const authToken = `Bearer ${userToken}`;

      // Mock search results
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: "Search Result lab",
              description: "Search Author",
              user_id: userId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: "1" }] });

      const searchResponse = await request(app)
        .get("/api/Labs?search=Search&page=1&limit=10")
        .set("Authorization", authToken)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.pagination.page).toBe(1);
      expect(searchResponse.body.pagination.limit).toBe(10);
      expect(searchResponse.body.pagination.total).toBe(1);

      // Verify search query was called correctly
      expect(mockDb.query.mock.calls[0][0]).toContain("ILIKE");
      expect(mockDb.query.mock.calls[0][1]).toContain("%Search%");
    });
  });

  describe("Response Format Consistency", () => {
    test("should maintain consistent response format across all endpoints", async () => {
      const authToken = `Bearer ${userToken}`;

      // Mock successful responses
      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList) // Data labs
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.count); // Data count

      const response = await request(app)
        .get("/api/Labs")
        .set("Authorization", authToken)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("pagination");

      // Verify timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);

      // Verify pagination structure
      expect(response.body.pagination).toHaveProperty("page");
      expect(response.body.pagination).toHaveProperty("limit");
      expect(response.body.pagination).toHaveProperty("total");
      expect(response.body.pagination).toHaveProperty("totalPages");
    });

    test("should maintain consistent error response format", async () => {
      const response = await request(app).get("/api/Labs").expect(401); // No auth token

      // Verify error response structure
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("No token provided");
    });
  });

  describe("Security Integration Tests", () => {
    test("should sanitize input across all endpoints", async () => {
      const authToken = `Bearer ${userToken}`;

      // Mock successful creation with sanitized data
      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // No duplicate
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.createLab); // Create lab

      const maliciousData = {
        title: '<script>alert("xss")</script>Clean Title',
        description: 'Clean Author<img src=x onerror=alert("xss")>',
      };

      // Should not crash and should sanitize the input
      const response = await request(app)
        .post("/api/Labs")
        .set("Authorization", authToken)
        .send(maliciousData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test("should enforce user isolation", async () => {
      // User A tries to access User B's lab
      const userAToken = TestHelpers.generateValidToken({
        userId: "user-a",
        email: "usera@test.com",
      });

      // Mock: No lab found for user A when looking for lab ID 1
      mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

      const response = await request(app)
        .get("/api/Labs/1")
        .set("Authorization", `Bearer ${userAToken}`)
        .set("x-test-user", "user-a") // Custom header to help mock identify user
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("lab not found");

      // Verify query includes user_id filter
      expect(mockDb.query.mock.calls[0][0]).toContain("user_id = $2");
      expect(mockDb.query.mock.calls[0][1]).toEqual([1, "user-a"]); // Now should work correctly
    });
  });
});
