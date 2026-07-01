using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Sales
{
    public class CreateSaleRequestDto
    {
        [Required]
        [MaxLength(30)]
        public string PaymentMethod { get; set; } = string.Empty;

        [Required]
        [MinLength(1)]
        public List<CreateSaleItemRequestDto> Items { get; set; } = new();
    }
}