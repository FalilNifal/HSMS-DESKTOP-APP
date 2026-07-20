namespace HSMS.API.DTOs.Reports
{
    public class ProfitReportDto
    {
        public DateTime PeriodStart { get; set; }

        public DateTime PeriodEnd { get; set; }

        public decimal TotalSales { get; set; }

        public decimal TotalProfit { get; set; }

        public int TotalOrders { get; set; }

        /// <summary>Total refunded from returns in the period.</summary>
        public decimal TotalRefunds { get; set; }

        /// <summary>Sales minus refunds.</summary>
        public decimal NetSales { get; set; }

        /// <summary>Profit minus the profit portion of refunds.</summary>
        public decimal NetProfit { get; set; }
    }
}