namespace HSMS.API.DTOs.Reports
{
    public class ProfitReportDto
    {
        public DateTime PeriodStart { get; set; }

        public DateTime PeriodEnd { get; set; }

        public decimal TotalSales { get; set; }

        public decimal TotalProfit { get; set; }

        public int TotalOrders { get; set; }
    }
}