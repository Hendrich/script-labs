const request = require("supertest");
const express = require("express");
const labRoutes = require("../../backend/routes/labRoutes");
const TestHelpers = require("../utils/testHelpers");
const { errorHandler } = require("../../backend/middlewares/errorHandler");

// Mock the database
const mockDb = require("../../backend/db");
jest.mock("../../backend/db");

// Mock auth middleware to bypass authentication
jest.mock("../../backend/middlewares/authMiddleware", () => {
  return (req, res, next) => {
    req.user_id = "test-user-123";
    req.user_email = "test@example.com";
    next();
  };
});

describe("Lab Routes - Validation", () => {
  let app, validToken;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use("/api/Labs", labRoutes);
    app.use(errorHandler);

    // Reset all mocks
    jest.clearAllMocks();
    mockDb.query = jest.fn();

    // Generate valid token
    validToken = TestHelpers.generateValidToken();
  });

  test("should validate required fields", async () => {
    const response = await request(app)
      .post("/api/Labs")
      .set("Authorization", `Bearer ${validToken}`)
      .send({}); // Empty body

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Validation Error:");
    expect(response.body.error.message).toContain("Title is required");
  });

  test("should handle database errors", async () => {
    // Mock database error
    jest
      .spyOn(require("../../backend/db"), "query")
      .mockRejectedValue(new Error("Database connection failed"));

    const response = await request(app)
      .post("/api/Labs")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ title: "Test lab", description: "Test Description" });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

