namespace HSMS.API.Models
{
    public class Sale
    {
        public int Id { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public int SoldByUserId { get; set; }

        /// <summary>Optional link to a customer (required when PaymentMethod is "Credit").</summary>
        public int? CustomerId { get; set; }

        public decimal TotalAmount { get; set; }

        public decimal TotalProfit { get; set; }

        /// <summary>Tax/VAT charged on this sale (included in TotalAmount).</summary>
        public decimal TaxAmount { get; set; }

        public string PaymentMethod { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public User? SoldByUser { get; set; }

        public Customer? Customer { get; set; }

        public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    }
}