"""
Idempotent migration: adds ShopSettings.Logo (shop-uploaded logo, data URL) to an
EXISTING dev database. A fresh install creates it automatically (EnsureCreated).

Run it with the backend STOPPED (close the app first):
    py backend/HSMS.API/Scripts/migrate_shoplogo.py
"""
import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "hsms_desktop.db")


def has_column(cur, table, column):
    cur.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cur.fetchall())


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        print("Nothing to migrate — a fresh install creates this column automatically.")
        return

    print(f"Migrating: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        if has_column(cur, "ShopSettings", "Logo"):
            print("  = ShopSettings.Logo already present")
        else:
            cur.execute('ALTER TABLE "ShopSettings" ADD COLUMN "Logo" TEXT NULL')
            print("  + added ShopSettings.Logo")
        conn.commit()
        print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
