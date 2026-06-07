const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../../backend/db");
const { errorHandler } = require("../../backend/middlewares/errorHandler");

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

    req.user_id = "11111111-1111-1111-1111-111111111111";
    req.user_email = "standard_user@example.com";
    req.token_expires = "N/A";
    req.user = {
      userId: req.user_id,
      email: req.user_email,
    };
    next();
  }
);

const authRoutes = require("../../backend/routes/authRoutes");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use(errorHandler);
  return app;
};

describe("Auth Routes - Local PostgreSQL Auth", () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();

    jwt.sign.mockReturnValue("mock.jwt.token");
    bcrypt.hash.mockResolvedValue("hashed.password");
    bcrypt.compare.mockResolvedValue(true);
  });

  describe("POST /api/auth/register", () => {
    test("should register a new local user successfully", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              email: "new_user@example.com",
              role: "user",
              status: "active",
              created_at: new Date(),
            },
          ],
        });

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "NEW_USER@example.com", password: "script_sauce" })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.token).toBe("mock.jwt.token");
      expect(response.body.data.user.email).toBe("new_user@example.com");
      expect(response.body.data.user.role).toBe("user");
      expect(response.body.data.user.status).toBe("active");
      expect(response.body.data.requiresConfirmation).toBe(false);

      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        "SELECT id FROM users WHERE email = $1",
        ["new_user@example.com"]
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("script_sauce", 12);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "11111111-1111-1111-1111-111111111111",
          email: "new_user@example.com",
          role: "user",
          status: "active",
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.any(String) })
      );
    });

    test("should reject duplicate email registration", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: "11111111-1111-1111-1111-111111111111" }],
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "standard_user@example.com", password: "script_sauce" })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("EMAIL_EXISTS");
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test("should validate register payload", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "invalid-email", password: "123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Validation Error");
    });

    test("should handle database errors on register", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database unavailable"));

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "new_user@example.com", password: "script_sauce" })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Registration endpoint error");
    });
  });

  describe("POST /api/auth/login", () => {
    test("should login an active local user successfully", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            email: "standard_user@example.com",
            password_hash: "hashed.password",
            role: "user",
            status: "active",
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "STANDARD_USER@example.com", password: "script_sauce" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data.token).toBe("mock.jwt.token");
      expect(response.body.data.user.email).toBe("standard_user@example.com");
      expect(response.body.data.user.status).toBe("active");
      expect(bcrypt.compare).toHaveBeenCalledWith("script_sauce", "hashed.password");
    });

    test("should reject unknown user", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "missing@example.com", password: "script_sauce" })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("AUTH_FAILED");
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("should reject invalid password", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            email: "standard_user@example.com",
            password_hash: "hashed.password",
            role: "user",
            status: "active",
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "standard_user@example.com", password: "wrong_password" })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("AUTH_FAILED");
    });

    test("should reject locked user", async () => {
      pool.query.mockResolvedValueOnce({
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
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("should validate login payload", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "invalid-email", password: "123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Validation Error");
    });
  });

  describe("POST /api/auth/logout", () => {
    test("should return stateless JWT logout message", async () => {
      const response = await request(app).post("/api/auth/logout").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Logout successful. Remove the token on the client side."
      );
      expect(response.body.data.note).toBe("This API uses stateless JWT auth.");
    });
  });

  describe("GET /api/auth/me", () => {
    test("should return current user from users table", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            email: "standard_user@example.com",
            role: "user",
            status: "active",
            created_at: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer valid.token")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("standard_user@example.com");
      expect(response.body.data.user.status).toBe("active");
    });

    test("should require authentication for me endpoint", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);
      expect(response.body.message).toBe("No token provided");
    });
  });

  describe("POST /api/auth/verify-token", () => {
    test("should verify valid token", async () => {
      const response = await request(app)
        .post("/api/auth/verify-token")
        .set("Authorization", "Bearer valid.token")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user_id).toBe("11111111-1111-1111-1111-111111111111");
      expect(response.body.data.email).toBe("standard_user@example.com");
      expect(response.body.message).toBe("Token is valid");
    });

    test("should reject invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/verify-token")
        .set("Authorization", "Bearer invalid.token")
        .expect(401);

      expect(response.body.message).toBe("Invalid token");
    });
  });
});
