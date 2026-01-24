--- Postgress Sql needed to be run maunally to create a database named 'merlins_crystal_ball_prod'
CREATE DATABASE merlins_crystal_ball_prod;
GRANT ALL PRIVILEGES ON DATABASE merlins_crystal_ball_prod TO mcb_user;
GRANT CONNECT ON DATABASE merlins_crystal_ball_prod TO mcb_user;
GRANT USAGE ON SCHEMA public TO mcb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mcb_user