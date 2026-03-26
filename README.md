# AI Code Accelerator

A CLI tool that uses Claude to generate complete project scaffolds, test suites, API documentation, and code review checklists from a plain-English specification -- replacing 4+ hours of software engineering busywork in under 60 seconds.

## How It Works

Given a project specification (markdown file or inline text), the tool runs a 4-step pipeline:

1. **Scaffold** -- Generates a complete project file structure with production-ready code
2. **Tests** -- Generates a comprehensive unit test suite covering happy paths, edge cases, and error handling
3. **Docs** -- Generates API documentation with endpoint descriptions, examples, and data schemas
4. **Review** -- Generates a code review checklist checking for security, performance, and quality issues

Each step calls Claude with a specialized system prompt and builds on the output of previous steps.

## Quick Start

```bash
# Install dependencies
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your-key-here

# Run against a sample spec
node src/index.js --spec data/specs/inventory-api.md --benchmark

# Or provide an inline spec
node src/index.js --inline "Build a REST API for a todo app with Express and SQLite"
```

## Usage

```
ai-code-accelerator [options]

Options:
  --spec <file>     Path to spec file (markdown)
  --inline <text>   Inline spec description
  --output <dir>    Output directory (default: ./output)
  --model <model>   Claude model (default: claude-sonnet-4-20250514)
  --benchmark       Show token usage + timing breakdown
  -h, --help        Display help
```

## Sample Specs

Three realistic project specifications are included in `data/specs/`:

- **inventory-api.md** -- REST API for inventory management (Express, PostgreSQL, JWT auth)
- **auth-service.md** -- OAuth2 authentication microservice (PKCE, refresh tokens, Redis sessions)
- **data-pipeline.md** -- ETL data pipeline (S3 ingestion, schema validation, PostgreSQL loading)

## Output Structure

All generated files are written to the output directory (default: `./output/`):

```
output/
├── src/              # Generated project source code
├── tests/            # Generated test suite
├── docs/             # Generated API documentation
├── review/           # Generated code review checklist
├── package.json      # Generated project dependencies
└── benchmark.json    # Timing and token usage data (with --benchmark)
```

## Benchmark

With the `--benchmark` flag, the tool displays a summary table showing wall-clock time, token usage, and cost for each pipeline step:

```
Step           Duration    Input Tok     Output Tok    Cost
─────────────────────────────────────────────────────────────
scaffold       4.2s        1,234         3,456         $0.0556
tests          3.8s        4,567         2,890         $0.0571
docs           2.1s        4,123         1,234         $0.0309
review         3.0s        5,678         1,567         $0.0405
─────────────────────────────────────────────────────────────
TOTAL          13.1s       15,602        9,147         $0.1841
```

## Project Structure

```
ai-code-accelerator/
├── package.json          # Project dependencies
├── src/
│   ├── index.js          # CLI entry point (Commander.js)
│   ├── scaffold.js       # Project scaffold generator
│   ├── tests.js          # Test suite generator
│   ├── docs.js           # API documentation generator
│   ├── review.js         # Code review checklist generator
│   ├── benchmark.js      # Timing + token usage tracker
│   └── utils.js          # Shared utilities (JSON parsing, file I/O)
├── data/
│   ├── specs/            # Sample project specifications
│   └── expected/         # Reference outputs for validation
└── output/               # Generated outputs (gitignored)
```

## Requirements

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

## License

MIT
