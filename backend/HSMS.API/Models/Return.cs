using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class Return
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(30)]
        public string ReturnNumber { get; set; } = string.Empty;

        public int SaleId { get; set; }

        [MaxLength(30)]
        public string InvoiceNumber { get; set; } = string.Empty;

        public int ProcessedByUserId { get; set; }

        public decimal TotalRefund { get; set; }

        [MaxLength(250)]
        public string Reason { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public Sale? Sale { get; set; }

        public User? ProcessedByUser { get; set; }

        public List<ReturnItem> Items { get; set; } = new();
    }
}
