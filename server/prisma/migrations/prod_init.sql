-- Production Database Initialization Script
-- Run this on your production PostgreSQL database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema version table for tracking migrations
CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id SERIAL PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMP,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMP,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security for sensitive tables
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Order" ENABLE ROW LEVEL SECURITY;

-- Create backup table for disaster recovery
CREATE TABLE IF NOT EXISTS backup_metadata (
  id SERIAL PRIMARY KEY,
  backup_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  backup_name VARCHAR(255) NOT NULL UNIQUE,
  backup_size BIGINT,
  backup_status VARCHAR(50),
  notes TEXT
);

-- Create audit log table for compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Grant appropriate permissions
-- Note: Create these roles in your PostgreSQL server
-- CREATE ROLE kodo_app WITH LOGIN PASSWORD 'your-secure-password';
-- GRANT CONNECT ON DATABASE kodo_prod TO kodo_app;
-- GRANT USAGE ON SCHEMA public TO kodo_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kodo_app;

