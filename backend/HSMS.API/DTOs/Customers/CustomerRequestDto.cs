using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Customers
{
    public class CustomerRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(250)]
        public string? Address { get; set; }

        [Range(0, double.MaxValue)]
        public decimal CreditLimit { get; set; }

        [MaxLength(250)]
        public string? Notes { get; set; }
    }
}
