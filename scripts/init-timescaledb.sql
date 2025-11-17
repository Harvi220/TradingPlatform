-- ============================================
-- TimescaleDB Initialization Script (UPDATED)
-- Trading Platform - BID/ASK Data Storage
-- Version: 1.1 (1-minute intervals)
-- ============================================
-- This script should run AFTER Prisma migrations
-- Execute with: psql -U postgres -d tradingdb -f init-timescaledb.sql
-- ============================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================
-- CONVERT TABLES TO HYPERTABLES
-- ============================================

-- Convert snapshots table to hypertable
-- Partitioning by timestamp with 1-day chunks
SELECT create_hypertable(
  'snapshots',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert websocket_events to hypertable
SELECT create_hypertable(
  'websocket_events',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert system_metrics to hypertable
SELECT create_hypertable(
  'system_metrics',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================
-- CONTINUOUS AGGREGATES - 1 HOUR INTERVALS
-- ============================================
-- NOTE: 1-minute aggregates removed since raw data is already per minute

-- Drop existing view if exists (for re-running script)
DROP MATERIALIZED VIEW IF EXISTS snapshots_agg_1h_view CASCADE;

-- Create continuous aggregate for 1-hour intervals
CREATE MATERIALIZED VIEW snapshots_agg_1h_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  symbol,
  "marketType",
  depth,
  AVG("bidVolume") AS "avgBidVolume",
  AVG("askVolume") AS "avgAskVolume",
  MAX("bidVolume") AS "maxBidVolume",
  MAX("askVolume") AS "maxAskVolume",
  MIN("bidVolume") AS "minBidVolume",
  MIN("askVolume") AS "minAskVolume",
  AVG("bidVolumeUsd") AS "avgBidVolumeUsd",
  AVG("askVolumeUsd") AS "avgAskVolumeUsd",
  COUNT(*) AS count
FROM snapshots
GROUP BY bucket, symbol, "marketType", depth
WITH NO DATA;

-- Add refresh policy: refresh every 1 hour
SELECT add_continuous_aggregate_policy(
  'snapshots_agg_1h_view',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

-- ============================================
-- CONTINUOUS AGGREGATES - 1 DAY INTERVALS
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS snapshots_agg_1d_view CASCADE;

CREATE MATERIALIZED VIEW snapshots_agg_1d_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  symbol,
  "marketType",
  depth,
  AVG("bidVolume") AS "avgBidVolume",
  AVG("askVolume") AS "avgAskVolume",
  MAX("bidVolume") AS "maxBidVolume",
  MAX("askVolume") AS "maxAskVolume",
  MIN("bidVolume") AS "minBidVolume",
  MIN("askVolume") AS "minAskVolume",
  AVG("bidVolumeUsd") AS "avgBidVolumeUsd",
  AVG("askVolumeUsd") AS "avgAskVolumeUsd",
  COUNT(*) AS count
FROM snapshots
GROUP BY bucket, symbol, "marketType", depth
WITH NO DATA;

-- Refresh policy for daily aggregates
SELECT add_continuous_aggregate_policy(
  'snapshots_agg_1d_view',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);

-- ============================================
-- RETENTION POLICIES
-- ============================================

-- Delete raw snapshots older than 60 days
-- (increased from 30 days since data is 60x smaller now)
SELECT add_retention_policy(
  'snapshots',
  INTERVAL '60 days',
  if_not_exists => TRUE
);

-- Delete websocket events older than 14 days
-- (increased from 7 days since they're small)
SELECT add_retention_policy(
  'websocket_events',
  INTERVAL '14 days',
  if_not_exists => TRUE
);

-- Delete system metrics older than 60 days
-- (increased from 30 days)
SELECT add_retention_policy(
  'system_metrics',
  INTERVAL '60 days',
  if_not_exists => TRUE
);

-- ============================================
-- COMPRESSION POLICIES
-- ============================================

-- Enable compression on snapshots table
ALTER TABLE snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol, marketType, depth',
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- Compress chunks older than 14 days
-- (increased from 7 days since data is much smaller)
SELECT add_compression_policy(
  'snapshots',
  INTERVAL '14 days',
  if_not_exists => TRUE
);

-- Enable compression on websocket_events
ALTER TABLE websocket_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol, marketType, eventType',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy(
  'websocket_events',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Enable compression on system_metrics
ALTER TABLE system_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'metricName',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy(
  'system_metrics',
  INTERVAL '14 days',
  if_not_exists => TRUE
);

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_snapshots_symbol_market_time
ON snapshots (symbol, "marketType", timestamp DESC);

-- Index for depth queries
CREATE INDEX IF NOT EXISTS idx_snapshots_depth_time
ON snapshots (depth, timestamp DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_snapshot_stats()
RETURNS TABLE (
  table_name TEXT,
  total_rows BIGINT,
  total_size TEXT,
  chunk_count BIGINT,
  compressed_chunks BIGINT,
  uncompressed_size TEXT,
  compressed_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'snapshots'::TEXT,
    (SELECT COUNT(*) FROM snapshots)::BIGINT,
    pg_size_pretty(pg_total_relation_size('snapshots')),
    (SELECT COUNT(*) FROM timescaledb_information.chunks WHERE hypertable_name = 'snapshots')::BIGINT,
    (SELECT COUNT(*) FROM timescaledb_information.chunks
     WHERE hypertable_name = 'snapshots' AND is_compressed = TRUE)::BIGINT,
    (SELECT pg_size_pretty(SUM(before_compression_total_bytes)::BIGINT)
     FROM timescaledb_information.compressed_chunk_stats
     WHERE hypertable_name = 'snapshots'),
    (SELECT pg_size_pretty(SUM(after_compression_total_bytes)::BIGINT)
     FROM timescaledb_information.compressed_chunk_stats
     WHERE hypertable_name = 'snapshots');
END;
$$ LANGUAGE plpgsql;

-- Function to manually refresh continuous aggregates
CREATE OR REPLACE FUNCTION refresh_all_continuous_aggregates()
RETURNS void AS $$
BEGIN
  CALL refresh_continuous_aggregate('snapshots_agg_1h_view', NULL, NULL);
  CALL refresh_continuous_aggregate('snapshots_agg_1d_view', NULL, NULL);
  RAISE NOTICE 'All continuous aggregates refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to get compression statistics
CREATE OR REPLACE FUNCTION get_compression_stats()
RETURNS TABLE (
  chunk_schema TEXT,
  chunk_name TEXT,
  before_compression_bytes BIGINT,
  after_compression_bytes BIGINT,
  compression_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunk_schema::TEXT,
    chunk_name::TEXT,
    before_compression_total_bytes::BIGINT,
    after_compression_total_bytes::BIGINT,
    ROUND(
      (before_compression_total_bytes::NUMERIC / NULLIF(after_compression_total_bytes, 0))::NUMERIC,
      2
    ) AS compression_ratio
  FROM timescaledb_information.compressed_chunk_stats
  WHERE hypertable_name = 'snapshots'
  ORDER BY before_compression_total_bytes DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get data coverage (min/max timestamps)
CREATE OR REPLACE FUNCTION get_data_coverage()
RETURNS TABLE (
  symbol TEXT,
  market_type TEXT,
  oldest_snapshot TIMESTAMPTZ,
  newest_snapshot TIMESTAMPTZ,
  total_snapshots BIGINT,
  days_covered NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.symbol::TEXT,
    s."marketType"::TEXT,
    MIN(s.timestamp) AS oldest_snapshot,
    MAX(s.timestamp) AS newest_snapshot,
    COUNT(*)::BIGINT AS total_snapshots,
    ROUND(
      EXTRACT(EPOCH FROM (MAX(s.timestamp) - MIN(s.timestamp))) / 86400,
      2
    ) AS days_covered
  FROM snapshots s
  GROUP BY s.symbol, s."marketType"
  ORDER BY s.symbol, s."marketType";
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFY SETUP
-- ============================================

-- List all hypertables
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== HYPERTABLES ===';
  FOR r IN
    SELECT hypertable_name, num_chunks
    FROM timescaledb_information.hypertables
    ORDER BY hypertable_name
  LOOP
    RAISE NOTICE 'Hypertable: %, Chunks: %', r.hypertable_name, r.num_chunks;
  END LOOP;
END $$;

-- List all continuous aggregates
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CONTINUOUS AGGREGATES ===';
  FOR r IN
    SELECT view_name, refresh_interval
    FROM timescaledb_information.continuous_aggregates
    ORDER BY view_name
  LOOP
    RAISE NOTICE 'View: %, Refresh: %', r.view_name, r.refresh_interval;
  END LOOP;
END $$;

-- List all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== POLICIES ===';
  FOR r IN
    SELECT
      hypertable_name,
      policy_name,
      config
    FROM timescaledb_information.jobs
    WHERE hypertable_name IN ('snapshots', 'websocket_events', 'system_metrics')
       OR proc_name LIKE '%continuous_aggregate%'
    ORDER BY hypertable_name, policy_name
  LOOP
    RAISE NOTICE 'Table: %, Policy: %', r.hypertable_name, r.policy_name;
  END LOOP;
END $$;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Get snapshot statistics
-- SELECT * FROM get_snapshot_stats();

-- Example 2: Get data coverage
-- SELECT * FROM get_data_coverage();

-- Example 3: Manually refresh aggregates
-- SELECT refresh_all_continuous_aggregates();

-- Example 4: Check compression stats
-- SELECT * FROM get_compression_stats();

-- Example 5: Query 1-hour aggregates
-- SELECT * FROM snapshots_agg_1h_view
-- WHERE symbol = 'BTCUSDT'
--   AND "marketType" = 'SPOT'
--   AND depth = 5
--   AND bucket >= NOW() - INTERVAL '7 days'
-- ORDER BY bucket DESC;

-- Example 6: Query 1-day aggregates
-- SELECT * FROM snapshots_agg_1d_view
-- WHERE symbol = 'BTCUSDT'
--   AND "marketType" = 'SPOT'
--   AND depth = 5
--   AND bucket >= NOW() - INTERVAL '30 days'
-- ORDER BY bucket DESC;

-- Example 7: Get recent snapshots (last hour)
-- SELECT timestamp, symbol, "bidVolumeUsd", "askVolumeUsd"
-- FROM snapshots
-- WHERE symbol = 'BTCUSDT'
--   AND "marketType" = 'SPOT'
--   AND depth = 5
--   AND timestamp >= NOW() - INTERVAL '1 hour'
-- ORDER BY timestamp DESC
-- LIMIT 60; -- 60 points for 1 hour (1 per minute)

-- Example 8: Get recent snapshots (last 24 hours)
-- SELECT timestamp, symbol, "bidVolumeUsd", "askVolumeUsd"
-- FROM snapshots
-- WHERE symbol = 'BTCUSDT'
--   AND "marketType" = 'SPOT'
--   AND depth = 5
--   AND timestamp >= NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC
-- LIMIT 1440; -- 1440 points for 24 hours (1 per minute)

-- ============================================
-- END OF SCRIPT
-- ============================================

RAISE NOTICE '';
RAISE NOTICE '==============================================';
RAISE NOTICE '✓ TimescaleDB initialization completed!';
RAISE NOTICE '==============================================';
RAISE NOTICE '';
RAISE NOTICE 'Configuration:';
RAISE NOTICE '- Snapshot frequency: 1 per minute (12/min for 1 symbol)';
RAISE NOTICE '- Hypertables: snapshots, websocket_events, system_metrics';
RAISE NOTICE '- Continuous aggregates: 1h, 1d (no 1m since raw is per minute)';
RAISE NOTICE '- Retention: 60 days (snapshots), 14 days (events)';
RAISE NOTICE '- Compression: after 14 days (snapshots), 7 days (events)';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Run: SELECT * FROM get_snapshot_stats();';
RAISE NOTICE '2. Run: SELECT * FROM get_data_coverage();';
RAISE NOTICE '3. Monitor compression: SELECT * FROM get_compression_stats();';
RAISE NOTICE '4. Start ingesting data through your application';
RAISE NOTICE '';
