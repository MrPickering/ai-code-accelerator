# Example Output

This directory contains a pre-generated example showing what ai-code-accelerator produces when run against the `inventory-api.md` spec.

Browse the output to evaluate quality without needing an API key:

```
inventory-api/
├── src/
│   ├── index.js              # Express server with middleware stack
│   └── routes/products.js    # CRUD routes with validation, filtering, pagination
├── tests/
│   └── products.test.js      # Jest tests with mocked DB and auth
├── docs/
│   └── API.md                # Full endpoint docs with curl examples
├── review/
│   └── REVIEW.md             # 20-item checklist (4 critical, 7 warning, 9 info)
└── benchmark.json            # 23.5s total, $0.33 cost
```

This was generated from [`data/specs/inventory-api.md`](../data/specs/inventory-api.md) in a single run.
