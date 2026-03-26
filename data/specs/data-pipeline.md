# ETL Data Pipeline

## Overview
Build an ETL (Extract, Transform, Load) data pipeline that ingests CSV files from Amazon S3, validates and cleans the data, and loads it into PostgreSQL. The pipeline supports incremental loads and quarantines invalid records for review.

## Tech Stack
- **Runtime:** Node.js
- **AWS SDK:** @aws-sdk/client-s3 for S3 access
- **Database:** PostgreSQL with `pg` driver
- **CSV Parsing:** csv-parser or papaparse
- **Scheduling:** node-cron for scheduled runs
- **Logging:** winston

## Requirements

### Functional Requirements
1. **Extract** - Read CSV files from a configurable S3 bucket/prefix
2. **Schema Validation** - Validate each row against a defined schema (column types, required fields, constraints)
3. **Data Cleaning** - Deduplicate records, normalize dates to ISO 8601, handle nulls/empty strings, trim whitespace, normalize case for enums
4. **Transform** - Apply configurable transformation rules (field mapping, computed fields, type coercion)
5. **Load** - Bulk insert into PostgreSQL with upsert support (ON CONFLICT)
6. **Incremental Loads** - Track last processed file/timestamp, only process new data
7. **Error Quarantine** - Invalid records go to a quarantine table with error details
8. **Monitoring** - Track records processed, failed, quarantined per run

### Pipeline Stages
```
S3 Bucket → Extract → Validate → Clean → Transform → Load → PostgreSQL
                          ↓                                    ↑
                     Quarantine Table                    Dedup Check
```

### Configuration
The pipeline should be configurable via a JSON config file:
```json
{
  "source": {
    "bucket": "data-ingestion",
    "prefix": "incoming/",
    "filePattern": "*.csv"
  },
  "schema": {
    "columns": [
      {"name": "id", "type": "integer", "required": true},
      {"name": "email", "type": "email", "required": true},
      {"name": "created_date", "type": "date", "required": true},
      {"name": "amount", "type": "decimal", "required": false},
      {"name": "status", "type": "enum", "values": ["active", "inactive", "pending"]}
    ]
  },
  "target": {
    "table": "customers",
    "conflictColumn": "id",
    "conflictAction": "update"
  },
  "processing": {
    "batchSize": 1000,
    "maxRetries": 3,
    "deduplicateBy": ["id"]
  }
}
```

### CLI Interface
- `pipeline run --config <file>` - Execute pipeline with config
- `pipeline run --config <file> --dry-run` - Validate without loading
- `pipeline status` - Show last run status and stats
- `pipeline quarantine list` - List quarantined records
- `pipeline quarantine retry --run-id <id>` - Retry quarantined records

### Non-Functional Requirements
- Process 100K+ rows efficiently using Node.js streams
- Memory-efficient: don't load entire file into memory
- Batch inserts (configurable batch size, default 1000)
- Retry logic for transient S3/database failures
- Structured logging with run ID correlation
- Graceful handling of malformed CSV files
- Exit codes: 0 = success, 1 = partial failure (some quarantined), 2 = fatal error

## Data Models

### PipelineRun
```
id: UUID (primary key)
config_file: VARCHAR(255)
source_files: TEXT[] (array of processed file keys)
started_at: TIMESTAMP
completed_at: TIMESTAMP
status: VARCHAR(20) (running, completed, failed)
records_processed: INTEGER DEFAULT 0
records_loaded: INTEGER DEFAULT 0
records_quarantined: INTEGER DEFAULT 0
error_message: TEXT
```

### QuarantineRecord
```
id: UUID (primary key)
run_id: UUID (foreign key to PipelineRun)
source_file: VARCHAR(255)
row_number: INTEGER
raw_data: JSONB
errors: JSONB (array of validation error objects)
created_at: TIMESTAMP DEFAULT NOW()
retried: BOOLEAN DEFAULT false
```

## Error Handling
- Malformed CSV: Log error, skip file, continue with next
- Schema validation failure: Quarantine record with error details
- Database connection failure: Retry 3 times with backoff, then fail run
- S3 access failure: Retry 3 times with backoff, then fail run
- Partial batch failure: Roll back batch, quarantine failed records, continue
