namespace HSMS.API.DTOs.StockLogs
{
    public class StockLogResponseDto
    {
        public int Id { get; set; }

        public int ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public string SKU { get; set; } = string.Empty;

        public int OldQuantity { get; set; }

        public int NewQuantity { get; set; }

        public int ChangeAmount { get; set; }

        public string Reason { get; set; } = string.Empty;

        public int ChangedByUserId { get; set; }

        public string ChangedByUserName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}