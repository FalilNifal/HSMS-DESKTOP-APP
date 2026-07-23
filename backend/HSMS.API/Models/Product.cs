using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class Product
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SKU { get; set; } = string.Empty;

        public int CategoryId { get; set; }

        public int? SupplierId { get; set; }

        public decimal PurchasePrice { get; set; }

        public decimal MinimumSellingPrice { get; set; }

        public int StockQuantity { get; set; }

        public int LowStockLevel { get; set; }

        /// <summary>Base selling/stocking unit label, e.g. "pcs", "kg", "m".</summary>
        [MaxLength(20)]
        public string Unit { get; set; } = "pcs";

        /// <summary>Optional bulk unit, e.g. "box". Null/empty = product sold only in the base unit.</summary>
        [MaxLength(20)]
        public string? SecondaryUnit { get; set; }

        /// <summary>How many base units make up one secondary unit (e.g. 12 pcs per box).</summary>
        public int SecondaryUnitFactor { get; set; }

        /// <summary>Default selling price for one secondary unit.</summary>
        public decimal SecondaryUnitPrice { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }

        public Category? Category { get; set; }

        public Supplier? Supplier { get; set; }

        public ICollection<StockLog> StockLogs { get; set; } = new List<StockLog>();
    }
}