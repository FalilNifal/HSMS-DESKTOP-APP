using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class Customer
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(250)]
        public string? Address { get; set; }

        /// <summary>Maximum allowed outstanding credit. 0 = no limit.</summary>
        public decimal CreditLimit { get; set; }

        /// <summary>Current amount the customer owes (running balance).</summary>
        public decimal OutstandingBalance { get; set; }

        [MaxLength(250)]
        public string? Notes { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }
    }
}
