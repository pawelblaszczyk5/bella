#!/bin/bash
set -e

# cspell:ignore psql EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE USER bella_cluster WITH PASSWORD 'example_cluster_password_123';
  CREATE DATABASE bella_cluster OWNER bella_cluster;
  GRANT ALL PRIVILEGES ON DATABASE bella_cluster TO bella_cluster;

  CREATE USER bella_app WITH PASSWORD 'example_app_password_123';
  ALTER ROLE bella_app WITH REPLICATION;
  CREATE DATABASE bella_app OWNER bella_app;
  GRANT ALL PRIVILEGES ON DATABASE bella_app TO bella_app;
EOSQL