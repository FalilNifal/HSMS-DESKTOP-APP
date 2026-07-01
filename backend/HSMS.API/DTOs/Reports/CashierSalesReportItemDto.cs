namespace HSMS.API.DTOs.Reports
{
    public class CashierSalesReportItemDto
    {
        public int CashierUserId { get; set; }

        public string CashierName { get; set; } = string.Empty;

        public decimal TotalSales { get; set; }

        public decimal TotalProfit { get; set; }

        public int OrderCount { get; set; }
    }
}