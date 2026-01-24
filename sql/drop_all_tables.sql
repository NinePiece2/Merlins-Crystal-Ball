-- Drop all tables and reset the database
-- WARNING: This will delete all data in the database!
-- Run this only if you're sure you want to reset everything

-- Drop tables in reverse order of dependencies (foreign keys first)
DROP TABLE IF EXISTS "user_campaign_preference" CASCADE;
DROP TABLE IF EXISTS "campaign_party" CASCADE;
DROP TABLE IF EXISTS "character_level" CASCADE;
DROP TABLE IF EXISTS "character_level_unique" CASCADE;
DROP TABLE IF EXISTS "character" CASCADE;
DROP TABLE IF EXISTS "campaign" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS "5e_data" CASCADE;

-- Drop drizzle migration table
DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;

-- Drop drizzle schema if empty
DROP SCHEMA IF EXISTS "drizzle" CASCADE;

-- Verify all tables are gone
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
