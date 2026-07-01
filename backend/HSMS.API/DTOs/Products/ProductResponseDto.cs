namespace HSMS.API.DTOs.Products
{
    public class ProductResponseDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public int? SupplierId { get; set; }

        public string? SupplierName { get; set; }

        public decimal? PurchasePrice { get; set; }

        public decimal MinimumSellingPrice { get; set; }

        public int StockQuantity { get; set; }

        public int LowStockLevel { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}