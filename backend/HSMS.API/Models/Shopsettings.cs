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

        /// <summary>Shop-uploaded logo as a data URL (e.g. "data:image/png;base64,...").
        /// Null = use the default product logo.</summary>
        public string? Logo { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "LKR";

        [MaxLength(250)]
        public string InvoiceFooterMessage { get; set; } = "Thank you for your business!";

        /// <summary>Tax/VAT rate applied to sales, as a percent. 0 = no tax.</summary>
        [Range(0, 100)]
        public decimal TaxRatePercent { get; set; }

        [MaxLength(20)]
        public string TaxLabel { get; set; } = "Tax";

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }
    }
}