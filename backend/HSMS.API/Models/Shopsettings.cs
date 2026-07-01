using System.ComponentModel.DataAnnotations;

namespace HSMS.API.Models
{
    public class ShopSettings
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string ShopName { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? LogoPath { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "LKR";

        [MaxLength(250)]
        public string InvoiceFooterMessage { get; set; } = "Thank you for your business!";

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }
    }
}