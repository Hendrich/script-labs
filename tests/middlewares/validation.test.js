const {
  validateLab,
  validateAuth,
  validateId,
  validateLabUpdate,
  sanitize,
  schemas,
} = require("../../backend/middlewares/validation");
const TestHelpers = require("../utils/testHelpers");
const { AppError } = require("../../backend/middlewares/errorHandler");

describe("Validation Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = TestHelpers.createMockRequest();
    res = TestHelpers.createMockResponse();
    next = TestHelpers.createMockNext();
  });

  describe("validateLab", () => {
    describe("Valid lab Data", () => {
      test("should pass validation with valid lab data", () => {
        // Arrange
        req.body = {
          title: "The Great Gatsby",
          description: "A classic American novel",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.body.title).toBe("The Great Gatsby");
        expect(req.body.description).toBe("A classic American novel");
      });

      test("should trim whitespace from title and description", () => {
        // Arrange
        req.body = {
          title: "  The Great Gatsby  ",
          description: "  A classic American novel  ",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.title).toBe("The Great Gatsby");
        expect(req.body.description).toBe("A classic American novel");
      });

      test("should handle maximum length title and description", () => {
        // Arrange
        const maxTitle = "A".repeat(255);
        const maxDescription = "B".repeat(1000);
        req.body = {
          title: maxTitle,
          description: maxDescription,
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.title).toBe(maxTitle);
        expect(req.body.description).toBe(maxDescription);
      });
    });

    describe("Invalid lab Data", () => {
      test("should reject empty title", () => {
        // Arrange
        req.body = {
          title: "",
          description: "Valid Description",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Title cannot be empty");
        expect(error.statusCode).toBe(400);
      });

      test("should reject missing title", () => {
        // Arrange
        req.body = {
          Description: "Valid Description",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Title is required");
      });

      test("should reject title exceeding 255 characters", () => {
        // Arrange
        req.body = {
          title: "A".repeat(256),
          Description: "Valid Description",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Title cannot exceed 255 characters");
      });

      test("should reject empty Description", () => {
        // Arrange
        req.body = {
          title: "Valid Title",
          Description: "",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Description is required");
      });

      test("should reject missing Description", () => {
        // Arrange
        req.body = {
          title: "Valid Title",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Description is required");
      });

      test("should reject Description exceeding 1000 characters", () => {
        // Arrange
        req.body = {
          title: "Valid Title",
          description: "B".repeat(1001),
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain(
          "Description cannot exceed 1000 characters"
        );
      });

      test("should reject extra unknown fields", () => {
        // Arrange
        req.body = {
          title: "Valid Title",
          Description: "Valid Description",
          unknownField: "should be removed",
        };

        // Act
        validateLab(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.unknownField).toBeUndefined();
      });
    });
  });

  describe("validateAuth", () => {
    describe("Valid Authentication Data", () => {
      test("should pass validation with valid email and password", () => {
        // Arrange
        req.body = {
          email: "test@example.com",
          password: "password123",
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.body.email).toBe("test@example.com");
        expect(req.body.password).toBe("password123");
      });

      test("should handle maximum length password", () => {
        // Arrange
        req.body = {
          email: "test@example.com",
          password: "a".repeat(128),
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
      });
    });

    describe("Invalid Authentication Data", () => {
      test("should reject invalid email format", () => {
        // Arrange
        req.body = {
          email: "invalid-email",
          password: "password123",
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Please provide a valid email address");
      });

      test("should reject missing email", () => {
        // Arrange
        req.body = {
          password: "password123",
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Email is required");
      });

      test("should reject password shorter than 6 characters", () => {
        // Arrange
        req.body = {
          email: "test@example.com",
          password: "12345",
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain(
          "Password must be at least 6 characters long"
        );
      });

      test("should reject password longer than 128 characters", () => {
        // Arrange
        req.body = {
          email: "test@example.com",
          password: "a".repeat(129),
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain(
          "Password cannot exceed 128 characters"
        );
      });

      test("should reject missing password", () => {
        // Arrange
        req.body = {
          email: "test@example.com",
        };

        // Act
        validateAuth(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("Password is required");
      });
    });
  });

  describe("validateId", () => {
    describe("Valid ID Parameters", () => {
      test("should pass validation with valid numeric ID", () => {
        // Arrange
        req.params = { id: "123" };

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.params.id).toBe(123); // Should be converted to number
      });

      test("should handle large valid ID", () => {
        // Arrange
        req.params = { id: "999999999" };

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.params.id).toBe(999999999);
      });
    });

    describe("Invalid ID Parameters", () => {
      test("should reject non-numeric ID", () => {
        // Arrange
        req.params = { id: "abc" };

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("ID must be a number");
      });

      test("should reject negative ID", () => {
        // Arrange
        req.params = { id: "-1" };

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("ID must be a positive number");
      });

      test("should reject zero ID", () => {
        // Arrange
        req.params = { id: "0" };

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("ID must be a positive number");
      });

      test("should reject decimal ID", () => {
        // Arrange
        req.params = { id: "12.5" };

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("ID must be an integer");
      });

      test("should reject missing ID", () => {
        // Arrange
        req.params = {};

        // Act
        validateId(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain("ID is required");
      });
    });
  });

  describe("sanitize middleware", () => {
    describe("XSS Protection", () => {
      test("should remove script tags from body", () => {
        // Arrange
        req.body = {
          title: '<script>alert("xss")</script>Clean Title',
          Description: "Clean Description<script>malicious()</script>",
        };

        // Act
        sanitize(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.title).toBe("Clean Title");
        expect(req.body.Description).toBe("Clean Description");
      });

      test("should remove HTML tags from body", () => {
        // Arrange
        req.body = {
          title: "<div>Title with <b>HTML</b></div>",
          Description: "<p>Description with <i>italic</i></p>",
        };

        // Act
        sanitize(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.title).toBe("Title with HTML");
        expect(req.body.Description).toBe("Description with italic");
      });

      test("should sanitize query parameters", () => {
        // Arrange
        req.query = {
          search: '<script>alert("xss")</script>lab title',
          page: "1",
        };

        // Act
        sanitize(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.query.search).toBe("lab title");
        expect(req.query.page).toBe("1");
      });

      test("should handle nested objects", () => {
        // Arrange
        req.body = {
          lab: {
            title: '<script>alert("xss")</script>Nested Title',
            metadata: {
              description: "<div>Nested <b>description</b></div>",
            },
          },
        };

        // Act
        sanitize(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.lab.title).toBe("Nested Title");
        expect(req.body.lab.metadata.description).toBe("Nested description");
      });

      test("should trim whitespace after sanitization", () => {
        // Arrange
        req.body = {
          title: "  <script></script>  Clean Title  ",
          Description: "  <div>  Clean Description  </div>  ",
        };

        // Act
        sanitize(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.title).toBe("Clean Title");
        expect(req.body.Description).toBe("Clean Description");
      });

      test("should handle null and undefined values", () => {
        // Arrange
        req.body = {
          title: null,
          Description: undefined,
          description: "Valid description",
        };

        // Act
        sanitize(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.title).toBeNull();
        expect(req.body.Description).toBeUndefined();
        expect(req.body.description).toBe("Valid description");
      });
    });
  });

  describe("Error Handling", () => {
    test("should include all validation errors", () => {
      // Arrange
      req.body = {
        title: "", // Invalid: empty
        description: "A".repeat(1001), // Invalid: too long
      };

      // Act
      validateLab(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toContain("Title cannot be empty");
      expect(error.message).toContain(
        "Description cannot exceed 1000 characters"
      );
    });

    test("should have consistent error format", () => {
      // Arrange
      req.body = {
        email: "invalid-email",
      };

      // Act
      validateAuth(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain("Validation Error:");
    });
  });
});
