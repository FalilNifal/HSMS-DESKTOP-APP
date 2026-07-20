using System.ComponentModel.DataAnnotations;

namespace HSMS.API.DTOs.Products
{
    public class ImportProductsRequestDto
    {
        [Required]
        public List<ImportProductRowDto> Rows { get; set; } = new();
    }
}
