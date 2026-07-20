namespace HSMS.API.DTOs.Returns
{
    public class ReturnItemResponseDto
    {
        public int ProductId { get; set; }

        public string ProductNameAtSale { get; set; } = string.Empty;

        public string SKUAtSale { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal LineRefund { get; set; }
    }
}
