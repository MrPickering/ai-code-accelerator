const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/database');

// Mock database
jest.mock('../src/config/database');

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

describe('Products API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('returns paginated products', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', name: 'Widget A', sku: 'WDG-001', price: 29.99, quantity: 100 },
            { id: '2', name: 'Widget B', sku: 'WDG-002', price: 49.99, quantity: 50 },
          ],
        });

      const res = await request(app).get('/api/products').expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 50, pages: 3 });
    });

    it('filters by category', async () => {
      const categoryId = '550e8400-e29b-41d4-a716-446655440000';
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app).get(`/api/products?category=${categoryId}`).expect(200);

      expect(db.query.mock.calls[0][1]).toContain(categoryId);
    });

    it('rejects invalid pagination params', async () => {
      const res = await request(app).get('/api/products?page=-1').expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/products', () => {
    it('creates a product', async () => {
      const product = { name: 'New Widget', sku: 'NW-001', price: 19.99 };
      db.query.mockResolvedValueOnce({
        rows: [{ id: '3', ...product, quantity: 0, created_at: new Date().toISOString() }],
      });

      const res = await request(app).post('/api/products').send(product).expect(201);

      expect(res.body.data.name).toBe('New Widget');
      expect(res.body.data.sku).toBe('NW-001');
    });

    it('returns 409 on duplicate SKU', async () => {
      db.query.mockRejectedValueOnce({ code: '23505' });

      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Duplicate', sku: 'EXISTING', price: 10 })
        .expect(409);

      expect(res.body.error.code).toBe('DUPLICATE_SKU');
    });

    it('validates required fields', async () => {
      const res = await request(app).post('/api/products').send({}).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/low-stock', () => {
    it('returns products below default threshold', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: '1', name: 'Low Stock Item', quantity: 3 }],
      });

      const res = await request(app).get('/api/products/low-stock').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(db.query.mock.calls[0][1]).toEqual([10]);
    });
  });

  describe('PATCH /api/products/:id/stock', () => {
    it('adjusts stock level', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      db.query.mockResolvedValueOnce({
        rows: [{ id, name: 'Widget', quantity: 105 }],
      });

      const res = await request(app)
        .patch(`/api/products/${id}/stock`)
        .send({ adjustment: 5 })
        .expect(200);

      expect(res.body.data.quantity).toBe(105);
    });

    it('returns 404 for non-existent product', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      db.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .patch(`/api/products/${id}/stock`)
        .send({ adjustment: 5 })
        .expect(404);
    });
  });
});
