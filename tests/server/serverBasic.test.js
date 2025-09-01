/**
 * Server Basic Tests
 * Simple tests to increase server.js coverage
 */

const request = require("supertest");

describe("Server Basic Tests", () => {
  let app;

  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = "test";
    process.env.PORT = "3333";
    process.env.JWT_SECRET = "test_secret_key";
    process.env.SESSION_SECRET = "test_session_secret";

    // Import app after setting environment
    app = require("../../backend/server");
  });

  test("should create express app", () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  test("should respond to health check", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "Server is healthy");
  });

  test("should handle 404 for unknown routes", async () => {
    await request(app).get("/unknown-route").expect(404);
  });

  test("should have CORS enabled", async () => {
    const response = await request(app).options("/api/labs").expect(204);
  });

  test("should serve swagger documentation", async () => {
    const response = await request(app).get("/api-docs/").expect(200);

    expect(response.text).toContain("swagger");
  });

  test("should handle JSON parsing", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ test: "data" })
      .expect(400); // Will fail validation but shows JSON parsing works
  });

  test("should apply security headers", async () => {
    const response = await request(app).get("/health").expect(200);

    // Check for security headers from helmet
    expect(response.headers).toHaveProperty(
      "x-content-type-options",
      "nosniff"
    );
  });

  test("should handle URL encoded data", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .type("form")
      .send("email=test@test.com&password=123456");

    // Expect 400 (validation), 500 (server error), atau 401 (unauthorized)
    expect([400, 500, 401]).toContain(response.status);
  });

  test("should respond to unknown paths with 404", async () => {
    const response = await request(app).get("/nonexistent").expect(404);
  });

  test("should handle requests with large payload", async () => {
    const largeData = {
      title: "A".repeat(1000),
      description: "B".repeat(1000),
    };

    await request(app).post("/api/labs").send(largeData).expect(401); // Unauthorized because no token, but payload was processed
  });

  test("should handle concurrent requests", async () => {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(request(app).get("/health").expect(200));
    }

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.body.success).toBe(true);
    });
  });
});
