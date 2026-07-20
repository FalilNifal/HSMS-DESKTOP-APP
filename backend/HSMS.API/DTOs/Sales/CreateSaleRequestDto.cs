using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Sales
{
    public class CreateSaleRequestDto
    {
        [Required]
        [MaxLength(30)]
        public string PaymentMethod { get; set; } = string.Empty;

        /// <summary>Optional customer link. Required when PaymentMethod is "Credit".</summary>
        public int? CustomerId { get; set; }

        [Required]
        [MinLength(1)]
        public List<CreateSaleItemRequestDto> Items { get; set; } = new();
    }
}