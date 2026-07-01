namespace HSMS.API.DTOs.Products
{
    public class ProductSearchResponseDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public string CategoryName { get; set; } = string.Empty;

        public string? SupplierName { get; set; }

        public decimal MinimumSellingPrice { get; set; }

        public int StockQuantity { get; set; }

        public int LowStockLevel { get; set; }

        public bool IsActive { get; set; }
    }
}