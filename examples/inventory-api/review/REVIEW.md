# Code Review Checklist — Inventory API

## Security

- [ ] :red_circle: **CRITICAL**: SQL injection — Verify all database queries use parameterized statements (`$1`, `$2`) and never concatenate user input into SQL strings
- [ ] :red_circle: **CRITICAL**: JWT secret — Ensure `JWT_SECRET` is loaded from environment variables, not hardcoded. Current implementation in `middleware/auth.js` reads from `process.env.JWT_SECRET`
- [ ] :red_circle: **CRITICAL**: Password storage — Verify bcrypt cost factor is at least 10 (currently 12 in auth routes)
- [ ] :yellow_circle: **WARNING**: Rate limiting is per-IP only — Consider per-user rate limiting to prevent abuse from authenticated users
- [ ] :yellow_circle: **WARNING**: No CSRF protection — If this API will be consumed by browsers, add CSRF tokens
- [ ] :large_blue_circle: **INFO**: Consider adding `helmet()` CSP directives for any HTML responses
- [ ] :large_blue_circle: **INFO**: Add request size limits (`express.json({ limit: '10kb' })`) to prevent payload-based DoS

## Performance

- [ ] :red_circle: **CRITICAL**: Missing database indexes — Add indexes on `products.sku` (unique), `products.category_id`, `products.supplier_id`, and `products.quantity` (for low-stock queries)
- [ ] :yellow_circle: **WARNING**: N+1 potential — The product list query uses JOINs correctly, but verify category and supplier list endpoints don't fetch related products individually
- [ ] :yellow_circle: **WARNING**: Pagination uses OFFSET — For large datasets, consider keyset pagination (`WHERE id > last_seen_id`) to avoid performance degradation
- [ ] :large_blue_circle: **INFO**: No response caching — Consider `Cache-Control` headers or ETag for read-heavy endpoints
- [ ] :large_blue_circle: **INFO**: Database connection pooling — Verify pool size is configured appropriately for expected load

## Error Handling

- [ ] :yellow_circle: **WARNING**: Async route handlers — All routes use try/catch correctly, but consider `express-async-errors` to catch any missed cases
- [ ] :yellow_circle: **WARNING**: Database connection errors — Add a health check that verifies database connectivity, not just server responsiveness
- [ ] :large_blue_circle: **INFO**: Error handler should sanitize error messages in production (avoid leaking stack traces)
- [ ] :large_blue_circle: **INFO**: Add request ID tracking (via `X-Request-ID` header) for debugging across services

## Test Coverage

- [ ] :yellow_circle: **WARNING**: No integration tests — Add tests that run against a real (test) database to verify SQL queries
- [ ] :yellow_circle: **WARNING**: Missing concurrent stock adjustment test — Verify PATCH `/stock` handles race conditions correctly (two simultaneous decrements)
- [ ] :large_blue_circle: **INFO**: Add tests for rate limiting behavior (429 responses)
- [ ] :large_blue_circle: **INFO**: Add tests for malformed JSON request bodies

## Code Quality

- [ ] :large_blue_circle: **INFO**: Extract validation rules into shared constants to reduce duplication across routes
- [ ] :large_blue_circle: **INFO**: Consider extracting database queries into a repository/model layer for better separation of concerns
- [ ] :large_blue_circle: **INFO**: Add JSDoc comments to exported functions
- [ ] :large_blue_circle: **INFO**: `package.json` should pin exact dependency versions or use a lockfile

## Summary

| Severity | Count |
|----------|-------|
| :red_circle: Critical | 4 |
| :yellow_circle: Warning | 7 |
| :large_blue_circle: Info | 9 |
| **Total** | **20** |
