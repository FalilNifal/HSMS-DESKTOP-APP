namespace HSMS.API.DTOs.Products
{
    public class StockTakeResponseDto
    {
        public int AdjustedCount { get; set; }

        public List<StockTakeVarianceDto> Variances { get; set; } = new();
    }

    public class StockTakeVarianceDto
    {
        public int ProductId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int SystemQuantity { get; set; }

        public int CountedQuantity { get; set; }

        public int Variance { get; set; }
    }
}
