namespace HSMS.API.DTOs.Reports
{
    public class ProductSalesReportDto
    {
        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }

        public List<ProductSalesReportItemDto> Items { get; set; } = new();
    }
}