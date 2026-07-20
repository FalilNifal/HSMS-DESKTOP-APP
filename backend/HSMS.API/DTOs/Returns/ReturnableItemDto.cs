namespace HSMS.API.DTOs.Returns
{
    public class ReturnableItemDto
    {
        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int SoldQuantity { get; set; }

        public int AlreadyReturned { get; set; }

        public int ReturnableQuantity { get; set; }

        public decimal UnitPrice { get; set; }
    }
}
