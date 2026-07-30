# HSMS.API.Tests — backend money-path tests

Automated tests for the **business-critical / money-handling** logic. This is a
deliberately **focused** suite, not a chase for a high coverage number: it tests
the code where a bug would corrupt a shop's books, and skips CRUD/read/plumbing
endpoints (those are cheap to verify by hand).

## What's covered
- **Sales** — stock deduction, multi-unit (box → base-unit) math, min-price rule,
  insufficient-stock rejection, tax, credit-limit enforcement & balance updates.
- **Quotations** — total calc, convert-to-sale (stock + status), double-convert guard.
- **Returns** — restock + refund total, over-return rejection.
- **Stock-take** — adjusts only changed rows, sets counted qty, writes a variance log.
- **Supplier payables** — bill raises balance, payment lowers it.
- **Z-report** — cash-drawer reconciliation arithmetic.

Coverage on those specific methods is ~80–100%. Overall line coverage is lower by
design because the untested surface (auth, backup, categories, plain CRUD) is
intentionally out of scope.

## How it works
Each test spins up a real **in-memory SQLite** database (same engine as production,
so decimals/precision/constraints behave identically), seeds a baseline
admin/category/supplier, and calls the **controllers directly** with a fake
authenticated user (`Infrastructure/Harness.cs`, `Infrastructure/ControllerExtensions.cs`).

## Run

```bash
cd backend/HSMS.API.Tests
dotnet test                                   # run the suite
dotnet test --collect:"XPlat Code Coverage"   # + coverage (writes TestResults/**/coverage.cobertura.xml)
```

Optional browsable HTML report (needs the tool once:
`dotnet tool install -g dotnet-reportgenerator-globaltool`):

```bash
reportgenerator -reports:TestResults/**/coverage.cobertura.xml -targetdir:coverage-report -reporttypes:Html
```
