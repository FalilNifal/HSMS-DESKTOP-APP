using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    /// <summary>A payment made to a supplier — reduces the amount owed.</summary>
    public class SupplierPayment
    {
        public int Id { get; set; }

        public int SupplierId { get; set; }

        public decimal Amount { get; set; }

        [MaxLength(30)]
        public string PaymentMethod { get; set; } = "Cash";

        public DateTime PaymentDate { get; set; }

        [MaxLength(250)]
        public string Notes { get; set; } = string.Empty;

        public int CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public Supplier? Supplier { get; set; }

        public User? CreatedByUser { get; set; }
    }
}
