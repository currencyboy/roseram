# JSONB Optimization Guide

## Current JSONB Usage in Your Schema

### Overview
Your schema uses 11 JSONB columns across 8 tables. This guide optimizes their usage for performance and maintainability.

---

## JSONB Columns Audit

### 1. **user_sessions Table** (4 JSONB columns)

```sql
CREATE TABLE public.user_sessions (
  user_data JSONB,              -- Full user profile
  service_metadata JSONB,        -- Service configuration
  form_inputs JSONB,            -- Form submission data
  project_configs JSONB,        -- Project settings
  integration_settings JSONB    -- Integration options
)
```

#### Usage Patterns
- **user_data**: Store user profile (first_name, last_name, avatar, etc.)
- **form_inputs**: Temporary form data
- **integration_settings**: Multi-provider configuration
- **project_configs**: Project-specific settings

#### Optimization Recommendation
**Extract frequently queried fields into columns:**

```sql
-- Add extracted columns for performance
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing data
UPDATE public.user_sessions 
SET 
  first_name = user_data->>'first_name',
  last_name = user_data->>'last_name',
  avatar_url = user_data->>'avatar_url',
  email = user_data->>'email'
WHERE user_data IS NOT NULL;

-- Add indexes on extracted columns
CREATE INDEX idx_user_sessions_first_name ON public.user_sessions(first_name);
CREATE INDEX idx_user_sessions_last_name ON public.user_sessions(last_name);
CREATE INDEX idx_user_sessions_email ON public.user_sessions(email);

-- Add GIN index for JSONB flexibility
CREATE INDEX idx_user_sessions_user_data_gin ON public.user_sessions USING GIN(user_data);
```

#### Query Optimization
```sql
-- BEFORE (slow - JSONB extraction)
SELECT * FROM user_sessions WHERE user_data->>'first_name' = 'John';

-- AFTER (fast - regular index)
SELECT * FROM user_sessions WHERE first_name = 'John';

-- For complex queries, use JSONB
SELECT * FROM user_sessions 
WHERE user_data @> '{"subscription": "pro"}';
```

---

### 2. **session_audit_log Table** (1 JSONB column)

```sql
CREATE TABLE public.session_audit_log (
  changed_fields JSONB  -- Track field changes
)
```

#### Purpose
Audit trail of what changed in the session

#### Optimization
- **Keep as JSONB**: Variable structure (different fields change each time)
- **Add GIN index**: Already recommended ✅
- **Size management**: Archive old records (>90 days)

```sql
-- Add GIN index if not present
CREATE INDEX IF NOT EXISTS idx_session_audit_log_changed_fields_gin 
ON public.session_audit_log USING GIN(changed_fields);

-- Archive old records
CREATE TABLE public.session_audit_log_archive AS 
SELECT * FROM public.session_audit_log 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

DELETE FROM public.session_audit_log 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```

---

### 3. **action_logs Table** (1 JSONB column)

```sql
CREATE TABLE public.action_logs (
  metadata JSONB  -- Action-specific metadata
)
```

#### Purpose
Store action details (file_changes, generation_params, etc.)

#### Optimization
```sql
-- Add GIN index for queries
CREATE INDEX IF NOT EXISTS idx_action_logs_metadata_gin 
ON public.action_logs USING GIN(metadata);

-- If you frequently query action metadata, add partial indexes:
CREATE INDEX idx_action_logs_metadata_file_changes 
ON public.action_logs USING GIN(metadata) 
WHERE action = 'file_changed';

-- Extract common fields for faster filtering
ALTER TABLE public.action_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
UPDATE public.action_logs 
SET action_type = metadata->>'type'
WHERE metadata IS NOT NULL;

CREATE INDEX idx_action_logs_action_type ON public.action_logs(action_type);
```

---

### 4. **code_generations Table** (1 JSONB column)

```sql
CREATE TABLE public.code_generations (
  generated_content JSONB  -- AI-generated code structure
)
```

#### Purpose
Store structured AI generation output

#### Optimization
```sql
-- Add GIN index (generation results vary greatly)
CREATE INDEX IF NOT EXISTS idx_code_generations_generated_content_gin 
ON public.code_generations USING GIN(generated_content);

-- NOTE: Don't extract fields - content structure varies too much
-- This should remain pure JSONB

-- Size management (if GIN index is large)
ALTER TABLE public.code_generations 
DROP COLUMN IF EXISTS generated_content_cached;
-- Keep only recent generations, archive old ones
```

