const Joi = require("joi");
const { AppError } = require("./errorHandler");

/**
 * Input validation middleware using Joi
 */

// Schema definitions
const schemas = {
  // lab validation schema
  lab: Joi.object({
    title: Joi.string().min(1).max(255).trim().required().messages({
      "string.empty": "Title cannot be empty",
      "string.max": "Title cannot exceed 255 characters",
      "any.required": "Title is required",
    }),
    description: Joi.string().min(1).max(1000).trim().required().messages({
      "string.empty": "Description cannot be empty",
      "string.max": "Description cannot exceed 1000 characters",
      "any.required": "Description is required",
    }),
  }),

  // User registration/login schema
  auth: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).max(128).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "string.max": "Password cannot exceed 128 characters",
      "any.required": "Password is required",
    }),
  }),

  // ID parameter validation
  id: Joi.object({
    id: Joi.number().integer().positive().required().messages({
      "number.base": "ID must be a number",
      "number.integer": "ID must be an integer",
      "number.positive": "ID must be a positive number",
      "any.required": "ID is required",
    }),
  }),

  // Query parameters validation
  labQuery: Joi.object({
    search: Joi.string().max(255).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string()
      .valid("title", "description", "created_at", "updated_at")
      .default("created_at"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

// Generic validation middleware factory
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Include all errors
      allowUnknown: false, // Don't allow unknown keys
      stripUnknown: true, // Remove unknown keys
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");

      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }

    // Replace the original data with the validated (and potentially transformed) data
    req[property] = value;
    next();
  };
};

// Specific validation middlewares
const validateLab = validate(schemas.lab, "body");
const validateAuth = validate(schemas.auth, "body");
const validateId = validate(schemas.id, "params");
const validateLabQuery = validate(schemas.labQuery, "query");

// Custom validation for lab update (partial updates allowed)
const validateLabUpdate = (req, res, next) => {
  const updateSchema = Joi.object({
    title: Joi.string().min(1).max(255).trim().optional(),
    description: Joi.string().min(1).max(1000).trim().optional(),
  }).min(1); // At least one field must be provided

  const { error, value } = updateSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");

    return next(new AppError(`Validation Error: ${errorMessage}`, 400));
  }

  req.body = value;
  next();
};

// Sanitization helper (could be expanded)
const sanitize = (req, res, next) => {
  // Basic HTML sanitization for string fields
  const sanitizeString = (str) => {
    if (typeof str !== "string") return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (typeof obj[key] === "string") {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === "object") {
          sanitizeObject(obj[key]);
        }
      }
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);

  next();
};

module.exports = {
  validate,
  validateLab,
  validateBook: validateLab, // Backward compatibility alias
  validateAuth,
  validateId,
  validateLabQuery,
  validateBookQuery: validateLabQuery, // Backward compatibility alias
  validateLabUpdate,
  validateBookUpdate: validateLabUpdate, // Backward compatibility alias
  sanitize,
  schemas,
};
