namespace HSMS.API.Models
{
    public class StockLog
    {
        public int Id { get; set; }

        public int ProductId { get; set; }

        public int OldQuantity { get; set; }

        public int NewQuantity { get; set; }

        public int ChangeAmount { get; set; }

        public string Reason { get; set; } = string.Empty;

        public int ChangedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public Product? Product { get; set; }

        public User? ChangedByUser { get; set; }
    }
}