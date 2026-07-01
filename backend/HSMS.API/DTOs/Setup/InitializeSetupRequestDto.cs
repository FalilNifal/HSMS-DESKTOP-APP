using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Setup
{
    public class InitializeSetupRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string ShopName { get; set; } = string.Empty;

        [Required]
        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = string.Empty;

        [MaxLength(250)]
        public string InvoiceFooterMessage { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string AdminFullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string AdminUsername { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string AdminPassword { get; set; } = string.Empty;
    }
}