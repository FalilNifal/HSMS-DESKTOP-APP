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