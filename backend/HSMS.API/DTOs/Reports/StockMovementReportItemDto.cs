namespace HSMS.API.DTOs.Reports
{
    public class StockMovementReportItemDto
    {
        public int Id { get; set; }

        public int OldQuantity { get; set; }

        public int NewQuantity { get; set; }

        public int ChangeAmount { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string ChangedByUserName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}