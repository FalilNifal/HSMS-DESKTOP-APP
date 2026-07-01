namespace HSMS.API.DTOs.Reports
{
    public class StockMovementReportDto
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public List<StockMovementReportItemDto> Items { get; set; } = new();
    }
}