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
        public DbSet<UserActivityLog> UserActivityLogs => Set<UserActivityLog>();
        public DbSet<Return> Returns => Set<Return>();
        public DbSet<ReturnItem> ReturnItems => Set<ReturnItem>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<CustomerPayment> CustomerPayments => Set<CustomerPayment>();
        public DbSet<Quotation> Quotations => Set<Quotation>();
        public DbSet<QuotationItem> QuotationItems => Set<QuotationItem>();
        public DbSet<Expense> Expenses => Set<Expense>();
        public DbSet<SupplierBill> SupplierBills => Set<SupplierBill>();
        public DbSet<SupplierPayment> SupplierPayments => Set<SupplierPayment>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<UserActivityLog>()
                .HasIndex(log => log.CreatedAt);

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

            modelBuilder.Entity<Product>()
                .Property(product => product.SecondaryUnitPrice)
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

            modelBuilder.Entity<Sale>()
                .Property(sale => sale.TaxAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ShopSettings>()
                .Property(settings => settings.TaxRatePercent)
                .HasPrecision(5, 2);

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

            modelBuilder.Entity<Return>()
                .HasIndex(returnEntity => returnEntity.ReturnNumber)
                .IsUnique();

            modelBuilder.Entity<Return>()
                .HasOne(returnEntity => returnEntity.ProcessedByUser)
                .WithMany()
                .HasForeignKey(returnEntity => returnEntity.ProcessedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Return>()
                .HasOne(returnEntity => returnEntity.Sale)
                .WithMany()
                .HasForeignKey(returnEntity => returnEntity.SaleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Return>()
                .Property(returnEntity => returnEntity.TotalRefund)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ReturnItem>()
                .HasOne(item => item.Return)
                .WithMany(returnEntity => returnEntity.Items)
                .HasForeignKey(item => item.ReturnId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ReturnItem>()
                .Property(item => item.UnitPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ReturnItem>()
                .Property(item => item.LineRefund)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Customer>()
                .Property(customer => customer.CreditLimit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Customer>()
                .Property(customer => customer.OutstandingBalance)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CustomerPayment>()
                .Property(payment => payment.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CustomerPayment>()
                .HasOne(payment => payment.Customer)
                .WithMany()
                .HasForeignKey(payment => payment.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Sale>()
                .HasOne(sale => sale.Customer)
                .WithMany()
                .HasForeignKey(sale => sale.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Quotation>()
                .HasIndex(quotation => quotation.QuotationNumber)
                .IsUnique();

            modelBuilder.Entity<Quotation>()
                .HasOne(quotation => quotation.CreatedByUser)
                .WithMany()
                .HasForeignKey(quotation => quotation.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Quotation>()
                .HasOne(quotation => quotation.Customer)
                .WithMany()
                .HasForeignKey(quotation => quotation.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Quotation>()
                .Property(quotation => quotation.TotalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<QuotationItem>()
                .HasOne(item => item.Quotation)
                .WithMany(quotation => quotation.Items)
                .HasForeignKey(item => item.QuotationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<QuotationItem>()
                .HasOne(item => item.Product)
                .WithMany()
                .HasForeignKey(item => item.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<QuotationItem>()
                .Property(item => item.UnitPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<QuotationItem>()
                .Property(item => item.LineTotal)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Expense>()
                .HasIndex(expense => expense.ExpenseDate);

            modelBuilder.Entity<Expense>()
                .HasOne(expense => expense.CreatedByUser)
                .WithMany()
                .HasForeignKey(expense => expense.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Expense>()
                .Property(expense => expense.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Supplier>()
                .Property(supplier => supplier.OutstandingBalance)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SupplierBill>()
                .HasOne(bill => bill.Supplier)
                .WithMany()
                .HasForeignKey(bill => bill.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SupplierBill>()
                .HasOne(bill => bill.CreatedByUser)
                .WithMany()
                .HasForeignKey(bill => bill.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SupplierBill>()
                .Property(bill => bill.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SupplierPayment>()
                .HasOne(payment => payment.Supplier)
                .WithMany()
                .HasForeignKey(payment => payment.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SupplierPayment>()
                .HasOne(payment => payment.CreatedByUser)
                .WithMany()
                .HasForeignKey(payment => payment.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SupplierPayment>()
                .Property(payment => payment.Amount)
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