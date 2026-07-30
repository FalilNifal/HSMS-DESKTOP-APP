using HSMS.API.Data;
using HSMS.API.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Tests.Infrastructure;

/// <summary>
/// A disposable test harness backed by a real in-memory SQLite database (same
/// engine as production, so decimal/precision/constraint behaviour matches).
/// Seeds a baseline admin user, category and supplier.
/// </summary>
public sealed class Harness : IDisposable
{
    private readonly SqliteConnection _conn;

    public AppDbContext Db { get; }
    public int AdminUserId { get; }
    public int CategoryId { get; }
    public int SupplierId { get; }

    public Harness()
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options;
        Db = new AppDbContext(options);
        Db.Database.EnsureCreated();

        var admin = new User
        {
            FullName = "Admin",
            Username = "admin",
            PasswordHash = "hash",
            Role = "Admin",
            IsActive = true,
            CreatedAt = DateTime.Now
        };
        Db.Users.Add(admin);

        var category = new Category { Name = "General", IsActive = true, CreatedAt = DateTime.Now };
        Db.Categories.Add(category);

        var supplier = new Supplier { Name = "Acme Supplies", IsActive = true, CreatedAt = DateTime.Now };
        Db.Suppliers.Add(supplier);

        Db.SaveChanges();

        AdminUserId = admin.Id;
        CategoryId = category.Id;
        SupplierId = supplier.Id;
    }

    public Product AddProduct(
        decimal purchasePrice,
        decimal minSellingPrice,
        int stock,
        string unit = "pcs",
        string? secondaryUnit = null,
        int secondaryFactor = 0,
        decimal secondaryPrice = 0)
    {
        var product = new Product
        {
            Name = "Product-" + Guid.NewGuid().ToString("N")[..6],
            SKU = "SKU-" + Guid.NewGuid().ToString("N")[..8],
            CategoryId = CategoryId,
            SupplierId = SupplierId,
            PurchasePrice = purchasePrice,
            MinimumSellingPrice = minSellingPrice,
            StockQuantity = stock,
            LowStockLevel = 5,
            Unit = unit,
            SecondaryUnit = secondaryUnit,
            SecondaryUnitFactor = secondaryFactor,
            SecondaryUnitPrice = secondaryPrice,
            IsActive = true,
            CreatedAt = DateTime.Now
        };
        Db.Products.Add(product);
        Db.SaveChanges();
        return product;
    }

    public Customer AddCustomer(decimal creditLimit = 0, decimal balance = 0)
    {
        var customer = new Customer
        {
            Name = "Customer-" + Guid.NewGuid().ToString("N")[..5],
            CreditLimit = creditLimit,
            OutstandingBalance = balance,
            IsActive = true,
            CreatedAt = DateTime.Now
        };
        Db.Customers.Add(customer);
        Db.SaveChanges();
        return customer;
    }

    public void SetTax(decimal ratePercent, string label = "VAT")
    {
        var settings = Db.ShopSettings.First(item => item.Id == 1);
        settings.TaxRatePercent = ratePercent;
        settings.TaxLabel = label;
        Db.SaveChanges();
    }

    /// <summary>Re-reads a product from the DB (fresh instance) to assert persisted state.</summary>
    public Product Reload(int productId) => Db.Products.AsNoTracking().First(p => p.Id == productId);

    public void Dispose()
    {
        Db.Dispose();
        _conn.Dispose();
    }
}