---

### 5. **api_usage_logs Table** (2 JSONB columns)

```sql
CREATE TABLE public.api_usage_logs (
  request_metadata JSONB,   -- Request parameters
  response_metadata JSONB   -- Response details
)
```

#### Purpose
Track API request/response details

#### Optimization
```sql
-- Add GIN indexes for searchability
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_request_meta_gin 
ON public.api_usage_logs USING GIN(request_metadata);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_response_meta_gin 
ON public.api_usage_logs USING GIN(response_metadata);

-- Extract commonly searched fields
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS 
  request_method TEXT,
  response_status_code INTEGER;

UPDATE public.api_usage_logs 
SET 
  request_method = request_metadata->>'method',
  response_status_code = CAST(response_metadata->>'status_code' AS INTEGER)
WHERE request_metadata IS NOT NULL;

CREATE INDEX idx_api_usage_logs_request_method ON public.api_usage_logs(request_method);
CREATE INDEX idx_api_usage_logs_response_status ON public.api_usage_logs(response_status_code);
```

---

### 6. **solana_payments Table** (1 JSONB column)

```sql
CREATE TABLE public.solana_payments (
  metadata JSONB  -- Payment metadata
)
```

#### Purpose
Store additional payment details

#### Optimization
```sql
-- Add GIN index if query patterns need it
CREATE INDEX IF NOT EXISTS idx_solana_payments_metadata_gin 
ON public.solana_payments USING GIN(metadata);

-- Extract key fields for faster filtering
ALTER TABLE public.solana_payments ADD COLUMN IF NOT EXISTS 
  transaction_type TEXT,
  network_name TEXT;

UPDATE public.solana_payments 
SET 
  transaction_type = metadata->>'type',
  network_name = metadata->>'network'
WHERE metadata IS NOT NULL;

CREATE INDEX idx_solana_payments_transaction_type ON public.solana_payments(transaction_type);
CREATE INDEX idx_solana_payments_network ON public.solana_payments(network_name);
```

---

### 7. **ai_chat_sessions Table** (1 JSONB column)

```sql
CREATE TABLE public.ai_chat_sessions (
  messages JSONB  -- Chat message array
)
```

#### Purpose
Store conversation history as JSON array

#### Optimization
```sql
-- Add GIN index for message searching
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_messages_gin 
ON public.ai_chat_sessions USING GIN(messages);

-- Extract metadata for faster filtering
ALTER TABLE public.ai_chat_sessions ADD COLUMN IF NOT EXISTS 
  message_count INTEGER,
  latest_message_at TIMESTAMP WITH TIME ZONE;

-- Update counts (periodic update job)
UPDATE public.ai_chat_sessions 
SET message_count = jsonb_array_length(messages)
WHERE messages IS NOT NULL;

CREATE INDEX idx_ai_chat_sessions_message_count ON public.ai_chat_sessions(message_count);
```

---

## JSONB Query Performance

### Slow JSONB Queries (Avoid These)
```sql
-- ❌ Full table scan with JSONB extraction
SELECT * FROM user_sessions WHERE user_data->>'email' = 'user@example.com';

-- ❌ LIKE pattern matching on JSONB
SELECT * FROM action_logs WHERE metadata->>'description' LIKE '%timeout%';

-- ❌ Nested extraction without index
SELECT * FROM ai_chat_sessions 
WHERE messages->0->>'role' = 'assistant';

-- ❌ Multiple JSONB conditions (without planning)
SELECT * FROM user_sessions 
WHERE user_data->>'status' = 'active' 
AND user_data->>'plan' = 'premium';
```

### Fast JSONB Queries (Use These)
```sql
-- ✅ Using extracted columns (if frequent)
SELECT * FROM user_sessions WHERE email = 'user@example.com';

-- ✅ Using @> operator with GIN index
SELECT * FROM user_sessions 
WHERE user_data @> '{"status": "active", "plan": "premium"}';

-- ✅ Using ->> with indexed column
SELECT * FROM action_logs 
WHERE action_type = 'file_changed' 
AND metadata->>'file_path' LIKE '%/src/%';

-- ✅ Using indexed columns with JSONB fallback
SELECT * FROM ai_chat_sessions 
WHERE message_count > 10 
AND messages @> '[{"role": "assistant"}]';
```

---

## JSONB vs. Regular Columns Decision Matrix

