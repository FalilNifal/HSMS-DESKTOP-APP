namespace HSMS.API.DTOs.Settings
{
    public class ShopSettingsResponseDto
    {
        public int Id { get; set; }

        public string ShopName { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public string? LogoPath { get; set; }

        public string? Logo { get; set; }

        public string Currency { get; set; } = string.Empty;

        public string InvoiceFooterMessage { get; set; } = string.Empty;

        public decimal TaxRatePercent { get; set; }

        public string TaxLabel { get; set; } = "Tax";

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
