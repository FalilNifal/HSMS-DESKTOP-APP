namespace HSMS.API.DTOs.Reports
{
    public class SalesTrendReportDto
    {
        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }

        public List<SalesTrendItemDto> Items { get; set; } = new();
    }
}
