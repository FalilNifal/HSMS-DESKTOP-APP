# Janatha Hardware — User Guide

A simple, step-by-step guide for running the shop with the Janatha Hardware
desktop app. No technical knowledge needed.

---

## 1. Installing the app

1. Copy the installer file — **`Janatha Hardware-Setup-1.0.0.exe`** — to the computer
   (from a pen drive, email, etc.).
2. Double-click it and follow the prompts (choose a folder, click **Install**).
3. It adds a **Desktop shortcut** and a **Start-menu** entry.

> **"Windows protected your PC" message?** This appears because the app isn't
> code-signed yet. Click **More info → Run anyway**. It's safe — it's your app.

Nothing else is needed — the app runs completely on this one computer and works
**offline**. There's no separate program to start.

---

## 2. First-time setup (only once, on each computer)

The very first time you open the app, it shows the **Setup Wizard**:

1. Enter your **shop details** — name, address, phone, currency (e.g. LKR).
2. Create the **first administrator account** — choose a username and password.
   *Write these down.*
3. The app shows a **Recovery Key** — **save it somewhere safe** (photo/notebook).
   It's the only way to reset the admin password if it's ever forgotten. It's
   shown **once**.
4. Click continue — you can now sign in.

> A brand-new installation starts **empty** (no products, no other staff). You
> build your own list — see the next sections.

---

## 3. Signing in & the screen layout

- Sign in with your username and password.
- **Left sidebar** = the menu. **Top-right** = light/dark toggle 🌓 and your
  account menu (change password, log out).
- What you see depends on your **role** (below).

---

## 4. Staff accounts & roles

| Role | Can do | Created by |
|---|---|---|
| **Admin** | Everything: products, sales, reports, **staff accounts**, settings, backups | Setup wizard (first run) |
| **Manager** | Products, suppliers, sales, reports (but **not** staff accounts) | The Admin |
| **Cashier** | Make sales + search products only | The Admin |

**Only the Admin can create staff.** To add your workers:

1. Sign in as Admin → **Users** (in the sidebar) → **Add user**.
2. Enter their full name, a username, a password, and pick a role
   (Manager or Cashier).
3. Give them their username/password — they sign in with their own account.

Managers and cashiers can change their **own** password from the top-right
account menu → **Change password**.

---

## 5. Adding your products

You have two ways:

### Option A — Add one at a time
**Products → Add product.** Fill in name, SKU (a unique code), category,
supplier (optional), **purchase price** (your cost), **minimum selling price**
(your price floor), opening stock, and a low-stock alert level.

### Option B — Import many at once (CSV) ✅ fastest for a new shop
1. **Products → Import CSV → Download template.**
2. Open the template in Excel / Google Sheets and fill in your products (one per
   row). Columns: *Name, SKU, Category, Supplier, PurchasePrice,
   MinimumSellingPrice, StockQuantity, LowStockLevel.*
3. Save as **CSV**.
4. **Products → Import CSV → choose your file → Import.**

The app **creates any new categories and suppliers automatically**, and skips
rows whose SKU already exists. You'll get a summary of how many were added.

> **Pricing rule:** the *minimum selling price* is your floor. At the counter,
> a cashier can raise the price but the app will **never allow a price below it**.

---

## 6. Making a sale (POS Billing)

1. Go to **POS Billing**.
2. Search a product and click it to add it to the cart.
3. Set the **quantity** and, if needed, adjust the **price** (it won't go below
   the minimum).
4. Choose the **payment method** and click **Complete sale**.
5. The **receipt** appears — click **Print** to print it. Stock is reduced
   automatically.

---

## 7. Reports (Admin / Manager)

**Reports** shows, for any date range:
- **Trend** — a daily sales bar chart.
- **By product** — best sellers (filter by category).
- **By cashier** — each person's sales.
- **Low stock** — items to reorder.

Every table has an **Export CSV** button for Excel.

The **Dashboard** (home screen) shows today's sales, profit, orders, and live
low-stock alerts at a glance.

---

## 8. Suppliers & Categories

- **Suppliers** — add/edit the businesses you buy from.
- **Settings → Product categories** — organise products into groups.
  (Categories are also created for you when you import a CSV.)

---

## 9. Tracking who did what

- **Every sale** records the **time** and **which cashier** made it (see
  Reports and the receipt).
- **User Activity** (Admin sidebar) shows a **login/logout history** — who signed
  in and out, and when — with date filters and CSV export.

---

## 10. Backing up your data

Your data lives only on this computer, so **back it up regularly**.

- **Backup → Create backup** makes a dated copy.
- **Download** an important backup and keep it on a pen drive / cloud for safety.
- **Restore** replaces the current data with a chosen backup (a safety copy of
  the current data is taken first).

**Moving to a new computer (same shop):** install the app there, then
**Backup → Restore** a backup from the old PC — this brings across *everything*
(products, sales, staff).

---

## 11. Common questions

**I forgot the admin password.**
On the login screen use the recovery option with the **Recovery Key** you saved
during setup.

**A red bar says "Can't reach the HSMS server."**
The app's engine didn't start. Close the app fully and reopen it. If it keeps
happening, restart the computer.

**Do all computers share the same data?**
No. Each installation is independent (offline, single-PC). Use Backup/Restore to
copy data between them.

**Can a cashier see my profit or cost prices?**
No. Cashiers never see purchase price or profit — only the selling price.
