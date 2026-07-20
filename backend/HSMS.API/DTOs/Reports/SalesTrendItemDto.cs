namespace HSMS.API.DTOs.Reports
{
    public class SalesTrendItemDto
    {
        public DateTime Date { get; set; }

        public decimal TotalSales { get; set; }

        public decimal TotalProfit { get; set; }

        public int OrderCount { get; set; }
    }
}
