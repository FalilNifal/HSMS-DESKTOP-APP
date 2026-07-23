namespace HSMS.API.DTOs.Quotations
{
    public class QuotationResponseDto
    {
        public int Id { get; set; }

        public string QuotationNumber { get; set; } = string.Empty;

        public int? CustomerId { get; set; }

        public string CustomerName { get; set; } = string.Empty;

        public int CreatedByUserId { get; set; }

        public string CreatedByUserName { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public string Notes { get; set; } = string.Empty;

        public DateTime? ValidUntil { get; set; }

        public string Status { get; set; } = "Open";

        public int? ConvertedSaleId { get; set; }

        public string? ConvertedInvoiceNumber { get; set; }

        public DateTime CreatedAt { get; set; }

        public List<QuotationItemResponseDto> Items { get; set; } = new();
    }

    public class QuotationItemResponseDto
    {
        public int Id { get; set; }

        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public string UnitLabel { get; set; } = "pcs";

        public int UnitFactor { get; set; } = 1;

        public decimal UnitPrice { get; set; }

        public decimal LineTotal { get; set; }
    }
}
