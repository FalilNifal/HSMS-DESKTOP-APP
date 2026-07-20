namespace HSMS.API.DTOs.Returns
{
    public class ReturnableSaleResponseDto
    {
        public int SaleId { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public string SoldByUserName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public List<ReturnableItemDto> Items { get; set; } = new();
    }
}
