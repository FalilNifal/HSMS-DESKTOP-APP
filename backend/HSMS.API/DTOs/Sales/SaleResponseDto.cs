namespace HSMS.API.DTOs.Sales
{
    public class SaleResponseDto
    {
        public int Id { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public int SoldByUserId { get; set; }

        public string SoldByUserName { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public decimal? TotalProfit { get; set; }

        public string PaymentMethod { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public List<SaleItemResponseDto> Items { get; set; } = new();
    }
}