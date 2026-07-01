using HSMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace HSMS.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<ShopSettings> ShopSettings => Set<ShopSettings>();
        public DbSet<AppSettings> AppSettings => Set<AppSettings>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Supplier> Suppliers => Set<Supplier>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<StockLog> StockLogs => Set<StockLog>();
        public DbSet<Sale> Sales => Set<Sale>();
        public DbSet<SaleItem> SaleItems => Set<SaleItem>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .Property(u => u.Role)
                .HasConversion<string>();

            modelBuilder.Entity<Category>()
                .HasIndex(category => category.Name)
                .IsUnique();

            modelBuilder.Entity<Supplier>()
                .HasIndex(supplier => supplier.Name)
                .IsUnique(false);

            modelBuilder.Entity<Product>()
                .HasIndex(product => product.SKU)
                .IsUnique();

            modelBuilder.Entity<Product>()
                .HasOne(product => product.Category)
                .WithMany(category => category.Products)
                .HasForeignKey(product => product.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Product>()
                .HasOne(product => product.Supplier)
                .WithMany(supplier => supplier.Products)
                .HasForeignKey(product => product.SupplierId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Product>()
                .Property(product => product.PurchasePrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Product>()
                .Property(product => product.MinimumSellingPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<StockLog>()
                .HasOne(stockLog => stockLog.Product)
                .WithMany(product => product.StockLogs)
                .HasForeignKey(stockLog => stockLog.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StockLog>()
                .HasOne(stockLog => stockLog.ChangedByUser)
                .WithMany()
                .HasForeignKey(stockLog => stockLog.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<StockLog>()
                .Property(stockLog => stockLog.ChangeAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Sale>()
                .HasIndex(sale => sale.InvoiceNumber)
                .IsUnique();

            modelBuilder.Entity<Sale>()
                .HasOne(sale => sale.SoldByUser)
                .WithMany()
                .HasForeignKey(sale => sale.SoldByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Sale>()
                .Property(sale => sale.TotalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Sale>()
                .Property(sale => sale.TotalProfit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SaleItem>()
                .HasOne(saleItem => saleItem.Sale)
                .WithMany(sale => sale.SaleItems)
                .HasForeignKey(saleItem => saleItem.SaleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleItem>()
                .HasOne(saleItem => saleItem.Product)
                .WithMany()
                .HasForeignKey(saleItem => saleItem.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleItem>()
                .Property(saleItem => saleItem.PurchasePriceAtSale)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SaleItem>()
                .Property(saleItem => saleItem.MinimumSellingPriceAtSale)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SaleItem>()
                .Property(saleItem => saleItem.ActualSellingPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SaleItem>()
                .Property(saleItem => saleItem.LineTotal)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SaleItem>()
                .Property(saleItem => saleItem.LineProfit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ShopSettings>()
                .HasData(new ShopSettings
                {
                    Id = 1,
                    ShopName = "HSMS Shop",
                    Address = "",
                    PhoneNumber = "",
                    Currency = "LKR",
                    InvoiceFooterMessage = "Thank you for your business!",
                    CreatedAt = new DateTime(2026, 1, 1)
                });

            modelBuilder.Entity<AppSettings>()
                .HasData(new AppSettings
                {
                    Id = 1,
                    IsSetupCompleted = false,
                    CreatedAt = new DateTime(2026, 1, 1)
                });
        }
    }
}