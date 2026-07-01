using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Products
{
    public class UpdateStockRequestDto
    {
        [Range(0, int.MaxValue)]
        public int NewQuantity { get; set; }

        [Required]
        [MaxLength(250)]
        public string Reason { get; set; } = string.Empty;
    }
}