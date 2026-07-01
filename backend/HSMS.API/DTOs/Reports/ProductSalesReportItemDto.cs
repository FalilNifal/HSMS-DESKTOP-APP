namespace HSMS.API.DTOs.Reports
{
    public class ProductSalesReportItemDto
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int QuantitySold { get; set; }

        public decimal TotalSales { get; set; }

        public decimal TotalProfit { get; set; }
    }
}