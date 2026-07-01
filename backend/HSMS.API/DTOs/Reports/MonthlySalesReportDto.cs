namespace HSMS.API.DTOs.Reports
{
    public class MonthlySalesReportDto
    {
        public int Year { get; set; }

        public int Month { get; set; }

        public decimal TotalSales { get; set; }

        public int TotalOrders { get; set; }
    }
}