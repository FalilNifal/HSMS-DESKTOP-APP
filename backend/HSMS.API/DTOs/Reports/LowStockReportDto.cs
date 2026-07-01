namespace HSMS.API.DTOs.Reports
{
    public class LowStockReportDto
    {
        public List<LowStockReportItemDto> Items { get; set; } = new();
    }
}