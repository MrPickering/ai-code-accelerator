const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
    });
  }
  next();
};

// GET /api/products - List products (paginated, filterable)
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('category').optional().isUUID(),
    query('supplier').optional().isUUID(),
    query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('search').optional().isString().trim(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (req.query.category) {
        whereClause += ` AND p.category_id = $${paramIndex++}`;
        params.push(req.query.category);
      }
      if (req.query.supplier) {
        whereClause += ` AND p.supplier_id = $${paramIndex++}`;
        params.push(req.query.supplier);
      }
      if (req.query.minPrice !== undefined) {
        whereClause += ` AND p.price >= $${paramIndex++}`;
        params.push(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined) {
        whereClause += ` AND p.price <= $${paramIndex++}`;
        params.push(req.query.maxPrice);
      }
      if (req.query.search) {
        whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        params.push(`%${req.query.search}%`);
        paramIndex++;
      }

      const countQuery = `SELECT COUNT(*) FROM products p ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      const dataQuery = `
        SELECT p.*, c.name as category_name, s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(limit, offset);
      const result = await db.query(dataQuery, params);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/products - Create product
router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().isString().trim().isLength({ max: 255 }),
    body('sku').notEmpty().isString().trim().isLength({ max: 50 }),
    body('description').optional().isString().trim(),
    body('price').isFloat({ min: 0 }),
    body('quantity').optional().isInt({ min: 0 }).toInt(),
    body('category_id').optional().isUUID(),
    body('supplier_id').optional().isUUID(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, sku, description, price, quantity, category_id, supplier_id } = req.body;

      const result = await db.query(
        `INSERT INTO products (name, sku, description, price, quantity, category_id, supplier_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, sku, description || null, price, quantity || 0, category_id || null, supplier_id || null]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          error: { code: 'DUPLICATE_SKU', message: `Product with SKU '${req.body.sku}' already exists` },
        });
      }
      next(err);
    }
  }
);

// GET /api/products/low-stock - Get products below threshold
router.get('/low-stock', authenticate, async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 10;
    const result = await db.query(
      'SELECT * FROM products WHERE quantity <= $1 ORDER BY quantity ASC',
      [threshold]
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', authenticate, param('id').isUUID(), handleValidation, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id/stock - Adjust stock level
router.patch(
  '/:id/stock',
  authenticate,
  [param('id').isUUID(), body('adjustment').isInt()],
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await db.query(
        `UPDATE products SET quantity = GREATEST(0, quantity + $1), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.body.adjustment, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
      }

      res.json({ data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
