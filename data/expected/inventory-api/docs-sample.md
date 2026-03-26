# Inventory Management API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Products

#### List Products
```
GET /api/products?page=1&limit=20&category=<id>&minPrice=0&maxPrice=100
```

**Response:** `200 OK`
```json
{
  "data": [...],
  "pagination": {"page": 1, "limit": 20, "total": 150, "pages": 8}
}
```

#### Create Product
```
POST /api/products
Content-Type: application/json

{
  "name": "Widget A",
  "sku": "WDG-001",
  "price": 29.99,
  "quantity": 100,
  "category_id": "uuid",
  "supplier_id": "uuid"
}
```

**Response:** `201 Created`

... (similar documentation for all endpoints)

## Error Codes
| Code | Meaning |
|------|---------|
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Missing or invalid token |
| 404  | Not Found - Resource doesn't exist |
| 409  | Conflict - Duplicate SKU |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error |
