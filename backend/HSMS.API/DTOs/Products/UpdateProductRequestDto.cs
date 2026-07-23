using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Products
{
    public class UpdateProductRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SKU { get; set; } = string.Empty;

        public int CategoryId { get; set; }

        public int? SupplierId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MinimumSellingPrice { get; set; }

        [Range(0, int.MaxValue)]
        public int StockQuantity { get; set; }

        [Range(0, int.MaxValue)]
        public int LowStockLevel { get; set; }

        [MaxLength(20)]
        public string Unit { get; set; } = "pcs";

        [MaxLength(20)]
        public string? SecondaryUnit { get; set; }

        [Range(0, int.MaxValue)]
        public int SecondaryUnitFactor { get; set; }

        [Range(0, double.MaxValue)]
        public decimal SecondaryUnitPrice { get; set; }
    }
}