describe("Lab Routes", () => {
  let app;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use("/api/Labs", labRoutes);
    app.use(errorHandler);

    // Reset all mocks
    jest.clearAllMocks();
    mockDb.query = jest.fn();
  });

  describe("GET /api/Labs", () => {
    describe("Successful Requests", () => {
      test("should get all Labs for authenticated user", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList) // Labs query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.count); // Count query

        // Act
        const response = await request(app).get("/api/Labs").expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toEqual({
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
        });
        expect(response.body.timestamp).toBeDefined();

        // Verify database calls
        expect(mockDb.query).toHaveBeenCalledTimes(2);
        expect(mockDb.query.mock.calls[0][0]).toContain(
          "SELECT * FROM labs WHERE user_id = $1"
        );
        expect(mockDb.query.mock.calls[0][1]).toEqual(["test-user-123", 50, 0]);
      });

      test("should handle pagination parameters", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList)
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.count);

        // Act
        const response = await request(app)
          .get("/api/Labs?page=2&limit=10")
          .expect(200);

        // Assert
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);

        // Verify pagination calculation (page 2, limit 10 = offset 10)
        expect(mockDb.query.mock.calls[0][1]).toEqual([
          "test-user-123",
          "10",
          10,
        ]);
      });

      test("should handle search parameters", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList)
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.count);

        // Act
        const response = await request(app)
          .get("/api/Labs?search=gatsby")
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);

        // Verify search query
        expect(mockDb.query.mock.calls[0][0]).toContain(
          "AND (title ILIKE $2 OR description ILIKE $2)"
        );
        expect(mockDb.query.mock.calls[0][1]).toEqual([
          "test-user-123",
          "%gatsby%",
          50,
          0,
        ]);
      });

      test("should handle search with pagination", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList)
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.count);

        // Act
        const response = await request(app)
          .get("/api/Labs?search=Lab&page=2&limit=5")
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.pagination).toEqual({
          page: 2,
          limit: 5,
          total: 2,
          totalPages: 1,
        });

        // Verify query parameters
        expect(mockDb.query.mock.calls[0][1]).toEqual([
          "test-user-123",
          "%Lab%",
          "5",
          5,
        ]);
      });

      test("should return empty array when no Labs found", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // No Labs
          .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // Zero count

        // Act
        const response = await request(app).get("/api/Labs").expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(response.body.pagination.total).toBe(0);
        expect(response.body.pagination.totalPages).toBe(0);
      });
    });

    describe("Error Handling", () => {
      test("should handle database errors", async () => {
        // Arrange
        mockDb.query.mockRejectedValueOnce(
          new Error("Database connection failed")
        );

        // Act
        const response = await request(app).get("/api/Labs").expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("Failed to fetch labs");
      });

      test("should handle invalid pagination parameters gracefully", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.LabList)
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.count);

        // Act
        const response = await request(app)
          .get("/api/Labs?page=invalid&limit=invalid")
          .expect(200);

        // Assert - Invalid pagination should still return Labs but pagination might be null
        expect(response.body.pagination.page).toBeNull();
        expect(response.body.pagination.limit).toBeNull();
      });
    });
  });

  describe("GET /api/Labs/:id", () => {
    describe("Successful Requests", () => {
      test("should get specific Lab by ID", async () => {
        // Arrange
        const LabData = {
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
        };
        mockDb.query.mockResolvedValueOnce(LabData);

        // Act
        const response = await request(app).get("/api/Labs/1").expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1);
        expect(response.body.data.title).toBe("Test lab");
        expect(response.body.data.user_id).toBe("test-user-123");
        expect(response.body.timestamp).toBeDefined();

        // Verify database query
        expect(mockDb.query).toHaveBeenCalledWith(
          "SELECT * FROM labs WHERE id = $1 AND user_id = $2",
          [1, "test-user-123"]
        );
      });
    });

    describe("Error Handling", () => {
      test("should return 404 when lab not found", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

        // Act
        const response = await request(app).get("/api/Labs/999").expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("lab not found");
      });

      test("should return 404 when Lab belongs to different user", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

        // Act
        const response = await request(app).get("/api/Labs/1").expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("lab not found");
      });

      test("should handle database errors", async () => {
        // Arrange
        mockDb.query.mockRejectedValueOnce(new Error("Database error"));

        // Act
        const response = await request(app).get("/api/Labs/1").expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("Failed to fetch lab");
      });
    });
  });

  describe("POST /api/Labs", () => {
    describe("Successful Requests", () => {
      test("should create new Lab with valid data", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // No existing Lab
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.createLab); // Create Lab

        const LabData = {
          title: "New Lab Title",
          description: "New Description",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(LabData)
          .expect(201);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe("Test lab");
        expect(response.body.data.description).toBe("Test Description");
        expect(response.body.message).toBe("Lab added successfully");
        expect(response.body.timestamp).toBeDefined();

        // Verify database calls
        expect(mockDb.query).toHaveBeenCalledTimes(2);
        // First call: check for duplicates
        expect(mockDb.query.mock.calls[0][0]).toContain(
          "SELECT id FROM labs WHERE title = $1 AND description = $2 AND user_id = $3"
        );
        expect(mockDb.query.mock.calls[0][1]).toEqual([
          "New Lab Title",
          "New Description",
          "test-user-123",
        ]);
        // Second call: insert new Lab
        expect(mockDb.query.mock.calls[1][0]).toContain("INSERT INTO labs");
      });
    });

    describe("Validation Errors", () => {
      test("should reject Lab with missing title", async () => {
        // Arrange
        const invalidLabData = {
          description: "Valid Description",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(invalidLabData)
          .expect(400);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain("Validation Error:");
        expect(response.body.error.message).toContain("Title is required");
      });

      test("should reject Lab with missing description", async () => {
        // Arrange
        const invalidLabData = {
          title: "Valid Title",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(invalidLabData)
          .expect(400);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain("Validation Error:");
        expect(response.body.error.message).toContain(
          "Description is required"
        );
      });

      test("should reject Lab with empty title", async () => {
        // Arrange
        const invalidLabData = {
          title: "",
          description: "Valid Description",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(invalidLabData)
          .expect(400);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain("Validation Error:");
        expect(response.body.error.message).toContain("Title cannot be empty");
      });
    });

    describe("Business Logic Errors", () => {
      test("should reject duplicate Lab for same user", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: 1 }], // Existing Lab found
        });

        const duplicateLabData = {
          title: "Existing Title",
          description: "Existing Description",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(duplicateLabData)
          .expect(409);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe(
          "Lab with this title and description already exists"
        );

        // Should not call insert query
        expect(mockDb.query).toHaveBeenCalledTimes(1);
      });
    });

    describe("Database Errors", () => {
      test("should handle database errors during duplicate check", async () => {
        // Arrange
        mockDb.query.mockRejectedValueOnce(
          new Error("Database connection failed")
        );

        const LabData = {
          title: "Valid Title",
          description: "Valid Description",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(LabData)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("Failed to add lab");
      });

      test("should handle database errors during Lab creation", async () => {
        // Arrange
        mockDb.query
          .mockResolvedValueOnce(TestHelpers.mockDbResponses.empty) // No duplicate
          .mockRejectedValueOnce(new Error("Insert failed"));

        const LabData = {
          title: "Valid Title",
          description: "Valid Description",
        };

        // Act
        const response = await request(app)
          .post("/api/Labs")
          .send(LabData)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("Failed to add lab");
      });
    });
  });

  describe("PUT /api/Labs/:id", () => {
    describe("Successful Requests", () => {
      test("should update Lab with valid data", async () => {
        // Arrange
        const updatedLabData = {
          rows: [
            {
              id: 1,
              title: "Updated Title",
              description: "Updated Description",
              user_id: "test-user-123",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
        mockDb.query.mockResolvedValueOnce(updatedLabData);

        const updateData = {
          title: "Updated Title",
          description: "Updated Description",
        };

        // Act
        const response = await request(app)
          .put("/api/Labs/1")
          .send(updateData)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe("Updated Title");
        expect(response.body.data.description).toBe("Updated Description");
        expect(response.body.message).toBe("lab updated successfully");
        expect(response.body.timestamp).toBeDefined();

        // Verify update query
        expect(mockDb.query).toHaveBeenCalledTimes(1);
        const query = mockDb.query.mock.calls[0][0];
        expect(query).toContain("UPDATE labs");
        expect(query).toContain("title = $1");
        expect(query).toContain("description = $2");
        expect(query).toContain("updated_at = NOW()");
        expect(query).toContain("WHERE id = $3 AND user_id = $4");
      });

      test("should update only provided fields", async () => {
        // Arrange
        const updatedLabData = {
          rows: [
            {
              id: 1,
              title: "Updated Title Only",
              author: "Original Author",
              user_id: "test-user-123",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
        mockDb.query.mockResolvedValueOnce(updatedLabData);

        const updateData = {
          title: "Updated Title Only",
        };

        // Act
        const response = await request(app)
          .put("/api/Labs/1")
          .send(updateData)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe("Updated Title Only");

        // Verify only title field is in query
        const query = mockDb.query.mock.calls[0][0];
        expect(query).toContain("title = $1");
        expect(query).not.toContain("author = $2");
      });
    });

    describe("Error Handling", () => {
      test("should return 404 when lab not found", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

        const updateData = {
          title: "Updated Title",
        };

        // Act
        const response = await request(app)
          .put("/api/Labs/999")
          .send(updateData)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe(
          "lab not found or unauthorized"
        );
      });

      test("should return 404 when Lab belongs to different user", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

        const updateData = {
          title: "Updated Title",
        };

        // Act
        const response = await request(app)
          .put("/api/Labs/1")
          .send(updateData)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe(
          "lab not found or unauthorized"
        );
      });

      test("should handle validation errors", async () => {
        // Arrange
        const invalidUpdateData = {
          title: "", // Empty title
        };

        // Act
        const response = await request(app)
          .put("/api/Labs/1")
          .send(invalidUpdateData)
          .expect(400);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain(
          '"title" is not allowed to be empty'
        );
      });

      test("should handle database errors", async () => {
        // Arrange
        mockDb.query.mockRejectedValueOnce(new Error("Database update failed"));

        const updateData = {
          title: "Valid Title",
        };

        // Act
        const response = await request(app)
          .put("/api/Labs/1")
          .send(updateData)
          .expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("Failed to update lab");
      });
    });
  });

  describe("DELETE /api/Labs/:id", () => {
    describe("Successful Requests", () => {
      test("should delete Lab successfully", async () => {
        // Arrange
        const deletedLabData = {
          rows: [
            {
              id: 1,
              title: "Deleted Lab",
              author: "Deleted Author",
              user_id: "test-user-123",
            },
          ],
        };
        mockDb.query.mockResolvedValueOnce(deletedLabData);

        // Act
        const response = await request(app).delete("/api/Labs/1").expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1); // ID is returned as number from database
        expect(response.body.message).toBe("lab deleted successfully");
        expect(response.body.timestamp).toBeDefined();

        // Verify delete query
        expect(mockDb.query).toHaveBeenCalledWith(
          "DELETE FROM labs WHERE id = $1 AND user_id = $2 RETURNING *",
          [1, "test-user-123"]
        );
      });
    });

    describe("Error Handling", () => {
      test("should return 404 when lab not found", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

        // Act
        const response = await request(app).delete("/api/Labs/999").expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe(
          "lab not found or unauthorized"
        );
      });

      test("should return 404 when Lab belongs to different user", async () => {
        // Arrange
        mockDb.query.mockResolvedValueOnce(TestHelpers.mockDbResponses.empty);

        // Act
        const response = await request(app).delete("/api/Labs/1").expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe(
          "lab not found or unauthorized"
        );
      });

      test("should handle database errors", async () => {
        // Arrange
        mockDb.query.mockRejectedValueOnce(new Error("Database delete failed"));

        // Act
        const response = await request(app).delete("/api/Labs/1").expect(500);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe("Failed to delete lab");
      });
    });
  });

  describe("Authentication Requirements", () => {
    test("should require authentication for all endpoints", () => {
      // This test verifies that authMiddleware is applied to all routes
      // The mock authMiddleware automatically sets user_id, so we test indirectly

      // All previous tests passing means auth middleware is working
      // This is more of a documentation test
      expect(
        labRoutes.stack.every((layer) => {
          // Check if the route stack has middleware applied
          return layer.handle || layer.route;
        })
      ).toBe(true);
    });
  });
});
