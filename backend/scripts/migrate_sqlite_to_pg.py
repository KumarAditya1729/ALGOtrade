#!/usr/bin/env python3
"""
Migration Script: OpenAlgo (SQLite) -> Unified Platform (PostgreSQL)
Extracts users, credentials, and flows from scattered SQLite databases
and loads them into the canonical PostgreSQL schema.
"""
import os
import sys
import sqlite3
import psycopg2
import argparse
import logging
from psycopg2.extras import DictCursor

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("migration")

OPENALGO_DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../openalgo/database"))
POSTGRES_DSN = os.getenv("DATABASE_URL", "dbname=calculatedrisk user=postgres password=postgres host=localhost port=5432")

def get_sqlite_conn(db_name: str) -> sqlite3.Connection:
    path = os.path.join(OPENALGO_DB_DIR, db_name)
    if not os.path.exists(path):
        logger.warning(f"SQLite DB not found at {path}, skipping.")
        return None
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def migrate_users(pg_conn, dry_run: bool):
    """Migrate users from auth.db -> qd_users"""
    sqlite_conn = get_sqlite_conn("auth.db")
    if not sqlite_conn:
        return
    
    logger.info("--- Migrating Users ---")
    cur_sqlite = sqlite_conn.cursor()
    try:
        cur_sqlite.execute("SELECT id, username, email, password, role FROM users")
        users = cur_sqlite.fetchall()
    except sqlite3.OperationalError:
        logger.error("Could not find 'users' table in auth.db")
        sqlite_conn.close()
        return

    cur_pg = pg_conn.cursor()
    migrated_count = 0
    
    for user in users:
        logger.info(f"Processing OpenAlgo user: {user['username']}")
        if dry_run:
            migrated_count += 1
            continue
            
        try:
            cur_pg.execute("""
                INSERT INTO qd_users (username, email, password_hash, role, status)
                VALUES (%s, %s, %s, %s, 'active')
                ON CONFLICT (email) DO UPDATE 
                SET password_hash = EXCLUDED.password_hash;
            """, (user['username'], user['email'], user['password'], user['role'] or 'user'))
            migrated_count += 1
        except Exception as e:
            logger.error(f"Failed to migrate user {user['username']}: {e}")
            pg_conn.rollback()
            
    if not dry_run:
        pg_conn.commit()
    logger.info(f"Migrated {migrated_count} users.\n")
    sqlite_conn.close()

def main():
    parser = argparse.ArgumentParser(description="Migrate OpenAlgo SQLite to PostgreSQL.")
    parser.add_argument("--dry-run", action="store_true", help="Do not commit changes to PostgreSQL.")
    args = parser.parse_args()

    logger.info(f"Starting Migration. Dry Run: {args.dry_run}")
    
    try:
        pg_conn = psycopg2.connect(POSTGRES_DSN)
    except psycopg2.Error as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        sys.exit(1)
        
    migrate_users(pg_conn, args.dry_run)
    # Further migration hooks for broker_credentials and flow.db go here
    
    pg_conn.close()
    logger.info("Migration finished.")

if __name__ == "__main__":
    main()
