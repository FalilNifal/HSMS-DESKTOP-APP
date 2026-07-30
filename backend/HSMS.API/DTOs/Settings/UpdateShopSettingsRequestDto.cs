using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Settings
{
    public class UpdateShopSettingsRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string ShopName { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        /// <summary>Shop logo as a data URL, or null/empty to clear it.</summary>
        [MaxLength(3_000_000)]
        public string? Logo { get; set; }

        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = string.Empty;

        [MaxLength(250)]
        public string InvoiceFooterMessage { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal TaxRatePercent { get; set; }

        [MaxLength(20)]
        public string TaxLabel { get; set; } = "Tax";
    }
}