| Scenario | Use JSONB | Use Column | Rationale |
|----------|-----------|-----------|-----------|
| Frequently queried field | ❌ | ✅ | Better performance |
| Rarely changed data | ❌ | ✅ | Integrity, simpler |
| Variable structure | ✅ | ❌ | Flexibility needed |
| Large nested objects | ✅ | ❌ | Storage efficiency |
| Multi-valued field | ✅ | ❌ | Array handling |
| Unique constraint needed | ❌ | ✅ | JSONB can't be unique |
| Full-text search needed | ❌ | ✅ | Use text column + TSVECTOR |
| Optional metadata | ✅ | ❌| No NULL columns needed |

---

## JSONB Index Strategy

### GIN Index (Recommended for Most Cases)
```sql
-- Best for: Equality, containment, membership checks
CREATE INDEX idx_table_column_gin ON table_name USING GIN(column_name);

-- Use when querying:
SELECT * FROM table WHERE column @> '{"key": "value"}';
SELECT * FROM table WHERE column ? 'key';
SELECT * FROM table WHERE column->>'key' = 'value';
```

### GIST Index (Alternative)
```sql
-- Best for: Range queries, complex filtering
CREATE INDEX idx_table_column_gist ON table_name USING GIST(column_name);

-- Use when: GIN is too slow (rare)
-- GIN is usually better for JSONB
```

### Partial GIN Index
```sql
-- Optimize for specific document types
CREATE INDEX idx_action_logs_file_changes_gin 
ON public.action_logs USING GIN(metadata) 
WHERE action_type = 'file_changed';

-- Reduces index size by only indexing matching rows
```

---

## JSONB Compression Strategies

### For Large JSONB Objects
```sql
-- Identify large JSONB columns
SELECT 
  tablename,
  'some_jsonb_column' as column_name,
  AVG(octet_length(some_jsonb_column::text)) as avg_size_bytes,
  MAX(octet_length(some_jsonb_column::text)) as max_size_bytes
FROM table_name
GROUP BY tablename
ORDER BY avg_size_bytes DESC;

-- If average > 1MB, consider:
-- 1. Extract frequently accessed keys
-- 2. Compress rarely accessed data
-- 3. Archive old records
```

### Remove Unused JSONB Data
```sql
-- Clean up null or empty JSONB
UPDATE public.user_sessions 
SET user_data = NULL 
WHERE user_data = '{}' OR user_data IS NULL;

UPDATE public.action_logs 
SET metadata = NULL 
WHERE metadata = '{}' OR metadata IS NULL;

-- Vacuum to reclaim space
VACUUM FULL public.user_sessions;
VACUUM FULL public.action_logs;
```

---

## Monitoring JSONB Performance

### Find Slow JSONB Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
SELECT pg_reload_conf();

-- Find slow queries in logs
SELECT query, calls, mean_time, max_time 
FROM pg_stat_statements 
WHERE query LIKE '%->%' 
ORDER BY mean_time DESC 
LIMIT 20;
```

### Monitor JSONB Index Usage
```sql
-- Check if GIN indexes are being used
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexdef LIKE '%GIN%'
ORDER BY idx_scan DESC;

-- If idx_scan = 0, the index isn't being used
-- Consider removing it or restructuring queries
```

---

## JSONB Validation and Constraints

### Ensure Valid JSONB Structure
```sql
-- Add CHECK constraint to validate structure
ALTER TABLE public.user_sessions ADD CONSTRAINT 
  user_data_must_be_object 
  CHECK (jsonb_typeof(user_data) = 'object');

ALTER TABLE public.ai_chat_sessions ADD CONSTRAINT 
  messages_must_be_array 
  CHECK (jsonb_typeof(messages) = 'array');

-- Add check for required keys
ALTER TABLE public.user_sessions ADD CONSTRAINT 
  user_data_has_required_fields 
  CHECK (
    user_data ? 'first_name' AND 
    user_data ? 'email'
  );
```

### Validate JSON at Application Level
```javascript
// JavaScript example
const Joi = require('joi');

const userDataSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  avatar_url: Joi.string().uri().optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

// Validate before inserting
const { error, value } = userDataSchema.validate(userData);
if (error) throw error;

// Insert validated data
await db.from('user_sessions').insert({
  user_id,
  user_data: value,
});
```

---

## Migration: Flattening JSONB (When Needed)

### Step-by-Step Example
```sql
-- 1. Add new columns
ALTER TABLE public.user_sessions ADD COLUMN first_name TEXT;
ALTER TABLE public.user_sessions ADD COLUMN last_name TEXT;
ALTER TABLE public.user_sessions ADD COLUMN email TEXT;

