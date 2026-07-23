"""
Idempotent migration: creates the Expenses table in an EXISTING dev database.
A fresh install creates it automatically (EnsureCreated).

Run it with the backend STOPPED (close the app first):
    py backend/HSMS.API/Scripts/migrate_expenses.py
"""
import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "hsms_desktop.db")

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS "Expenses" (
        "Id" INTEGER NOT NULL CONSTRAINT "PK_Expenses" PRIMARY KEY AUTOINCREMENT,
        "Category" TEXT NOT NULL,
        "Description" TEXT NOT NULL,
        "Amount" TEXT NOT NULL,
        "PaymentMethod" TEXT NOT NULL,
        "ExpenseDate" TEXT NOT NULL,
        "CreatedByUserId" INTEGER NOT NULL,
        "CreatedAt" TEXT NOT NULL,
        CONSTRAINT "FK_Expenses_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    )
    """,
    'CREATE INDEX IF NOT EXISTS "IX_Expenses_ExpenseDate" ON "Expenses" ("ExpenseDate")',
    'CREATE INDEX IF NOT EXISTS "IX_Expenses_CreatedByUserId" ON "Expenses" ("CreatedByUserId")',
]


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        print("Nothing to migrate — a fresh install creates this table automatically.")
        return

    print(f"Migrating: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        for statement in STATEMENTS:
            cur.execute(statement)
        conn.commit()
        print("Done. Expenses table is present.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
