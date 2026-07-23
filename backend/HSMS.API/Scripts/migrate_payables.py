"""
Idempotent migration: adds supplier-payables support to an EXISTING dev database
(Suppliers.OutstandingBalance column + SupplierBills / SupplierPayments tables).
A fresh install creates all of this automatically (EnsureCreated).

Run it with the backend STOPPED (close the app first):
    py backend/HSMS.API/Scripts/migrate_payables.py
"""
import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "hsms_desktop.db")

TABLES = [
    """
    CREATE TABLE IF NOT EXISTS "SupplierBills" (
        "Id" INTEGER NOT NULL CONSTRAINT "PK_SupplierBills" PRIMARY KEY AUTOINCREMENT,
        "SupplierId" INTEGER NOT NULL,
        "BillNumber" TEXT NOT NULL,
        "Amount" TEXT NOT NULL,
        "BillDate" TEXT NOT NULL,
        "Notes" TEXT NOT NULL,
        "CreatedByUserId" INTEGER NOT NULL,
        "CreatedAt" TEXT NOT NULL,
        CONSTRAINT "FK_SupplierBills_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SupplierBills_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    )
    """,
    'CREATE INDEX IF NOT EXISTS "IX_SupplierBills_SupplierId" ON "SupplierBills" ("SupplierId")',
    'CREATE INDEX IF NOT EXISTS "IX_SupplierBills_CreatedByUserId" ON "SupplierBills" ("CreatedByUserId")',
    """
    CREATE TABLE IF NOT EXISTS "SupplierPayments" (
        "Id" INTEGER NOT NULL CONSTRAINT "PK_SupplierPayments" PRIMARY KEY AUTOINCREMENT,
        "SupplierId" INTEGER NOT NULL,
        "Amount" TEXT NOT NULL,
        "PaymentMethod" TEXT NOT NULL,
        "PaymentDate" TEXT NOT NULL,
        "Notes" TEXT NOT NULL,
        "CreatedByUserId" INTEGER NOT NULL,
        "CreatedAt" TEXT NOT NULL,
        CONSTRAINT "FK_SupplierPayments_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SupplierPayments_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    )
    """,
    'CREATE INDEX IF NOT EXISTS "IX_SupplierPayments_SupplierId" ON "SupplierPayments" ("SupplierId")',
    'CREATE INDEX IF NOT EXISTS "IX_SupplierPayments_CreatedByUserId" ON "SupplierPayments" ("CreatedByUserId")',
]


def supplier_has_balance(cur):
    cur.execute("PRAGMA table_info(Suppliers)")
    return any(row[1] == "OutstandingBalance" for row in cur.fetchall())


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        print("Nothing to migrate — a fresh install creates this automatically.")
        return

    print(f"Migrating: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        if supplier_has_balance(cur):
            print("  = Suppliers.OutstandingBalance already present")
        else:
            cur.execute('ALTER TABLE "Suppliers" ADD COLUMN "OutstandingBalance" TEXT NOT NULL DEFAULT \'0\'')
            print("  + added Suppliers.OutstandingBalance")
        for statement in TABLES:
            cur.execute(statement)
        conn.commit()
        print("Done. Supplier-payables schema is present.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
