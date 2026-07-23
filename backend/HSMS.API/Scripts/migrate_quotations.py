"""
Idempotent migration: creates the Quotations / QuotationItems tables in an
EXISTING dev database. A fresh install creates them automatically (EnsureCreated),
but EnsureCreated never adds tables to a database that already exists.

Run it with the backend STOPPED (close the app first):
    py backend/HSMS.API/Scripts/migrate_quotations.py
Optionally pass a path:
    py backend/HSMS.API/Scripts/migrate_quotations.py path\\to\\hsms_desktop.db
"""
import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "hsms_desktop.db")

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS "Quotations" (
        "Id" INTEGER NOT NULL CONSTRAINT "PK_Quotations" PRIMARY KEY AUTOINCREMENT,
        "QuotationNumber" TEXT NOT NULL,
        "CustomerId" INTEGER NULL,
        "CustomerNameSnapshot" TEXT NOT NULL,
        "CreatedByUserId" INTEGER NOT NULL,
        "TotalAmount" TEXT NOT NULL,
        "Notes" TEXT NOT NULL,
        "ValidUntil" TEXT NULL,
        "Status" TEXT NOT NULL,
        "ConvertedSaleId" INTEGER NULL,
        "CreatedAt" TEXT NOT NULL,
        "UpdatedAt" TEXT NULL,
        CONSTRAINT "FK_Quotations_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_Quotations_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    )
    """,
    'CREATE UNIQUE INDEX IF NOT EXISTS "IX_Quotations_QuotationNumber" ON "Quotations" ("QuotationNumber")',
    'CREATE INDEX IF NOT EXISTS "IX_Quotations_CustomerId" ON "Quotations" ("CustomerId")',
    'CREATE INDEX IF NOT EXISTS "IX_Quotations_CreatedByUserId" ON "Quotations" ("CreatedByUserId")',
    """
    CREATE TABLE IF NOT EXISTS "QuotationItems" (
        "Id" INTEGER NOT NULL CONSTRAINT "PK_QuotationItems" PRIMARY KEY AUTOINCREMENT,
        "QuotationId" INTEGER NOT NULL,
        "ProductId" INTEGER NOT NULL,
        "ProductNameSnapshot" TEXT NOT NULL,
        "SKUSnapshot" TEXT NOT NULL,
        "Quantity" INTEGER NOT NULL,
        "UnitLabel" TEXT NOT NULL,
        "UnitFactor" INTEGER NOT NULL,
        "UnitPrice" TEXT NOT NULL,
        "LineTotal" TEXT NOT NULL,
        CONSTRAINT "FK_QuotationItems_Quotations_QuotationId" FOREIGN KEY ("QuotationId") REFERENCES "Quotations" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_QuotationItems_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE RESTRICT
    )
    """,
    'CREATE INDEX IF NOT EXISTS "IX_QuotationItems_QuotationId" ON "QuotationItems" ("QuotationId")',
    'CREATE INDEX IF NOT EXISTS "IX_QuotationItems_ProductId" ON "QuotationItems" ("ProductId")',
]


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        print("Nothing to migrate — a fresh install creates these tables automatically.")
        return

    print(f"Migrating: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        for statement in STATEMENTS:
            cur.execute(statement)
        conn.commit()
        print("Done. Quotations tables are present.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
