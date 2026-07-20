namespace HSMS.API.DTOs.Sales
{
    public class InvoiceResponseDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;

        public string ShopName { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public string InvoiceFooterMessage { get; set; } = string.Empty;

        public string CashierName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public string PaymentMethod { get; set; } = string.Empty;

        public decimal SubTotal { get; set; }

        public decimal TaxAmount { get; set; }

        public string TaxLabel { get; set; } = "Tax";

        public decimal TotalAmount { get; set; }

        public List<InvoiceItemResponseDto> Items { get; set; } = new();
    }
}