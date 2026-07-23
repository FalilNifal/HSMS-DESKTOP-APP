namespace HSMS.API.DTOs.Sales
{
    public class InvoiceItemResponseDto
    {
        public string ProductName { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public string UnitLabel { get; set; } = "pcs";

        public decimal ActualSellingPrice { get; set; }

        public decimal LineTotal { get; set; }
    }
}