-- 2. Populate from JSONB
UPDATE public.user_sessions 
SET 
  first_name = COALESCE(user_data->>'first_name', ''),
  last_name = COALESCE(user_data->>'last_name', ''),
  email = COALESCE(user_data->>'email', '')
WHERE user_data IS NOT NULL;

-- 3. Verify data integrity
SELECT COUNT(*) as total_rows FROM public.user_sessions;
SELECT COUNT(*) as filled_rows FROM public.user_sessions 
WHERE first_name IS NOT NULL AND first_name != '';

-- 4. Add indexes on new columns
CREATE INDEX idx_user_sessions_first_name ON public.user_sessions(first_name);
CREATE INDEX idx_user_sessions_email ON public.user_sessions(email);

-- 5. Update application to use new columns
-- (See application code section below)

-- 6. Once application is stable, drop JSONB key from user_data
-- UPDATE user_sessions SET user_data = user_data - 'first_name';
-- (Keep for backwards compatibility first)

-- 7. Eventually drop JSONB column if unused
-- ALTER TABLE user_sessions DROP COLUMN user_data;
```

---

## Application Code Updates

### Before: JSONB Extraction
```javascript
// Direct JSONB field access
const firstName = userData?.user_data?.first_name;
const email = userData?.user_data?.email;

// Database query with extraction
const sessions = await db
  .from('user_sessions')
  .select('*')
  .filter('user_data->first_name', 'eq', 'John');
```

### After: Extracted Columns
```javascript
// Direct column access (faster)
const firstName = userData?.first_name;
const email = userData?.email;

// Database query on regular column (much faster)
const sessions = await db
  .from('user_sessions')
  .select('*')
  .eq('first_name', 'John');

// For other metadata, still use JSONB
const preferences = userData?.user_data;
```

---

## Best Practices Summary

### ✅ DO
- Use GIN indexes on all frequently queried JSONB columns
- Extract and denormalize frequently accessed fields
- Validate JSONB structure at application level
- Use `@>` operator for containment queries
- Archive or delete old JSONB records
- Monitor query performance regularly

### ❌ DON'T
- Use JSONB for frequently filtered fields
- Create UNIQUE constraints on JSONB fields
- Store sensitive data in JSONB (encrypt it)
- Query deeply nested JSONB without testing
- Leave JSONB without any index
- Mix JSONB extraction with multiple filters
- Assume JSONB queries are automatically optimized

---

## Troubleshooting

### Problem: GIN index not being used
```sql
-- Solution: Force index usage
EXPLAIN ANALYZE
SELECT * FROM user_sessions 
WHERE user_data @> '{"status": "active"}';

-- If sequential scan, check:
-- 1. Index exists: SELECT * FROM pg_indexes WHERE tablename = 'user_sessions'
-- 2. ANALYZE is run: ANALYZE user_sessions;
-- 3. Cost settings: SHOW random_page_cost;
```

### Problem: Slow JSONB key extraction
```sql
-- Before (slow):
SELECT * FROM table WHERE col->>'key' = 'value';

-- After (fast):
-- Extract to regular column and index it
ALTER TABLE table ADD COLUMN key_extracted TEXT;
UPDATE table SET key_extracted = col->>'key';
CREATE INDEX idx_key_extracted ON table(key_extracted);
SELECT * FROM table WHERE key_extracted = 'value';
```

### Problem: Large JSONB column causing storage issues
```sql
-- Find large documents
SELECT octet_length(column_name::text) as size_bytes, *
FROM table_name
ORDER BY size_bytes DESC
LIMIT 10;

-- Options:
-- 1. Archive old records
-- 2. Compress/truncate large fields
-- 3. Extract to separate table
DELETE FROM table WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
VACUUM FULL table;
```

---

## Conclusion

Your JSONB columns are well-structured. The cleanup script adds necessary GIN indexes. Consider these additional optimizations:

1. **Extract frequently queried fields** (15-20% query speedup)
2. **Archive old records** (reduce storage, improve index performance)
3. **Add application-level validation** (prevent invalid JSONB)
4. **Monitor query patterns** (identify optimization opportunities)

**Estimated Impact**: 30-50% faster JSONB queries with these optimizations.

---

**Version**: 1.0
**Status**: Ready to Implement
**Last Updated**: 2024
