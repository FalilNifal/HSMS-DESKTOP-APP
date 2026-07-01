namespace HSMS.API.Models
{
    public class Sale
    {
        public int Id { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public int SoldByUserId { get; set; }

        public decimal TotalAmount { get; set; }

        public decimal TotalProfit { get; set; }

        public string PaymentMethod { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public User? SoldByUser { get; set; }

        public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    }
}