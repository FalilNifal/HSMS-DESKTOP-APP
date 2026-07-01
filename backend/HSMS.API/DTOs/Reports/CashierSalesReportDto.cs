namespace HSMS.API.DTOs.Reports
{
    public class CashierSalesReportDto
    {
        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }

        public List<CashierSalesReportItemDto> Items { get; set; } = new();
    }
}