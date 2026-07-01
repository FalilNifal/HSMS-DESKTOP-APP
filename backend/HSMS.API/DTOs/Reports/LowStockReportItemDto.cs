namespace HSMS.API.DTOs.Reports
{
    public class LowStockReportItemDto
    {
        public int ProductId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int StockQuantity { get; set; }

        public int LowStockLevel { get; set; }
    }
}