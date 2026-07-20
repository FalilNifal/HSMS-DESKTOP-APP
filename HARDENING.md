# HSMS — Security & Production Hardening

Status of the hardening pass. Items marked ✅ are applied and build-verified.
Items marked 📋 need internet (nuget / dotnet-ef tooling) and are documented here
to run on a connected machine.

## ✅ Applied

### 1. Per-install JWT signing key
The API no longer signs tokens with the shared dev placeholder key. On startup
([Program.cs](backend/HSMS.API/Program.cs)):

- If `Jwt:Key` is missing or equals the old dev placeholder, the API generates a
  cryptographically-random 64-byte key, base64-encodes it, and persists it to
  `jwt.key` in the writable data directory (`%APPDATA%\hsms-desktop\jwt.key` when
  packaged; the project folder in dev).
- The same key is reused on every subsequent launch, so tokens stay valid across
  restarts — but each **installation** has its own secret.

> Note: the first time this runs, any tokens signed with the old key become
> invalid, so users must sign in again. Passwords are unaffected.
> `jwt.key` is gitignored.

### 2. Login rate-limiting
A fixed-window limiter (`Microsoft.AspNetCore.RateLimiting`, built into the
framework) protects `POST /api/auth/login`: **max 10 attempts per minute per
client**, excess returns **HTTP 429**. This slows brute-force guessing without
affecting normal use.

## 📋 Follow-ups (need a connected machine)

### 3. Patch the vulnerable SQLite native package
The build warns (NU1903) that the transitive `SQLitePCLRaw.lib.e_sqlite3 2.1.11`
has a known vulnerability. Pin the patched bundle:

```powershell
cd backend/HSMS.API
dotnet add package SQLitePCLRaw.bundle_e_sqlite3   # pulls the latest patched version
dotnet build
dotnet list package --vulnerable                   # should now be clean
```

Real-world risk here is low (the only database is the app's own local file), but
it clears the advisory.

### 4. EF Core migrations (replace `EnsureCreated`)
Today the API calls `db.Database.EnsureCreated()`, which is fine for a fresh
install but can't evolve the schema later without data loss. To switch to
migrations:

```powershell
dotnet tool install --global dotnet-ef            # one time
cd backend/HSMS.API
dotnet ef migrations add InitialCreate
```

Then in [Program.cs](backend/HSMS.API/Program.cs) replace:

```csharp
db.Database.EnsureCreated();
```
with:
```csharp
db.Database.Migrate();
```

> Cut over **before** real shop data exists (or delete the existing
> `hsms_desktop.db` first). A database created by `EnsureCreated` has no
> migrations-history table, so `Migrate()` would try to re-create existing
> tables and fail. After the cutover, future schema changes are just
> `dotnet ef migrations add <Name>` — applied automatically on next launch.

## Not applicable / already handled
- **HTTPS**: the API is loopback-only (`http://localhost:5146`) behind the
  desktop app; TLS/redirect isn't needed and was removed for the packaged build.
- **Overselling under concurrency**: SQLite serializes writers and sales run in a
  transaction, so no `SELECT … FOR UPDATE` equivalent is required.
- **Code signing**: buy a certificate to remove the SmartScreen warning on the
  installer (see PACKAGING.md).
