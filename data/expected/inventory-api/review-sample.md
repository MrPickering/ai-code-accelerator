# Code Review Checklist - Inventory API

## Security
- [ ] 🔴 CRITICAL: SQL injection prevention - verify all queries use parameterized statements
- [ ] 🔴 CRITICAL: JWT secret must be loaded from environment variables, not hardcoded
- [ ] 🟡 WARNING: Rate limiting should be applied per-user, not just per-IP
- [ ] 🟡 WARNING: Password hashing cost factor should be at least 10
- [ ] 🔵 INFO: Consider adding helmet.js for security headers

## Performance
- [ ] 🟡 WARNING: Add database indexes on frequently queried columns (sku, category_id, supplier_id)
- [ ] 🟡 WARNING: Pagination queries should use keyset pagination for large datasets
- [ ] 🔵 INFO: Consider adding response caching for read-heavy endpoints

## Error Handling
- [ ] 🟡 WARNING: All async route handlers should have try/catch or use express-async-errors
- [ ] 🔵 INFO: Database connection errors should trigger graceful shutdown

## Testing
- [ ] 🟡 WARNING: Add integration tests for database queries
- [ ] 🔵 INFO: Add test for concurrent stock adjustments (race condition)

## Code Quality
- [ ] 🔵 INFO: Extract validation rules to shared constants
- [ ] 🔵 INFO: Add JSDoc comments to model functions
