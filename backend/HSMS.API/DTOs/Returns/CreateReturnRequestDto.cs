using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Returns
{
    public class CreateReturnRequestDto
    {
        [Required]
        [MaxLength(30)]
        public string InvoiceNumber { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        [MinLength(1)]
        public List<CreateReturnItemRequestDto> Items { get; set; } = new();
    }
}
