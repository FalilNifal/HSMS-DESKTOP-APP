using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    /// <summary>A credit purchase from a supplier — increases the amount owed.</summary>
    public class SupplierBill
    {
        public int Id { get; set; }

        public int SupplierId { get; set; }

        [MaxLength(50)]
        public string BillNumber { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public DateTime BillDate { get; set; }

        [MaxLength(250)]
        public string Notes { get; set; } = string.Empty;

        public int CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public Supplier? Supplier { get; set; }

        public User? CreatedByUser { get; set; }
    }
}
