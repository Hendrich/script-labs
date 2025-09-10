const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  validateLab,
  validateId,
  validateLabUpdate,
} = require("../middlewares/validation");
const { authLimiter } = require("../middlewares/rateLimiter");
const { securityLogger } = require("../middlewares/logger");
const { AppError } = require("../middlewares/errorHandler");

const router = express.Router();
router.use(authMiddleware);

/**
 * @route   GET /api/labs/search
 * @desc    Search labs by title or author (no DB/schema change)
 * @access  Private
 * @query   {string} q - Search query (title or author)
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10)
 */
router.get("/search", async (req, res, next) => {
  try {
    const userId = req.user_id;
    const { q = "", page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Two explicit query shapes to avoid dynamic placeholder arithmetic (helps Snyk static analysis)
    let rows;
    if (q) {
      const searchParam = `%${q}%`;
      const searchQuery = `
        SELECT * FROM labs
        WHERE user_id = $1
          AND (title ILIKE $2 OR description ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;
      ({ rows } = await pool.query(searchQuery, [userId, searchParam, limitNum, offset]));
    } else {
      const baseQuery = `
        SELECT * FROM labs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      ({ rows } = await pool.query(baseQuery, [userId, limitNum, offset]));
    }

    // Total count
    let totalLabs = 0;
    if (q) {
      const countQuery = `
        SELECT COUNT(*) FROM labs
        WHERE user_id = $1
          AND (title ILIKE $2 OR description ILIKE $2)
      `;
      const { rows: countRows } = await pool.query(countQuery, [userId, `%${q}%`]);
      totalLabs = parseInt(countRows[0].count);
    } else {
      const { rows: countRows } = await pool.query(
        "SELECT COUNT(*) FROM labs WHERE user_id = $1",
        [userId]
      );
      totalLabs = parseInt(countRows[0].count);
    }

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalLabs,
        totalPages: Math.ceil(totalLabs / limitNum),
      },
      search_query: q,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
// ...existing code...

/**
 * @route   GET /api/labs
 * @desc    Get all labs for the authenticated user
 * @access  Private
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user_id;
    const { page = 1, limit = 50, search } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let rows;
    if (search) {
      const searchParam = `%${search}%`;
      const qWithSearch = `
        SELECT * FROM labs
        WHERE user_id = $1
          AND (title ILIKE $2 OR description ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;
      ({ rows } = await pool.query(qWithSearch, [userId, searchParam, limitNum, offset]));
    } else {
      const qBase = `
        SELECT * FROM labs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      ({ rows } = await pool.query(qBase, [userId, limitNum, offset]));
    }

    let totalLabs = 0;
    if (search) {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) FROM labs WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $2)`,
        [userId, `%${search}%`]
      );
      totalLabs = parseInt(countRows[0].count);
    } else {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) FROM labs WHERE user_id = $1`,
        [userId]
      );
      totalLabs = parseInt(countRows[0].count);
    }

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalLabs,
        totalPages: Math.ceil(totalLabs / limitNum),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("❌ Error fetching labs:", err.message);
    }
    next(new AppError("Failed to fetch labs", 500));
  }
});

/**
 * @route   GET /api/labs/:id
 * @desc    Get a specific lab by ID
 * @access  Private
 */
router.get("/:id", validateId, async (req, res, next) => {
  try {
    const labId = req.params.id;
    const userId = req.user_id;

    const { rows } = await pool.query(
      "SELECT * FROM labs WHERE id = $1 AND user_id = $2",
      [labId, userId]
    );

    if (rows.length === 0) {
      return next(new AppError("lab not found", 404));
    }

    res.json({
      success: true,
      data: rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("âŒ Error fetching lab:", err.message);
    }
    next(new AppError("Failed to fetch lab", 500));
  }
});

/**
 * @route   POST /api/labs
 * @desc    Add a new lab
 * @access  Private
 */
router.post(
  "/",
  validateLab,
  securityLogger("CREATE_LAB"),
  async (req, res, next) => {
    try {
      const { title, description } = req.body;
      const userId = req.user_id;

      // Check for duplicate labs (same title and description for the same user)
      const { rows: existingLabs } = await pool.query(
        "SELECT id FROM labs WHERE title = $1 AND description = $2 AND user_id = $3",
        [title, description, userId]
      );

      if (existingLabs.length > 0) {
        return next(
          new AppError(
            "Lab with this title and description already exists",
            409
          )
        );
      }

      const { rows } = await pool.query(
        "INSERT INTO labs (title, description, user_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *",
        [title, description, userId]
      );

      res.status(201).json({
        success: true,
        data: rows[0],
        message: "Lab added successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("âŒ Error adding lab:", err.message);
      }
      next(new AppError("Failed to add lab", 500));
    }
  }
);

/**
 * @route   PUT /api/labs/:id
 * @desc    Update a lab
 * @access  Private
 */
router.put(
  "/:id",
  validateId,
  validateLabUpdate,
  securityLogger("UPDATE_LAB"),
  async (req, res, next) => {
    try {
      const labId = req.params.id;
      const userId = req.user_id;
      const updateFields = req.body;

      // Whitelist allowed columns to prevent SQL injection via field names
      const allowed = ["title", "description"]; // extend if needed
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateFields).forEach(([key, value]) => {
        if (allowed.includes(key)) {
          setClauses.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (setClauses.length === 0) {
        return next(new AppError("No valid fields to update", 400));
      }

      // Add updated_at timestamp
      setClauses.push(`updated_at = NOW()`);

      // Add WHERE conditions
      values.push(labId, userId);

      const query = `
	  UPDATE labs 
	  SET ${setClauses.join(", ")} 
	  WHERE id = $${values.length - 1} AND user_id = $${values.length}
	  RETURNING *
	`;

      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        return next(new AppError("lab not found or unauthorized", 404));
      }

      res.json({
        success: true,
        data: rows[0],
        message: "lab updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("âŒ Error updating lab:", err.message);
      }
      next(new AppError("Failed to update lab", 500));
    }
  }
);

/**
 * @route   DELETE /api/labs/:id
 * @desc    Delete a lab
 * @access  Private
 */
router.delete(
  "/:id",
  validateId,
  securityLogger("DELETE_LAB"),
  async (req, res, next) => {
    try {
      const labId = req.params.id;
      const userId = req.user_id;

      const { rows } = await pool.query(
        "DELETE FROM labs WHERE id = $1 AND user_id = $2 RETURNING *",
        [labId, userId]
      );

      if (rows.length === 0) {
        return next(new AppError("lab not found or unauthorized", 404));
      }

      res.json({
        success: true,
        data: { id: labId },
        message: "lab deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("âŒ Error deleting lab:", err.message);
      }
      next(new AppError("Failed to delete lab", 500));
    }
  }
);

module.exports = router;
