namespace HSMS.API.DTOs.Returns
{
    public class ReturnResponseDto
    {
        public int Id { get; set; }

        public string ReturnNumber { get; set; } = string.Empty;

        public int SaleId { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public string ProcessedByUserName { get; set; } = string.Empty;

        public decimal TotalRefund { get; set; }

        public string Reason { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public List<ReturnItemResponseDto> Items { get; set; } = new();
    }
}
