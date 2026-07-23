namespace HSMS.API.DTOs.Sales
{
    public class SaleItemResponseDto
    {
        public int Id { get; set; }

        public int ProductId { get; set; }

        public string ProductNameAtSale { get; set; } = string.Empty;

        public string SKUAtSale { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public string UnitLabel { get; set; } = "pcs";

        public decimal? PurchasePriceAtSale { get; set; }

        public decimal? MinimumSellingPriceAtSale { get; set; }

        public decimal ActualSellingPrice { get; set; }

        public decimal LineTotal { get; set; }

        public decimal? LineProfit { get; set; }
    }
}