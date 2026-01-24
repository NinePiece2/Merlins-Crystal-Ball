--- Postgress Sql needed to be run manually to create a database named 'merlins_crystal_ball_prod'
CREATE DATABASE merlins_crystal_ball_prod;
GRANT ALL PRIVILEGES ON DATABASE merlins_crystal_ball_prod TO mcb_user;
GRANT CONNECT ON DATABASE merlins_crystal_ball_prod TO mcb_user;

-- IMPORTANT: Run the following commands while connected to merlins_crystal_ball_prod database
-- Run: psql -U postgres -d merlins_crystal_ball_prod -f this_file.sql
-- Or in psql, run: \c merlins_crystal_ball_prod

GRANT ALL PRIVILEGES ON SCHEMA public TO mcb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mcb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mcb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO mcb_user;