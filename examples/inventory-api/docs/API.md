# Inventory Management API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints except `/api/auth/register` and `/api/auth/login` require a valid JWT token:

```
Authorization: Bearer <token>
```

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

**Response:** `200 OK`
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  }
}
```

---

## Products

### List Products

```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**
| Parameter   | Type    | Default | Description                    |
|------------|---------|---------|--------------------------------|
| `page`     | integer | 1       | Page number                    |
| `limit`    | integer | 20      | Items per page (max 100)       |
| `category` | UUID    | —       | Filter by category ID          |
| `supplier` | UUID    | —       | Filter by supplier ID          |
| `minPrice` | float   | —       | Minimum price filter           |
| `maxPrice` | float   | —       | Maximum price filter           |
| `search`   | string  | —       | Full-text search on name/desc  |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Industrial Widget A",
      "sku": "WDG-001",
      "description": "High-grade industrial widget",
      "price": 29.99,
      "quantity": 150,
      "category_id": "...",
      "supplier_id": "...",
      "category_name": "Widgets",
      "supplier_name": "Acme Corp",
      "created_at": "2026-01-15T10:30:00.000Z",
      "updated_at": "2026-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Industrial Widget A",
    "sku": "WDG-001",
    "description": "High-grade industrial widget",
    "price": 29.99,
    "quantity": 150,
    "category_id": "550e8400-e29b-41d4-a716-446655440000",
    "supplier_id": "660e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:** `201 Created`

### Get Product

```bash
curl http://localhost:3000/api/products/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`

### Adjust Stock

```bash
curl -X PATCH http://localhost:3000/api/products/550e8400-e29b-41d4-a716-446655440000/stock \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"adjustment": -5}'
```

**Response:** `200 OK` — Returns updated product with new quantity.

### Low Stock Alert

```bash
curl "http://localhost:3000/api/products/low-stock?threshold=10" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK` — Returns all products with quantity at or below threshold.

---

## Categories

### List Categories

```bash
curl http://localhost:3000/api/categories \
  -H "Authorization: Bearer <token>"
```

### Create Category

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics", "description": "Electronic components and devices"}'
```

### Get Category (with products)

```bash
curl http://localhost:3000/api/categories/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

---

## Suppliers

### List Suppliers

```bash
curl http://localhost:3000/api/suppliers \
  -H "Authorization: Bearer <token>"
```

### Create Supplier

```bash
curl -X POST http://localhost:3000/api/suppliers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "contact_email": "sales@acme.com",
    "phone": "+1-555-0100",
    "address": "123 Industrial Ave, Manufacturing City, MC 12345"
  }'
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  }
}
```

### Error Codes

| HTTP Status | Code                  | Description                          |
|------------|----------------------|--------------------------------------|
| 400        | `VALIDATION_ERROR`   | Invalid request parameters or body   |
| 401        | `UNAUTHORIZED`       | Missing or invalid JWT token         |
| 404        | `NOT_FOUND`          | Resource does not exist              |
| 409        | `DUPLICATE_SKU`      | Product SKU already exists           |
| 429        | `RATE_LIMIT_EXCEEDED`| Too many requests (100/min per IP)   |
| 500        | `INTERNAL_ERROR`     | Unexpected server error              |

---

## Data Models

### Product
| Field         | Type         | Required | Description              |
|--------------|--------------|----------|--------------------------|
| `id`         | UUID         | auto     | Primary key              |
| `name`       | string(255)  | yes      | Product name             |
| `sku`        | string(50)   | yes      | Unique stock keeping unit|
| `description`| text         | no       | Product description      |
| `price`      | decimal(10,2)| yes      | Unit price               |
| `quantity`   | integer      | no       | Stock quantity (default 0)|
| `category_id`| UUID         | no       | Foreign key to categories|
| `supplier_id`| UUID         | no       | Foreign key to suppliers |
| `created_at` | timestamp    | auto     | Creation timestamp       |
| `updated_at` | timestamp    | auto     | Last update timestamp    |

### Category
| Field              | Type        | Required | Description                    |
|-------------------|-------------|----------|--------------------------------|
| `id`              | UUID        | auto     | Primary key                    |
| `name`            | string(100) | yes      | Category name                  |
| `description`     | text        | no       | Category description           |
| `parent_category_id` | UUID     | no       | Self-referencing (nesting)     |

### Supplier
| Field          | Type        | Required | Description          |
|---------------|-------------|----------|----------------------|
| `id`          | UUID        | auto     | Primary key          |
| `name`        | string(255) | yes      | Supplier name        |
| `contact_email`| string(255)| no       | Contact email        |
| `phone`       | string(20)  | no       | Phone number         |
| `address`     | text        | no       | Mailing address      |
