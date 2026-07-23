using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class Quotation
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(30)]
        public string QuotationNumber { get; set; } = string.Empty;

        /// <summary>Optional link to a saved customer.</summary>
        public int? CustomerId { get; set; }

        /// <summary>Name to print when there is no saved customer (walk-in).</summary>
        [MaxLength(150)]
        public string CustomerNameSnapshot { get; set; } = string.Empty;

        public int CreatedByUserId { get; set; }

        public decimal TotalAmount { get; set; }

        [MaxLength(300)]
        public string Notes { get; set; } = string.Empty;

        public DateTime? ValidUntil { get; set; }

        /// <summary>Open, Converted or Cancelled.</summary>
        [MaxLength(20)]
        public string Status { get; set; } = "Open";

        /// <summary>Set once the quotation has been turned into a sale.</summary>
        public int? ConvertedSaleId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }

        public Customer? Customer { get; set; }

        public User? CreatedByUser { get; set; }

        public List<QuotationItem> Items { get; set; } = new();
    }
}
