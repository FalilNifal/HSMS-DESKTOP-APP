namespace HSMS.API.DTOs.Reports
{
    public class DeadStockItemDto
    {
        public int ProductId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int StockQuantity { get; set; }

        public decimal StockValueAtCost { get; set; }

        public DateTime? LastSoldDate { get; set; }
    }
}
