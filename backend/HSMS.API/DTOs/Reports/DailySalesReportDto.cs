namespace HSMS.API.DTOs.Reports
{
    public class DailySalesReportDto
    {
        public DateTime Date { get; set; }

        public decimal TotalSales { get; set; }

        public int TotalOrders { get; set; }
    }
}