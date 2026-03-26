# Inventory Management REST API

## Overview
Build a REST API for inventory management that allows businesses to track products, categories, and suppliers. The API should support full CRUD operations with filtering, pagination, and search capabilities.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL with `pg` driver
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** express-validator

## Requirements

### Functional Requirements
1. **Products** - Full CRUD with fields: name, SKU, description, price, quantity, category_id, supplier_id, created_at, updated_at
2. **Categories** - Full CRUD with fields: name, description, parent_category_id (supports nesting)
3. **Suppliers** - Full CRUD with fields: name, contact_email, phone, address
4. **Stock Management** - Endpoints to adjust stock levels (increment/decrement), low-stock alerts
5. **Search** - Full-text search across product names and descriptions
6. **Filtering** - Filter products by category, supplier, price range, stock level

### API Endpoints
- `GET /api/products` - List products (paginated, filterable)
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/stock` - Adjust stock level
- `GET /api/products/low-stock` - Get products below threshold
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category with products
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier with products
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login, returns JWT
- All other endpoints require valid JWT in Authorization header

### Non-Functional Requirements
- Rate limiting: 100 requests per minute per IP
- Pagination: Default 20 items per page, max 100
- Input validation on all endpoints
- Proper HTTP status codes (200, 201, 400, 401, 404, 409, 429, 500)
- Request logging with timestamps
- Graceful error handling with consistent error response format

## Data Models

### Product
```
id: UUID (primary key)
name: VARCHAR(255) NOT NULL
sku: VARCHAR(50) UNIQUE NOT NULL
description: TEXT
price: DECIMAL(10,2) NOT NULL
quantity: INTEGER DEFAULT 0
category_id: UUID (foreign key)
supplier_id: UUID (foreign key)
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()
```

### Category
```
id: UUID (primary key)
name: VARCHAR(100) NOT NULL
description: TEXT
parent_category_id: UUID (self-referencing foreign key, nullable)
```

### Supplier
```
id: UUID (primary key)
name: VARCHAR(255) NOT NULL
contact_email: VARCHAR(255)
phone: VARCHAR(20)
address: TEXT
```

## Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": []
  }
}
```
