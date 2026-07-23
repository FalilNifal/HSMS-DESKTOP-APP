using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class Expense
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(60)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Description { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        [MaxLength(30)]
        public string PaymentMethod { get; set; } = "Cash";

        /// <summary>The day the expense was incurred (may differ from CreatedAt).</summary>
        public DateTime ExpenseDate { get; set; }

        public int CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public User? CreatedByUser { get; set; }
    }
}
