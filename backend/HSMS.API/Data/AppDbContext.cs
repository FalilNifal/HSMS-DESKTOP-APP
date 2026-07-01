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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .Property(u => u.Role)
                .HasConversion<string>();

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