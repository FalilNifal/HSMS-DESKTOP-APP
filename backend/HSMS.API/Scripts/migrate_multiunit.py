"""
Idempotent migration: adds the multiple-units columns to an EXISTING dev database.

Background: the app uses EF Core's EnsureCreated(), which builds the full schema
on a fresh install but never alters existing tables. So a database created before
the "multiple units per product" feature needs these columns added once.

Run it with the backend STOPPED (close the app first, or the DB will be locked):
    py backend/HSMS.API/Scripts/migrate_multiunit.py
Optionally pass a path:
    py backend/HSMS.API/Scripts/migrate_multiunit.py path\\to\\hsms_desktop.db
"""
import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "hsms_desktop.db")

# (table, column, column definition)
COLUMNS = [
    ("Products", "Unit", 'TEXT NOT NULL DEFAULT \'pcs\''),
    ("Products", "SecondaryUnit", "TEXT NULL"),
    ("Products", "SecondaryUnitFactor", "INTEGER NOT NULL DEFAULT 0"),
    ("Products", "SecondaryUnitPrice", "TEXT NOT NULL DEFAULT '0'"),
    ("SaleItems", "UnitLabel", 'TEXT NOT NULL DEFAULT \'pcs\''),
    ("SaleItems", "UnitFactor", "INTEGER NOT NULL DEFAULT 1"),
]


def existing_columns(cur, table):
    cur.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cur.fetchall()}


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        print("Nothing to migrate — a fresh install creates these columns automatically.")
        return

    print(f"Migrating: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        added = 0
        for table, column, definition in COLUMNS:
            if column in existing_columns(cur, table):
                print(f"  = {table}.{column} already present")
                continue
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            print(f"  + added {table}.{column}")
            added += 1
        conn.commit()
        print(f"Done. {added} column(s) added." if added else "Done. Already up to date.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
