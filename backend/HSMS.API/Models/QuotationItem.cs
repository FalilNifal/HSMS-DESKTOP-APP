namespace HSMS.API.Models
{
    public class QuotationItem
    {
        public int Id { get; set; }

        public int QuotationId { get; set; }

        public int ProductId { get; set; }

        public string ProductNameSnapshot { get; set; } = string.Empty;

        public string SKUSnapshot { get; set; } = string.Empty;

        public int Quantity { get; set; }

        /// <summary>Unit quoted, e.g. "pcs" or "box".</summary>
        public string UnitLabel { get; set; } = "pcs";

        /// <summary>Base units per quoted unit (1 = base unit).</summary>
        public int UnitFactor { get; set; } = 1;

        public decimal UnitPrice { get; set; }

        public decimal LineTotal { get; set; }

        public Quotation? Quotation { get; set; }

        public Product? Product { get; set; }
    }
}
