namespace HSMS.API.DTOs.Reports
{
    public class DeadStockReportDto
    {
        public int Days { get; set; }

        public List<DeadStockItemDto> Items { get; set; } = new();
    }
}
