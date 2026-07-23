namespace HSMS.API.Models
{
    public class SaleItem
    {
        public int Id { get; set; }

        public int SaleId { get; set; }

        public int ProductId { get; set; }

        public string ProductNameAtSale { get; set; } = string.Empty;

        public string SKUAtSale { get; set; } = string.Empty;

        public int Quantity { get; set; }

        /// <summary>Unit this line was sold in, e.g. "pcs" or "box".</summary>
        public string UnitLabel { get; set; } = "pcs";

        /// <summary>Base units per sold unit. Base stock deducted = Quantity * UnitFactor.</summary>
        public int UnitFactor { get; set; } = 1;

        public decimal PurchasePriceAtSale { get; set; }

        public decimal MinimumSellingPriceAtSale { get; set; }

        public decimal ActualSellingPrice { get; set; }

        public decimal LineTotal { get; set; }

        public decimal LineProfit { get; set; }

        public Sale? Sale { get; set; }

        public Product? Product { get; set; }
    }
}