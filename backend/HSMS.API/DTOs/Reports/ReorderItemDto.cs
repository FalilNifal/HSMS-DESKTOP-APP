namespace HSMS.API.DTOs.Reports
{
    public class ReorderItemDto
    {
        public int ProductId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int? SupplierId { get; set; }

        public string SupplierName { get; set; } = string.Empty;

        public int StockQuantity { get; set; }

        public int LowStockLevel { get; set; }

        public int SuggestedQuantity { get; set; }
    }
}
