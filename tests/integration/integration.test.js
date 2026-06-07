const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { errorHandler } = require("../../backend/middlewares/errorHandler");
const TestHelpers = require("../utils/testHelpers");

jest.mock("../../backend/db");
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

jest.mock(
  "../../backend/middlewares/authMiddleware",
  () => (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "invalid.token") {
      return res.status(401).json({ message: "Invalid token" });
    }

    const testUser = req.get("x-test-user");
    if (testUser === "user-a") {
      req.user_id = "user-a";
      req.user_email = "usera@test.com";
    } else {
      req.user_id = "11111111-1111-1111-1111-111111111111";
      req.user_email = "integration@test.com";
    }

    req.user = {
      userId: req.user_id,
      email: req.user_email,
    };
    next();
  }
);

const mockDb = require("../../backend/db");
const authRoutes = require("../../backend/routes/authRoutes");
const labRoutes = require("../../backend/routes/labRoutes");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/labs", labRoutes);
  app.use(errorHandler);
  return app;
};

describe("Integration Tests - Local Auth and Labs Workflow", () => {
  let app;
  let userToken;
  let userId;
  let labId;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();

    userId = "11111111-1111-1111-1111-111111111111";
    userToken = "integration.jwt.token";
    labId = 1;

    bcrypt.hash.mockResolvedValue("hashed.password");
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue(userToken);
  });

  describe("Complete Authentication Flow", () => {
    test("should complete registration, login, token verification, and profile flow", async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: userId,
              email: "integration@test.com",
              role: "user",
              status: "active",
              created_at: new Date(),
            },
          ],
        });

      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({ email: "integration@test.com", password: "script_sauce" })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe("integration@test.com");
      expect(registerResponse.body.data.token).toBe(userToken);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: "integration@test.com",
            password_hash: "hashed.password",
            role: "user",
            status: "active",
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: "integration@test.com", password: "script_sauce" })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBe(userToken);
      expect(loginResponse.body.data.user.status).toBe("active");

      const verifyResponse = await request(app)
        .post("/api/auth/verify-token")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.valid).toBe(true);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: "integration@test.com",
            role: "user",
            status: "active",
            created_at: new Date(),
          },
        ],
      });

      const userInfoResponse = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(userInfoResponse.body.success).toBe(true);
      expect(userInfoResponse.body.data.user.email).toBe("integration@test.com");
    });

    test("should reject locked user during login", async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: "22222222-2222-2222-2222-222222222222",
            email: "locked_user@example.com",
            password_hash: "hashed.password",
            role: "user",
            status: "locked",
          },
        ],
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "locked_user@example.com", password: "script_sauce" })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_LOCKED");
    });
  });

  describe("Complete Labs Management Flow", () => {
    test("should complete full CRUD operations for labs", async () => {
      const authToken = `Bearer ${userToken}`;

      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty)
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const initialLabsResponse = await request(app)
        .get("/api/labs")
        .set("Authorization", authToken)
        .expect(200);

      expect(initialLabsResponse.body.success).toBe(true);
      expect(initialLabsResponse.body.data).toEqual([]);
      expect(initialLabsResponse.body.pagination.total).toBe(0);

      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty)
        .mockResolvedValueOnce({
          rows: [
            {
              id: labId,
              title: "Integration Test Lab",
              description: "Test Description",
              user_id: userId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        });

      const createLabResponse = await request(app)
        .post("/api/labs")
        .set("Authorization", authToken)
        .send({ title: "Integration Test Lab", description: "Test Description" })
        .expect(201);

      expect(createLabResponse.body.success).toBe(true);
      expect(createLabResponse.body.data.title).toBe("Integration Test Lab");
      expect(createLabResponse.body.message).toBe("Lab added successfully");

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: labId,
            title: "Integration Test Lab",
            description: "Test Description",
            user_id: userId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const getLabResponse = await request(app)
        .get(`/api/labs/${labId}`)
        .set("Authorization", authToken)
        .expect(200);

      expect(getLabResponse.body.success).toBe(true);
      expect(getLabResponse.body.data.id).toBe(labId);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: labId,
            title: "Updated Integration Test Lab",
            description: "Updated Test Description",
            user_id: userId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const updateLabResponse = await request(app)
        .put(`/api/labs/${labId}`)
        .set("Authorization", authToken)
        .send({
          title: "Updated Integration Test Lab",
          description: "Updated Test Description",
        })
        .expect(200);

      expect(updateLabResponse.body.success).toBe(true);
      expect(updateLabResponse.body.data.title).toBe("Updated Integration Test Lab");
      expect(updateLabResponse.body.message).toBe("lab updated successfully");

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: labId,
              title: "Updated Integration Test Lab",
              description: "Updated Test Description",
              user_id: userId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: "1" }] });

      const updatedLabsResponse = await request(app)
        .get("/api/labs")
        .set("Authorization", authToken)
        .expect(200);

      expect(updatedLabsResponse.body.success).toBe(true);
      expect(updatedLabsResponse.body.data).toHaveLength(1);
      expect(updatedLabsResponse.body.pagination.total).toBe(1);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: labId,
            title: "Updated Integration Test Lab",
            description: "Updated Test Description",
            user_id: userId,
          },
        ],
      });

      const deleteLabResponse = await request(app)
        .delete(`/api/labs/${labId}`)
        .set("Authorization", authToken)
        .expect(200);

      expect(deleteLabResponse.body.success).toBe(true);
      expect(deleteLabResponse.body.data.id).toBe(String(labId));
      expect(deleteLabResponse.body.message).toBe("lab deleted successfully");
    });
  });

  describe("Error Handling Integration", () => {
    test("should handle authentication errors throughout the flow", async () => {
      const unauthorizedResponse = await request(app).get("/api/labs").expect(401);
      expect(unauthorizedResponse.body.message).toBe("No token provided");

      const invalidTokenResponse = await request(app)
        .get("/api/labs")
        .set("Authorization", "Bearer invalid.token")
        .expect(401);
      expect(invalidTokenResponse.body.message).toBe("Invalid token");

      mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

      const notFoundResponse = await request(app)
        .get("/api/labs/999")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);

      expect(notFoundResponse.body.success).toBe(false);
      expect(notFoundResponse.body.error.message).toBe("lab not found");
    });

    test("should handle validation errors consistently", async () => {
      const authToken = `Bearer ${userToken}`;

      const invalidCreateResponse = await request(app)
        .post("/api/labs")
        .set("Authorization", authToken)
        .send({ title: "", description: "Valid Description" })
        .expect(400);

      expect(invalidCreateResponse.body.success).toBe(false);
      expect(invalidCreateResponse.body.error.message).toContain("Title cannot be empty");

      const invalidUpdateResponse = await request(app)
        .put("/api/labs/1")
        .set("Authorization", authToken)
        .send({ title: "A".repeat(256) })
        .expect(400);

      expect(invalidUpdateResponse.body.success).toBe(false);
      expect(invalidUpdateResponse.body.error.message).toContain(
        "length must be less than or equal to 255 characters"
      );

      const invalidIdResponse = await request(app)
        .get("/api/labs/invalid-id")
        .set("Authorization", authToken)
        .expect(400);

      expect(invalidIdResponse.body.success).toBe(false);
      expect(invalidIdResponse.body.error.message).toContain("ID must be a number");
    });

    test("should handle database errors gracefully", async () => {
      const authToken = `Bearer ${userToken}`;
      mockDb.query.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/labs")
        .set("Authorization", authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Failed to fetch labs");
    });
  });

  describe("Business Logic Integration", () => {
    test("should prevent duplicate labs for same user", async () => {
      const authToken = `Bearer ${userToken}`;

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const duplicateResponse = await request(app)
        .post("/api/labs")
        .set("Authorization", authToken)
        .send({ title: "Existing Lab", description: "Existing Description" })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error.message).toBe(
        "Lab with this title and description already exists"
      );
    });

    test("should handle pagination and search correctly", async () => {
      const authToken = `Bearer ${userToken}`;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: "Search Result Lab",
              description: "Search Description",
              user_id: userId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: "1" }] });

      const searchResponse = await request(app)
        .get("/api/labs?search=Search&page=1&limit=10")
        .set("Authorization", authToken)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.pagination.total).toBe(1);
      expect(mockDb.query.mock.calls[0][0]).toContain("ILIKE");
      expect(mockDb.query.mock.calls[0][1]).toContain("%Search%");
    });

    test("should enforce user isolation", async () => {
      const userAToken = "user-a.jwt.token";
      mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

      const response = await request(app)
        .get("/api/labs/1")
        .set("Authorization", `Bearer ${userAToken}`)
        .set("x-test-user", "user-a")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("lab not found");
      expect(mockDb.query.mock.calls[0][0]).toContain("user_id = $2");
      expect(mockDb.query.mock.calls[0][1]).toEqual(["1", "user-a"]);
    });
  });

  describe("Response Format Consistency", () => {
    test("should maintain consistent response format across labs endpoints", async () => {
      const authToken = `Bearer ${userToken}`;

      mockDb.query
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList)
        .mockResolvedValueOnce(TestHelpers.mockDbResponses.count);

      const response = await request(app)
        .get("/api/labs")
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("pagination");
    });
  });
});
